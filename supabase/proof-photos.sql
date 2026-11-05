-- A proof photo on a Did.
--
-- Someone who answers Did to a Did you (sends, kind todo) or a Did we card can
-- add one photo to that answer. Who sees it:
--   Did you: the person who asked, and the person who answered.
--   Did we: members in state 'in', unless the card shows only a count.
-- Blocks hide it both ways. A report hides it for the reporter at once.
--
-- The file is in the private bucket proofs, at proofs/<user id>/<proof id>.jpg,
-- up to 400 KB, JPEG only. The phone reads it through signed links (1 hour).
-- A photo stays until its owner removes it or the send or card goes.
--
-- Rows are made only through add_proof, which checks the Did is real.
-- A kid adds photos only where every other person involved shares their
-- family. A sender can ask for a photo (sends.wants_photo); a Did without
-- one still counts.
--
-- Redefines delete_me (latest: did-we-safety.sql) to clear the files.
-- Apply last, after question-cap.sql.

alter table public.sends add column if not exists wants_photo boolean not null default false;

create table if not exists public.proofs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  send_id uuid references public.sends on delete cascade,
  card_id uuid references public.we_cards on delete cascade,
  night date not null,
  made_at timestamptz not null default now(),
  constraint proofs_one_target check ((send_id is null) <> (card_id is null))
);

-- One photo per answer.
create unique index if not exists proofs_send_night_key
  on public.proofs (send_id, night) where send_id is not null;
create unique index if not exists proofs_card_owner_night_key
  on public.proofs (card_id, owner_id, night) where card_id is not null;
create index if not exists proofs_owner_idx on public.proofs (owner_id, made_at desc);

alter table public.reports add column if not exists proof_id uuid references public.proofs on delete set null;
create index if not exists reports_proof_idx on public.reports (proof_id);

-- Who can see a photo ---------------------------------------------------

create or replace function public.can_see_proof(pid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.proofs p
    where p.id = pid
      and (
        p.owner_id = (select auth.uid())
        or (
          not public.blocked_with(p.owner_id)
          and not exists (
            select 1 from public.reports r
            where r.from_id = (select auth.uid()) and r.proof_id = p.id
          )
          and (
            exists (
              select 1 from public.sends s
              where s.id = p.send_id and s.from_id = (select auth.uid())
            )
            or exists (
              select 1 from public.we_members m
              join public.we_cards c on c.id = m.card_id
              where m.card_id = p.card_id
                and m.user_id = (select auth.uid())
                and m.state = 'in'
                and c.shows <> 'count'
            )
          )
        )
      )
  );
$$;

revoke all on function public.can_see_proof(uuid) from public, anon;
grant execute on function public.can_see_proof(uuid) to authenticated;

-- The proof id in a file path (<user id>/<proof id>.jpg), or null.
create or replace function public.proof_of_path(path text)
returns uuid
language sql
immutable
set search_path = public
as $$
  select case
    when path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
      then substring(path from '/([0-9a-f-]{36})\.jpg$')::uuid
    else null
  end;
$$;

revoke all on function public.proof_of_path(text) from public, anon;
grant execute on function public.proof_of_path(text) to authenticated;

create or replace function public.own_proof_path(path text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.proofs p
    where p.id = public.proof_of_path(path)
      and p.owner_id = (select auth.uid())
      and path like (p.owner_id::text || '/%')
  );
$$;

revoke all on function public.own_proof_path(text) from public, anon;
grant execute on function public.own_proof_path(text) to authenticated;

-- Row level security ----------------------------------------------------

alter table public.proofs enable row level security;

drop policy if exists "see proofs" on public.proofs;
create policy "see proofs" on public.proofs
  for select to authenticated using (public.can_see_proof(id));

drop policy if exists "remove own proof" on public.proofs;
create policy "remove own proof" on public.proofs
  for delete to authenticated using ((select auth.uid()) = owner_id);

revoke all on public.proofs from anon, authenticated;
grant select, delete on public.proofs to authenticated;

-- The bucket and its files ---------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 409600, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = 409600, allowed_mime_types = array['image/jpeg'];

-- Only into your own folder, and only for a photo row you made.
drop policy if exists "proofs own insert" on storage.objects;
create policy "proofs own insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.own_proof_path(name)
  );

drop policy if exists "proofs read" on storage.objects;
create policy "proofs read" on storage.objects
  for select to authenticated
  using (bucket_id = 'proofs' and public.can_see_proof(public.proof_of_path(name)));

drop policy if exists "proofs own delete" on storage.objects;
create policy "proofs own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Making a photo row ----------------------------------------------------

