-- Day-7 retention by signup week. Read only; run with npm run db:retention.
-- Back on day 7 = a phone or the shelf was seen 7 or more days after signup.
-- devices.last_seen_at keeps only the latest visit, so this counts people
-- still around after a week, not people who opened on exactly day 7.
with people as (
  select
    u.id,
    u.created_at,
    greatest(
      (select max(d.last_seen_at) from public.devices d where d.user_id = u.id),
      (select s.updated_at from public.shelves s where s.user_id = u.id)
    ) as last_seen
  from auth.users u
  where u.created_at < now() - interval '7 days'
    and u.created_at >= now() - interval '120 days'
)
select
  to_char(date_trunc('week', created_at), 'YYYY-MM-DD') as week,
  count(*) as signed_up,
  count(*) filter (where last_seen >= created_at + interval '7 days') as back_day_7,
  round(100.0 * count(*) filter (where last_seen >= created_at + interval '7 days') / count(*)) as pct
from people
group by 1
order by 1;
