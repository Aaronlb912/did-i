-- Report emails and photo file cleanup. Run after admin.sql and avatars.sql.
--
-- 1. Every new report queues one email per report. The report-mail edge
--    function sends it to every admin through Resend. A pg_cron job calls
--    the function every 5 minutes with the service role key, read from Vault:
--
--      select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--      select vault.create_secret('<service role key>', 'service_role_key');
--
--    Needs pg_cron and pg_net. Without those secrets the job does nothing.
--
-- 2. When an admin removes a reported photo, the app also deletes the file
--    from the avatars bucket. Admins get a delete policy on that bucket and
--    a helper that reads the file path before admin_act clears the link.

-- One row per report. No client access at all.
create table if not exists public.report_mail_queue (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.reports on delete cascade,
  made_at timestamptz not null default now(),
  sent_at timestamptz,
  tries integer not null default 0,
  last_error text not null default ''
);

create unique index if not exists report_mail_queue_report_idx on public.report_mail_queue (report_id);
create index if not exists report_mail_queue_open_idx on public.report_mail_queue (made_at) where sent_at is null;

alter table public.report_mail_queue drop constraint if exists report_mail_queue_ok;
alter table public.report_mail_queue add constraint report_mail_queue_ok
  check (tries between 0 and 10 and length(last_error) <= 500);

alter table public.report_mail_queue enable row level security;
revoke all on public.report_mail_queue from public, anon, authenticated;
-- No policies on purpose: only the service role (edge function) reads it.

create or replace function public.queue_report_mail()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.report_mail_queue (report_id) values (new.id)
  on conflict (report_id) do nothing;
  return new;
end;
$$;

revoke all on function public.queue_report_mail() from public, anon, authenticated;

drop trigger if exists queue_report_mail on public.reports;
create trigger queue_report_mail
  after insert on public.reports
  for each row execute function public.queue_report_mail();

-- Up to 50 unsent rows with what the email says, for the edge function.
-- Rows that failed 5 times stay put for a look in the SQL editor.
create or replace function public.report_mail_batch(lim integer default 50)
returns table (
  id bigint,
  report_id uuid,
  kind text,
  reason text,
  made_at timestamptz,
  from_name text,
  about_name text,
  tries integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    q.id,
    q.report_id,
    public.report_kind(r.reason, r.line_id),
    left(coalesce(r.reason, ''), 300),
    r.made_at,
    coalesce(nullif(pf.display_name, ''), pf.handle, ''),
    coalesce(nullif(pa.display_name, ''), pa.handle, ''),
    q.tries
  from public.report_mail_queue q
  join public.reports r on r.id = q.report_id
  left join public.profiles pf on pf.user_id = r.from_id
  left join public.profiles pa on pa.user_id = r.about_id
  where q.sent_at is null and q.tries < 5
  order by q.made_at
  limit greatest(1, least(coalesce(lim, 50), 50));
$$;

revoke all on function public.report_mail_batch(integer) from public, anon, authenticated;
grant execute on function public.report_mail_batch(integer) to service_role;

-- Who gets the email: every admin's sign-in email.
create or replace function public.admin_emails()
returns table (email text)
language sql
stable
security definer
set search_path = public
as $$
  select u.email::text
  from public.admins a
  join auth.users u on u.id = a.user_id
  where coalesce(u.email, '') <> '';
$$;

revoke all on function public.admin_emails() from public, anon, authenticated;
grant execute on function public.admin_emails() to service_role;

create or replace function public.report_mail_done(row_id bigint, err text default '')
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.report_mail_queue
  set sent_at = case when coalesce(err, '') = '' then now() else null end,
      tries = least(tries + 1, 10),
      last_error = left(coalesce(err, ''), 500)
  where id = row_id;
$$;

revoke all on function public.report_mail_done(bigint, text) from public, anon, authenticated;
grant execute on function public.report_mail_done(bigint, text) to service_role;

-- Sent rows older than 30 days go.
create or replace function public.sweep_report_mail()
returns integer
language sql
volatile
security definer
set search_path = public
as $$
  with gone as (
    delete from public.report_mail_queue
    where sent_at is not null and sent_at < now() - interval '30 days'
    returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function public.sweep_report_mail() from public, anon, authenticated;

select cron.unschedule('report-mail') where exists (select 1 from cron.job where jobname = 'report-mail');
select cron.schedule('report-mail', '*/5 * * * *', $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/report-mail',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  )
  where exists (select 1 from public.report_mail_queue where sent_at is null and tries < 5)
    and exists (select 1 from vault.decrypted_secrets where name = 'project_url');
  select public.sweep_report_mail();
$cron$);

-- The avatars object path ('<user id>/<file>') of a reported photo, read
-- before admin_act clears profiles.avatar_url. Null unless the link points
-- inside avatars/<that user id>/ with one plain file name.
create or replace function public.admin_photo_path(report uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r public.reports;
  url text;
  obj text;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  select * into r from public.reports where id = report;
  if not found or r.about_id is null then return null; end if;
  if public.report_kind(r.reason, r.line_id) <> 'photo' then return null; end if;
  select avatar_url into url from public.profiles where user_id = r.about_id;
  obj := substring(split_part(coalesce(url, ''), '?', 1) from '/storage/v1/object/public/avatars/(.+)$');
  if obj is null or obj !~ ('^' || r.about_id::text || '/[A-Za-z0-9._-]+$') or obj like '%..%' then
    return null;
  end if;
  return obj;
end;
$$;

revoke all on function public.admin_photo_path(uuid) from public, anon;
grant execute on function public.admin_photo_path(uuid) to authenticated;

-- Admins may delete files in the avatars bucket (the app only asks for the
-- one path above). Owners keep their own policies from avatars.sql.
drop policy if exists "avatars admin delete" on storage.objects;
create policy "avatars admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (select public.is_admin()));

-- Storage remove() also needs select on the row. The bucket is public anyway.
drop policy if exists "avatars admin read" on storage.objects;
create policy "avatars admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (select public.is_admin()));
