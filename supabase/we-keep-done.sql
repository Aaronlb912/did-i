-- Someone joining or leaving a Did we card re-settles its nights, counting
-- who is on the card now. Last night used to be re-settled both ways, so a
-- new member undid a night everyone had done and the streak broke. Last
-- night is add-only now too; a person taking back their own Did still undoes
-- it through we_answer. Replaces we_resettle in we-slots.sql.

create or replace function public.we_resettle(card uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.we_cards;
  d date;
  here date;
  first_night date;
begin
  select * into c from public.we_cards where id = card;
  if not found then
    return;
  end if;
  here := public.we_slot(c.starts_on, c.cadence, c.weekdays, current_date - 1);
  first_night := coalesce(public.we_slot(c.starts_on, c.cadence, c.weekdays, here - 1), here, current_date - 1);
  for d in
    select g::date from generate_series(first_night, current_date + 7, interval '1 day') g
    where public.we_due(c.starts_on, c.cadence, c.weekdays, g::date)
  loop
    -- Before today is add-only: it can become done, never undone.
    if d >= current_date
       or not exists (select 1 from public.we_done x where x.card_id = card and x.night = d) then
      perform public.we_settle(card, d);
    end if;
  end loop;
end;
$$;

revoke all on function public.we_resettle(uuid) from public, anon, authenticated;
