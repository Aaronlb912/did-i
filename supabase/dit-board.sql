-- Did I, part eight. DIT is a board: all your DID answers show when you
-- opt in and finish tonight. No line cap. Run after tonight.sql.

-- The three-a-night cap is gone.
drop trigger if exists cap_tonight on public.tonight;
drop function if exists public.cap_tonight();

-- Replace your lines for a night with whatever you DID. Only when public.
create or replace function public.sync_tonight(wanted date, labels text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  clean text[] := array[]::text[];
  item text;
  low text;
  seen text[] := array[]::text[];
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.user_id = who and p.public_tonight and p.done_on = wanted
  ) then
    return;
  end if;
  if labels is not null then
    foreach item in array labels loop
      item := left(btrim(item), 60);
      if length(item) < 1 then
        continue;
      end if;
      low := lower(item);
      if low = any(seen) then
        continue;
      end if;
      seen := array_append(seen, low);
      clean := array_append(clean, item);
      if coalesce(array_length(clean, 1), 0) >= 50 then
        exit;
      end if;
    end loop;
  end if;
  delete from public.tonight where user_id = who and night = wanted;
  foreach item in array clean loop
    insert into public.tonight (user_id, night, label) values (who, wanted, item);
  end loop;
end;
$$;

revoke all on function public.sync_tonight(date, text[]) from public;
revoke all on function public.sync_tonight(date, text[]) from anon;
grant execute on function public.sync_tonight(date, text[]) to authenticated;

-- More room on the wall. Still one query.
create or replace function public.tonight_wall(wanted date)
returns table (
  user_id uuid,
  handle text,
  display_name text,
  streak integer,
  lines jsonb,
  cheers integer,
  cheered boolean,
  you boolean
)
language sql
security definer
stable
set search_path = public
as $$
  with me as (select (select auth.uid()) as id),
  hidden as (
    select b.blocked as who from public.blocks b where b.blocker = (select id from me)
    union
    select b.blocker as who from public.blocks b where b.blocked = (select id from me)
  ),
  folks as (
    select p.user_id, p.handle, p.display_name, p.streak
    from public.profiles p
    where p.public_tonight
      and p.done_on = wanted
      and p.user_id not in (select who from hidden)
    order by p.streak desc, p.user_id
    limit 200
  )
  select
    f.user_id,
    f.handle,
    f.display_name,
    f.streak,
    coalesce(
      (select jsonb_agg(jsonb_build_object('id', w.id, 'label', w.label) order by w.made_at)
       from public.tonight w
       where w.user_id = f.user_id
         and w.night = wanted
         and (
           f.user_id = (select id from me)
           or (select count(*) from public.reports r where r.line_id = w.id) < 2
         )),
      '[]'::jsonb
    ) as lines,
    coalesce(
      (select count(*) from public.cheers c
       where c.to_id = f.user_id and c.night = wanted),
      0
    )::integer as cheers,
    exists (
      select 1 from public.cheers c
      where c.to_id = f.user_id and c.night = wanted
        and c.from_id = (select id from me)
    ) as cheered,
    f.user_id = (select id from me) as you
  from folks f;
$$;

notify pgrst, 'reload schema';
