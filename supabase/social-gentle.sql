-- Did I: gentle mode for friends, and "check on me".
-- Run after friends-week.sql (it redefines known_people). Safe to run again.
--
-- Gentle mode (profiles.prefs ->> 'gentle') hides your streak number from
-- friends and family too. They still see whether you are done tonight if
-- you share it. The number is dropped here, on the server, so no client can
-- read it.
--
-- Check on me: on one of your own questions you pick one friend or family
-- member. If the question is not answered by your chosen time (10pm on your
-- own clock unless you change it), they get a push asking them to send you a
-- Did you. Only that question's words are shared, and only with that person.

-- Friends and family, as in friends-week.sql, plus a gentle flag. The streak
-- is null for anyone in gentle mode.
drop function if exists public.known_people();

create or replace function public.known_people()
returns table (
  user_id uuid,
  handle text,
  display_name text,
  share_streak boolean,
  streak integer,
  done_on date,
  avatar_url text,
  buddy_on text,
  look_on text,
  frame_on text,
  gentle boolean
)
language sql
security definer
stable
set search_path = public
as $$
  with me as (select auth.uid() as id),
  mine as (
    select case when l.from_id = (select id from me) then l.to_id else l.from_id end as who
    from public.friend_links l
    where l.state = 'ok' and (select id from me) in (l.from_id, l.to_id)
    union
    select theirs.user_id
    from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.user_id = (select id from me)
  )
  select p.user_id, p.handle, p.display_name, p.share_streak,
    case when coalesce(p.prefs ->> 'gentle', '') = 'true' then null else p.streak end,
    p.done_on,
    nullif(p.avatar_url, ''), coalesce(p.buddy_on, ''),
    coalesce(p.look_on, 'lime'), coalesce(p.frame_on, ''),
    coalesce(p.prefs ->> 'gentle', '') = 'true'
  from public.profiles p
  join mine on mine.who = p.user_id
  where p.user_id <> (select id from me)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker = (select id from me) and b.blocked = p.user_id)
         or (b.blocker = p.user_id and b.blocked = (select id from me))
    );
$$;

revoke all on function public.known_people() from public, anon;
grant execute on function public.known_people() to authenticated;

-- The public tonight wall (dit-board.sql), with the same rule. Your own row
-- keeps its number; nobody else sees a gentle streak or its order.
create or replace function public.tonight_wall(wanted date)
returns table (
  user_id uuid,
  handle text,
  display_name text,
  streak integer,
  lines jsonb,
  cheers integer,
  cheered boolean,
  you boolean
)
language sql
security definer
stable
set search_path = public
as $$
  with me as (select (select auth.uid()) as id),
  hidden as (
    select b.blocked as who from public.blocks b where b.blocker = (select id from me)
    union
    select b.blocker as who from public.blocks b where b.blocked = (select id from me)
  ),
  folks as (
    select p.user_id, p.handle, p.display_name,
      case when coalesce(p.prefs ->> 'gentle', '') = 'true' and p.user_id <> (select id from me)
        then null else p.streak end as streak
    from public.profiles p
    where p.public_tonight
      and p.done_on = wanted
      and p.user_id not in (select who from hidden)
    order by 4 desc nulls last, p.user_id
    limit 200
  )
  select
    f.user_id,
    f.handle,
    f.display_name,
    f.streak,
    coalesce(
      (select jsonb_agg(jsonb_build_object('id', w.id, 'label', w.label) order by w.made_at)
       from public.tonight w
       where w.user_id = f.user_id
         and w.night = wanted
         and (
           f.user_id = (select id from me)
           or (select count(*) from public.reports r where r.line_id = w.id) < 2
         )),
      '[]'::jsonb
    ) as lines,
    coalesce(
      (select count(*) from public.cheers c
       where c.to_id = f.user_id and c.night = wanted),
      0
    )::integer as cheers,
    exists (
      select 1 from public.cheers c
      where c.to_id = f.user_id and c.night = wanted
        and c.from_id = (select id from me)
    ) as cheered,
    f.user_id = (select id from me) as you
  from folks f;
$$;

