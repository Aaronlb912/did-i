// Send a Did you from Did I to every signed-in account (supabase/did-you-links.sql).
// Connects like scripts/apply-sql.mjs (SUPABASE_ACCESS_TOKEN in .env.local).
// The database allows at most 4 in any 30 days and queues one push per
// person who leaves "From Did I" on.
//
// Usage:
//   node scripts/send-from-did-i.mjs "Did you go vote?" [--note "Polls close at 8."] [--tonight 2026-11-03] [--yes]
//
// Without --yes it only prints what it would send.
// --tonight NIGHT puts it straight on each person's tonight for that night
// only (it never counts for a streak) instead of asking in the inbox.

import { randomInt } from 'node:crypto'
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
    if (key === 'SUPABASE_ACCESS_TOKEN' || key === 'SB_PAT' || !process.env[key]) {
      process.env[key] = val
    }
  }
}

function argAfter(flag) {
  const at = process.argv.indexOf(flag)
  return at > 0 ? String(process.argv[at + 1] || '') : ''
}

const args = process.argv.slice(2)
const question = String(args.find((arg, i) => !arg.startsWith('--') && !['--note', '--tonight'].includes(args[i - 1])) || '').trim()
const note = argAfter('--note').trim()
const night = argAfter('--tonight').trim()
const go = args.includes('--yes')

if (!question || question.length > 200) {
  console.error('Give a question of 1 to 200 characters.')
  process.exit(1)
}
if (note.length > 300) {
  console.error('The note can be at most 300 characters.')
  process.exit(1)
}
if (args.includes('--tonight') && !/^\d{4}-\d{2}-\d{2}$/.test(night)) {
  console.error('--tonight needs a night like 2026-11-03.')
  process.exit(1)
}

const letters = 'abcdefghjkmnpqrstuvwxyz23456789'
const code = Array.from({ length: 10 }, () => letters[randomInt(letters.length)]).join('')
const lit = (text) => `'${String(text).replace(/'/g, "''")}'`

console.log('From:     Did I')
console.log(`Question: ${question}`)
if (note) console.log(`Note:     ${note}`)
console.log(night ? `Where:    tonight on ${night}, for that night only` : 'Where:    inbox (Keep or Pass)')
console.log(`Link:     https://did-i.app/d/${code}`)

if (!go) {
  console.log('\nNothing sent. Add --yes to send it.')
  process.exit(0)
}

loadEnvLocal()
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
begin;
insert into public.did_you_links (code, made_by, question) values (${lit(code)}, null, ${lit(question)});
insert into public.app_sends (question, note, link_code, mode, night)
values (${lit(question)}, ${lit(note)}, ${lit(code)}, ${night ? "'tonight'" : "'inbox'"}, ${night ? `${lit(night)}::date` : 'null'});
commit;
select count(*)::int as queued from public.push_queue where sent_at is null and made_at > now() - interval '1 minute' and title = 'Did I';
`

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
})
const text = await res.text()
if (!res.ok) {
  console.error(`Not sent. HTTP ${res.status}`)
  console.error(text.slice(0, 500))
  process.exit(1)
}
console.log(`\nSent. ${text.slice(0, 200)}`)
