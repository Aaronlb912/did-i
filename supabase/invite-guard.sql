-- Referral codes: one per person, only through use_invite / my_invite / claim_invites.

alter table public.profiles add column if not exists invite_gems_paid integer not null default 0;

create or replace function public.guard_profile_invites()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('did_i.invite_write', true) = '1' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.invited_by := null;
    new.invite_code := null;
    new.joined_paid := false;
    new.invites_paid := 0;
    new.invite_gems_paid := 0;
    new.invite_look_paid := false;
  else
    new.invited_by := old.invited_by;
    new.invite_code := old.invite_code;
    new.joined_paid := old.joined_paid;
    new.invites_paid := old.invites_paid;
    new.invite_gems_paid := old.invite_gems_paid;
    new.invite_look_paid := old.invite_look_paid;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_invites on public.profiles;
create trigger guard_profile_invites
  before insert or update on public.profiles
  for each row execute function public.guard_profile_invites();

create or replace function public.invite_gems_cap()
returns integer language sql immutable as $$ select 10 $$;

create or replace function public.invite_gems_for(which integer)
returns integer language sql immutable as $$
  select greatest(which, 1)
$$;

create or replace function public.invite_gems_left(already integer)
returns integer language sql immutable as $$
  select greatest(public.invite_gems_cap() - greatest(already, 0), 0)
$$;

create or replace function public.my_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  code text;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  try text;
  n integer := 0;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select p.invite_code into code from public.profiles p where p.user_id = me;
  if code is not null and length(code) = 10 then
    return code;
  end if;
  loop
    try := '';
    for i in 1..10 loop
      try := try || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where upper(invite_code) = try);
    n := n + 1;
    if n > 40 then
      raise exception 'could not find a free code';
    end if;
  end loop;
  perform set_config('did_i.invite_write', '1', true);
  insert into public.profiles (user_id, invite_code) values (me, try)
  on conflict (user_id) do update set invite_code = try;
  return try;
end;
$$;

create or replace function public.use_invite(want_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  owner uuid;
  mine text;
  row public.profiles;
  code text := upper(btrim(want_code));
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if code is null or length(code) <> 10 then
    return 'code';
  end if;

  insert into public.profiles (user_id) values (me)
  on conflict (user_id) do nothing;

  select * into row from public.profiles where user_id = me for update;
  if row.invited_by is not null then
    return 'used';
  end if;

  select p.invite_code into mine from public.profiles p where p.user_id = me;
  if mine is not null and upper(mine) = code then
    return 'self';
  end if;

  select p.user_id into owner
  from public.profiles p
  where p.invite_code is not null and upper(p.invite_code) = code;
  if owner is null then
    return 'nobody';
  end if;
  if owner = me then
    return 'self';
  end if;

  perform set_config('did_i.invite_write', '1', true);
  update public.profiles
  set invited_by = owner
  where user_id = me and invited_by is null;

  if not found then
    return 'used';
  end if;

  return 'ok';
end;
$$;

create or replace function public.claim_invites()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  row public.profiles;
  gems integer := 0;
  looks text[] := '{}';
  joined integer;
  i integer;
  wins_look boolean;
  gems_left integer;
  pay integer;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select * into row from public.profiles where user_id = me for update;
  if row is null then
    return jsonb_build_object('gems', 0, 'looks', '[]'::jsonb, 'joined', 0);
  end if;

  select count(*) into joined from public.profiles where invited_by = me;
  gems_left := public.invite_gems_left(row.invite_gems_paid);

  if row.invited_by is not null and not row.joined_paid and gems_left > 0 then
    pay := least(public.invite_gems_for(1), gems_left);
    gems := gems + pay;
    gems_left := gems_left - pay;
  end if;

  for i in (row.invites_paid + 1)..joined loop
    if gems_left <= 0 then
      exit;
    end if;
    pay := least(public.invite_gems_for(i), gems_left);
    gems := gems + pay;
    gems_left := gems_left - pay;
  end loop;

  wins_look := joined >= public.invite_look_at() and not row.invite_look_paid;
  if wins_look then
    looks := array_append(looks, 'night');
  end if;

  if gems > 0 or wins_look then
    perform set_config('did_i.invite_write', '1', true);
    update public.profiles set
      joined_paid = (invited_by is not null),
      invites_paid = joined,
      invite_gems_paid = row.invite_gems_paid + gems,
      invite_look_paid = invite_look_paid or wins_look
    where user_id = me;
  end if;

  return jsonb_build_object('gems', gems, 'looks', to_jsonb(looks), 'joined', joined);
end;
$$;

revoke all on function public.my_invite() from public;
revoke all on function public.use_invite(text) from public;
revoke all on function public.claim_invites() from public;
grant execute on function public.my_invite() to authenticated;
grant execute on function public.use_invite(text) to authenticated;
grant execute on function public.claim_invites() to authenticated;