-- Check on me ----------------------------------------------------------

create table if not exists public.check_ons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  buddy_id uuid not null references auth.users (id) on delete cascade,
  lamp_id text not null,
  question text not null,
  -- Minutes after midnight on the owner's clock. 1320 is 10pm.
  at_minute smallint not null default 1320,
  -- Weekdays (0 Sunday to 6 Saturday) the question is asked; empty is every night.
  days smallint[] not null default '{}',
  -- The owner's night the last push went out, so a night sends once.
  sent_on date,
  made_at timestamptz not null default now(),
  unique (owner_id, lamp_id)
);

alter table public.check_ons drop constraint if exists check_ons_ok;
alter table public.check_ons add constraint check_ons_ok check (
  length(lamp_id) between 1 and 80
  and length(btrim(question)) between 1 and 200
  and at_minute between 0 and 1439
  and cardinality(days) <= 7
  and days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  and owner_id <> buddy_id
);

-- owner_id leads the unique key; buddy_id needs its own for reads and the cascade.
create index if not exists check_ons_buddy_idx on public.check_ons (buddy_id);

alter table public.check_ons enable row level security;

drop policy if exists "check_ons read" on public.check_ons;
create policy "check_ons read" on public.check_ons
  for select using ((select auth.uid()) in (owner_id, buddy_id));

-- Only someone you are friends or family with, and not blocked either way.
drop policy if exists "check_ons add" on public.check_ons;
create policy "check_ons add" on public.check_ons
  for insert with check (
    (select auth.uid()) = owner_id
    and (public.are_friends(buddy_id) or (public.shares_family(buddy_id) and not public.blocked_with(buddy_id)))
  );

drop policy if exists "check_ons change" on public.check_ons;
create policy "check_ons change" on public.check_ons
  for update using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and (public.are_friends(buddy_id) or (public.shares_family(buddy_id) and not public.blocked_with(buddy_id)))
  );

-- The owner can stop it, and so can the friend.
drop policy if exists "check_ons stop" on public.check_ons;
create policy "check_ons stop" on public.check_ons
  for delete using ((select auth.uid()) in (owner_id, buddy_id));

revoke all on public.check_ons from anon;
revoke all on public.check_ons from authenticated;
grant select, delete on public.check_ons to authenticated;
grant insert (owner_id, buddy_id, lamp_id, question, at_minute, days) on public.check_ons to authenticated;
-- sent_on is the job's; nobody signed in moves it.
grant update (buddy_id, question, at_minute, days) on public.check_ons to authenticated;

-- A friend changed: the night starts fresh for the new one.
create or replace function public.check_ons_reset()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.buddy_id is distinct from old.buddy_id then
    new.sent_on := null;
  end if;
  return new;
end;
$$;
revoke all on function public.check_ons_reset() from public, anon, authenticated;

drop trigger if exists check_ons_reset on public.check_ons;
create trigger check_ons_reset
  before update on public.check_ons
  for each row execute function public.check_ons_reset();

-- 20 per person. The client says the same (CHECK_ON_MAX in src/lib/check-on.js).
create or replace function public.cap_check_ons()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.check_ons where owner_id = new.owner_id) >= 20 then
    raise exception 'check-on cap';
  end if;
  return new;
end;
$$;
revoke all on function public.cap_check_ons() from public, anon, authenticated;

drop trigger if exists cap_check_ons on public.check_ons;
create trigger cap_check_ons
  before insert on public.check_ons
  for each row execute function public.cap_check_ons();

