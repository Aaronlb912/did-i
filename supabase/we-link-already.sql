-- Run after we-link-blocked.sql. look_up_we_link also says whether the caller
-- is already on the card, so a member who taps the link again goes straight to
-- Today instead of a join sheet.
drop function if exists public.look_up_we_link(text);
create or replace function public.look_up_we_link(code text)
returns table (question text, name text, avatar_url text, people integer, full_up boolean, blocked boolean, already boolean)
language sql
stable
security definer
set search_path = public
as $$
  select c.question,
    coalesce(nullif(p.display_name, ''), nullif('@' || coalesce(p.handle, ''), '@')),
    nullif(p.avatar_url, ''),
    (select count(*)::int from public.we_members m where m.card_id = c.id and m.state = 'in'),
    (select count(*) from public.we_members m where m.card_id = c.id
      and (m.state = 'in' or (m.state = 'asked' and m.asked_at > now() - make_interval(days => public.we_ask_days()))))
      >= public.we_max_members(),
    (select auth.uid()) is not null and exists (
      select 1 from public.blocks b
      where (b.blocker = l.made_by and b.blocked = (select auth.uid()))
         or (b.blocker = (select auth.uid()) and b.blocked = l.made_by)),
    (select auth.uid()) is not null and exists (
      select 1 from public.we_members m
      where m.card_id = c.id and m.user_id = (select auth.uid()) and m.state = 'in')
  from public.we_links l
  join public.we_cards c on c.id = l.card_id and not c.archived
  left join public.profiles p on p.user_id = l.made_by
  where l.code = lower(btrim(look_up_we_link.code)) and not l.ended and l.ends_at > now()
    -- A link stops when the person who made it is no longer on the card.
    and exists (select 1 from public.we_members mm where mm.card_id = l.card_id and mm.user_id = l.made_by and mm.state = 'in')
  limit 1;
$$;

revoke all on function public.look_up_we_link(text) from public;
grant execute on function public.look_up_we_link(text) to anon, authenticated;
