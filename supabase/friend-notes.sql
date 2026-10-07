-- A private note you keep about a friend ("allergic to nuts", "kids: Sam
-- and Lee"). Only the person who wrote it can read or change it; the friend
-- never sees it. One note per friend. Run after schema.sql and hardening.sql.
-- Safe to run again.

create table if not exists public.friend_notes (
  owner_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (owner_id, friend_id)
);

-- The note box caps at 500; the server holds the same line.
alter table public.friend_notes drop constraint if exists friend_notes_note_len;
alter table public.friend_notes add constraint friend_notes_note_len check (length(note) <= 500);

-- owner_id leads the primary key; friend_id needs its own for the cascade.
create index if not exists friend_notes_friend_idx on public.friend_notes (friend_id);

alter table public.friend_notes enable row level security;

drop policy if exists "own friend notes" on public.friend_notes;
create policy "own friend notes" on public.friend_notes
  for all using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- One note per person is the most anyone needs; 1000 is far past any real
-- friends list and stops a script filling the table.
create or replace function public.cap_friend_notes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.friend_notes where owner_id = new.owner_id) >= 1000 then
    raise exception 'too many friend notes';
  end if;
  return new;
end;
$$;

drop trigger if exists cap_friend_notes on public.friend_notes;
create trigger cap_friend_notes
  before insert on public.friend_notes
  for each row execute function public.cap_friend_notes();

revoke all on public.friend_notes from anon;
grant select, insert, update, delete on public.friend_notes to authenticated;
