-- Photo please on asks that add themselves: auto_sends_waiting now says
-- whether the sender asked for a photo (sends.wants_photo, proof-photos.sql).
-- The result gains a column, so the function is dropped and made again.
drop function if exists public.auto_sends_waiting();

create function public.auto_sends_waiting()
returns table (send_id uuid, sender_id uuid, question text, note text, from_family boolean, repeat text, wants_photo boolean)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.from_id, s.question, s.note, public.shares_family(s.from_id), s.repeat, s.wants_photo
  from public.sends s
  where s.to_id = (select auth.uid())
    and s.state = 'sent'
    and s.kind = 'todo'
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
  limit 100;
$$;

revoke all on function public.auto_sends_waiting() from public, anon;
grant execute on function public.auto_sends_waiting() to authenticated;
