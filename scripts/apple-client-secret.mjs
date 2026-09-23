// Build the Apple OAuth client secret (JWT) for Supabase Auth.
// Usage: node scripts/apple-client-secret.mjs

import { createPrivateKey, sign } from 'node:crypto'
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

const teamId = process.env.APPLE_TEAM_ID || '2ZUKFKSSV8'
const keyId = process.env.APPLE_SIGNIN_KEY_ID || process.env.APPLE_KEY_ID || ''
const clientId = process.env.APPLE_SERVICES_ID || ''
const keyPath =
  process.env.APPLE_SIGNIN_KEY_PATH ||
  process.env.APPLE_KEY_PATH ||
  resolve('AuthKey_TL92CR5TVF.p8')

function need(label, value) {
  if (value) return
  console.error(`Missing ${label} (set in .env.local or env)`)
  process.exit(1)
}

need('APPLE_SERVICES_ID', clientId)
need('APPLE_SIGNIN_KEY_ID or APPLE_KEY_ID', keyId)
if (!existsSync(keyPath)) {
  console.error(`Missing key file at ${keyPath}`)
  process.exit(1)
}

const privateKey = createPrivateKey(readFileSync(keyPath, 'utf8'))

function b64url(json) {
  return Buffer.from(JSON.stringify(json)).toString('base64url')
}

const now = Math.floor(Date.now() / 1000)
const header = b64url({ alg: 'ES256', kid: keyId })
const body = b64url({
  iss: teamId,
  iat: now,
  exp: now + 15552000,
  aud: 'https://appleid.apple.com',
  sub: clientId,
})
const unsigned = `${header}.${body}`
const signature = sign('sha256', Buffer.from(unsigned), {
  key: privateKey,
  dsaEncoding: 'ieee-p1363',
})
process.stdout.write(`${unsigned}.${signature.toString('base64url')}`)
