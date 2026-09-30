// Send a special item (one that is never sold, like the launch cheer) as a gift.
// It shows up as a gift pop-up the next time they open the app (1.2 or later).
// Usage (SUPABASE_ACCESS_TOKEN in .env.local):
//   node scripts/give-special.mjs --to them@example.com --from you@example.com --item launch --note "Thanks for testing"

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  const path = resolve('.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const cut = line.indexOf('=')
    const key = line.slice(0, cut).trim()
    if (!process.env[key]) process.env[key] = line.slice(cut + 1).trim()
  }
}

function arg(name, fallback = '') {
  const at = process.argv.indexOf(`--${name}`)
  return at > 0 ? String(process.argv[at + 1] || '') : fallback
}

function quote(value) {
  return `'${String(value).replace(/'/g, "''")}'`
}

loadEnvLocal()

const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SB_PAT
const ref =
  process.env.SUPABASE_PROJECT_REF ||
  (process.env.VITE_SUPABASE_URL || '').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ||
  'lsvvxslgizihbktqoybt'
const to = arg('to')
const from = arg('from')
const kind = arg('kind', 'cheer')
const item = arg('item', 'launch')
const note = arg('note').slice(0, 60)

if (!token || !to || !from) {
  console.error('Usage: node scripts/give-special.mjs --to <email> --from <your email> [--item launch] [--note "..."]')
  process.exit(1)
}

const query = `select public.give_special(${quote(to)}, ${quote(from)}, ${quote(kind)}, ${quote(item)}, ${quote(note)}) as id;`
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
})
const text = await res.text()
if (!res.ok) {
  console.error(`HTTP ${res.status}`)
  console.error(text.slice(0, 1000))
  process.exit(1)
}
console.log(`sent ${kind} ${item} to ${to}: ${text}`)