-- The push words in the friend's language. English when missing.
create or replace function public.check_on_text(who uuid, name text, q text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  with words(lang, line) as (values
    ('en', '{name} hasn''t answered "{q}" yet. Send a Did you?'),
    ('de', '{name} hat "{q}" noch nicht beantwortet. Ein Did you schicken?'),
    ('es', '{name} aún no respondió "{q}". ¿Le envías un Did you?'),
    ('fr', '{name} n''a pas encore répondu à « {q} ». Envoyer un Did you ?'),
    ('it', '{name} non ha ancora risposto a "{q}". Mandi un Did you?'),
    ('pt', '{name} ainda não respondeu "{q}". Enviar um Did you?'),
    ('ja', '{name}さんはまだ「{q}」に答えていません。Did you を送りますか？'),
    ('ko', '{name}님이 아직 "{q}"에 답하지 않았어요. Did you를 보낼까요?'),
    ('zh', '{name} 还没回答“{q}”。发一个 Did you？')
  )
  select replace(replace(
    coalesce(
      (select w.line from words w
       where w.lang = left(coalesce((select p.prefs ->> 'locale' from public.profiles p where p.user_id = who), 'en'), 2)),
      (select w.line from words w where w.lang = 'en')),
    '{name}', coalesce(name, '')), '{q}', coalesce(q, ''));
$$;
revoke all on function public.check_on_text(uuid, text, text) from public, anon, authenticated;

-- Finds every check-on past its time tonight with no answer in answer_log,
-- marks it sent and queues one push each. One statement, no loop. The
-- drain-push job sends what this queues. Uses the friend's 'friends' switch.
create or replace function public.queue_check_ons()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  made integer := 0;
begin
  with clock as (
    select c.id, c.owner_id, c.buddy_id, c.question, c.lamp_id, c.at_minute, c.days, c.sent_on,
      (now() at time zone p.zone) as local
    from public.check_ons c
    join public.profiles p on p.user_id = c.owner_id
    where p.zone <> '' and p.zone in (select name from pg_timezone_names)
  ),
  due as (
    select k.id, k.owner_id, k.buddy_id, k.question, k.local::date as night
    from clock k
    where (k.sent_on is null or k.sent_on < k.local::date)
      and extract(hour from k.local) * 60 + extract(minute from k.local) >= k.at_minute
      and (cardinality(k.days) = 0 or extract(dow from k.local)::smallint = any (k.days))
      and not exists (
        select 1 from public.answer_log a
        where a.user_id = k.owner_id and a.lamp_id = k.lamp_id and a.period_key = k.local::date::text
      )
      and public.push_wanted(k.buddy_id, 'friends')
      and exists (select 1 from public.devices d where d.user_id = k.buddy_id and d.push_token is not null)
      and (
        exists (
          select 1 from public.friend_links l
          where l.state = 'ok'
            and ((l.from_id = k.owner_id and l.to_id = k.buddy_id) or (l.from_id = k.buddy_id and l.to_id = k.owner_id))
        )
        or exists (
          select 1 from public.family_members a
          join public.family_members b on b.family_id = a.family_id
          where a.user_id = k.owner_id and b.user_id = k.buddy_id
        )
      )
      and not exists (
        select 1 from public.blocks b
        where (b.blocker = k.owner_id and b.blocked = k.buddy_id)
           or (b.blocker = k.buddy_id and b.blocked = k.owner_id)
      )
  ),
  marked as (
    update public.check_ons c set sent_on = d.night
    from due d
    where c.id = d.id
    returning c.owner_id, c.buddy_id, c.question
  ),
  queued as (
    insert into public.push_queue (to_id, title, body, go)
    select m.buddy_id,
      left(coalesce(nullif(o.display_name, ''), public.push_text(m.buddy_id, 'a_friend')), 80),
      left(public.check_on_text(m.buddy_id,
        coalesce(nullif(o.display_name, ''), public.push_text(m.buddy_id, 'a_friend')),
        left(m.question, 120)), 200),
      left('/friend?id=' || m.owner_id::text || '&face=checkon', 80)
    from marked m
    left join public.profiles o on o.user_id = m.owner_id
    returning 1
  )
  select count(*) into made from queued;
  return made;
end;
$$;

revoke all on function public.queue_check_ons() from public, anon, authenticated;

-- Every 5 minutes, so a 10pm check lands by 10:05. The existing
-- drain-push job sends what this queues.
select cron.unschedule('check-ons') where exists (select 1 from cron.job where jobname = 'check-ons');
select cron.schedule('check-ons', '*/5 * * * *', $cron$
  select public.queue_check_ons();
$cron$);

notify pgrst, 'reload schema';
