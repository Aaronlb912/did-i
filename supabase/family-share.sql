-- Family sharing fixes. Safe to run again. Runs last (new file).
--
-- 1. Someone taken out of a family (or who leaves it) comes off the Did we
--    cards that hold a kid they no longer share a family with, and their
--    asks to those cards are voided. This only enforces we_kid_ok, which
--    checked at make, ask and link-join time only. we_reply(yes) checks it
--    too now.
-- 2. we_drop(card, other): the person who made a card takes a member off it
--    (or voids a waiting ask). The same clean break as we_leave.
-- 3. Switching a card to "Show every answer" stamps who and when
--    (we_cards.shows_by, shows_at) and tells the other members once a day.
--    Widening means: to every answer, or off "count" to anything else.
--    we_tonight returns showsAt and showsByName for the line in the app, and
--    people[].joinedAt so the app can say who takes over when the maker leaves.
-- 4. we_tonight marks an ask older than 14 days: people[].expired. The app
--    reads it as expired and offers to ask again (we_ask already allows it).
-- 5. A kid's Did we or Did you link shows no name or photo to signed-out
--    viewers, or to a signed-in viewer who shares no family with the kid
--    (the link page and its preview). Nothing else about it changes.
-- 6. queue_we_left_push is redefined so the person who took someone off,
--    or removed them from a family, is not told "{name} left".
--
-- Redefines we_reply (did-we.sql), we_tonight (we-timing.sql),
-- look_up_we_link (we-link-already.sql), look_up_did_you_link
-- (did-you-links.sql) and push_more_text (leave-keep.sql).

-- 3: who widened what a card shows, and when ---------------------------

alter table public.we_cards add column if not exists shows_by uuid references auth.users on delete set null;
alter table public.we_cards add column if not exists shows_at timestamptz;
create index if not exists we_cards_shows_by_idx on public.we_cards (shows_by);

create or replace function public.we_cards_shows_stamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if ((new.shows = 'all' and old.shows <> 'all') or (old.shows = 'count' and new.shows <> 'count'))
     and (select auth.uid()) is not null then
    new.shows_by := (select auth.uid());
    new.shows_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.we_cards_shows_stamp() from public, anon, authenticated;

drop trigger if exists we_cards_shows_stamp on public.we_cards;
create trigger we_cards_shows_stamp
  before update of shows on public.we_cards
  for each row execute function public.we_cards_shows_stamp();

