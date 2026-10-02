-- Did you links (did-i.app/d/CODE) and sends from Did I.
--
-- A link holds one question. Anyone with the link can see the question and
-- the name of the person who made it. made_by null means Did I made it.
-- Rows are only made through make_did_you_link (20 a day per person) or by
-- the service role (scripts/send-from-did-i.mjs).
--
-- app_sends are Did yous from Did I to every signed-in account. Only the
-- service role writes them, at most 4 in any 30 days. Each one queues a
-- push for people who leave the 'didi' switch on.

create table if not exists public.did_you_links (
  code text primary key,
  made_by uuid references auth.users on delete cascade,
  question text not null,
  made_at timestamptz not null default now(),
  uses integer not null default 0,
  ended boolean not null default false
);

alter table public.did_you_links drop constraint if exists did_you_links_len;
alter table public.did_you_links add constraint did_you_links_len
  check (code ~ '^[a-z0-9]{10}$' and length(btrim(question)) between 1 and 200);

create index if not exists did_you_links_made_by_idx on public.did_you_links (made_by, made_at);

alter table public.did_you_links enable row level security;
revoke all on public.did_you_links from anon, authenticated;
grant select on public.did_you_links to authenticated;

drop policy if exists "own did you links" on public.did_you_links;
create policy "own did you links" on public.did_you_links
  for select to authenticated using (made_by = (select auth.uid()));

create table if not exists public.did_you_link_claims (
  code text not null references public.did_you_links on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  made_at timestamptz not null default now(),
  primary key (code, user_id)
);

alter table public.did_you_link_claims drop constraint if exists did_you_link_claims_len;
alter table public.did_you_link_claims add constraint did_you_link_claims_len check (length(code) = 10);

create index if not exists did_you_link_claims_user_idx on public.did_you_link_claims (user_id);

alter table public.did_you_link_claims enable row level security;
revoke all on public.did_you_link_claims from anon, authenticated;
grant select on public.did_you_link_claims to authenticated;

