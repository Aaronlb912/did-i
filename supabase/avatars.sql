-- Profile pictures. Run after blocks.sql and friend-ids.sql (which adds
-- profiles.avatar_url). Anyone who finds you sees it (friend ID look-up,
-- friends, family). Kids can set one too; report and block apply.

-- The link must point at your own folder in the avatars bucket.
alter table public.profiles drop constraint if exists profiles_avatar_url_shape;
alter table public.profiles add constraint profiles_avatar_url_shape
  check (
    avatar_url is null
    or avatar_url = ''
    or (
      length(avatar_url) <= 400
      and avatar_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/avatars/'
      and position('/avatars/' || user_id::text || '/' in avatar_url) > 0
    )
  );

-- Public to read (a photo is meant to be seen), small JPEGs only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 262144, array['image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = 262144, allowed_mime_types = array['image/jpeg'];

-- Each person writes only their own folder: avatars/<user id>/...
drop policy if exists "avatars own insert" on storage.objects;
create policy "avatars own insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars own read" on storage.objects;
create policy "avatars own read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars own delete" on storage.objects;
create policy "avatars own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- At most 3 files in a folder; the app deletes the old one after a change.
create or replace function public.cap_avatar_files()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if new.bucket_id = 'avatars'
     and (select count(*) from storage.objects o
          where o.bucket_id = 'avatars'
            and (storage.foldername(o.name))[1] = (storage.foldername(new.name))[1]) >= 3 then
    raise exception 'too many avatar files';
  end if;
  return new;
end;
$$;

revoke all on function public.cap_avatar_files() from public, anon, authenticated;

drop trigger if exists cap_avatar_files on storage.objects;
create trigger cap_avatar_files
  before insert on storage.objects
  for each row execute function public.cap_avatar_files();

-- Friends and family, now with their photo. Same rules as blocks.sql.
drop function if exists public.known_people();

create or replace function public.known_people()
returns table (
  user_id uuid,
  handle text,
  display_name text,
  share_streak boolean,
  streak integer,
  done_on date,
  avatar_url text
)
language sql
security definer
stable
set search_path = public
as $$
  with me as (select auth.uid() as id),
  mine as (
    select case when l.from_id = (select id from me) then l.to_id else l.from_id end as who
    from public.friend_links l
    where l.state = 'ok' and (select id from me) in (l.from_id, l.to_id)
    union
    select theirs.user_id
    from public.family_members mine
    join public.family_members theirs on theirs.family_id = mine.family_id
    where mine.user_id = (select id from me)
  )
  select p.user_id, p.handle, p.display_name, p.share_streak, p.streak, p.done_on, nullif(p.avatar_url, '')
  from public.profiles p
  join mine on mine.who = p.user_id
  where p.user_id <> (select id from me)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker = (select id from me) and b.blocked = p.user_id)
         or (b.blocker = p.user_id and b.blocked = (select id from me))
    );
$$;

revoke all on function public.known_people() from public, anon;
grant execute on function public.known_people() to authenticated;
