// Admin: strip sample-board data from an account shelf and answer_log.
// Usage: node scripts/strip-demo-account.mjs aaronlb59@gmail.com

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { stripDemoShelf, demoLampIds } from '../src/lib/demo-strip.js'
import { shelfWithoutAnswers } from '../src/lib/answer-log.js'

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

async function query(sql) {
  const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SB_PAT
  const ref =
    process.env.SUPABASE_PROJECT_REF ||
    (process.env.VITE_SUPABASE_URL || '').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ||
    'lsvvxslgizihbktqoybt'
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 2000)}`)
  return text ? JSON.parse(text) : []
}

loadEnvLocal()

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/strip-demo-account.mjs <email>')
  process.exit(1)
}

const safe = email.replace(/'/g, "''")
const ids = demoLampIds().map((id) => `'${id.replace(/'/g, "''")}'`).join(', ')

const rows = await query(`
  select u.id, s.doc
  from auth.users u
  left join public.shelves s on s.user_id = u.id
  where lower(u.email) = lower('${safe}')
`)
if (!rows.length) {
  console.error('user not found')
  process.exit(1)
}

const userId = rows[0].id
const doc = rows[0].doc || { boards: [] }
const clean = stripDemoShelf(doc)
const text = JSON.stringify(shelfWithoutAnswers(clean)).replace(/'/g, "''")

await query(`
  update public.shelves
  set doc = '${text}'::jsonb, saved_at = now(), updated_at = now()
  where user_id = '${userId}';
  delete from public.answer_log
  where user_id = '${userId}' and lamp_id in (${ids});
`)

console.log(JSON.stringify({ userId, boards: clean.boards?.length || 0, demoLamps: demoLampIds().length }))
