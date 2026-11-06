-- Hide what it says covers an edited Did you too. edit_send rewrites the
-- body of a push still waiting (quiet hours can hold it for hours), and the
-- trigger only ran on insert, so the new words reached the lock screen.

drop trigger if exists push_private on public.push_queue;
create trigger push_private
  before insert or update of body on public.push_queue
  for each row execute function public.push_private();
