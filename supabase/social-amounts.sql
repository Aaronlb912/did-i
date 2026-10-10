-- Amounts on a Did we, and notes you choose to share. Run after did-we.sql,
-- blocks.sql and friend-cheers.sql. Safe to run again.
--
-- Amounts: a Did we can track an amount ("glasses"). Each member types theirs
-- on the shared card only. The group sees one combined total for the week,
-- never who typed what. Amounts on your own questions (answer_log) are never
-- read here.
--
-- Shared notes: a note after a Did stays private unless you turn on Share.
-- Friends can read a shared one and cheer it. Turning Share off deletes it.

-- Amounts on a Did we ---------------------------------------------------

alter table public.we_cards add column if not exists track_amount boolean not null default false;
alter table public.we_cards add column if not exists amount_unit text not null default '';
alter table public.we_cards drop constraint if exists we_cards_amount_unit_len;
alter table public.we_cards add constraint we_cards_amount_unit_len check (length(amount_unit) <= 24);

alter table public.we_answers add column if not exists amount numeric;
alter table public.we_answers drop constraint if exists we_answers_amount;
alter table public.we_answers add constraint we_answers_amount
  check (amount is null or (amount >= 0 and amount <= 100000));

-- The maker turns tracking on or off and names the unit.
create or replace function public.we_track_amount(card uuid, want_on boolean, want_unit text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  update public.we_cards
     set track_amount = coalesce(want_on, false),
         amount_unit = left(btrim(regexp_replace(coalesce(want_unit, ''), '\s+', ' ', 'g')), 24)
   where id = card and made_by = me and not archived;
  if not found then
    raise exception 'not your card';
  end if;
  return coalesce(want_on, false);
end;
$$;

-- Your amount on a night you said did. Null clears it.
create or replace function public.we_put_amount(card uuid, on_night date, want_amount numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  if want_amount is not null and (want_amount < 0 or want_amount > 100000) then
    raise exception 'amount out of range';
  end if;
  if not exists (
    select 1 from public.we_cards c
    join public.we_members m on m.card_id = c.id
    where c.id = card and c.track_amount and not c.archived
      and m.user_id = me and m.state = 'in'
  ) then
    raise exception 'not on this card';
  end if;
  update public.we_answers
     set amount = round(want_amount, 2)
   where card_id = card and user_id = me and night = on_night and status = 'did';
  if not found then
    raise exception 'answer did first';
  end if;
  return true;
end;
$$;

-- One read for every card on screen: the combined total for the 7 nights
-- from week_start, your own amount for on_night, and the unit. Only cards
-- you are on and that track an amount come back. No per-person rows.
create or replace function public.we_week_totals(cards uuid[], week_start date, on_night date)
returns table (card_id uuid, unit text, total numeric, mine numeric)
language sql
security definer
stable
set search_path = public
as $$
  select c.id,
         c.amount_unit,
         coalesce((select sum(a.amount) from public.we_answers a
                   join public.we_members m2 on m2.card_id = a.card_id and m2.user_id = a.user_id and m2.state = 'in'
                   where a.card_id = c.id and a.status = 'did' and a.amount is not null
                     and a.night >= week_start and a.night < week_start + 7), 0),
         (select a.amount from public.we_answers a
          where a.card_id = c.id and a.user_id = (select auth.uid()) and a.night = on_night)
  from public.we_cards c
  join public.we_members m on m.card_id = c.id
  where c.id = any(cards)
    and c.track_amount
    and m.user_id = (select auth.uid())
    and m.state = 'in'
  limit 60;
$$;

revoke all on function public.we_track_amount(uuid, boolean, text) from public, anon;
revoke all on function public.we_put_amount(uuid, date, numeric) from public, anon;
revoke all on function public.we_week_totals(uuid[], date, date) from public, anon;
grant execute on function public.we_track_amount(uuid, boolean, text) to authenticated;
grant execute on function public.we_put_amount(uuid, date, numeric) to authenticated;
grant execute on function public.we_week_totals(uuid[], date, date) to authenticated;

-- Shared notes -----------------------------------------------------------

create table if not exists public.shared_notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  lamp_id text not null,
  period_key text not null,
  question text not null default '',
  note text not null,
  made_at timestamptz not null default now(),
  primary key (user_id, lamp_id, period_key)
);

alter table public.shared_notes drop constraint if exists shared_notes_len;
alter table public.shared_notes add constraint shared_notes_len check (
  length(lamp_id) <= 64
  and length(period_key) <= 24
  and length(question) <= 200
  and length(note) between 1 and 500
);

-- The cap and a friend's recent notes both read by person and time.
create index if not exists shared_notes_made_idx on public.shared_notes (user_id, made_at);

alter table public.shared_notes enable row level security;

drop policy if exists "read own or a friend's shared notes" on public.shared_notes;
create policy "read own or a friend's shared notes" on public.shared_notes
  for select using ((select auth.uid()) = user_id or public.are_friends(user_id));

drop policy if exists "write own shared notes" on public.shared_notes;
create policy "write own shared notes" on public.shared_notes
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "change own shared notes" on public.shared_notes;
create policy "change own shared notes" on public.shared_notes
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "remove own shared notes" on public.shared_notes;
create policy "remove own shared notes" on public.shared_notes
  for delete using ((select auth.uid()) = user_id);

-- 20 new shared notes a day is far past a real night of questions.
create or replace function public.cap_shared_notes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.shared_notes
      where user_id = new.user_id and made_at > now() - interval '1 day') >= 20 then
    raise exception 'too many shared notes today';
  end if;
  return new;
