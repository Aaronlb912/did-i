-- A Did we answer also wakes your own other phones (wake-push.sql only wakes
-- the other people on the card), so their reminder for that day goes away.
-- New at the end of the order; safe to run again.

create or replace function public.wake_own_we_answers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid[];
begin
  select array_agg(distinct user_id) into who from changed;
  perform public.wake_devices(who, public.wake_from_device());
  return null;
end;
$$;

revoke all on function public.wake_own_we_answers() from public, anon, authenticated;

drop trigger if exists wake_we_ins on public.we_answers;
drop trigger if exists wake_we_upd on public.we_answers;
create trigger wake_we_ins after insert on public.we_answers
  referencing new table as changed for each statement execute function public.wake_own_we_answers();
create trigger wake_we_upd after update on public.we_answers
  referencing new table as changed for each statement execute function public.wake_own_we_answers();
