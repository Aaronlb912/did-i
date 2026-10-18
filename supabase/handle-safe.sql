-- Safe to run again. Also in people.sql; use this alone if people.sql
-- already ran before handle safety landed.

create or replace function public.handle_safe(raw text)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  h text := lower(btrim(coalesce(raw, '')));
  bad text[] := array[
    '1488', '8814', '1312', '8888', '6666', '6969',
    'nigger', 'nigga', 'faggot', 'fagot', 'kike', 'spic', 'chink', 'gook',
    'wetback', 'beaner', 'tranny', 'retard', 'cunt', 'rape', 'lynch',
    'hitler', 'nazi', 'kkk', 'coon', 'raghead', 'towelhead', 'pedo'
  ];
  piece text;
begin
  if h = '' then
    return true;
  end if;
  if h !~ '^[a-z0-9_]{3,20}$' then
    return false;
  end if;
  foreach piece in array bad loop
    if position(piece in h) > 0 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

alter table public.profiles drop constraint if exists profiles_handle_safe;
alter table public.profiles add constraint profiles_handle_safe
  check (handle is null or public.handle_safe(handle));

create or replace function public.my_handle()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  have text;
  words text[] := array[
    'acorn', 'anchor', 'apron', 'atlas', 'beacon', 'birch', 'bramble', 'canyon',
    'cedar', 'clover', 'comet', 'copper', 'cove', 'dune', 'ember', 'fennel',
    'flint', 'garnet', 'harbor', 'hazel', 'indigo', 'juniper', 'kettle', 'lantern',
    'ledger', 'maple', 'meadow', 'mica', 'nickel', 'olive', 'onyx', 'otter',
    'parcel', 'pebble', 'quarry', 'quill', 'ridge', 'rowan', 'saffron', 'sage',
    'slate', 'sparrow', 'spruce', 'thistle', 'timber', 'tulip', 'umber', 'vellum',
    'walnut', 'willow'
  ];
  try text;
  n integer := 0;
  w integer;
  i integer;
  j integer;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select p.handle into have from public.profiles p where p.user_id = me;
  if have is not null and have <> '' then
    return have;
  end if;
  w := array_length(words, 1);
  loop
    i := 1 + floor(random() * w)::int;
    loop
      j := 1 + floor(random() * w)::int;
      exit when j <> i;
    end loop;
    try := words[i] || words[j];
    exit when public.handle_safe(try)
      and not exists (select 1 from public.profiles where lower(handle) = try);
    n := n + 1;
    if n > 60 then
      raise exception 'could not find a free handle';
    end if;
  end loop;
  insert into public.profiles (user_id, handle) values (me, try)
  on conflict (user_id) do update set handle = coalesce(nullif(public.profiles.handle, ''), try);
  select p.handle into have from public.profiles p where p.user_id = me;
  return have;
end;
$$;

revoke all on function public.my_handle() from public;
grant execute on function public.my_handle() to authenticated;
