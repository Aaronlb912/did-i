-- Run after we-link-already.sql. A Did you can carry any Did I schedule:
-- on:DATE, by:DATE, every_n:N, per_week:N and monthly:DAY (0 = last day).
alter table public.sends drop constraint if exists sends_repeat_ok;
alter table public.sends add constraint sends_repeat_ok
  check (
    repeat = ''
    or repeat = 'daily'
    or repeat ~ '^weekly:[0-6](,[0-6]){0,6}$'
    or (repeat ~ '^every:[1-9][0-9]{0,2}$' and substring(repeat from 7)::integer <= 365)
    or repeat ~ '^(on|by):[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or (repeat ~ '^every_n:[1-9][0-9]{0,2}$' and substring(repeat from 9)::integer between 2 and 365)
    or repeat ~ '^per_week:[1-6]$'
    or (repeat ~ '^monthly:(0|[1-9]|[12][0-9]|3[01])$')
  );
