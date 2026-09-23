// Enable Sign in with Apple on Supabase Auth (Management API).
// Needs: SUPABASE_ACCESS_TOKEN, APPLE_SERVICES_ID, APPLE_SIGNIN_KEY_ID, .p8 key.
//   node scripts/setup-apple-auth.mjs

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

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
  ''

const servicesId = process.env.APPLE_SERVICES_ID || ''
const bundleId = process.env.APPLE_BUNDLE_ID || 'com.aaronbryant.didi'
const webApp = (process.env.VITE_WEB_APP_URL || 'https://did-i.app').replace(/\/$/, '')

function need(label, value) {
  if (value) return
  console.error(`Missing ${label} in .env.local`)
  process.exit(1)
}

need('SUPABASE_ACCESS_TOKEN', token)
need('SUPABASE project ref', ref)
need('APPLE_SERVICES_ID', servicesId)

const secretProc = spawnSync(process.execPath, ['scripts/apple-client-secret.mjs'], {
  encoding: 'utf8',
  cwd: resolve('.'),
})
if (secretProc.status !== 0) {
  console.error(secretProc.stderr || 'Could not build Apple client secret')
  process.exit(1)
}
const appleSecret = secretProc.stdout.trim()

const base = `https://api.supabase.com/v1/projects/${ref}/config/auth`
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
}

const getRes = await fetch(base, { headers })
const current = await getRes.json()
if (!getRes.ok) {
  console.error(`Could not read auth config (${getRes.status})`)
  process.exit(1)
}

const have = new Set(
  String(current.uri_allow_list || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)
for (const url of [
  'didi://auth/callback',
  `${webApp}`,
  `${webApp}/app`,
  'http://127.0.0.1:48741',
  'http://localhost:48741',
]) {
  have.add(url)
}

const body = {
  uri_allow_list: [...have].join(','),
  external_apple_enabled: true,
  external_apple_client_id: servicesId,
  external_apple_secret: appleSecret,
  external_apple_additional_client_ids: bundleId,
}

const patchRes = await fetch(base, { method: 'PATCH', headers, body: JSON.stringify(body) })
const text = await patchRes.text()
if (!patchRes.ok) {
  console.error(`Apple auth setup failed (${patchRes.status})`)
  console.error(text.slice(0, 500))
  process.exit(1)
}

console.log(`Apple auth enabled on ${ref}`)
console.log(`  services_id: ${servicesId}`)
console.log(`  additional_client_ids: ${bundleId}`)
console.log('  Set VITE_APPLE_AUTH=1 in env.client.js (or EAS env) to show the button in the app.')