end;
$$;

drop trigger if exists cap_shared_notes on public.shared_notes;
create trigger cap_shared_notes
  before insert on public.shared_notes
  for each row execute function public.cap_shared_notes();

revoke all on public.shared_notes from anon;
grant select, insert, update, delete on public.shared_notes to authenticated;

-- Notes on a Did we ------------------------------------------------------
-- After a Did on a shared card you can add a note to that night. It stays
-- yours unless you turn on Share; then everyone still on the card can read
-- it and cheer you. Leaving the card (or the card closing) ends that: the
-- read policy checks you are still on it, every time.

create table if not exists public.we_notes (
  card_id uuid not null references public.we_cards on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  night date not null,
  note text not null,
  shared boolean not null default false,
  made_at timestamptz not null default now(),
  primary key (card_id, user_id, night)
);

alter table public.we_notes drop constraint if exists we_notes_len;
alter table public.we_notes add constraint we_notes_len check (length(note) between 1 and 500);

-- The card page reads a card's recent nights; the cap reads by person and time.
create index if not exists we_notes_card_night_idx on public.we_notes (card_id, night);
create index if not exists we_notes_made_idx on public.we_notes (user_id, made_at);

-- Is this person on the card right now (state in, card not closed)?
create or replace function public.we_note_in(card uuid, who uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.we_members m
    join public.we_cards c on c.id = m.card_id
    where m.card_id = card and m.user_id = who and m.state = 'in' and not c.archived
  );
$$;

-- A note only goes on a night you said did.
create or replace function public.we_note_did(card uuid, who uuid, on_night date)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.we_answers
    where card_id = card and user_id = who and night = on_night and status = 'did'
  );
$$;

revoke all on function public.we_note_in(uuid, uuid) from public, anon;
revoke all on function public.we_note_did(uuid, uuid, date) from public, anon;
grant execute on function public.we_note_in(uuid, uuid) to authenticated;
grant execute on function public.we_note_did(uuid, uuid, date) to authenticated;

alter table public.we_notes enable row level security;

-- Yours always. Someone else's only when shared, while you and they are both
-- still on the card.
drop policy if exists "read own or the group's shared we notes" on public.we_notes;
create policy "read own or the group's shared we notes" on public.we_notes
  for select using (
    (select auth.uid()) = user_id
    or (shared
        and public.we_note_in(card_id, (select auth.uid()))
        and public.we_note_in(card_id, user_id))
  );

drop policy if exists "write own we notes" on public.we_notes;
create policy "write own we notes" on public.we_notes
  for insert with check (
    (select auth.uid()) = user_id
    and public.we_note_in(card_id, user_id)
    and public.we_note_did(card_id, user_id, night)
  );

drop policy if exists "change own we notes" on public.we_notes;
create policy "change own we notes" on public.we_notes
  for update using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and public.we_note_in(card_id, user_id)
    and public.we_note_did(card_id, user_id, night)
  );

drop policy if exists "remove own we notes" on public.we_notes;
create policy "remove own we notes" on public.we_notes
  for delete using ((select auth.uid()) = user_id);

-- The same 20 a day as shared notes, counted across both tables.
create or replace function public.cap_we_notes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.we_notes
      where user_id = new.user_id and made_at > now() - interval '1 day')
     + (select count(*) from public.shared_notes
      where user_id = new.user_id and made_at > now() - interval '1 day') >= 20 then
    raise exception 'too many shared notes today';
  end if;
  return new;
end;
$$;

drop trigger if exists cap_we_notes on public.we_notes;
create trigger cap_we_notes
  before insert on public.we_notes
  for each row execute function public.cap_we_notes();

revoke all on public.we_notes from anon;
grant select, insert, update, delete on public.we_notes to authenticated;
