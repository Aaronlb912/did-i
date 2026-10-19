-- Abuse guard: at most 30 morning one-day questions per day on a shelf. The
-- app stops at 10 (src/lib/morning-ask.js MORNING_CAP), so no real one is dropped. Questions live in shelves.doc (boards[].lamps[]); a lamp from
-- the morning ask has morning = true and onceOn = its day.
-- Past the cap the extra ones (last in the doc) are dropped instead of the
-- save being refused: two phones merging 6 + 6 must not stop sync for good.
-- Apply after schema.sql and hardening.sql (scripts/apply-all-sql.mjs order).

create or replace function public.cap_shelf_morning()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if jsonb_typeof(NEW.doc->'boards') <> 'array' then
    return NEW;
  end if;
  -- Cheap exit: nothing over the cap, nothing rebuilt.
  if not exists (
    select 1
    from jsonb_array_elements(NEW.doc->'boards') b,
         jsonb_array_elements(case when jsonb_typeof(b->'lamps') = 'array' then b->'lamps' else '[]'::jsonb end) l
    where l->>'morning' = 'true'
    group by l->>'onceOn'
    having count(*) > 30
  ) then
    return NEW;
  end if;
  NEW.doc := jsonb_set(NEW.doc, '{boards}', (
    with lamps as (
      select bi, li, l,
             case when l->>'morning' = 'true'
               then row_number() over (partition by l->>'morning' = 'true', l->>'onceOn' order by bi, li)
             end as rank
      from jsonb_array_elements(NEW.doc->'boards') with ordinality as b(board, bi),
           jsonb_array_elements(case when jsonb_typeof(board->'lamps') = 'array' then board->'lamps' else '[]'::jsonb end) with ordinality as x(l, li)
    )
    select coalesce(jsonb_agg(
      case when jsonb_typeof(board->'lamps') = 'array'
        then jsonb_set(board, '{lamps}', coalesce((
          select jsonb_agg(k.l order by k.li) from lamps k where k.bi = b.bi and (k.rank is null or k.rank <= 30)
        ), '[]'::jsonb))
        else board
      end order by b.bi), '[]'::jsonb)
    from jsonb_array_elements(NEW.doc->'boards') with ordinality as b(board, bi)
  ));
  return NEW;
end;
$$;

revoke all on function public.cap_shelf_morning() from public, anon, authenticated;

drop trigger if exists cap_shelf_morning on public.shelves;
create trigger cap_shelf_morning
  before insert or update of doc on public.shelves
  for each row execute function public.cap_shelf_morning();
