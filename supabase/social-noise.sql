-- Social noise pass (docs/ux-loop.md, 2026-11-06).
-- Apply after push-private-edit.sql. Each function is the latest copy with one change.

-- Five cheers in two minutes are one push: inbox pushes match on the path, not the cheer id.
create or replace function public.push_once()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.push_queue q
      where q.to_id = new.to_id and q.sent_at is null and q.body = new.body and q.title = new.title
        and q.from_id is not distinct from new.from_id
        and (q.go is not distinct from new.go
          or (split_part(q.go, '?', 1) = '/inbox' and split_part(new.go, '?', 1) = '/inbox'))
        and q.made_at > now() - interval '2 minutes') then
    update public.push_to_counts set n = n - 1
    where to_id = new.to_id and hour = date_trunc('hour', now()) and n > 0;
    return null;
  end if;
  return new;
end;
$$;
revoke all on function public.push_once() from public, anon, authenticated;

-- Waiting cheers no longer fill the 20-waiting cap, so a daily cheerer can still send Did yous.
create or replace function public.cap_sends()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  open_now integer;
  made_today integer;
begin
  select count(*) into open_now
  from public.sends
  where from_id = new.from_id and to_id = new.to_id and state = 'sent' and kind <> 'cheer';
  if open_now >= 20 then
    raise exception 'too many waiting for an answer';
  end if;
  insert into public.send_counts as c (from_id, to_id, day, n)
  values (new.from_id, new.to_id, current_date, 1)
  on conflict (from_id, to_id, day) do update set n = c.n + 1
  returning c.n into made_today;
  if made_today > 30 then
    raise exception 'too many today';
  end if;
  -- Yesterday and older no longer count. All of the sender's old rows go, so
  -- a friend they stopped sending to does not leave a row behind for good.
  delete from public.send_counts
  where from_id = new.from_id and day < current_date;
  return new;
end;
$$;

-- Quiet hours no longer end in a burst of yesterday's Did we pushes.
create or replace function public.take_push_batch(how_many integer default 50)
returns table (id bigint, to_id uuid, title text, body text, go text, send_id uuid, tokens text[])
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_queue q
  using public.profiles p
  where q.sent_at is null
    and q.go = '/people'
    and p.user_id = q.to_id
    and public.push_quiet(p.prefs, p.zone);

  delete from public.push_queue q
  where q.sent_at is null
    and q.title = 'Did we'
    and q.go = '/tonight'
    and q.made_at < now() - interval '12 hours';

  return query
  with picked as (
    update public.push_queue q
    set sent_at = now()
    where q.id in (
      select q2.id from public.push_queue q2
      where q2.sent_at is null
        and not coalesce(
          (select public.push_quiet(p.prefs, p.zone) from public.profiles p where p.user_id = q2.to_id),
          false
        )
      order by q2.made_at
      limit greatest(1, least(how_many, 200))
      for update skip locked
    )
    returning q.id, q.to_id, q.title, q.body, q.go, q.send_id
  )
  select p.id, p.to_id, p.title, p.body, p.go, p.send_id,
         coalesce(array_agg(d.push_token) filter (where d.push_token is not null), '{}')
  from picked p
  left join public.devices d on d.user_id = p.to_id and d.push_token is not null
  group by p.id, p.to_id, p.title, p.body, p.go, p.send_id;
end;
$$;
revoke all on function public.take_push_batch(integer) from public;
revoke all on function public.take_push_batch(integer) from anon;
revoke all on function public.take_push_batch(integer) from authenticated;

-- The person whose Did finished the card is not told "Done together" about their own tap.
create or replace function public.we_settle(card uuid, on_night date)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  now_done boolean := public.we_is_done(card, on_night);
  was_done boolean := exists (select 1 from public.we_done where card_id = card and night = on_night);
  q text;
  first_time boolean;
begin
  if now_done and not was_done then
    -- The finisher is whoever said the Did that finished it. A join, leave or
    -- edit that tips the night over credits nobody.
    insert into public.we_done (card_id, night, finisher, finisher_cheer)
    select card, on_night, f.who, left(coalesce(p.badge_cheer, ''), 24)
    from (
      select case when exists (
        select 1 from public.we_answers a
        where a.card_id = card and a.night = on_night
          and a.user_id = (select auth.uid()) and a.status = 'did'
      ) then (select auth.uid()) end as who
    ) f
    left join public.profiles p on p.user_id = f.who
    on conflict do nothing;
    -- Did, undo, Did again: the push only goes out the first time.
    insert into public.we_done_pushed (card_id, night) values (card, on_night)
    on conflict do nothing;
    get diagnostics first_time = row_count;
    if first_time then
      select question into q from public.we_cards where id = card;
      insert into public.push_queue (to_id, title, body, go)
      select m.user_id, 'Did we', left(public.push_text(m.user_id, 'we_done', jsonb_build_object('q', left(q, 120))), 200), '/tonight'
      from public.we_members m
      where m.card_id = card and m.state = 'in' and public.push_wanted(m.user_id, 'we')
        and m.user_id is distinct from (select auth.uid());
    end if;
  elsif was_done and not now_done then
    delete from public.we_done where card_id = card and night = on_night;
  end if;
  return now_done;
end;
$$;
revoke all on function public.we_settle(uuid, date) from public, anon, authenticated;
