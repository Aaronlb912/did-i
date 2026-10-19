-- store-version (supabase/functions/store-version) reads the App Store and
-- Play every 6 hours and raises app_versions.latest, so the update prompt
-- shows without a hand edit. Run after refunds.sql. Safe to run again.

select cron.unschedule('store-version') where exists (select 1 from cron.job where jobname = 'store-version');
select cron.schedule('store-version', '41 */6 * * *', $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/store-version',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url');
$cron$);
