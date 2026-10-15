-- Answers reach your other open devices in about a second.
-- Run after answers.sql. Safe to run again.
--
-- The app listens for changes to answer_log while it is open
-- (src/lib/cloud-sync.js, startLiveAnswers). Realtime only sends a row to a
-- listener whose select policy lets them read it, so "own answers"
-- (answers.sql) keeps each account to its own rows. Did we and Did you
-- answers are read through functions, not table policies, so they are not
-- sent this way.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'answer_log'
  ) then
    alter publication supabase_realtime add table public.answer_log;
  end if;
end;
$$;
