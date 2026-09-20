// Push custom SMTP from .env.local into Supabase Auth.
// Usage: fill SMTP_* and SUPABASE_ACCESS_TOKEN in .env.local, then:
//   node scripts/setup-smtp.mjs

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

const host = process.env.SMTP_HOST || ''
const port = process.env.SMTP_PORT || '587'
const user = process.env.SMTP_USER || ''
const pass = process.env.SMTP_PASS || ''
const from = process.env.SMTP_FROM || ''
const sender = process.env.SMTP_SENDER_NAME || 'Did I'

function need(label, value) {
  if (value) return
  console.error(`Missing ${label} in .env.local`)
  process.exit(1)
}

need('SUPABASE_ACCESS_TOKEN', token)
need('SUPABASE project (VITE_SUPABASE_URL or SUPABASE_PROJECT_REF)', ref)
need('SMTP_HOST', host)
need('SMTP_USER', user)
need('SMTP_PASS', pass)
need('SMTP_FROM', from)

const body = {
  external_email_enabled: true,
  mailer_autoconfirm: false,
  smtp_admin_email: from,
  smtp_host: host,
  smtp_port: String(port),
  smtp_user: user,
  smtp_pass: pass,
  smtp_sender_name: sender,
}

const url = `https://api.supabase.com/v1/projects/${ref}/config/auth`
const res = await fetch(url, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
})

const text = await res.text()
let json = null
try {
  json = JSON.parse(text)
} catch {
  // ok
}

if (!res.ok) {
  console.error(`SMTP setup failed (${res.status})`)
  if (res.status === 403) {
    console.error('Your PAT may need Administrator on this project (not just Developer).')
  }
  console.error(json?.message || text.slice(0, 400))
  process.exit(1)
}

const smtpOn = json?.external_email_enabled ?? true
console.log(`SMTP enabled on project ${ref}`)
console.log(`  host: ${host}`)
console.log(`  from: ${from}`)
console.log(`  sender: ${sender}`)
console.log(`  external_email_enabled: ${smtpOn}`)
console.log('')
console.log('Send yourself a sign-in code in the app to confirm it lands in the inbox.')
