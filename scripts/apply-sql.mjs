// Apply one SQL file through the Supabase Management API.
// Usage: set SUPABASE_ACCESS_TOKEN=sbp_... then
//   node scripts/apply-sql.mjs supabase/tonight.sql

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

loadEnvLocal()

const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SB_PAT
const ref =
  process.env.SUPABASE_PROJECT_REF ||
  (process.env.VITE_SUPABASE_URL || '').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ||
  'lsvvxslgizihbktqoybt'
const file = process.argv[2]

if (!token) {
  console.error('Set SUPABASE_ACCESS_TOKEN or SB_PAT')
  process.exit(1)
}
if (!file) {
  console.error('Usage: node scripts/apply-sql.mjs <path-to.sql>')
  process.exit(1)
}

const sql = readFileSync(resolve(file), 'utf8')
const url = `https://api.supabase.com/v1/projects/${ref}/database/query`
const res = await fetch(url, {
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

console.log(`applied ${file}`)
if (text && text !== '[]') console.log(text.slice(0, 500))