create or replace function public.proofs_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.sends;
begin
  -- Five a day.
  if (select count(*) from public.proofs p
      where p.owner_id = new.owner_id and p.made_at >= date_trunc('day', now())) >= 5 then
    raise exception 'too many photos today';
  end if;
  if new.send_id is not null then
    select * into s from public.sends x where x.id = new.send_id;
    if s.id is null or s.to_id <> new.owner_id or s.kind <> 'todo' or s.state <> 'kept' then
      raise exception 'not your Did you';
    end if;
    if exists (select 1 from public.blocks b
               where (b.blocker = s.from_id and b.blocked = s.to_id)
                  or (b.blocker = s.to_id and b.blocked = s.from_id)) then
      raise exception 'not your Did you';
    end if;
    if not exists (select 1 from public.send_answers a
                   where a.send_id = new.send_id and a.night = new.night and a.answer = 'did') then
      raise exception 'no Did to add a photo to';
    end if;
    -- A kid sends and gets Did yous only inside the family.
    if exists (select 1 from public.family_members k
               where k.role = 'kid' and k.user_id in (s.from_id, s.to_id))
       and not public.shares_family_of(s.from_id, s.to_id) then
      raise exception 'kid photos are family only';
    end if;
  else
    if not exists (select 1 from public.we_members m
                   where m.card_id = new.card_id and m.user_id = new.owner_id and m.state = 'in') then
      raise exception 'not on this card';
    end if;
    if not exists (select 1 from public.we_answers a
                   where a.card_id = new.card_id and a.user_id = new.owner_id
                     and a.night = new.night and a.status = 'did') then
      raise exception 'no Did to add a photo to';
    end if;
    -- A kid's photo goes only to a card where every other member is family.
    if exists (
      select 1 from public.we_members m
      where m.card_id = new.card_id and m.user_id <> new.owner_id and m.state = 'in'
        and exists (select 1 from public.family_members k
                    where k.role = 'kid' and k.user_id in (m.user_id, new.owner_id))
        and not public.shares_family_of(m.user_id, new.owner_id)
    ) then
      raise exception 'kid photos are family only';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.proofs_guard() from public, anon, authenticated;

drop trigger if exists proofs_guard on public.proofs;
create trigger proofs_guard
  before insert on public.proofs
  for each row execute function public.proofs_guard();

