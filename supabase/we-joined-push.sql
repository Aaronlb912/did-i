-- Saying yes to a Did we ask tells the person who asked. Before this only a
-- link join did (share-links.sql), so an ask that was taken went unseen.
create or replace function public.queue_we_joined_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.state <> 'asked' or new.state <> 'in' or new.asked_by is null or new.asked_by = new.user_id then
    return new;
  end if;
  if not public.push_wanted(new.asked_by, 'we') then
    return new;
  end if;
  insert into public.push_queue (to_id, from_id, title, body, go)
  select new.asked_by, new.user_id, 'Did we',
    left(public.push_text(new.asked_by, 'link_joined', jsonb_build_object(
      'name', coalesce((select nullif(btrim(p.display_name), '') from public.profiles p where p.user_id = new.user_id),
                       public.push_text(new.asked_by, 'a_friend')),
      'q', left(c.question, 120))), 200),
    '/tonight'
  from public.we_cards c where c.id = new.card_id;
  return new;
end;
$$;

revoke all on function public.queue_we_joined_push() from public, anon, authenticated;

drop trigger if exists queue_we_joined_push on public.we_members;
create trigger queue_we_joined_push
  after update of state on public.we_members
  for each row execute function public.queue_we_joined_push();
