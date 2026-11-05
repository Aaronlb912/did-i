-- One account holds at most 300 questions. A question is an entry in a
-- folder's lamps array in shelves.doc (deleting one removes it from the array).
-- A shelf already over the cap still saves unrelated edits: only a write that
-- raises the count is refused.

create or replace function public.shelf_question_count(d jsonb)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(sum(jsonb_array_length(b -> 'lamps')), 0)::integer
  from jsonb_array_elements(
    case when jsonb_typeof(d -> 'boards') = 'array' then d -> 'boards' else '[]'::jsonb end
  ) as b
  where jsonb_typeof(b -> 'lamps') = 'array';
$$;

create or replace function public.shelves_question_cap()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  after_n integer := public.shelf_question_count(new.doc);
  before_n integer := case when tg_op = 'UPDATE' then public.shelf_question_count(old.doc) else 0 end;
begin
  if after_n > 300 and after_n > before_n then
    raise exception 'question cap: a shelf holds at most 300 questions' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists shelves_question_cap on public.shelves;
create trigger shelves_question_cap
  before insert or update of doc on public.shelves
  for each row execute function public.shelves_question_cap();
