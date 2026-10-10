// One-off admin: clear answer history for a test account.
// Usage: node scripts/reset-completions.mjs aaronlb59@gmail.com

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  const path = resolve('.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const cut = line.indexOf('=')
    const key = line.slice(0, cut).trim()
    const val = line.slice(cut + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/reset-completions.mjs <email>')
  process.exit(1)
}

const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SB_PAT
const ref =
  process.env.SUPABASE_PROJECT_REF ||
  (process.env.VITE_SUPABASE_URL || '').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ||
  'lsvvxslgizihbktqoybt'

if (!token) {
  console.error('Set SUPABASE_ACCESS_TOKEN in .env.local')
  process.exit(1)
}

const sql = `
with u as (
  select id from auth.users where lower(email) = lower('${email.replace(/'/g, "''")}')
),
gone as (
  delete from public.answer_log where user_id in (select id from u) returning 1
),
family_gone as (
  delete from public.family_answers where user_id in (select id from u) returning 1
),
profile_fix as (
  update public.profiles
  set streak = 0, done_on = null, updated_at = now()
  where user_id in (select id from u)
  returning user_id
),
shelf_fix as (
  update public.shelves s
  set doc = jsonb_set(
        s.doc,
        '{boards}',
        (
          select coalesce(jsonb_agg(b - 'answers' order by ord), '[]'::jsonb)
          from jsonb_array_elements(coalesce(s.doc->'boards', '[]'::jsonb)) with ordinality t(b, ord)
        )
      ),
      saved_at = now(),
      updated_at = now()
  where user_id in (select id from u)
    and s.doc ? 'boards'
  returning user_id
)
select
  (select count(*) from u) as users_found,
  (select count(*) from gone) as answers_deleted,
  (select count(*) from family_gone) as family_answers_deleted,
  (select count(*) from profile_fix) as profiles_reset,
  (select count(*) from shelf_fix) as shelves_scrubbed;
`

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})

const text = await res.text()
if (!res.ok) {
  console.error(`HTTP ${res.status}`)
  console.error(text.slice(0, 2000))
  process.exit(1)
}

console.log(text)
