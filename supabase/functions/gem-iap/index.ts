// In-app purchase finished. Ask the store whether it really happened, then credit gems.
//
// Deploy:  supabase functions deploy gem-iap
// Secrets:
//   Apple (App Store Connect > Users and Access > Integrations > In-App Purchase key):
//     APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID, APPLE_IAP_PRIVATE_KEY (the .p8 text)
//   Google (Play Console > Users and permissions, service account with financial data access):
//     GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
// Without them the function refuses every purchase with miss 'setup'. There is no trust switch.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const APP_ID = 'com.aaronbryant.didi'

// $1 per gem, bonus gems on bigger packs. Same table as src/lib/gem-packs.js.
const PACKS: Record<string, { gems: number; cents: number }> = {
  gems_1: { gems: 1, cents: 100 },
  gems_3: { gems: 3, cents: 300 },
  gems_5: { gems: 6, cents: 500 },
  gems_10: { gems: 14, cents: 1000 },
  gems_25: { gems: 40, cents: 2500 },
  gems_50: { gems: 80, cents: 5000 },
}

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

type Verified = { ok: true; ref: string } | { ok: false; miss: string }

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function b64url(bytes: Uint8Array | string) {
  const raw = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes
  let s = ''
  for (const b of raw) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(part: string) {
  const pad = part.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((part.length + 3) % 4)
  return JSON.parse(atob(pad))
}

function pemBytes(pem: string) {
  const body = pem.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
}

async function signJwt(header: Record<string, unknown>, payload: Record<string, unknown>, key: CryptoKey, algo: AlgorithmIdentifier | EcdsaParams) {
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const sig = new Uint8Array(await crypto.subtle.sign(algo, key, new TextEncoder().encode(input)))
  return `${input}.${b64url(sig)}`
}

// Apple: App Store Server API, Get Transaction Info. Review and TestFlight buys live in the sandbox.
async function verifyApple(productId: string, transactionId: string): Promise<Verified> {
  const keyId = Deno.env.get('APPLE_IAP_KEY_ID') || ''
  const issuer = Deno.env.get('APPLE_IAP_ISSUER_ID') || ''
  const pem = Deno.env.get('APPLE_IAP_PRIVATE_KEY') || ''
  if (!keyId || !issuer || !pem) return { ok: false, miss: 'setup' }
  if (!/^\d{6,32}$/.test(transactionId)) return { ok: false, miss: 'receipt' }

  const key = await crypto.subtle.importKey('pkcs8', pemBytes(pem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const now = Math.floor(Date.now() / 1000)
  const jwt = await signJwt(
    { alg: 'ES256', kid: keyId, typ: 'JWT' },
    { iss: issuer, iat: now, exp: now + 600, aud: 'appstoreconnect-v1', bid: APP_ID },
    key,
    { name: 'ECDSA', hash: 'SHA-256' },
  )

  for (const host of ['api.storekit.itunes.apple.com', 'api.storekit-sandbox.itunes.apple.com']) {
    const res = await fetch(`https://${host}/inApps/v1/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    })
    // Production answers 401 until the app is live; sandbox buys (review, TestFlight) 404 there.
    if (res.status === 404 || (res.status === 401 && host.startsWith('api.storekit.'))) continue
    if (!res.ok) return { ok: false, miss: 'store' }
    const { signedTransactionInfo } = await res.json()
    const info = fromB64url(String(signedTransactionInfo || '').split('.')[1] || '')
    if (info.bundleId !== APP_ID) return { ok: false, miss: 'receipt' }
    if (info.productId !== productId) return { ok: false, miss: 'receipt' }
    if (info.type !== 'Consumable') return { ok: false, miss: 'receipt' }
    if (info.revocationDate) return { ok: false, miss: 'refunded' }
    return { ok: true, ref: String(info.transactionId) }
  }
  return { ok: false, miss: 'receipt' }
}

// Google: Play Developer API, purchases.products.get, signed in as the service account.
async function verifyPlay(productId: string, purchaseToken: string): Promise<Verified> {
  const raw = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON') || ''
  if (!raw) return { ok: false, miss: 'setup' }
  if (purchaseToken.length < 20) return { ok: false, miss: 'receipt' }

  const account = JSON.parse(raw)
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemBytes(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const now = Math.floor(Date.now() / 1000)
  const assertion = await signJwt(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 600,
    },
    key,
    { name: 'RSASSA-PKCS1-v1_5' },
  )
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!tokenRes.ok) return { ok: false, miss: 'setup' }
  const { access_token } = await tokenRes.json()

  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${APP_ID}` +
    `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } })
  if (res.status === 404 || res.status === 400) return { ok: false, miss: 'receipt' }
  if (!res.ok) return { ok: false, miss: 'store' }
  const info = await res.json()
  // 0 purchased, 1 cancelled, 2 pending.
  if (info.purchaseState !== 0) return { ok: false, miss: info.purchaseState === 2 ? 'pending' : 'receipt' }
  return { ok: true, ref: String(info.orderId || purchaseToken) }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  const auth = req.headers.get('Authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) return json({ miss: 'signin' }, 401)

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  )
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData?.user) return json({ miss: 'signin' }, 401)
  const userId = userData.user.id

  let body: Record<string, string> = {}
  try {
    body = await req.json()
  } catch {
    return json({ miss: 'bad' }, 400)
  }

  const packId = String(body.packId || '')
  const platform = String(body.platform || '')
  const transactionId = String(body.transactionId || '')
  const purchaseToken = String(body.purchaseToken || '')

  const pack = PACKS[packId]
  if (!pack) return json({ miss: 'pack' }, 400)
  // The store product has to be the pack being credited, not whatever the client names.
  const productId = `${APP_ID}.${packId}`

  const store = platform === 'ios' ? 'apple' : platform === 'android' ? 'play' : ''
  if (!store) return json({ miss: 'store' }, 400)

  let verified: Verified
  try {
    verified = store === 'play' ? await verifyPlay(productId, purchaseToken) : await verifyApple(productId, transactionId)
  } catch {
    verified = { ok: false, miss: 'store' }
  }
  if (!verified.ok) return json({ miss: verified.miss }, verified.miss === 'setup' || verified.miss === 'store' ? 503 : 400)

  const { error } = await admin.rpc('record_gem_purchase', {
    who: userId,
    pack: packId,
    gem_count: pack.gems,
    paid_cents: pack.cents,
    from_store: store,
    ref: verified.ref.slice(0, 128),
  })

  if (error) return json({ miss: 'miss' }, 500)
  return json({ ok: true, pack: packId, gems: pack.gems })
})
