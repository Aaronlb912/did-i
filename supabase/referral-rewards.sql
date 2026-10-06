-- Did I: rewards for bringing friends, past the gems and the Night look.
-- 15 friends joined with your code: the Hive buddy. 20: the Bloom frame.
-- Neither is ever sold. claim_invites counts the friends here, on the
-- server, and lists what that count has earned every time it runs, so a new
-- phone gets them back. Gems and the Night look work exactly as before.
-- Run after invite-guard.sql. Safe to run again.

create or replace function public.invite_buddy_at()
returns integer language sql immutable as $$ select 15 $$;

create or replace function public.invite_frame_at()
returns integer language sql immutable as $$ select 20 $$;

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
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  select * into row from public.profiles where user_id = me for update;
  if row is null then
    return jsonb_build_object('gems', 0, 'looks', '[]'::jsonb, 'joined', 0,
      'buddies', '[]'::jsonb, 'frames', '[]'::jsonb);
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

  -- Listed every time from the count; they cost nothing to give again.
  if joined >= public.invite_buddy_at() then
    buddies := array_append(buddies, 'hive');
  end if;
  if joined >= public.invite_frame_at() then
    frames := array_append(frames, 'bloom');
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

  return jsonb_build_object('gems', gems, 'looks', to_jsonb(looks), 'joined', joined,
    'buddies', to_jsonb(buddies), 'frames', to_jsonb(frames));
end;
$$;

revoke all on function public.claim_invites() from public;
grant execute on function public.claim_invites() to authenticated;
