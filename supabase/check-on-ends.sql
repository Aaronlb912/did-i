-- Check-ons stop after the question's end date. check_ons gets ends_on
-- (null: no end); the app sends it with the rest of the rule. queue_check_ons
-- is the away-check-ons.sql copy with one more condition: the owner's local
-- date is not past ends_on. Safe to run again. Runs last (new file).
alter table public.check_ons add column if not exists ends_on date;

grant insert (owner_id, buddy_id, lamp_id, question, at_minute, days, kind, month_day, on_date, starts_on, every_days, ends_on) on public.check_ons to authenticated;
grant update (buddy_id, question, at_minute, days, kind, month_day, on_date, starts_on, every_days, ends_on) on public.check_ons to authenticated;

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
      c.kind, c.month_day, c.on_date, c.starts_on, c.every_days, c.ends_on,
      p.zone, (now() at time zone p.zone) as local
    from public.check_ons c
    join public.profiles p on p.user_id = c.owner_id
    where p.zone <> '' and p.zone in (select name from pg_timezone_names)
      -- Away: no check-ons while the owner's local date is inside a [from, until) range.
      and not exists (
        select 1 from jsonb_array_elements(case when jsonb_typeof(p.prefs->'away') = 'array' then p.prefs->'away' else '[]'::jsonb end) r
        where jsonb_typeof(r) = 'array'
          and (now() at time zone p.zone)::date::text >= r->>0
          and (now() at time zone p.zone)::date::text < r->>1
      )
  ),
  due as (
    select k.id, k.owner_id, k.buddy_id, k.question, k.local::date as night
    from clock k
    -- Every so often: the newest Did before tonight and the gap the app
    -- learns (learnedGap in src/lib/recurrence.js): the median of the gaps
    -- between the last 6 Did nights, once there are at least 4. One indexed
    -- read of answer_log per every-so-often row, inside this statement.
    left join lateral (
      select max(n.night) as last_did,
        case when count(*) >= 4
          then nullif(round(percentile_cont(0.5) within group (order by n.gap))::int, 0)
        end as learned
      from (
        select d.night, d.night - lag(d.night) over (order by d.night) as gap
        from (
          select a.period_key::date as night from public.answer_log a
          where k.kind = 'every'
            and a.user_id = k.owner_id and a.lamp_id = k.lamp_id
            and a.status in ('yes', 'late')
            and a.period_key ~ '^\d{4}-\d{2}-\d{2}$'
            and a.period_key < k.local::date::text
          order by a.period_key desc
          limit 6
        ) d
      ) n
    ) g on true
    where (k.sent_on is null or k.sent_on < k.local::date)
      -- A question with an end date stops asking after its last day.
      and (k.ends_on is null or k.local::date <= k.ends_on)
      and extract(hour from k.local) * 60 + extract(minute from k.local) >= k.at_minute
      -- Asked tonight, per kind. Same rule as checkOnDue in src/lib/check-on.js.
      and case k.kind
        when 'night' then cardinality(k.days) = 0 or extract(dow from k.local)::smallint = any (k.days)
        when 'monthly' then extract(day from k.local)::int = least(
          case when k.month_day = 0 then 31 else k.month_day end,
          extract(day from (date_trunc('month', k.local) + interval '1 month - 1 day'))::int)
        when 'once' then k.local::date = k.on_date
        -- A deadline is asked every night from its start to the due date.
        when 'by' then k.local::date between coalesce(k.starts_on, k.on_date) and k.on_date
        -- Never done, or the learned gap (else every_days) since the newest Did.
        when 'every' then coalesce(k.local::date - g.last_did >= coalesce(g.learned, k.every_days), true)
        else false
      end
      -- Not answered: the key the app writes for this period. A deadline
      -- keeps one key for every night, so a Not yet only counts tonight.
      and not exists (
        select 1 from public.answer_log a
        where a.user_id = k.owner_id and a.lamp_id = k.lamp_id
          and a.period_key = case
            when k.kind = 'monthly' then to_char(k.local, 'YYYY-MM')
            when k.kind in ('once', 'by') then 'once:' || k.lamp_id
            else k.local::date::text
          end
          and (k.kind <> 'by' or a.status in ('yes', 'late')
            or (a.updated_at at time zone k.zone)::date = k.local::date)
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