-- Words for the pushes: leave-keep.sql plus we_shows_all and we_shows_waiting.
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
    "en": {"we_closed": "{name} ended the Did we: {q}", "family_joined": "{name} joined your family.", "family_left": "{name} left your family.", "invite_used": "{name} joined Did I with your invite code.", "family_parent": "You are now a parent in {family}.", "family_removed": "You are no longer in {family}.", "we_shows_all": "{name} set it to show every answer: {q}", "we_shows_waiting": "{name} set it to show who did it: {q}"},
    "de": {"we_closed": "{name} hat das Did we beendet: {q}", "family_joined": "{name} ist deiner Familie beigetreten.", "family_left": "{name} hat deine Familie verlassen.", "invite_used": "{name} ist Did I mit deinem Einladungscode beigetreten.", "family_parent": "Du bist jetzt Elternteil in {family}.", "family_removed": "Du bist nicht mehr in {family}.", "we_shows_all": "{name} hat eingestellt, dass jede Antwort sichtbar ist: {q}", "we_shows_waiting": "{name} hat eingestellt, dass man sieht, wer es geschafft hat: {q}"},
    "es": {"we_closed": "{name} terminó el Did we: {q}", "family_joined": "{name} se unió a tu familia.", "family_left": "{name} salió de tu familia.", "invite_used": "{name} se unió a Did I con tu código de invitación.", "family_parent": "Ahora eres padre en {family}.", "family_removed": "Ya no estás en {family}.", "we_shows_all": "{name} lo configuró para mostrar todas las respuestas: {q}", "we_shows_waiting": "{name} lo configuró para mostrar quién lo hizo: {q}"},
    "fr": {"we_closed": "{name} a terminé le Did we : {q}", "family_joined": "{name} a rejoint ta famille.", "family_left": "{name} a quitté ta famille.", "invite_used": "{name} a rejoint Did I avec ton code d’invitation.", "family_parent": "Tu es maintenant responsable dans {family}.", "family_removed": "Tu n’es plus dans {family}.", "we_shows_all": "{name} l’a réglé pour montrer toutes les réponses : {q}", "we_shows_waiting": "{name} l’a réglé pour montrer qui l’a fait : {q}"},
    "it": {"we_closed": "{name} ha chiuso il Did we: {q}", "family_joined": "{name} è entrato nella tua famiglia.", "family_left": "{name} ha lasciato la tua famiglia.", "invite_used": "{name} è entrato in Did I con il tuo codice invito.", "family_parent": "Ora sei genitore in {family}.", "family_removed": "Non sei più in {family}.", "we_shows_all": "{name} ha impostato la vista su tutte le risposte: {q}", "we_shows_waiting": "{name} ha impostato la vista su chi l’ha fatto: {q}"},
    "ja": {"we_closed": "{name}さんが Did we を終了しました：{q}", "family_joined": "{name}さんが家族に参加しました。", "family_left": "{name}さんが家族から抜けました。", "invite_used": "{name}さんがあなたの招待コードで Did I に参加しました。", "family_parent": "{family} の親になりました。", "family_removed": "{family} から外れました。", "we_shows_all": "{name}さんが全員の答えを表示する設定にしました：{q}", "we_shows_waiting": "{name}さんが誰がやったかを表示する設定にしました：{q}"},
    "ko": {"we_closed": "{name}님이 Did we를 끝냈어요: {q}", "family_joined": "{name}님이 가족에 들어왔어요.", "family_left": "{name}님이 가족에서 나갔어요.", "invite_used": "{name}님이 내 초대 코드로 Did I에 들어왔어요.", "family_parent": "{family}에서 부모가 되었어요.", "family_removed": "이제 {family}에 속해 있지 않아요.", "we_shows_all": "{name}님이 모든 답을 보이게 설정했어요: {q}", "we_shows_waiting": "{name}님이 누가 했는지 보이게 설정했어요: {q}"},
    "pt": {"we_closed": "{name} encerrou o Did we: {q}", "family_joined": "{name} entrou na sua família.", "family_left": "{name} saiu da sua família.", "invite_used": "{name} entrou no Did I com seu código de convite.", "family_parent": "Você agora é pai em {family}.", "family_removed": "Você não está mais em {family}.", "we_shows_all": "{name} configurou para mostrar todas as respostas: {q}", "we_shows_waiting": "{name} configurou para mostrar quem fez: {q}"},
    "zh": {"we_closed": "{name} 结束了 Did we：{q}", "family_joined": "{name} 加入了你的家庭。", "family_left": "{name} 离开了你的家庭。", "invite_used": "{name} 用你的邀请码加入了 Did I。", "family_parent": "你现在是 {family} 的家长。", "family_removed": "你已不在 {family} 中。", "we_shows_all": "{name} 设置为显示所有回答：{q}", "we_shows_waiting": "{name} 设置为显示谁完成了：{q}"}
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

-- Tells the other members, once a day per card, not a blocked pair, not when
-- the we pings are off. old.shows_at is the last time it widened.
create or replace function public.queue_we_shows_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
begin
  if not ((new.shows = 'all' and old.shows <> 'all') or (old.shows = 'count' and new.shows <> 'count'))
     or who is null
     or (old.shows_at is not null and old.shows_at > now() - interval '1 day') then
    return new;
  end if;
  insert into public.push_queue (to_id, from_id, title, body, go)
  select m.user_id, who, 'Did we',
    left(public.push_more_text(m.user_id,
      case when new.shows = 'all' then 'we_shows_all' else 'we_shows_waiting' end,
      jsonb_build_object(
      'name', public.push_name(who, m.user_id),
      'q', left(new.question, 120))), 200),
    '/tonight'
  from public.we_members m
  where m.card_id = new.id and m.state = 'in' and m.user_id <> who
    and not exists (select 1 from public.blocks b
                    where (b.blocker = who and b.blocked = m.user_id)
                       or (b.blocker = m.user_id and b.blocked = who))
    and public.push_wanted(m.user_id, 'we');
  return new;
