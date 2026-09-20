// Drains push_queue and hands each nudge to Firebase.
//
// Deploy:  supabase functions deploy push
// Secrets: supabase secrets set FCM_PROJECT_ID=... FCM_CLIENT_EMAIL=... FCM_PRIVATE_KEY="..."
// Schedule: a cron every minute, or call it from a database webhook.
//
// The three secrets come out of the Firebase service account JSON. The
// private key keeps its literal \n escapes; this reads them back.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const project = Deno.env.get('FCM_PROJECT_ID') ?? ''
const clientEmail = Deno.env.get('FCM_CLIENT_EMAIL') ?? ''
const privateKey = (Deno.env.get('FCM_PRIVATE_KEY') ?? '').replace(/\\n/g, '\n')

function base64url(input: Uint8Array | string) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function signingKey() {
  const body = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const raw = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8',
    raw,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

// Firebase wants an OAuth token, and the only way to get one is to sign
// a JWT with the service account key.
async function accessToken() {
  const now = Math.floor(Date.now() / 1000)
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const head = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(claim))
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    await signingKey(),
    new TextEncoder().encode(`${head}.${body}`),
  )
  const jwt = `${head}.${body}.${base64url(new Uint8Array(signature))}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!res.ok) throw new Error(`token ${res.status} ${await res.text()}`)
  return (await res.json()).access_token as string
}

async function send(token: string, row: Record<string, unknown>, bearer: string) {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${project}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: row.title, body: row.body },
        data: { go: String(row.go ?? '/inbox') },
        // The channel has to already exist on the phone or Android drops
        // the notification without a word. The app makes it on start.
        android: { priority: 'HIGH', notification: { channel_id: 'did-i' } },
        // iPhones need their own block. Firebase passes this to Apple as
        // is, and without it a nudge arrives silent and unbadged.
        apns: {
          headers: { 'apns-priority': '10' },
          payload: { aps: { sound: 'default', badge: 1, 'content-available': 1 } },
        },
      },
    }),
  })
  return res.ok ? '' : `${res.status} ${(await res.text()).slice(0, 200)}`
}

Deno.serve(async () => {
  if (!project || !clientEmail || !privateKey) {
    return new Response('firebase is not set up yet', { status: 503 })
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: batch, error } = await db.rpc('take_push_batch', { how_many: 50 })
  if (error) return new Response(error.message, { status: 500 })
  if (!batch?.length) return Response.json({ sent: 0 })

  const bearer = await accessToken()
  let sent = 0
  const dead: string[] = []
  // Why sends failed, without the tokens themselves. A push that quietly
  // goes nowhere is the whole reason this is hard to debug.
  const trouble: Record<string, number> = {}

  for (const row of batch) {
    for (const token of row.tokens ?? []) {
      const why = await send(token, row, bearer)
      if (!why) {
        sent += 1
        continue
      }
      // A token Firebase will never accept again: the app was removed,
      // reinstalled, or the token was never real.
      if (/UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT|SenderId mismatch/i.test(why)) {
        dead.push(token)
      }
      const kind =
        why.match(/UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT|SENDER_ID_MISMATCH|QUOTA_EXCEEDED|UNAVAILABLE|THIRD_PARTY_AUTH_ERROR/i)?.[0] ??
        why.slice(0, 40)
      trouble[kind] = (trouble[kind] ?? 0) + 1
    }
  }

  if (dead.length) {
    await db.from('devices').update({ push_token: null }).in('push_token', dead)
  }

  await db.rpc('sweep_push_queue')
  return Response.json({ sent, dropped: dead.length, trouble })
})
