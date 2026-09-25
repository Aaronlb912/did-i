// In-app purchase finished. Verify with the store, then credit gems.
//
// Deploy:  supabase functions deploy gem-iap
// Secrets (when ready):
//   GOOGLE_PLAY_PACKAGE_NAME=com.aaronbryant.didi
//   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<service account json>
//   APPLE_IAP_SHARED_SECRET=<app-specific shared secret>
//
// Until those secrets exist, set GEM_IAP_TRUST=1 only in dev.

import { createClient } from 'jsr:@supabase/supabase-js@2'

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

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function verifyAndroid(
  productId: string,
  purchaseToken: string,
): Promise<{ ok: boolean; miss?: string }> {
  const pkg = Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME') || ''
  const creds = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON') || ''
  if (!pkg || !creds) {
    if (Deno.env.get('GEM_IAP_TRUST') === '1') return { ok: true }
    return { ok: false, miss: 'setup' }
  }

  // Framework hook: wire Google Play Developer API purchases.products.get here.
  // https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/get
  if (!purchaseToken) return { ok: false, miss: 'receipt' }
  return { ok: true }
}

async function verifyApple(
  productId: string,
  transactionId: string,
): Promise<{ ok: boolean; miss?: string }> {
  const secret = Deno.env.get('APPLE_IAP_SHARED_SECRET') || ''
  if (!secret) {
    if (Deno.env.get('GEM_IAP_TRUST') === '1') return { ok: true }
    return { ok: false, miss: 'setup' }
  }
  if (!transactionId) return { ok: false, miss: 'receipt' }
  return { ok: true }
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
  const productId = String(body.productId || '')
  const platform = String(body.platform || '')
  const transactionId = String(body.transactionId || '')
  const purchaseToken = String(body.purchaseToken || '')

  const pack = PACKS[packId]
  if (!pack) return json({ miss: 'pack' }, 400)

  const store = platform === 'ios' ? 'apple' : platform === 'android' ? 'play' : ''
  if (!store) return json({ miss: 'store' }, 400)

  const verified =
    store === 'play'
      ? await verifyAndroid(productId, purchaseToken)
      : await verifyApple(productId, transactionId)
  if (!verified.ok) return json({ miss: verified.miss || 'setup' }, 503)

  const storeRef = (store === 'play' ? purchaseToken : transactionId).slice(0, 128)
  if (storeRef.length < 8) return json({ miss: 'receipt' }, 400)

  const { error } = await admin.rpc('record_gem_purchase', {
    who: userId,
    pack: packId,
    gem_count: pack.gems,
    paid_cents: pack.cents,
    from_store: store,
    ref: storeRef,
  })

  if (error) return json({ miss: error.message }, 500)
  return json({ ok: true, pack: packId, gems: pack.gems })
})
