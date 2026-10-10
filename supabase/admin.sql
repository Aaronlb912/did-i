-- Reports admin: a private page at did-i.app/app#/admin/reports.
-- Run after blocks.sql, tonight.sql, did-you-links.sql and share-links.sql.
--
-- Only people in public.admins can read reports or act on them. The table is
-- closed to every client; the owner adds himself once in the SQL editor:
--
--   insert into public.admins (user_id)
--   select id from auth.users where lower(email) = lower('you@example.com')
--   on conflict do nothing;
--
-- Nobody is added here.

create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  made_at timestamptz not null default now()
);

alter table public.admins enable row level security;
revoke all on public.admins from public, anon, authenticated;
-- No policies on purpose: only the security definer helper below reads it.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Where a report stands. Open until an admin dismisses it or acts on it.
alter table public.reports add column if not exists status text not null default 'open';
alter table public.reports add column if not exists handled_at timestamptz;
alter table public.reports add column if not exists handled_by uuid references auth.users on delete set null;

alter table public.reports drop constraint if exists reports_status_ok;
alter table public.reports add constraint reports_status_ok
  check (status in ('open', 'dismissed', 'removed', 'banned'));

create index if not exists reports_made_idx on public.reports (made_at desc);
create index if not exists reports_handled_by_idx on public.reports (handled_by);

-- Admins read every report. Filers still can not read their own.
drop policy if exists "admins read reports" on public.reports;
create policy "admins read reports" on public.reports
  for select to authenticated using ((select public.is_admin()));

-- Every admin action, kept.
create table if not exists public.report_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports on delete set null,
  admin_id uuid references auth.users on delete set null,
  about_id uuid references auth.users on delete set null,
  action text not null,
  note text not null default '',
  made_at timestamptz not null default now()
);

alter table public.report_actions drop constraint if exists report_actions_ok;
alter table public.report_actions add constraint report_actions_ok
  check (action in ('dismiss', 'remove', 'ban') and length(note) <= 500);

create index if not exists report_actions_report_idx on public.report_actions (report_id);
create index if not exists report_actions_admin_idx on public.report_actions (admin_id);
create index if not exists report_actions_about_idx on public.report_actions (about_id);

alter table public.report_actions enable row level security;
revoke all on public.report_actions from public, anon, authenticated;
grant select on public.report_actions to authenticated;

drop policy if exists "admins read report actions" on public.report_actions;
create policy "admins read report actions" on public.report_actions
  for select to authenticated using ((select public.is_admin()));

-- What a report is about, read from how each report RPC writes its reason.
create or replace function public.report_kind(reason text, line uuid)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when reason = 'photo' then 'photo'
    when reason like 'did you link %' then 'did_you_link'
    when reason like 'did we link %' then 'we_link'
    when line is not null then 'line'
    else 'person'
  end;
$$;

revoke all on function public.report_kind(text, uuid) from public, anon;

-- The link code inside a link report's reason ('did you link CODE: ...').
create or replace function public.report_link_code(reason text)
returns text
language sql
immutable
set search_path = public
as $$
  select substring(reason from '^did (?:you|we) link ([a-z0-9]+):');
$$;

revoke all on function public.report_link_code(text) from public, anon;

-- Newest first, with names. Admins only.
drop function if exists public.admin_reports(integer);
create or replace function public.admin_reports(lim integer default 100)
returns table (
  id uuid,
  kind text,
  reason text,
  status text,
  made_at timestamptz,
  from_id uuid,
  from_name text,
  about_id uuid,
  about_name text,
  about_banned boolean,
  link_code text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  select
    r.id,
    public.report_kind(r.reason, r.line_id),
    r.reason,
    r.status,
    r.made_at,
    r.from_id,
    coalesce(nullif(pf.display_name, ''), pf.handle, ''),
    r.about_id,
    coalesce(nullif(pa.display_name, ''), pa.handle, ''),
    coalesce(ua.banned_until > now(), false),
    public.report_link_code(r.reason)
  from public.reports r
  left join public.profiles pf on pf.user_id = r.from_id
  left join public.profiles pa on pa.user_id = r.about_id
  left join auth.users ua on ua.id = r.about_id
  order by r.made_at desc
  limit greatest(1, least(coalesce(lim, 100), 500));
end;
$$;

revoke all on function public.admin_reports(integer) from public, anon;
grant execute on function public.admin_reports(integer) to authenticated;

-- Act on a report. 'dismiss' closes it. 'remove' takes the photo off the
-- profile or ends the reported link. 'ban' uses Supabase Auth's own ban
-- (auth.users.banned_until): no new sign-in and no token refresh, so every
-- signed-in write stops within the hour an access token lasts. Nothing else
-- about the person changes. Undo a ban in the SQL editor:
--   update auth.users set banned_until = null where id = '<user id>';
create or replace function public.admin_act(report uuid, act text, note text default '')
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  r public.reports;
  k text;
  link text;
  next_status text;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select * into r from public.reports where id = report;
  if not found then raise exception 'no such report'; end if;
  k := public.report_kind(r.reason, r.line_id);

  if act = 'dismiss' then
    next_status := 'dismissed';
  elsif act = 'remove' then
    if k = 'photo' then
      if r.about_id is null then raise exception 'nothing to remove'; end if;
      update public.profiles set avatar_url = null where user_id = r.about_id;
    elsif k = 'did_you_link' then
      link := public.report_link_code(r.reason);
      update public.did_you_links set ended = true where did_you_links.code = link;
    elsif k = 'we_link' then
      link := public.report_link_code(r.reason);
      update public.we_links set ended = true where we_links.code = link;
    else
      raise exception 'nothing to remove';
    end if;
    next_status := 'removed';
  elsif act = 'ban' then
    if r.about_id is null then raise exception 'nobody to ban'; end if;
    if r.about_id = me or exists (select 1 from public.admins a where a.user_id = r.about_id) then
      raise exception 'can not ban an admin';
    end if;
    update auth.users set banned_until = now() + interval '100 years' where id = r.about_id;
    next_status := 'banned';
  else
    raise exception 'unknown action';
  end if;

  update public.reports
  set status = next_status, handled_at = now(), handled_by = me
  where id = report;

  insert into public.report_actions (report_id, admin_id, about_id, action, note)
  values (report, me, r.about_id, act, left(coalesce(btrim(note), ''), 500));

  return next_status;
end;
$$;

revoke all on function public.admin_act(uuid, text, text) from public, anon;
grant execute on function public.admin_act(uuid, text, text) to authenticated;
