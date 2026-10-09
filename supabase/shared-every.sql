-- Every so often, shared. A family question can come up every so often
-- instead of every night: it is due for everyone it is for once every_days
-- have passed since anyone's last Did, so the first Did resets it for the
-- whole family. A nope only answers for you, for that night. No streak.
--
-- The last Did is read from family_answers, which every member can already
-- see (people.sql, "see family answers"). Nothing new is shown to anyone.
-- There is no stored "last did" to race on: each Did is its own row, and
-- family_every_last picks the newest, so two people saying Did at once
-- both count and the newest wins.
--
-- A Did you can also be every so often ('every:N' in sends.repeat). The
-- sender may attach the night they last did it themselves (last_did_on),
-- which the person they sent it to sees as "Last time: 12 days ago".
--
-- Apply after people.sql, hardening.sql and did-you-repeat.sql. Safe to run
-- again.

-- Family questions ---------------------------------------------------

alter table public.family_lamps add column if not exists every_days smallint;

alter table public.family_lamps drop constraint if exists family_lamps_cadence_check;
alter table public.family_lamps add constraint family_lamps_cadence_check
  check (cadence in ('daily', 'weekly', 'once', 'every'));

alter table public.family_lamps drop constraint if exists family_lamps_every_days_ok;
alter table public.family_lamps add constraint family_lamps_every_days_ok
  check (
    (cadence = 'every' and every_days between 1 and 365)
    or (cadence <> 'every' and every_days is null)
  );

-- The newest Did per question, without reading a question's whole history.
create index if not exists family_answers_last_did_idx
  on public.family_answers (lamp_id, period_key desc)
  where status in ('yes', 'late');

-- The newest Did on each of these questions, and who said it. Only for
-- questions in a family you are in; anything else comes back empty.
create or replace function public.family_every_last(lamps uuid[])
returns table (lamp_id uuid, last_on text, last_by uuid)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (a.lamp_id) a.lamp_id, a.period_key, a.user_id
  from public.family_answers a
  join public.family_lamps l on l.id = a.lamp_id
  where a.lamp_id = any (lamps[1:200])
    and l.cadence = 'every'
    and public.in_family(l.family_id)
    and a.family_id = l.family_id
    and a.status in ('yes', 'late')
  order by a.lamp_id, a.period_key desc, a.answered_at desc;
$$;

revoke all on function public.family_every_last(uuid[]) from public, anon;
grant execute on function public.family_every_last(uuid[]) to authenticated;

-- Did you asks -------------------------------------------------------

alter table public.sends drop constraint if exists sends_repeat_ok;
alter table public.sends add constraint sends_repeat_ok
  check (
    repeat = ''
    or repeat = 'daily'
    or repeat ~ '^weekly:[0-6](,[0-6]){0,6}$'
    or (repeat ~ '^every:[1-9][0-9]{0,2}$' and substring(repeat from 7)::integer <= 365)
  );

alter table public.sends add column if not exists last_did_on date;

alter table public.sends drop constraint if exists sends_last_did_ok;
alter table public.sends add constraint sends_last_did_ok
  check (
    last_did_on is null
    or (repeat like 'every:%' and last_did_on <= (made_at at time zone 'utc')::date + 1)
  );
