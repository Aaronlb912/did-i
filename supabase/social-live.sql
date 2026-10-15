-- Other people's answers, live while the app is open.
-- Run after did-we.sql, send-answers.sql, blocks.sql and realtime.sql.
-- Safe to run again.
--
-- Each account listens on one private Realtime topic, 'didi:<user id>'.
-- When a Did we, family or Did you answer changes, a trigger sends a
-- broadcast to the people who can already read that answer today. The
-- broadcast carries no answer: only which kind changed and the card, family
-- or send id the person already holds. Their app then reads again through
-- the same functions and queries as before (we_tonight, family_answers,
-- send_answers_for), so what anyone sees is decided there, as today.
--
-- Who gets a broadcast mirrors those reads:
--   Did we:   members of the card who are in, or asked in the last
--             we_ask_days (we_tonight), on a card that is not archived.
--   Family:   everyone in the family (policy "see family answers").
--   Did you:  the sender, while the keeper shares answers, neither has
--             blocked the other, and they are still friends or family
--             (send_answers_for).
-- The person who answered is left out: their own devices see it through
-- their own sync.

-- Only you can join your own topic. No insert policy: clients cannot send.
create or replace function public.live_topic_mine(topic text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select auth.uid()) is not null and topic = 'didi:' || (select auth.uid())::text;
$$;

revoke all on function public.live_topic_mine(text) from public, anon;
grant execute on function public.live_topic_mine(text) to authenticated;


drop policy if exists "didi own topic" on realtime.messages;
create policy "didi own topic" on realtime.messages
  for select to authenticated
  using (extension = 'broadcast' and public.live_topic_mine((select realtime.topic())));

-- One broadcast per person. A miss never fails the answer that caused it.
create or replace function public.live_ping(who uuid[], kind text, ref uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  one uuid;
begin
  foreach one in array coalesce(who, '{}') loop
    begin
      perform realtime.send(jsonb_build_object('kind', kind, 'id', ref), 'live', 'didi:' || one::text, true);
    exception when others then
      null;
    end;
  end loop;
end;
$$;

revoke all on function public.live_ping(uuid[], text, uuid) from public, anon, authenticated;

-- Statement triggers with transition tables: a batch of answers sends one
-- broadcast per person and card, not one per row.

create or replace function public.live_we_answers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select c.card_id, array_agg(distinct m.user_id) as who
    from (select distinct card_id, user_id from changed) c
    join public.we_cards wc on wc.id = c.card_id and not wc.archived
    join public.we_members m on m.card_id = c.card_id and m.user_id <> c.user_id
    where m.state = 'in'
       or (m.state = 'asked' and m.asked_at > now() - make_interval(days => public.we_ask_days()))
    group by c.card_id
  loop
    perform public.live_ping(r.who, 'we', r.card_id);
  end loop;
  return null;
end;
$$;

create or replace function public.live_family_answers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select c.family_id, array_agg(distinct m.user_id) as who
    from (select distinct family_id, user_id from changed) c
    join public.family_members m on m.family_id = c.family_id and m.user_id <> c.user_id
    group by c.family_id
  loop
    perform public.live_ping(r.who, 'family', r.family_id);
  end loop;
  return null;
end;
$$;

create or replace function public.live_send_answers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select s.id, s.from_id
    from (select distinct send_id from changed) c
    join public.sends s on s.id = c.send_id
    where s.share_answers
      and not exists (
        select 1 from public.blocks b
        where (b.blocker = s.from_id and b.blocked = s.to_id)
           or (b.blocker = s.to_id and b.blocked = s.from_id)
      )
      and (
        exists (
          select 1 from public.friend_links f
          where f.state = 'ok'
            and ((f.from_id = s.from_id and f.to_id = s.to_id) or (f.from_id = s.to_id and f.to_id = s.from_id))
        )
        or exists (
          select 1 from public.family_members a
          join public.family_members b on b.family_id = a.family_id
          where a.user_id = s.from_id and b.user_id = s.to_id
        )
      )
  loop
    perform public.live_ping(array[r.from_id], 'send', r.id);
  end loop;
  return null;
end;
$$;

revoke all on function public.live_we_answers() from public, anon, authenticated;
revoke all on function public.live_family_answers() from public, anon, authenticated;
revoke all on function public.live_send_answers() from public, anon, authenticated;

drop trigger if exists live_we_ins on public.we_answers;
drop trigger if exists live_we_upd on public.we_answers;
drop trigger if exists live_we_del on public.we_answers;
create trigger live_we_ins after insert on public.we_answers
  referencing new table as changed for each statement execute function public.live_we_answers();
create trigger live_we_upd after update on public.we_answers
  referencing new table as changed for each statement execute function public.live_we_answers();
create trigger live_we_del after delete on public.we_answers
  referencing old table as changed for each statement execute function public.live_we_answers();

drop trigger if exists live_family_ins on public.family_answers;
drop trigger if exists live_family_upd on public.family_answers;
drop trigger if exists live_family_del on public.family_answers;
create trigger live_family_ins after insert on public.family_answers
  referencing new table as changed for each statement execute function public.live_family_answers();
create trigger live_family_upd after update on public.family_answers
  referencing new table as changed for each statement execute function public.live_family_answers();
create trigger live_family_del after delete on public.family_answers
  referencing old table as changed for each statement execute function public.live_family_answers();

drop trigger if exists live_send_ins on public.send_answers;
drop trigger if exists live_send_upd on public.send_answers;
drop trigger if exists live_send_del on public.send_answers;
create trigger live_send_ins after insert on public.send_answers
  referencing new table as changed for each statement execute function public.live_send_answers();
create trigger live_send_upd after update on public.send_answers
  referencing new table as changed for each statement execute function public.live_send_answers();
create trigger live_send_del after delete on public.send_answers
  referencing old table as changed for each statement execute function public.live_send_answers();

-- Your own undo, to your own devices. answer_log deletes are not published
-- (realtime.sql), so a short list of what went goes on your private topic.
-- A bulk delete (a prune of removed questions) sends nothing: those
-- questions are already gone on every device.
create or replace function public.live_answer_gone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select user_id, jsonb_agg(jsonb_build_object('lamp', lamp_id, 'period', period_key, 'at', answered_at, 'noteAt', note_at)) as gone, count(*) as n
    from changed
    group by user_id
  loop
    if r.n <= 20 then
      begin
        perform realtime.send(jsonb_build_object('kind', 'undo', 'gone', r.gone), 'live', 'didi:' || r.user_id::text, true);
      exception when others then
        null;
      end;
    end if;
  end loop;
  return null;
end;
$$;

revoke all on function public.live_answer_gone() from public, anon, authenticated;

drop trigger if exists live_answer_gone on public.answer_log;
create trigger live_answer_gone after delete on public.answer_log
  referencing old table as changed for each statement execute function public.live_answer_gone();

-- A new Did you for you: your inbox count reads again. You can already read
-- sends made to you; the broadcast carries only its id.
create or replace function public.live_new_sends()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select c.to_id, (array_agg(c.id))[1] as id
    from changed c
    where not exists (
      select 1 from public.blocks b
      where (b.blocker = c.from_id and b.blocked = c.to_id)
         or (b.blocker = c.to_id and b.blocked = c.from_id)
    )
    group by c.to_id
  loop
    perform public.live_ping(array[r.to_id], 'ask', r.id);
  end loop;
  return null;
end;
$$;

revoke all on function public.live_new_sends() from public, anon, authenticated;

drop trigger if exists live_new_sends on public.sends;
create trigger live_new_sends after insert on public.sends
  referencing new table as changed for each statement execute function public.live_new_sends();
