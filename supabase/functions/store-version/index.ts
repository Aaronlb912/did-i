// Keeps app_versions.latest in step with the stores, so "A new version is
// out" shows without anyone editing the row. Runs every 6 hours (cron in
// supabase/store-version.sql). Only ever raises `latest`; `minimum` stays
// hand-set.
//
// iPhone: the public App Store lookup. Android: the newest finished release on
// any track but internal testing (closed tracks have custom names), from
// its release name ("87 (1.3.8)" or "1.3.8").
//
// Deploy:  supabase functions deploy store-version
// Secrets: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, the same as gem-iap.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { APP_ID, playToken } from '../_shared/store-auth.ts'

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

function fromCron(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const part = token.split('.')[1]
  if (!part) return false
  try {
    const claims = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
    return claims?.role === 'service_role'
  } catch {
    return false
  }
}

const VERSION = /(\d+)\.(\d+)\.(\d+)/

function parts(v: string) {
  const m = VERSION.exec(v || '')
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

function newer(a: string, b: string) {
  const x = parts(a)
  const y = parts(b)
  if (!x) return false
  if (!y) return true
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] > y[i]
  return false
}

async function iosVersion() {
  const res = await fetch(`https://itunes.apple.com/lookup?bundleId=${APP_ID}&country=us&t=${Date.now()}`)
  if (!res.ok) return ''
  const body = await res.json()
  const v = String(body?.results?.[0]?.version || '')
  return VERSION.exec(v)?.[0] || ''
}

async function androidVersion() {
  const token = await playToken().catch(() => '')
  if (!token) return ''
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${APP_ID}/edits`
  const auth = { Authorization: `Bearer ${token}` }
  const made = await fetch(base, { method: 'POST', headers: auth })
  if (!made.ok) return ''
  const { id } = await made.json()
  try {
    const res = await fetch(`${base}/${id}/tracks`, { headers: auth })
    if (!res.ok) return ''
    const { tracks = [] } = await res.json()
    // Testers join the beta (did-i.app/beta). Closed tracks can have any name
    // ("Beta group"), so every track but internal testing.
    let best = ''
    for (const track of tracks) {
      if (track.track === 'internal') continue
      for (const release of track.releases || []) {
        if (release.status !== 'completed') continue
        const v = VERSION.exec(String(release.name || ''))?.[0] || ''
        if (newer(v, best)) best = v
      }
    }
    return best
  } finally {
    await fetch(`${base}/${id}`, { method: 'DELETE', headers: auth }).catch(() => {})
  }
}

Deno.serve(async (req) => {
  if (!fromCron(req)) return new Response('not allowed', { status: 401 })
  const found: Record<string, string> = {
    ios: await iosVersion().catch(() => ''),
    android: await androidVersion().catch(() => ''),
  }
  const { data, error } = await admin.from('app_versions').select('platform, latest')
  if (error) return new Response('miss', { status: 500 })
  const out: Record<string, string> = {}
  for (const row of data || []) {
    const v = found[row.platform]
    out[row.platform] = v || 'not read'
    if (!v || !newer(v, row.latest)) continue
    const { error: upError } = await admin
      .from('app_versions')
      .update({ latest: v, updated_at: new Date().toISOString() })
      .eq('platform', row.platform)
    if (upError) return new Response('miss', { status: 500 })
  }
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } })
})
