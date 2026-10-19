-- Sweep 2 (2026-10-19): invite gems only for people who really use the app,
-- avatar links pinned to the owner's own folder.
-- Run after sweep-guards.sql (just before drop-tonight.sql). Safe to run again.

-- 1. Invites ------------------------------------------------------------
-- Throwaway sign ups could farm gems: each new account using a code paid the
-- inviter (and itself). Now a join only counts once the invited person has
-- answered on 3 different nights.
create or replace function public.invite_real(who uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select count(*) >= 3 from (
    select distinct a.period_key from public.answer_log a
    where a.user_id = who and a.status in ('yes', 'late')
    limit 3
  ) n;
$$;

revoke all on function public.invite_real(uuid) from public, anon, authenticated;

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
  buddies text[] := '{}';
  frames text[] := '{}';
  joined integer;
  i integer;
  wins_look boolean;
  gems_left integer;
  pay integer;
  cos jsonb;
  pays_me boolean;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select * into row from public.profiles where user_id = me for update;
  if row is null then
    return jsonb_build_object('gems', 0, 'looks', '[]'::jsonb, 'joined', 0,
      'buddies', '[]'::jsonb, 'frames', '[]'::jsonb);
  end if;

  select count(*) into joined from public.profiles p
  where p.invited_by = me and public.invite_real(p.user_id);
  gems_left := public.invite_gems_left(row.invite_gems_paid);

  pays_me := row.invited_by is not null and not row.joined_paid and public.invite_real(me);
  if pays_me and gems_left > 0 then
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

  -- Listed every time from the count; they cost nothing to give again.
  if joined >= public.invite_buddy_at() then
    buddies := array_append(buddies, 'hive');
  end if;
  if joined >= public.invite_frame_at() then
    frames := array_append(frames, 'bloom');
  end if;

  if gems > 0 or wins_look then
    cos := public.coin_catalog_normalize(row.coin_cosmetics);
    if wins_look and not (cos->'looks' @> '["night"]'::jsonb) then
      cos := jsonb_set(cos, '{looks}', (cos->'looks') || '["night"]'::jsonb);
    end if;
    perform set_config('did_i.invite_write', '1', true);
    update public.profiles set
      joined_paid = joined_paid or pays_me,
      -- Never lower it: joins counted before this file stay paid.
      invites_paid = greatest(invites_paid, joined),
      invite_gems_paid = row.invite_gems_paid + gems,
      invite_look_paid = invite_look_paid or wins_look,
      gem_balance = least(gem_balance + gems, 9999),
      coin_cosmetics = case when wins_look then cos else coin_cosmetics end
    where user_id = me;
    perform set_config('did_i.invite_write', '', true);
  end if;

  return jsonb_build_object('gems', gems, 'looks', to_jsonb(looks), 'joined', joined,
    'buddies', to_jsonb(buddies), 'frames', to_jsonb(frames));
end;
$$;

revoke all on function public.claim_invites() from public, anon;
grant execute on function public.claim_invites() to authenticated;

-- 2. Avatar links ---------------------------------------------------------
-- The old check only looked for '/avatars/<id>/' anywhere, so a query string
-- could carry it while the path pointed at someone else's photo.
alter table public.profiles drop constraint if exists profiles_avatar_url_shape;
alter table public.profiles add constraint profiles_avatar_url_shape
  check (
    avatar_url is null
    or avatar_url = ''
    or (
      length(avatar_url) <= 400
      and avatar_url ~ ('^https://lsvvxslgizihbktqoybt\.supabase\.co/storage/v1/object/public/avatars/'
        || user_id::text || '/[A-Za-z0-9_-][A-Za-z0-9._-]*(\?[A-Za-z0-9=&._-]*)?$')
      and position('..' in avatar_url) = 0
    )
  ) not valid;
