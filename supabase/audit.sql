-- Run this in the Supabase SQL editor after any schema change.
-- It should come back with no rows. Every row is something that will
-- either get slow or leak once there are a lot of people on the app.

with unindexed_fk as (
  select 'unindexed foreign key' as problem,
         c.conrelid::regclass::text as where_at,
         a.attname::text as detail
  from pg_constraint c
  join unnest(c.conkey) with ordinality k(attnum, ord) on true
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
  where c.contype = 'f'
    and c.connamespace = 'public'::regnamespace
    and not exists (
      select 1 from pg_index i
      where i.indrelid = c.conrelid and (i.indkey::int2[])[0] = a.attnum
    )
),
per_row_auth as (
  select 'auth.uid() re-run per row' as problem,
         tablename::text as where_at,
         policyname::text as detail
  from pg_policies
  where schemaname = 'public'
    and (coalesce(qual, '') || coalesce(with_check, '')) like '%auth.uid()%'
    and (coalesce(qual, '') || coalesce(with_check, '')) not like '%SELECT auth.uid()%'
),
loose_path as (
  select 'security definer without search_path' as problem,
         p.proname::text as where_at,
         coalesce(array_to_string(p.proconfig, ','), 'none') as detail
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.prosecdef
    and (p.proconfig is null or not exists (
      select 1 from unnest(p.proconfig) s where s like 'search_path=%'
    ))
),
rls_gap as (
  -- A table with row level security on and no policy at all is sealed
  -- shut, which is fine on purpose for something only the service role
  -- touches. It is only a gap if somebody still holds a grant on it.
  select 'row level security off, or no policy' as problem,
         c.relname::text as where_at,
         (c.relrowsecurity::text || ' / ' ||
          (select count(*) from pg_policies p
           where p.tablename = c.relname and p.schemaname = 'public')::text) as detail
  from pg_class c
  where c.relnamespace = 'public'::regnamespace
    and c.relkind = 'r'
    and (
      not c.relrowsecurity
      or (
        not exists (select 1 from pg_policies p
                    where p.tablename = c.relname and p.schemaname = 'public')
        and (
          has_table_privilege('authenticated', c.oid, 'SELECT, INSERT, UPDATE, DELETE')
          or has_table_privilege('anon', c.oid, 'SELECT, INSERT, UPDATE, DELETE')
        )
      )
    )
),
no_cap as (
  select 'caller can write any length' as problem,
         (table_name || '.' || column_name)::text as where_at,
         data_type::text as detail
  from information_schema.columns col
  where table_schema = 'public'
    and data_type in ('text', 'jsonb')
    and not exists (
      select 1 from pg_constraint c
      where c.conrelid = (quote_ident(col.table_name))::regclass
        and c.contype = 'c'
        and pg_get_constraintdef(c.oid) like '%' || col.column_name || '%'
        and (pg_get_constraintdef(c.oid) like '%length%'
          or pg_get_constraintdef(c.oid) like '%= ANY %'
          or pg_get_constraintdef(c.oid) like '%~%')
    )
)
select * from unindexed_fk
union all select * from per_row_auth
union all select * from loose_path
union all select * from rls_gap
union all select * from no_cap
order by 1, 2, 3;
