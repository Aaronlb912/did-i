-- A kid's card photo stays family only when it is viewed, not only when it
-- is added: someone who stops sharing a family with the kid later loses sight.
create or replace function public.can_see_proof(pid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.proofs p
    where p.id = pid
      and (
        p.owner_id = (select auth.uid())
        or (
          not public.blocked_with(p.owner_id)
          and not exists (
            select 1 from public.reports r
            where r.from_id = (select auth.uid()) and r.proof_id = p.id
          )
          and (
            exists (
              select 1 from public.sends s
              where s.id = p.send_id and s.from_id = (select auth.uid())
            )
            or exists (
              select 1 from public.we_members m
              join public.we_cards c on c.id = m.card_id
              where m.card_id = p.card_id
                and m.user_id = (select auth.uid())
                and m.state = 'in'
                and c.shows <> 'count'
                and (
                  public.shares_family_of(p.owner_id, (select auth.uid()))
                  or not exists (select 1 from public.family_members k
                                 where k.role = 'kid' and k.user_id in (p.owner_id, (select auth.uid())))
                )
            )
          )
        )
      )
  );
$$;

revoke all on function public.can_see_proof(uuid) from public, anon;
grant execute on function public.can_see_proof(uuid) to authenticated;
