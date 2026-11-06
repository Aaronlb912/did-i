-- Proof photos, second pass.
--
-- 1. A monthly Did you or Did we is dated the 1st, so a photo added later in
--    the month was refused as a bad night. The window is now 35 days.
-- 2. Others see a photo only while its Did stands (an undo or Not yet hides
--    it) and, for a Did you, while the keeper shares its answers; the owner
--    always sees it. Did you answers older than the week the phone shares
--    are not on the server, so those hide only on a Not yet.
-- 3. The asker of a Did you sees its photos only while still a friend or in
--    a family with the owner. A kid's photos stay inside the family, so a
--    family split hides them too.
--
-- 4. A Did you photo on a night older than the week the phone shares is
--    taken on the keeper's word (proofs_guard).
--
-- Apply after proof-view-kid.sql (this replaces can_see_proof from there)
-- and proof-photos.sql (proofs_guard).

create or replace function public.add_proof(p_send uuid default null, p_card uuid default null, p_night date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := (select auth.uid());
  pid uuid;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if p_night is null or p_night < current_date - 35 or p_night > current_date + 1 then
    raise exception 'bad night';
  end if;
  insert into public.proofs (owner_id, send_id, card_id, night)
  values (me, p_send, p_card, p_night)
  returning id into pid;
  return pid;
end;
$$;
revoke all on function public.add_proof(uuid, uuid, date) from public, anon;
grant execute on function public.add_proof(uuid, uuid, date) to authenticated;

create or replace function public.can_see_proof(pid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.proofs p
    where p.id = pid
      and (
        p.owner_id = (select auth.uid())
        or (
          not public.blocked_with(p.owner_id)
          and not exists (select 1 from public.reports r where r.from_id = (select auth.uid()) and r.proof_id = p.id)
          and (
            (
              exists (select 1 from public.sends s where s.id = p.send_id and s.from_id = (select auth.uid()) and s.share_answers)
              and (exists (select 1 from public.send_answers a
                           where a.send_id = p.send_id and a.night = p.night and a.answer = 'did')
                or (p.night < current_date - 5
                    and not exists (select 1 from public.send_answers a
                                    where a.send_id = p.send_id and a.night = p.night and a.answer = 'nope')))
              and (public.shares_family_of(p.owner_id, (select auth.uid()))
                or (public.are_friends(p.owner_id)
                  and not exists (select 1 from public.family_members k where k.role = 'kid' and k.user_id in (p.owner_id, (select auth.uid())))))
            )
            or (
              exists (
                select 1 from public.we_members m join public.we_cards c on c.id = m.card_id
                where m.card_id = p.card_id and m.user_id = (select auth.uid()) and m.state = 'in' and c.shows <> 'count'
                  and (public.shares_family_of(p.owner_id, (select auth.uid()))
                    or not exists (select 1 from public.family_members k where k.role = 'kid' and k.user_id in (p.owner_id, (select auth.uid())))))
              and exists (select 1 from public.we_answers a
                          where a.card_id = p.card_id and a.user_id = p.owner_id and a.night = p.night and a.status = 'did')
            )
          )
        )
      )
  );
$$;
revoke all on function public.can_see_proof(uuid) from public, anon;
grant execute on function public.can_see_proof(uuid) to authenticated;

create or replace function public.proofs_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.sends;
begin
  -- Five a day.
  if (select count(*) from public.proofs p
      where p.owner_id = new.owner_id and p.made_at >= date_trunc('day', now())) >= 5 then
    raise exception 'too many photos today';
  end if;
  if new.send_id is not null then
    select * into s from public.sends x where x.id = new.send_id;
    if s.id is null or s.to_id <> new.owner_id or s.kind <> 'todo' or s.state <> 'kept' then
      raise exception 'not your Did you';
    end if;
    if exists (select 1 from public.blocks b
               where (b.blocker = s.from_id and b.blocked = s.to_id)
                  or (b.blocker = s.to_id and b.blocked = s.from_id)) then
      raise exception 'not your Did you';
    end if;
    -- The keeper's phone shares only the last week of answers, so an older
    -- night (a monthly one, dated the 1st) is never on the server. Those are
    -- taken on the keeper's word unless a Not yet is there; newer ones need
    -- the Did.
    if exists (select 1 from public.send_answers a
               where a.send_id = new.send_id and a.night = new.night and a.answer = 'nope')
       or (new.night >= current_date - 5
           and not exists (select 1 from public.send_answers a
                           where a.send_id = new.send_id and a.night = new.night and a.answer = 'did')) then
      raise exception 'no Did to add a photo to';
    end if;
    -- A kid sends and gets Did yous only inside the family.
    if exists (select 1 from public.family_members k
               where k.role = 'kid' and k.user_id in (s.from_id, s.to_id))
       and not public.shares_family_of(s.from_id, s.to_id) then
      raise exception 'kid photos are family only';
    end if;
  else
    if not exists (select 1 from public.we_members m
                   where m.card_id = new.card_id and m.user_id = new.owner_id and m.state = 'in') then
      raise exception 'not on this card';
    end if;
    if not exists (select 1 from public.we_answers a
                   where a.card_id = new.card_id and a.user_id = new.owner_id
                     and a.night = new.night and a.status = 'did') then
      raise exception 'no Did to add a photo to';
    end if;
    -- A kid's photo goes only to a card where every other member is family.
    if exists (
      select 1 from public.we_members m
      where m.card_id = new.card_id and m.user_id <> new.owner_id and m.state = 'in'
        and exists (select 1 from public.family_members k
                    where k.role = 'kid' and k.user_id in (m.user_id, new.owner_id))
        and not public.shares_family_of(m.user_id, new.owner_id)
    ) then
      raise exception 'kid photos are family only';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.proofs_guard() from public, anon, authenticated;