end;
$$;

revoke all on function public.queue_we_shows_push() from public, anon, authenticated;

drop trigger if exists queue_we_shows_push on public.we_cards;
create trigger queue_we_shows_push
  after update of shows on public.we_cards
  for each row execute function public.queue_we_shows_push();

-- Copied from we-left-push.sql, plus: the person who tapped Take off or
-- removed someone from a family is not told. The person taken off is never
-- told either (only members still in get it). The trigger stays as it is.
create or replace function public.queue_we_left_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.state <> 'in' or new.state <> 'left' then
    return new;
  end if;
  insert into public.push_queue (to_id, from_id, title, body, go)
  select m.user_id, new.user_id, 'Did we',
    left(public.push_text(m.user_id, 'we_left', jsonb_build_object(
      'name', public.push_name(new.user_id, m.user_id),
      'q', left(c.question, 120))), 200),
    '/tonight'
  from public.we_cards c
  join public.we_members m on m.card_id = c.id and m.state = 'in' and m.user_id <> new.user_id
  where c.id = new.card_id
    and not exists (select 1 from public.blocks b
                    where (b.blocker = new.user_id and b.blocked = m.user_id)
                       or (b.blocker = m.user_id and b.blocked = new.user_id))
    and (exists (select 1 from public.friend_links f
                 where f.state = 'ok'
                   and ((f.from_id = new.user_id and f.to_id = m.user_id)
                     or (f.from_id = m.user_id and f.to_id = new.user_id)))
         or public.shares_family_of(new.user_id, m.user_id))
    and m.user_id is distinct from (select auth.uid())
    and public.push_wanted(m.user_id, 'we');
  return new;
end;
$$;

revoke all on function public.queue_we_left_push() from public, anon, authenticated;

-- 1 and 2: taking someone off a card -----------------------------------

