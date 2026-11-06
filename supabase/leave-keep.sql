-- Did I: leaving keeps your days, and two pushes for family changes you did not
-- make. Safe to run again. Runs last (new file).
--
-- 1. Leaving a Did we, or the maker ending it, no longer wipes the days you
--    did. we_members.left_at is stamped when a member goes from in to left (any
--    path: we_leave, unfriend, block, delete_me). we_cards.ended_at is stamped
--    when a card is closed. my_we_nights then also returns the nights you
--    finished on cards you left or that ended, up to that day, so days in a row
--    does not shrink. Only finished nights come back: a left or ended card is
--    never due on Today and nights after the leave never count as misses. Rows
--    from before this file have no stamp and stay out, as they did.
-- 2. Someone made a parent (a handoff from delete_me, or a parent's tap) is
--    told. Not for a change you made to yourself.
-- 3. Someone a parent removes from a family is told.
-- The shape of my_we_nights is unchanged, so older app builds read it as before.

alter table public.we_members add column if not exists left_at timestamptz;
alter table public.we_cards add column if not exists ended_at timestamptz;

create or replace function public.we_members_left_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.state = 'left' and old.state = 'in' then
    new.left_at := now();
  elsif new.state = 'in' then
    -- Only coming back clears it: a new ask, or saying no to it, keeps the days.
    new.left_at := null;
  end if;
  return new;
end;
$$;

revoke all on function public.we_members_left_at() from public, anon, authenticated;

drop trigger if exists we_members_left_at on public.we_members;
create trigger we_members_left_at
  before update of state on public.we_members
  for each row execute function public.we_members_left_at();

create or replace function public.we_cards_ended_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.archived and not old.archived then
    new.ended_at := now();
  elsif not new.archived then
    new.ended_at := null;
  end if;
  return new;
end;
$$;

revoke all on function public.we_cards_ended_at() from public, anon, authenticated;

drop trigger if exists we_cards_ended_at on public.we_cards;
create trigger we_cards_ended_at
  before update of archived on public.we_cards
  for each row execute function public.we_cards_ended_at();

-- Same as we-week-miss.sql, plus: cards you left or that ended give their
-- finished nights up to the leave or end day (never an open night).
create or replace function public.my_we_nights()
returns table (card_id uuid, folder text, night date, status text, paused boolean, done boolean)
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as id),
  mine as (
    select c.id, c.cadence, c.weekdays, c.mode, c.starts_on, c.restarted_on, coalesce(m.folder, '') as folder,
      (c.cadence in ('monthly', 'every', 'deadline')
        or exists (select 1 from jsonb_array_elements(c.schedule_was) e(v)
                   where e.v ->> 'cadence' in ('monthly', 'every', 'deadline'))) as ever_open,
      greatest(c.starts_on, coalesce(m.joined_at, m.asked_at)::date, current_date - 400) as since,
      (m.state <> 'in') as i_left,
      -- The first night we_resettle settles again at the leave (we-monthly.sql):
      -- the slot before the one holding the day before the leave.
      case when m.left_at is not null then coalesce(
        public.we_slot_in(c, public.we_slot_in(c, m.left_at::date - 1) - 1),
        public.we_slot_in(c, m.left_at::date - 1), m.left_at::date - 1) end as kept_from,
      -- A day past the leave or end, for zones ahead of or behind UTC; nothing
      -- can be answered after it, so that day only holds what was done before.
      case when m.state <> 'in' or c.archived
        then least(coalesce(m.left_at::date, 'infinity'::date), coalesce(c.ended_at::date, 'infinity'::date)) + 1
        else 'infinity'::date end as upto
    from public.we_cards c
    join public.we_members m on m.card_id = c.id and m.user_id = (select id from me)
      and (m.state = 'in' or m.left_at is not null)
    where (not c.archived or c.ended_at is not null)
      and least(coalesce(m.left_at::date, 'infinity'::date), coalesce(c.ended_at::date, 'infinity'::date)) >= current_date - 401
  ),
  heard as (
    select mine.id, dd.night,
      exists (select 1 from public.we_answers x where x.card_id = mine.id and x.night = dd.night) as heard
    from mine
    join public.we_cards cc on cc.id = mine.id
    cross join lateral public.we_due_days(
      cc, greatest(mine.starts_on, mine.since - 7 * public.we_stale_nights()), least(current_date + 1, mine.upto)) as dd
  ),
  marked as (
    select h.id, h.night,
      count(*) filter (where h.heard) over w as heard_before,
      count(*) over w as due_before
    from heard h
    join mine on mine.id = h.id
    window w as (
      partition by h.id, h.night >= coalesce(mine.restarted_on, mine.starts_on)
      order by h.night
      rows between 3 preceding and 1 preceding
    )
  ),
  members as (
    select m.card_id, count(*) as total
    from public.we_members m
    where m.state = 'in' and m.card_id in (select id from mine)
    group by m.card_id
  ),
  dids as (
    select a.card_id, a.night, count(*) as dn
    from public.we_answers a
    join public.we_members m on m.card_id = a.card_id and m.user_id = a.user_id and m.state = 'in'
    where a.status = 'did' and a.card_id in (select id from mine) and a.night >= current_date - 401
    group by a.card_id, a.night
  )
  select s.card_id, s.folder, s.night, s.status,
    s.paused or (public.we_open(s.how) and not s.done and s.pend >= current_date)
      or (split_part(s.how, ':', 1) = 'per_week' and not s.done and s.night <> s.pend),
    s.done
  from (
  select r.card_id, r.folder, r.night, r.status, r.how, r.pend, r.paused, r.upto,
    r.day_done or (split_part(r.how, ':', 1) = 'per_week'
      and (select count(*) from public.we_done x
           where x.card_id = r.card_id and x.night between r.pend - 6 and r.pend
             and (not r.i_left or x.night < r.kept_from))
        >= split_part(r.how, ':', 2)::integer) as done
  from (
  select mine.id as card_id, mine.folder, dd.night, a.status, dd.how, dd.pend, mine.upto, mine.i_left, mine.kept_from,
    coalesce(k.due_before = public.we_stale_nights() and k.heard_before = 0, false) as paused,
    case
      when mine.mode = 'turns' then coalesce(a.status = 'did', false)
      -- Leaving settles recent nights again without you, so from there on only
      -- your own Did counts.
      when mine.i_left and dd.night >= mine.kept_from then coalesce(a.status = 'did', false)
      when dd.night < current_date - 1 then exists (select 1 from public.we_done x where x.card_id = mine.id and x.night = dd.night)
      when mine.mode = 'any' then coalesce(d.dn, 0) >= 1
      when mine.mode = 'most' then coalesce(t.total, 0) >= 2 and coalesce(d.dn, 0) * 2 > t.total
      else coalesce(t.total, 0) >= 2 and coalesce(d.dn, 0) = t.total
    end as day_done
  from mine
  join public.we_cards cc on cc.id = mine.id
  cross join lateral public.we_due_spans(
    cc, case when mine.ever_open then greatest(mine.starts_on - 31, mine.since - 366) else mine.since end,
    least(current_date + 1, mine.upto)) as dd
  left join marked k on k.id = mine.id and k.night = dd.night
  left join members t on t.card_id = mine.id
  left join dids d on d.card_id = mine.id and d.night = dd.night
  left join public.we_answers a
    on a.card_id = mine.id and a.user_id = (select id from me) and a.night = dd.night
  where (dd.night >= mine.since
      or (public.we_open(dd.how) and split_part(dd.how, ':', 1) <> 'per_week' and dd.pend >= mine.since))
    and (mine.mode <> 'turns'
      or (dd.night >= current_date - 1 and public.we_turn(mine.id, dd.night) = (select id from me))
      or (dd.night < current_date - 1
        and (a.status is not null
          or exists (select 1 from public.we_turns p
                     where p.card_id = mine.id and p.night = dd.night and p.user_id = (select id from me)))))
  ) r
  ) s
  where s.upto = 'infinity'::date or (s.done and s.night <= s.upto);