drop policy if exists "own link claims" on public.did_you_link_claims;
create policy "own link claims" on public.did_you_link_claims
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.make_did_you_link(question text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  q text := btrim(coalesce(question, ''));
  letters text := 'abcdefghjkmnpqrstuvwxyz23456789';
  code text;
  tries integer := 0;
begin
  if me is null then raise exception 'sign in first'; end if;
  if length(q) < 1 then raise exception 'blank'; end if;
  if length(q) > 200 then raise exception 'too long'; end if;
  perform pg_advisory_xact_lock(hashtext('did_you_link:' || me::text));
  if (select count(*) from public.did_you_links l
      where l.made_by = me and l.made_at > now() - interval '1 day') >= 20 then
    raise exception 'too many links today';
  end if;
  loop
    code := '';
    for i in 1..10 loop
      code := code || substr(letters, 1 + floor(random() * length(letters))::int, 1);
    end loop;
    begin
      insert into public.did_you_links (code, made_by, question) values (code, me, q);
      return code;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 5 then raise; end if;
    end;
  end loop;
end;
$$;

revoke all on function public.make_did_you_link(text) from public, anon;
grant execute on function public.make_did_you_link(text) to authenticated;

-- What the link page and the app show. Nothing for an unknown or ended code.
create or replace function public.look_up_did_you_link(code text)
returns table (question text, name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select l.question,
    case when l.made_by is null then null
         else coalesce(nullif(p.display_name, ''), nullif('@' || coalesce(p.handle, ''), '@')) end,
    case when l.made_by is null then null else nullif(p.avatar_url, '') end
  from public.did_you_links l
  left join public.profiles p on p.user_id = l.made_by
  where l.code = lower(btrim(look_up_did_you_link.code)) and not l.ended
  limit 1;
$$;

revoke all on function public.look_up_did_you_link(text) from public;
grant execute on function public.look_up_did_you_link(text) to anon, authenticated;

-- Counted once per person per link. Your own link does not count.
create or replace function public.claim_did_you_link(code text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  c text := lower(btrim(coalesce(claim_did_you_link.code, '')));
  hit integer;
begin
  if me is null then return false; end if;
  if not exists (select 1 from public.did_you_links l
                 where l.code = c and not l.ended and l.made_by is distinct from me) then
    return false;
  end if;
  insert into public.did_you_link_claims (code, user_id) values (c, me) on conflict do nothing;
  get diagnostics hit = row_count;
  if hit = 0 then return false; end if;
  update public.did_you_links set uses = uses + 1 where did_you_links.code = c;
  return true;
end;
$$;

revoke all on function public.claim_did_you_link(text) from public, anon;
grant execute on function public.claim_did_you_link(text) to authenticated;

-- Sends from Did I --------------------------------------------------------

create table if not exists public.app_sends (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  note text not null default '',
  made_at timestamptz not null default now(),
  link_code text references public.did_you_links on delete set null
);

alter table public.app_sends drop constraint if exists app_sends_len;
alter table public.app_sends add constraint app_sends_len
  check (length(btrim(question)) between 1 and 200 and length(note) <= 300 and length(link_code) = 10);

-- mode 'tonight': the app adds it to each person's Tonight for that night
-- only, as a question outside streaks, instead of asking in the inbox.
alter table public.app_sends add column if not exists mode text not null default 'inbox';
alter table public.app_sends add column if not exists night date;
alter table public.app_sends drop constraint if exists app_sends_mode;
alter table public.app_sends add constraint app_sends_mode
  check (mode = any (array['inbox', 'tonight']) and (mode = 'inbox' or night is not null));

create index if not exists app_sends_made_idx on public.app_sends (made_at);
create index if not exists app_sends_link_idx on public.app_sends (link_code);

alter table public.app_sends enable row level security;
revoke all on public.app_sends from anon, authenticated;
grant select on public.app_sends to authenticated;

drop policy if exists "signed in see app sends" on public.app_sends;
create policy "signed in see app sends" on public.app_sends
  for select to authenticated using (true);

create or replace function public.cap_app_sends()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('app_sends'));
  if (select count(*) from public.app_sends a where a.made_at > now() - interval '30 days') >= 4 then
    raise exception 'at most 4 sends from Did I in 30 days';
  end if;
  new.made_at := now();
  return new;
end;
$$;

revoke all on function public.cap_app_sends() from public, anon, authenticated;

drop trigger if exists cap_app_sends on public.app_sends;
create trigger cap_app_sends
  before insert on public.app_sends
  for each row execute function public.cap_app_sends();

-- One push per person with a token who leaves 'didi' on.
create or replace function public.queue_app_send_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.push_queue (to_id, title, body, go)
  select u.user_id, 'Did I',
    left(public.push_text(u.user_id, 'didi_send', jsonb_build_object('q', left(new.question, 120))), 200),
    case when new.mode = 'tonight' then '/tonight' else '/inbox' end
  from (select distinct d.user_id from public.devices d where d.push_token is not null) u
  where public.push_wanted(u.user_id, 'didi');
  return new;
end;
$$;

revoke all on function public.queue_app_send_push() from public, anon, authenticated;

drop trigger if exists queue_app_send_push on public.app_sends;
create trigger queue_app_send_push
  after insert on public.app_sends
  for each row execute function public.queue_app_send_push();

create table if not exists public.app_send_answers (
  app_send_id uuid not null references public.app_sends on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  state text not null,
  made_at timestamptz not null default now(),
  primary key (app_send_id, user_id)
);

alter table public.app_send_answers drop constraint if exists app_send_answers_state;
alter table public.app_send_answers add constraint app_send_answers_state
  check (state = any (array['kept', 'passed', 'added']));

create index if not exists app_send_answers_user_idx on public.app_send_answers (user_id);

alter table public.app_send_answers enable row level security;
revoke all on public.app_send_answers from anon, authenticated;
grant select, insert on public.app_send_answers to authenticated;

drop policy if exists "own app send answers" on public.app_send_answers;
create policy "own app send answers" on public.app_send_answers
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "answer app sends" on public.app_send_answers;
create policy "answer app sends" on public.app_send_answers
  for insert to authenticated with check (user_id = (select auth.uid()));
