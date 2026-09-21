// Push OAuth redirect URLs (and optional Google/Apple keys) into Supabase Auth.
// Usage: SUPABASE_ACCESS_TOKEN in .env.local, then:
//   node scripts/setup-auth.mjs

import { existsSync, readFileSync } from 'node:fs'
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

const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SB_PAT
const ref =
  process.env.SUPABASE_PROJECT_REF ||
  (process.env.VITE_SUPABASE_URL || '').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ||
  ''

const webApp = (process.env.VITE_WEB_APP_URL || 'https://did-i.app').replace(/\/$/, '')

// Native Google OAuth returns here (expo-auth-session + didi:// scheme).
// Web OAuth uses the site; hash routes are client-only so allow the path.
const WANT = [
  'didi://auth/callback',
  `${webApp}`,
  `${webApp}/app`,
  'http://127.0.0.1:48741',
  'http://localhost:48741',
]

function need(label, value) {
  if (value) return
  console.error(`Missing ${label} in .env.local`)
  process.exit(1)
}

need('SUPABASE_ACCESS_TOKEN', token)
need('SUPABASE project (VITE_SUPABASE_URL or SUPABASE_PROJECT_REF)', ref)

const base = `https://api.supabase.com/v1/projects/${ref}/config/auth`
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
}

const getRes = await fetch(base, { headers })
const current = await getRes.json()
if (!getRes.ok) {
  console.error(`Could not read auth config (${getRes.status})`)
  console.error(current?.message || JSON.stringify(current).slice(0, 400))
  process.exit(1)
}

const have = new Set(
  String(current.uri_allow_list || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)
for (const url of WANT) have.add(url)

const body = {
  uri_allow_list: [...have].join(','),
}

const patchRes = await fetch(base, {
  method: 'PATCH',
  headers,
  body: JSON.stringify(body),
})

const text = await patchRes.text()
let json = null
try {
  json = JSON.parse(text)
} catch {
  // ok
}

if (!patchRes.ok) {
  console.error(`Auth setup failed (${patchRes.status})`)
  if (patchRes.status === 403) {
    console.error('Your PAT may need Administrator on this project (not just Developer).')
  }
  console.error(json?.message || text.slice(0, 400))
  process.exit(1)
}

const added = WANT.filter((url) => !String(current.uri_allow_list || '').includes(url))
console.log(`Auth config updated on project ${ref}`)
console.log(`  site_url: ${json?.site_url || current.site_url}`)
console.log(`  uri_allow_list: ${json?.uri_allow_list || body.uri_allow_list}`)
if (added.length) console.log(`  added: ${added.join(', ')}`)
