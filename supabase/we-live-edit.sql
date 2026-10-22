-- Did we: the maker ending or editing a card pings everyone on it who is in
-- or asked, so their open screens read again (live_we_members only covers
-- the member rows).
create or replace function public.live_we_cards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select c.id as card_id, array_agg(distinct m.user_id) as who
    from changed c
    join public.we_members m on m.card_id = c.id and m.state in ('asked', 'in')
    group by c.id
  loop
    perform public.live_ping(r.who, 'we', r.card_id);
  end loop;
  return null;
end;
$$;

revoke all on function public.live_we_cards() from public, anon, authenticated;

drop trigger if exists live_we_cards on public.we_cards;
create trigger live_we_cards after update on public.we_cards
  referencing new table as changed for each statement execute function public.live_we_cards();
