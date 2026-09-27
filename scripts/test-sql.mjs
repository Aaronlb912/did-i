// Run a SQL test file through the Supabase Management API.
// A test file does its work in one DO block and always raises at the end,
// so nothing it makes is kept. 'SQL TESTS PASSED' is a pass; anything else fails.
// Usage: npm run db:test supabase/tests/auto-add.test.sql

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const path = resolve('.env.local')
if (existsSync(path)) {
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const cut = line.indexOf('=')
    const key = line.slice(0, cut).trim()
    if (!process.env[key]) process.env[key] = line.slice(cut + 1).trim()
  }
}

const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SB_PAT
const ref =
  process.env.SUPABASE_PROJECT_REF ||
  (process.env.VITE_SUPABASE_URL || '').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ||
  'lsvvxslgizihbktqoybt'
const file = process.argv[2]

if (!token || !file) {
  console.error('Set SUPABASE_ACCESS_TOKEN and pass a test file')
  process.exit(1)
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: readFileSync(resolve(file), 'utf8') }),
})
const text = await res.text()

if (text.includes('SQL TESTS PASSED')) {
  console.log(`pass ${file}`)
} else {
  console.error(`fail ${file}`)
  console.error(text.slice(0, 2000))
  process.exit(1)
}