-- The clean break from a card for someone other than the caller, copied
-- from we_leave (did-we.sql): a waiting ask is voided, a member goes to
-- left (leave-keep.sql keeps their days), the card passes on if they made
-- it, and ends if nobody is left. The caller holds the card lock.
create or replace function public.we_take_off(card uuid, other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  heir uuid;
begin
  if exists (select 1 from public.we_members where card_id = card and user_id = other and state = 'asked') then
    update public.we_members set state = 'left'
    where card_id = card and user_id = other and state = 'asked';
    return;
  end if;
  if not exists (select 1 from public.we_members where card_id = card and user_id = other and state = 'in') then
    return;
  end if;
  perform public.we_pin_turns(card, current_date - 1, current_date + 1);
  update public.we_members set state = 'left'
  where card_id = card and user_id = other and state = 'in';
  select user_id into heir from public.we_members
  where card_id = card and state = 'in'
  order by joined_at nulls last
  limit 1;
  if heir is null then
    update public.we_cards set archived = true where id = card;
  else
    if (select made_by from public.we_cards where id = card) = other then
      update public.we_cards set made_by = heir where id = card;
    end if;
    perform public.we_resettle(card);
  end if;
end;
$$;

revoke all on function public.we_take_off(uuid, uuid) from public, anon, authenticated;

-- The person who made the card takes someone off it. Anyone else is refused.
create or replace function public.we_drop(card uuid, other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  perform pg_advisory_xact_lock(hashtext('we_card:' || card::text));
  if not exists (select 1 from public.we_cards c where c.id = card and c.made_by = who and not c.archived) then
    raise exception 'only the person who made it can change it';
  end if;
  if other = who then
    return;
  end if;
  perform public.we_take_off(card, other);
end;
$$;

revoke all on function public.we_drop(uuid, uuid) from public, anon;
grant execute on function public.we_drop(uuid, uuid) to authenticated;

-- A person out of a family comes off every card that now breaks the kid
-- rule for them: a card holding a kid they no longer share a family with.
-- Cards with no kid are not touched. A trigger, so every way out is covered
-- (a parent removing them, leaving, a deleted family).
create or replace function public.drop_kid_cards_on_family_leave()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c uuid;
begin
  for c in
    select m.card_id from public.we_members m
    join public.we_cards k on k.id = m.card_id and not k.archived
    where m.user_id = old.user_id
      and (m.state = 'in'
        or (m.state = 'asked' and m.asked_at > now() - make_interval(days => public.we_ask_days())))
  loop
    if not public.we_kid_ok(c, old.user_id) then
      perform pg_advisory_xact_lock(hashtext('we_card:' || c::text));
      perform public.we_take_off(c, old.user_id);
    end if;
  end loop;
  return old;
end;
$$;

revoke all on function public.drop_kid_cards_on_family_leave() from public, anon, authenticated;

drop trigger if exists drop_kid_cards_on_family_leave on public.family_members;
create trigger drop_kid_cards_on_family_leave
  after delete on public.family_members
  for each row execute function public.drop_kid_cards_on_family_leave();

-- Copied from did-we.sql, plus the kid rule when saying yes: an ask that
-- was fine when sent is not taken up once the family changed.
create or replace function public.we_reply(card uuid, yes boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
begin
  if yes then
    if (select count(*) from public.we_cards c
        join public.we_members m on m.card_id = c.id and m.user_id = who and m.state = 'in'
        where not c.archived) >= public.we_max_cards() then
      raise exception 'too many shared questions';
    end if;
    -- Same lock as we_answer, so a join and an answer never settle at once.
    perform pg_advisory_xact_lock(hashtext('we_card:' || card::text));
    if not public.we_kid_ok(card, who) then
      raise exception 'kid card is family only';
    end if;
    perform public.we_pin_turns(card, current_date - 1, current_date + 1);
    update public.we_members
    set state = 'in', joined_at = now()
    where card_id = card and user_id = who and state = 'asked'
      and asked_at > now() - make_interval(days => public.we_ask_days());
    if not found then
      raise exception 'that ask has closed';
    end if;
    perform public.we_resettle(card);
  else
    -- Kept, not deleted, so we_said_no_lately can hold the no.
    update public.we_members set state = 'left', said_no_at = now()
    where card_id = card and user_id = who and state = 'asked';
  end if;
end;
$$;

revoke all on function public.we_reply(uuid, boolean) from public;
grant execute on function public.we_reply(uuid, boolean) to authenticated;

-- 4: we_tonight, copied from we-timing.sql, plus showsAt, showsByName and
-- people[].expired and joinedAt ------------------------------------------------------

create or replace function public.we_tonight(on_night date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with me as (select (select auth.uid()) as id),
  mine as (
    select m.card_id, m.state, m.folder, m.topics
    from public.we_members m, me
    where m.user_id = me.id
      and (m.state = 'in'
        or (m.state = 'asked' and m.asked_at > now() - make_interval(days => public.we_ask_days())))
  ),
  cards0 as (
    select c.*, mine.state as my_state, mine.folder as my_folder, mine.topics as my_topics,
      t.slot,
      public.we_due_in(c, on_night) as due_now,
      public.we_due_in(c, t.slot) as slot_due,
      sc.how as how_now, sc.starts as starts_now, sc.days as days_now,
      (select coalesce(nullif(btrim(mp.display_name), ''), '@' || coalesce(mp.handle, ''))
         from public.profiles mp where mp.user_id = c.made_by) as maker_name,
      (select coalesce(nullif(btrim(cp.display_name), ''), '@' || coalesce(cp.handle, ''))
         from public.profiles cp where cp.user_id = c.changed_by) as changed_by_name,
      (select coalesce(nullif(btrim(sp.display_name), ''), '@' || coalesce(sp.handle, ''))
         from public.profiles sp where sp.user_id = c.shows_by) as shows_by_name,
      st.streak as my_streak, st.best as my_best
    from public.we_cards c
    join mine on mine.card_id = c.id
    cross join lateral (select public.we_target_in(c, on_night) as slot) t
    left join lateral public.we_sched(c, on_night) sc on true
    cross join lateral public.we_streaks(case when mine.state = 'in' then c.id end, on_night) st
    where not c.archived
  ),
  cards as (
    select c.*,
      split_part(coalesce(c.how_now, ''), ':', 1) = 'per_week' as weekly_n,
      case when split_part(coalesce(c.how_now, ''), ':', 1) = 'per_week'
        then public.we_week_dids(c.id, on_night) end as week_dids
    from cards0 c
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'question', c.question,
    'mode', c.mode,
    'shows', c.shows,
    'cadence', c.cadence,
    'weekdays', c.weekdays,
    'everyDays', c.every_days,
    'everyAnchor', c.every_anchor,
    'perWeek', c.per_week,
    'monthDay', c.month_day,
    'onceOn', c.once_on,
    'dueBy', c.due_by,
    'how', c.how_now,
    'goal', c.goal_nights,
    'askAfter', c.ask_after,
    'remind', c.remind,
    'note', c.note,
    'startsOn', c.starts_on,
    'scheduleFrom', c.schedule_from,
    'changedBy', c.changed_by,
    'changedAt', c.changed_at,
    'priorCadence', c.prior_cadence,
    'changedByName', c.changed_by_name,
    'showsAt', c.shows_at,
    'showsByName', c.shows_by_name,
    'periodStart', case
      when c.slot is null then null
      when c.weekly_n then public.we_period_end(c.starts_now, c.how_now, c.days_now, c.slot) - 6
      else c.slot end,
    'periodEnd', case when c.slot is null then null
      else public.we_period_end(c.starts_now, c.how_now, c.days_now, c.slot) end,
    'weekDids', c.week_dids,
    'makerName', c.maker_name,
    'maker_name', c.maker_name,
    'mine', c.made_by = (select id from me),
    'myState', c.my_state,
    'folder', c.my_folder,
    'topics', c.my_topics,
    'slot', c.slot,
    'due', case when c.weekly_n then c.due_now and c.week_dids < c.per_week
      else c.due_now
        or coalesce(c.slot < on_night
          and c.slot_due
          and not exists (select 1 from public.we_done d where d.card_id = c.id and d.night = c.slot), false) end,
    'paused', c.my_state = 'in' and public.we_paused(c.id, coalesce(c.slot, on_night)),
    'done', exists (select 1 from public.we_done d where d.card_id = c.id and d.night = c.slot)
      or (c.weekly_n and c.week_dids >= c.per_week),
    'turn', case when c.mode = 'turns' then public.we_turn(c.id, c.slot) end,
    'dids', (select count(*) from public.we_answers a
             join public.we_members m2 on m2.card_id = a.card_id and m2.user_id = a.user_id and m2.state = 'in'
             where a.card_id = c.id and a.night = c.slot and a.status = 'did'),
    'askedBy', (select coalesce(nullif(btrim(p.display_name), ''), '') from public.we_members m3
                join public.profiles p on p.user_id = m3.asked_by
                where m3.card_id = c.id and m3.user_id = (select id from me)),
    'streak', c.my_streak,
    'best', c.my_best,
    'finish', (select jsonb_build_object('by', d.finisher, 'cheer', d.finisher_cheer)
               from public.we_done d where d.card_id = c.id and d.night = c.slot),
    'doneNights', (select coalesce(jsonb_agg(d.night order by d.night desc), '[]'::jsonb)
                   from (select night from public.we_done d
                         where d.card_id = c.id order by night desc limit 400) d),
    'people', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.user_id,
        'name', coalesce(nullif(btrim(p.display_name), ''), '@' || coalesce(p.handle, '')),
        'buddy', coalesce(p.buddy_on, ''),
        'cheer', coalesce(p.badge_cheer, ''),
        'state', m.state,
        'joinedAt', m.joined_at,
        'expired', m.state = 'asked' and m.asked_at <= now() - make_interval(days => public.we_ask_days()),
        'turn', m.turn,
        'me', m.user_id = (select id from me),
        'status', case
          when m.user_id = (select id from me) then a.status
          when c.shows = 'all' then a.status
          when c.shows = 'waiting' and a.status = 'did' then 'did'
          else null
        end,
        'nudged', exists (select 1 from public.we_nudges n
                          where n.card_id = c.id and n.night = on_night
                            and n.from_id = (select id from me) and n.to_id = m.user_id)
      ) order by m.turn, m.asked_at), '[]'::jsonb)
      from public.we_members m
      left join public.profiles p on p.user_id = m.user_id
      left join public.we_answers a on a.card_id = m.card_id and a.user_id = m.user_id and a.night = c.slot
      where m.card_id = c.id and m.state in ('in', 'asked')
        and (c.shows <> 'count' or m.user_id = (select id from me) or c.my_state = 'asked')
    )
  ) order by c.made_at), '[]'::jsonb)
  from cards c;
