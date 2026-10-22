-- A friend reads your shared notes only for the few days the app shows them
-- (SHARED_NOTE_DAYS in src/lib/social-amounts.js, plus a day of slack).
-- Before this, every note ever shared stayed readable to friends.
drop policy if exists "read own or a friend's shared notes" on public.shared_notes;
create policy "read own or a friend's shared notes" on public.shared_notes
  for select using (
    (select auth.uid()) = user_id
    or (made_at > now() - interval '4 days' and public.are_friends(user_id))
  );
