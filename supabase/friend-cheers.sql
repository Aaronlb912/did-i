-- One gem buys five cheers. They sit on friend_cheers until a cheer
-- spends one. Friend cheers and family cheers spend the same balance.
--
-- Apply this with the app that calls these functions. The old app
-- inserts cheers itself, and this file stops that insert.

alter table public.profiles
  add column if not exists friend_cheers integer not null default 0;

alter table public.profiles drop constraint if exists profiles_friend_cheers_rng;
alter table public.profiles add constraint profiles_friend_cheers_rng
  check (friend_cheers between 0 and 20);

-- A profile write from the phone cannot mint cheers.
create or replace function public.keep_friend_cheers()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.friend_cheers is distinct from old.friend_cheers
     and current_setting('did_i.friend_cheer', true) is distinct from '1' then
    new.friend_cheers := old.friend_cheers;
  end if;
  return new;
end;
$$;

drop trigger if exists keep_friend_cheers on public.profiles;
create trigger keep_friend_cheers
  before update of friend_cheers on public.profiles
  for each row execute function public.keep_friend_cheers();

-- Client inserts of kind cheer are refused. The functions below set
-- the flag in the same transaction as the insert.
create or replace function public.guard_cheer_send()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.kind = 'cheer'
     and current_setting('did_i.cheer_send', true) is distinct from '1' then
    raise exception 'cheer goes through the pack';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_cheer_send on public.sends;
create trigger guard_cheer_send
  before insert on public.sends
  for each row execute function public.guard_cheer_send();

create or replace function public.buy_friend_cheers()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  bal integer;
  held integer;
begin
  if who is null then
    raise exception 'not signed in';
  end if;

  select p.gem_balance, p.friend_cheers
    into bal, held
  from public.profiles p
  where p.user_id = who
  for update;

  if bal is null then
    raise exception 'not signed in';
  end if;
  if bal < 1 then
    raise exception 'need gems';
  end if;
  if held + 5 > 20 then
    raise exception 'cheer cap';
  end if;

  perform set_config('did_i.friend_cheer', '1', true);
  update public.profiles
    set gem_balance = bal - 1,
        friend_cheers = held + 5
    where user_id = who
    returning gem_balance, friend_cheers into bal, held;

  return jsonb_build_object('gems', bal, 'cheers', held);
end;
$$;

revoke all on function public.buy_friend_cheers() from public;
revoke all on function public.buy_friend_cheers() from anon;
grant execute on function public.buy_friend_cheers() to authenticated;

create or replace function public.send_friend_cheer(other uuid, note text, want text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  bal integer;
  held integer;
  cid text := left(btrim(coalesce(want, '')), 20);
  line text := left(btrim(coalesce(note, '')), 280);
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if other is null or other = who or public.blocked_with(other) or not public.are_friends(other) then
    raise exception 'not friends';
  end if;

  select p.gem_balance, p.friend_cheers
    into bal, held
  from public.profiles p
  where p.user_id = who
  for update;

  if bal is null then
    raise exception 'not signed in';
  end if;
  if held < 1 then
    raise exception 'need cheers';
  end if;

  perform set_config('did_i.friend_cheer', '1', true);
  perform set_config('did_i.cheer_send', '1', true);
  update public.profiles
    set friend_cheers = held - 1
    where user_id = who
    returning gem_balance, friend_cheers into bal, held;

  insert into public.sends (from_id, to_id, kind, question, note, cheer_id)
  values (who, other, 'cheer', '', line, cid);

  return jsonb_build_object('gems', bal, 'cheers', held);
end;
$$;

revoke all on function public.send_friend_cheer(uuid, text, text) from public;
revoke all on function public.send_friend_cheer(uuid, text, text) from anon;
grant execute on function public.send_friend_cheer(uuid, text, text) to authenticated;

create or replace function public.read_friend_cheers()
returns integer
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  return coalesce(
    (select p.friend_cheers from public.profiles p where p.user_id = who),
    0
  );
end;
$$;

revoke all on function public.read_friend_cheers() from public;
revoke all on function public.read_friend_cheers() from anon;
grant execute on function public.read_friend_cheers() to authenticated;

-- Same stored cheer as a friend. The person has to share a family.
create or replace function public.send_family_cheer(other uuid, note text, want text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  bal integer;
  held integer;
  cid text := left(btrim(coalesce(want, '')), 20);
  line text := left(btrim(coalesce(note, '')), 280);
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  if other is null or other = who or public.blocked_with(other) or not public.shares_family(other) then
    raise exception 'not family';
  end if;

  select p.gem_balance, p.friend_cheers
    into bal, held
  from public.profiles p
  where p.user_id = who
  for update;

  if bal is null then
    raise exception 'not signed in';
  end if;
  if held < 1 then
    raise exception 'need cheers';
  end if;

  perform set_config('did_i.friend_cheer', '1', true);
  perform set_config('did_i.cheer_send', '1', true);
  update public.profiles
    set friend_cheers = held - 1
    where user_id = who
    returning gem_balance, friend_cheers into bal, held;

  insert into public.sends (from_id, to_id, kind, question, note, cheer_id)
  values (who, other, 'cheer', '', line, cid);

  return jsonb_build_object('gems', bal, 'cheers', held);
end;
$$;

revoke all on function public.send_family_cheer(uuid, text, text) from public;
revoke all on function public.send_family_cheer(uuid, text, text) from anon;
grant execute on function public.send_family_cheer(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
