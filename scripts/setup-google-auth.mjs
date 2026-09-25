// Turn on Google sign-in in Supabase Auth (Management API).
// Needs in .env.local: SUPABASE_ACCESS_TOKEN, GOOGLE_WEB_CLIENT_ID,
// GOOGLE_WEB_CLIENT_SECRET, and optionally GOOGLE_IOS_CLIENT_ID and
// GOOGLE_ANDROID_CLIENT_ID. See docs/google-sign-in.md.
//   npm run google:auth:setup

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
    if (key === 'SUPABASE_ACCESS_TOKEN' || !process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SB_PAT
const ref =
  process.env.SUPABASE_PROJECT_REF ||
  (process.env.VITE_SUPABASE_URL || '').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ||
  'lsvvxslgizihbktqoybt'
const webId = process.env.GOOGLE_WEB_CLIENT_ID || ''
const webSecret = process.env.GOOGLE_WEB_CLIENT_SECRET || ''
const iosId = process.env.GOOGLE_IOS_CLIENT_ID || ''
const androidId = process.env.GOOGLE_ANDROID_CLIENT_ID || ''

for (const [label, value] of [
  ['SUPABASE_ACCESS_TOKEN', token],
  ['GOOGLE_WEB_CLIENT_ID', webId],
  ['GOOGLE_WEB_CLIENT_SECRET', webSecret],
]) {
  if (!value) {
    console.error(`Missing ${label} in .env.local`)
    process.exit(1)
  }
}

// Supabase checks a native ID token's audience against every ID listed here.
// The web client comes first; it is also the one the website redirect uses.
const clientIds = [webId, iosId, androidId].filter(Boolean).join(',')

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    external_google_enabled: true,
    external_google_client_id: clientIds,
    external_google_secret: webSecret,
    // The iOS Google SDK adds a nonce Supabase cannot see, so native sign-in fails without this.
    external_google_skip_nonce_check: true,
  }),
})
if (!res.ok) {
  console.error(`Google auth setup failed (${res.status})`)
  console.error((await res.text()).slice(0, 500))
  process.exit(1)
}

console.log(`Google auth enabled on ${ref}`)
console.log(`  client ids: ${clientIds.split(',').length}`)
console.log('  Next: put the client IDs in env.client.js and set VITE_GOOGLE_AUTH to 1.')