$$;

revoke all on function public.my_we_nights() from public, anon;
grant execute on function public.my_we_nights() to authenticated;

-- Words for the pushes, in every language the app has. Same list as
-- social-pushes.sql plus family_parent and family_removed.
create or replace function public.push_more_text(who uuid, key text, args jsonb default '{}'::jsonb)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lang text := coalesce((select p.prefs ->> 'locale' from public.profiles p where p.user_id = who), 'en');
  words jsonb := '{
    "en": {"we_closed": "{name} ended the Did we: {q}", "family_joined": "{name} joined your family.", "family_left": "{name} left your family.", "invite_used": "{name} joined Did I with your invite code.", "family_parent": "You are now a parent in {family}.", "family_removed": "You are no longer in {family}."},
    "de": {"we_closed": "{name} hat das Did we beendet: {q}", "family_joined": "{name} ist deiner Familie beigetreten.", "family_left": "{name} hat deine Familie verlassen.", "invite_used": "{name} ist Did I mit deinem Einladungscode beigetreten.", "family_parent": "Du bist jetzt Elternteil in {family}.", "family_removed": "Du bist nicht mehr in {family}."},
    "es": {"we_closed": "{name} terminó el Did we: {q}", "family_joined": "{name} se unió a tu familia.", "family_left": "{name} salió de tu familia.", "invite_used": "{name} se unió a Did I con tu código de invitación.", "family_parent": "Ahora eres padre en {family}.", "family_removed": "Ya no estás en {family}."},
    "fr": {"we_closed": "{name} a terminé le Did we : {q}", "family_joined": "{name} a rejoint ta famille.", "family_left": "{name} a quitté ta famille.", "invite_used": "{name} a rejoint Did I avec ton code d’invitation.", "family_parent": "Tu es maintenant responsable dans {family}.", "family_removed": "Tu n’es plus dans {family}."},
    "it": {"we_closed": "{name} ha chiuso il Did we: {q}", "family_joined": "{name} è entrato nella tua famiglia.", "family_left": "{name} ha lasciato la tua famiglia.", "invite_used": "{name} è entrato in Did I con il tuo codice invito.", "family_parent": "Ora sei genitore in {family}.", "family_removed": "Non sei più in {family}."},
    "ja": {"we_closed": "{name}さんが Did we を終了しました：{q}", "family_joined": "{name}さんが家族に参加しました。", "family_left": "{name}さんが家族から抜けました。", "invite_used": "{name}さんがあなたの招待コードで Did I に参加しました。", "family_parent": "{family} の親になりました。", "family_removed": "{family} から外れました。"},
    "ko": {"we_closed": "{name}님이 Did we를 끝냈어요: {q}", "family_joined": "{name}님이 가족에 들어왔어요.", "family_left": "{name}님이 가족에서 나갔어요.", "invite_used": "{name}님이 내 초대 코드로 Did I에 들어왔어요.", "family_parent": "{family}에서 부모가 되었어요.", "family_removed": "이제 {family}에 속해 있지 않아요."},
    "pt": {"we_closed": "{name} encerrou o Did we: {q}", "family_joined": "{name} entrou na sua família.", "family_left": "{name} saiu da sua família.", "invite_used": "{name} entrou no Did I com seu código de convite.", "family_parent": "Você agora é pai em {family}.", "family_removed": "Você não está mais em {family}."},
    "zh": {"we_closed": "{name} 结束了 Did we：{q}", "family_joined": "{name} 加入了你的家庭。", "family_left": "{name} 离开了你的家庭。", "invite_used": "{name} 用你的邀请码加入了 Did I。", "family_parent": "你现在是 {family} 的家长。", "family_removed": "你已不在 {family} 中。"}
  }'::jsonb;
  out text;
  k text;