create or replace function public.add_proof(p_send uuid default null, p_card uuid default null, p_night date default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  pid uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if p_night is null or p_night < current_date - 3 or p_night > current_date + 1 then
    raise exception 'bad night';
  end if;
  insert into public.proofs (owner_id, send_id, card_id, night)
  values (me, p_send, p_card, p_night)
  returning id into pid;
  return pid;
end;
$$;

revoke all on function public.add_proof(uuid, uuid, date) from public, anon;
grant execute on function public.add_proof(uuid, uuid, date) to authenticated;

-- Report a photo. It hides at once for you; nothing is sent to the owner.
create or replace function public.report_proof(p_proof uuid, why text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  who uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if not public.can_see_proof(p_proof) then
    raise exception 'not yours';
  end if;
  select p.owner_id into who from public.proofs p where p.id = p_proof;
  if who = me then
    raise exception 'not yours';
  end if;
  insert into public.reports (from_id, about_id, reason, proof_id)
  values (me, who, left('photo' || coalesce(': ' || nullif(btrim(why), ''), ''), 500), p_proof);
end;
$$;

revoke all on function public.report_proof(uuid, text) from public, anon;
grant execute on function public.report_proof(uuid, text) to authenticated;

-- A row that goes takes its file with it. Supabase may block direct deletes
-- on storage.objects; then the app's own Storage call removes it, and a
-- refusal here must not stop the delete.
create or replace function public.proofs_drop_file()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  begin
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.objects
    where bucket_id = 'proofs' and name = old.owner_id::text || '/' || old.id::text || '.jpg';
  exception when others then
    raise warning 'proofs_drop_file: file left for %: %', old.id, sqlerrm;
  end;
  return old;
end;
$$;

revoke all on function public.proofs_drop_file() from public, anon, authenticated;

drop trigger if exists proofs_drop_file on public.proofs;
create trigger proofs_drop_file
  after delete on public.proofs
  for each row execute function public.proofs_drop_file();

-- Push: "{name} added a photo" ------------------------------------------

create or replace function public.proof_push_text(who uuid, name text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lang text := coalesce((select p.prefs ->> 'locale' from public.profiles p where p.user_id = who), 'en');
  words jsonb := '{
    "en": "{name} added a photo",
    "de": "{name} hat ein Foto hinzugefügt",
    "es": "{name} añadió una foto",
    "fr": "{name} a ajouté une photo",
    "it": "{name} ha aggiunto una foto",
    "ja": "{name}さんが写真を追加しました",
    "ko": "{name}님이 사진을 추가했어요",
    "pt": "{name} adicionou uma foto",
    "zh": "{name} 添加了一张照片"
  }'::jsonb;
begin
  return replace(coalesce(words ->> lang, words ->> 'en'), '{name}', coalesce(name, ''));
end;
$$;

revoke all on function public.proof_push_text(uuid, text) from public, anon, authenticated;

create or replace function public.proofs_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who text;
begin
  select coalesce(nullif(btrim(p.display_name), ''), '') into who
  from public.profiles p where p.user_id = new.owner_id;
  if new.send_id is not null then
    insert into public.push_queue (to_id, title, body, go)
    select s.from_id, 'Did I',
      left(public.proof_push_text(s.from_id, coalesce(nullif(who, ''), public.push_text(s.from_id, 'someone'))), 200),
      '/sent'
    from public.sends s
    where s.id = new.send_id and public.push_wanted(s.from_id, 'sends');
  else
    insert into public.push_queue (to_id, title, body, go)
    select m.user_id, 'Did we',
      left(public.proof_push_text(m.user_id, coalesce(nullif(who, ''), public.push_text(m.user_id, 'someone'))), 200),
      '/tonight'
    from public.we_members m
    join public.we_cards c on c.id = m.card_id
    where m.card_id = new.card_id and m.state = 'in' and m.user_id <> new.owner_id
      and c.shows <> 'count'
      and not exists (select 1 from public.blocks b
                      where (b.blocker = new.owner_id and b.blocked = m.user_id)
                         or (b.blocker = m.user_id and b.blocked = new.owner_id))
      and public.push_wanted(m.user_id, 'we');
  end if;
  return new;
end;
$$;

revoke all on function public.proofs_push() from public, anon, authenticated;

drop trigger if exists proofs_push on public.proofs;
create trigger proofs_push
  after insert on public.proofs
  for each row execute function public.proofs_push();

-- delete_me: the same as did-we-safety.sql, plus the proof files -------------

create or replace function public.delete_me()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  me uuid := (select auth.uid());
  fam uuid;
  heir uuid;
  card uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  -- Leave every Did we first, the normal way: the next person takes over a
  -- card you made, the last one out ends it, and done nights are counted again.
  for card in
    select card_id from public.we_members where user_id = me and state = 'in'
  loop
    perform public.we_leave(card);
  end loop;
  -- Gifts waiting for you go back to whoever paid for them.
  with back as (
    update public.cheer_gifts g
    set returned_at = now()
    where g.to_id = me and g.claimed_at is null and g.returned_at is null
      and g.from_id is not null and g.from_id <> me
    returning g.from_id, g.gems, g.coins
  )
  update public.profiles p
  set gem_balance = least(p.gem_balance + s.gems, 999999),
      coin_balance = least(p.coin_balance + s.coins, 999999)
  from (select from_id, sum(gems) as gems, sum(coins) as coins from back group by from_id) s
  where p.user_id = s.from_id;
  -- Hand each family to somebody else, or close it if you were the only one.
  for fam in
    select family_id from public.family_members where user_id = me and role = 'parent'
  loop
    select user_id into heir
    from public.family_members
    where family_id = fam and user_id <> me
    order by role = 'parent' desc, joined_at
    limit 1;
    if heir is null then
      delete from public.families where id = fam;
    else
      update public.family_members set role = 'parent'
      where family_id = fam and user_id = heir;
    end if;
  end loop;
  delete from public.family_members where user_id = me;
  delete from public.shelves where user_id = me;
  delete from public.profiles where user_id = me;
  delete from public.devices where user_id = me;
  -- Photo files stay until removed. Supabase may block direct deletes
  -- on storage.objects (storage.protect_delete); then the app's Storage API
  -- call is the only way, so a refusal here must not stop the account delete.
  begin
    perform set_config('storage.allow_delete_query', 'true', true);
    delete from storage.objects
    where bucket_id in ('avatars', 'proofs') and (storage.foldername(name))[1] = me::text;
  exception when others then
    raise warning 'delete_me: photo files left for %: %', me, sqlerrm;
  end;
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_me() from public;
revoke all on function public.delete_me() from anon;
grant execute on function public.delete_me() to authenticated;

notify pgrst, 'reload schema';
