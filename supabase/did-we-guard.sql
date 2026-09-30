-- Guards around Did we and Did you: blocking and unfriending clear shared
-- cards, reports, and pushes that keep the question off the lock screen.
-- Apply after blocks.sql, push.sql, did-we.sql and did-you-repeat.sql.
-- Safe to run again.

-- Blocking is a clean break --------------------------------------------

-- The blocker leaves every card they share with the blocked person (the
-- other people keep the card), and any ask either way is dropped.
-- Runs as the blocker, so we_leave acts for them.
create or replace function public.we_on_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  shared uuid;
begin
  delete from public.we_members m
  where m.state = 'asked'
    and ((m.user_id = new.blocked and m.asked_by = new.blocker)
      or (m.user_id = new.blocker and m.asked_by = new.blocked));
  if (select auth.uid()) is distinct from new.blocker then
    return new;
  end if;
  for shared in
    select mine.card_id
    from public.we_members mine
    join public.we_members them on them.card_id = mine.card_id
      and them.user_id = new.blocked and them.state in ('in', 'asked')
    where mine.user_id = new.blocker and mine.state = 'in'
  loop
    perform public.we_leave(shared);
  end loop;
  return new;
end;
$$;

revoke all on function public.we_on_block() from public;

drop trigger if exists we_on_block on public.blocks;
create trigger we_on_block
  after insert on public.blocks
  for each row execute function public.we_on_block();

-- Unfriending drops asks still waiting between the two of you, unless you
-- share a family. Cards you are both on stay; either of you can leave.
create or replace function public.we_on_unfriend()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.family_members a
    join public.family_members b on b.family_id = a.family_id
    where a.user_id = old.from_id and b.user_id = old.to_id
  ) then
    return old;
  end if;
  delete from public.we_members m
  where m.state = 'asked'
    and ((m.user_id = old.to_id and m.asked_by = old.from_id)
      or (m.user_id = old.from_id and m.asked_by = old.to_id));
  return old;
end;
$$;

revoke all on function public.we_on_unfriend() from public;

drop trigger if exists we_on_unfriend on public.friend_links;
create trigger we_on_unfriend
  after delete on public.friend_links
  for each row execute function public.we_on_unfriend();

-- Reports ---------------------------------------------------------------

-- Report a Did we card you are on or were asked to. It is filed about the
-- person who asked you (or the owner), with the question for context, and
-- that person is blocked: nobody reviews reports, so the report itself has
-- to be what protects you. Blocking also takes you off the shared cards.
create or replace function public.report_we(card uuid, why text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  about uuid;
  q text;
begin
  select coalesce(m.asked_by, c.made_by), c.question into about, q
  from public.we_members m
  join public.we_cards c on c.id = m.card_id
  where m.card_id = card and m.user_id = me;
  if not found then
    raise exception 'not on this card';
  end if;
  if about = me then
    select made_by into about from public.we_cards where id = card;
  end if;
  insert into public.reports (from_id, about_id, reason)
  values (me, nullif(about, me), left('did we: ' || q || coalesce(' / ' || nullif(btrim(why), ''), ''), 500));
  if about is not null and about <> me then
    perform public.block_person(about, '');
  end if;
end;
$$;

revoke all on function public.report_we(uuid, text) from public;
grant execute on function public.report_we(uuid, text) to authenticated;

-- Report a Did you sent to you, and block the sender (which also clears
-- what they sent you).
create or replace function public.report_send(send uuid, why text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  who uuid;
  q text;
begin
  select s.from_id, s.question into who, q
  from public.sends s where s.id = send and s.to_id = me;
  if not found then
    raise exception 'not yours';
  end if;
  insert into public.reports (from_id, about_id, reason)
  values (me, who, left('did you: ' || q || coalesce(' / ' || nullif(btrim(why), ''), ''), 500));
  perform public.block_person(who, '');
end;
$$;

revoke all on function public.report_send(uuid, text) from public;
grant execute on function public.report_send(uuid, text) to authenticated;

-- Twenty reports a day from one person, however they are filed.
create or replace function public.cap_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.reports r
      where r.from_id = new.from_id and r.made_at > now() - interval '1 day') >= 20 then
    raise exception 'too many reports today';
  end if;
  return new;
end;
$$;

revoke all on function public.cap_reports() from public;

drop trigger if exists cap_reports on public.reports;
create trigger cap_reports
  before insert on public.reports
  for each row execute function public.cap_reports();

-- Private pushes --------------------------------------------------------

-- prefs.pingsPrivate: the lock screen says who, never what. Every push goes
-- through push_queue, so this covers them all.
create or replace function public.push_private()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((select (p.prefs ->> 'pingsPrivate') = 'true' from public.profiles p where p.user_id = new.to_id), false) then
    new.body := 'Open Did I to see it.';
  end if;
  return new;
end;
$$;

revoke all on function public.push_private() from public;

drop trigger if exists push_private on public.push_queue;
create trigger push_private
  before insert on public.push_queue
  for each row execute function public.push_private();