begin
  out := coalesce(words -> lang ->> key, words -> 'en' ->> key, public.push_text(who, key, args));
  for k in select jsonb_object_keys(coalesce(args, '{}'::jsonb)) loop
    out := replace(out, '{' || k || '}', coalesce(args ->> k, ''));
  end loop;
  return out;
end;
$$;

revoke all on function public.push_more_text(uuid, text, jsonb) from public, anon, authenticated;

-- Someone made a parent tells them (a handoff when the last parent deletes
-- their account, or a parent's tap). Not for a change you made to yourself.
create or replace function public.queue_family_parent_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fam text := (select f.name from public.families f where f.id = new.family_id);
  words text;
begin
  if old.role = 'parent' or new.role <> 'parent' or fam is null
     or new.user_id is not distinct from (select auth.uid())
     or not public.push_wanted(new.user_id, 'family') then
    return new;
  end if;
  words := left(public.push_more_text(new.user_id, 'family_parent', jsonb_build_object('family', left(fam, 60))), 200);
  -- Made a parent again and again in one day: one push.
  -- Private pushes are stored with the open-the-app words instead.
  if exists (select 1 from public.push_queue q
             where q.to_id = new.user_id and q.go = '/people' and q.made_at > now() - interval '1 day'
               and (q.body = words
                 or (q.body = public.push_text(new.user_id, 'open') and q.from_id is not distinct from (select auth.uid())))) then
    return new;
  end if;
  insert into public.push_queue (to_id, from_id, title, body, go)
  values (new.user_id, (select auth.uid()), public.push_text(new.user_id, 'family'), words, '/people');
  return new;
end;
$$;

revoke all on function public.queue_family_parent_push() from public, anon, authenticated;

drop trigger if exists queue_family_parent_push on public.family_members;
create trigger queue_family_parent_push
  after update of role on public.family_members
  for each row execute function public.queue_family_parent_push();

-- Leaving a family tells the people still in it, as in social-pushes.sql.
-- New: a parent removing someone tells the person removed (not when the
-- family itself is deleted, and not without a signed in caller).
create or replace function public.queue_family_left_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fam text;
begin
  if old.user_id is distinct from (select auth.uid()) then
    fam := (select f.name from public.families f where f.id = old.family_id);
    -- Not after a block: removing them is part of it, and it says nothing.
    if (select auth.uid()) is not null and fam is not null
       and not public.blocked_with(old.user_id)
       and public.push_wanted(old.user_id, 'family') then
      insert into public.push_queue (to_id, from_id, title, body, go)
      values (old.user_id, (select auth.uid()), public.push_text(old.user_id, 'family'),
        left(public.push_more_text(old.user_id, 'family_removed', jsonb_build_object('family', left(fam, 60))), 200),
        '/people');
    end if;
    return old;
  end if;
  -- A parent deleting the whole family: the cascade is not a leave.
  if not exists (select 1 from public.families f where f.id = old.family_id) then
    return old;
  end if;
  insert into public.push_queue (to_id, from_id, title, body, go)
  select m.user_id, old.user_id, public.push_text(m.user_id, 'family'),
    left(public.push_more_text(m.user_id, 'family_left', jsonb_build_object(
      'name', public.push_name(old.user_id, m.user_id))), 200),
    '/people'
  from public.family_members m
  where m.family_id = old.family_id and m.user_id <> old.user_id
    and public.push_wanted(m.user_id, 'family');
  return old;
end;
$$;

revoke all on function public.queue_family_left_push() from public, anon, authenticated;

drop trigger if exists queue_family_left_push on public.family_members;
create trigger queue_family_left_push
  after delete on public.family_members
  for each row execute function public.queue_family_left_push();

notify pgrst, 'reload schema';
