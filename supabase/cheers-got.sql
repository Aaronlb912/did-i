-- Cheers you got: the last 20 cheers you said Thanks to. Thanks keeps the
-- send as state kept (nothing deletes it), so this only reads. Safe to apply alone.

create index if not exists sends_cheers_got_idx
  on public.sends (to_id, made_at desc)
  where kind = 'cheer' and state = 'kept';

create or replace function public.cheers_got_list()
returns table (id uuid, from_id uuid, display_name text, cheer_id text, note text, made_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select s.id, s.from_id, p.display_name, s.cheer_id, s.note, s.made_at
  from public.sends s
  left join public.profiles p on p.user_id = s.from_id
  where s.to_id = (select auth.uid())
    and s.kind = 'cheer'
    and s.state = 'kept'
    and not public.blocked_with(s.from_id)
  order by s.made_at desc
  limit 20;
$$;

revoke all on function public.cheers_got_list() from public, anon;
grant execute on function public.cheers_got_list() to authenticated;
