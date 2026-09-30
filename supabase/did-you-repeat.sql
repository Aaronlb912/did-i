-- A Did you can repeat. The sender suggests a schedule; when the person
-- keeps it (from the inbox or by auto add), it lands on their Tonight with
-- that schedule instead of tonight only. It is their question from then on:
-- they can change or remove it like any other. Nothing repeats server side.
--
-- '' once, 'daily', or 'weekly:' plus weekday numbers 0-6 (Sunday 0).
-- Apply after people.sql and auto-add.sql.

alter table public.sends add column if not exists repeat text not null default '';

alter table public.sends drop constraint if exists sends_repeat_ok;
alter table public.sends add constraint sends_repeat_ok
  check (repeat = '' or repeat = 'daily' or repeat ~ '^weekly:[0-6](,[0-6]){0,6}$');

drop function if exists public.claim_auto_sends();
create function public.claim_auto_sends()
returns table (send_id uuid, sender_id uuid, question text, note text, from_family boolean, repeat text)
language sql
security definer
set search_path = public
as $$
  update public.sends s
  set state = 'kept'
  where s.to_id = (select auth.uid())
    and s.state = 'sent'
    and s.kind = 'todo'
    -- A repeat puts a question on their Tonight night after night, so it
    -- always waits in the inbox for a yes, even from family.
    and s.repeat = ''
    and not public.blocked_with(s.from_id)
    and (
      public.shares_family(s.from_id)
      or (
        public.are_friends(s.from_id)
        and exists (
          select 1 from public.auto_adds a
          where a.owner_id = s.to_id and a.friend_id = s.from_id
        )
      )
    )
  returning s.id, s.from_id, s.question, s.note, public.shares_family(s.from_id), s.repeat;
$$;

revoke all on function public.claim_auto_sends() from public;
revoke all on function public.claim_auto_sends() from anon;
grant execute on function public.claim_auto_sends() to authenticated;

-- Three repeating Did yous to one person a day at most, ten to everyone.
create or replace function public.cap_repeat_sends()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.repeat = '' then
    return new;
  end if;
  if (select count(*) from public.sends s
      where s.from_id = new.from_id and s.to_id = new.to_id
        and s.repeat <> '' and s.made_at > now() - interval '1 day') >= 3 then
    raise exception 'too many repeats today';
  end if;
  -- And ten a day from one sender to everyone together.
  if (select count(*) from public.sends s
      where s.from_id = new.from_id
        and s.repeat <> '' and s.made_at > now() - interval '1 day') >= 10 then
    raise exception 'too many repeats today';
  end if;
  return new;
end;
$$;

revoke all on function public.cap_repeat_sends() from public;

drop trigger if exists cap_repeat_sends on public.sends;
create trigger cap_repeat_sends
  before insert on public.sends
  for each row execute function public.cap_repeat_sends();