$$;

revoke all on function public.we_tonight(date) from public, anon;
grant execute on function public.we_tonight(date) to authenticated;

-- 5: a kid's link shows no name or photo to someone signed out or outside the family --

create or replace function public.link_maker_hidden(maker uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.family_members k where k.user_id = maker and k.role = 'kid')
    and ((select auth.uid()) is null or not public.shares_family_of((select auth.uid()), maker));
$$;

revoke all on function public.link_maker_hidden(uuid) from public, anon, authenticated;

-- Copied from we-link-already.sql: name and avatar_url come back null for a
-- signed out viewer when the link was made by a kid.
create or replace function public.look_up_we_link(code text)
returns table (question text, name text, avatar_url text, people integer, full_up boolean, blocked boolean, already boolean)
language sql
stable
security definer
set search_path = public
as $$
  select c.question,
    case when public.link_maker_hidden(l.made_by) then null
      else coalesce(nullif(p.display_name, ''), nullif('@' || coalesce(p.handle, ''), '@')) end,
    case when public.link_maker_hidden(l.made_by) then null else nullif(p.avatar_url, '') end,
    (select count(*)::int from public.we_members m where m.card_id = c.id and m.state = 'in'),
    (select count(*) from public.we_members m where m.card_id = c.id
      and (m.state = 'in' or (m.state = 'asked' and m.asked_at > now() - make_interval(days => public.we_ask_days()))))
      >= public.we_max_members(),
    (select auth.uid()) is not null and exists (
      select 1 from public.blocks b
      where (b.blocker = l.made_by and b.blocked = (select auth.uid()))
         or (b.blocker = (select auth.uid()) and b.blocked = l.made_by)),
    (select auth.uid()) is not null and exists (
      select 1 from public.we_members m
      where m.card_id = c.id and m.user_id = (select auth.uid()) and m.state = 'in')
  from public.we_links l
  join public.we_cards c on c.id = l.card_id and not c.archived
  left join public.profiles p on p.user_id = l.made_by
  where l.code = lower(btrim(look_up_we_link.code)) and not l.ended and l.ends_at > now()
    -- A link stops when the person who made it is no longer on the card.
    and exists (select 1 from public.we_members mm where mm.card_id = l.card_id and mm.user_id = l.made_by and mm.state = 'in')
  limit 1;
$$;

revoke all on function public.look_up_we_link(text) from public;
grant execute on function public.look_up_we_link(text) to anon, authenticated;

-- Copied from did-you-links.sql, with the same rule.
create or replace function public.look_up_did_you_link(code text)
returns table (question text, name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select l.question,
    case when l.made_by is null or public.link_maker_hidden(l.made_by) then null
         else coalesce(nullif(p.display_name, ''), nullif('@' || coalesce(p.handle, ''), '@')) end,
    case when l.made_by is null or public.link_maker_hidden(l.made_by) then null else nullif(p.avatar_url, '') end
  from public.did_you_links l
  left join public.profiles p on p.user_id = l.made_by
  where l.code = lower(btrim(look_up_did_you_link.code)) and not l.ended
    and public.did_you_link_open(l.made_by, l.made_at)
  limit 1;
$$;

revoke all on function public.look_up_did_you_link(text) from public;
grant execute on function public.look_up_did_you_link(text) to anon, authenticated;

notify pgrst, 'reload schema';
