// App Store Server Notifications V2: Apple posts here when a gem pack is
// refunded or revoked, and the pack's gems come back off the account.
//
// Deploy:  supabase functions deploy apple-notify --no-verify-jwt
//   (Apple sends no Supabase key; supabase/config.toml sets verify_jwt false.)
// App Store Connect > the app > App Information > App Store Server
// Notifications: Version 2, Production and Sandbox URL
//   https://<project>.supabase.co/functions/v1/apple-notify
// Secrets: the same APPLE_IAP_* as gem-iap.
//
// Anyone can post here, so the notice is only a hint: the transaction id is
// read from it, then Apple is asked about that transaction, and only Apple's
// answer (a revocationDate on one of our buys) takes gems back.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { APP_ID, appleTransaction, jwsPayload } from '../_shared/store-auth.ts'

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const ACTS_ON = new Set(['REFUND', 'REVOKE'])

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })
  // Apple's notices are a few KB.
  const text = await req.text()
  if (text.length > 64_000) return new Response('too big', { status: 413 })

  let transactionId = ''
  try {
    const notice = jwsPayload(String(JSON.parse(text)?.signedPayload || ''))
    if (!ACTS_ON.has(String(notice?.notificationType || ''))) return new Response('ok')
    if (notice?.data?.bundleId && notice.data.bundleId !== APP_ID) return new Response('ok')
    transactionId = String(jwsPayload(String(notice?.data?.signedTransactionInfo || ''))?.transactionId || '')
  } catch {
    return new Response('bad', { status: 400 })
  }
  if (!/^\d{6,32}$/.test(transactionId)) return new Response('bad', { status: 400 })

  // Only buys we credited are worth a call to Apple.
  const { data: buy } = await admin
    .from('gem_purchases')
    .select('id, refunded_at')
    .eq('store', 'apple')
    .eq('store_ref', transactionId)
    .maybeSingle()
  if (!buy || buy.refunded_at) return new Response('ok')

  let info: Record<string, unknown> | null = null
  try {
    info = await appleTransaction(transactionId)
  } catch {
    info = null
  }
  // Apple retries a notice that is not answered 200, so a miss here comes back.
  if (!info) return new Response('store', { status: 503 })
  if (info.bundleId !== APP_ID || !info.revocationDate) return new Response('ok')

  const { error } = await admin.rpc('refund_gem_purchase', { from_store: 'apple', ref: transactionId })
  if (error) return new Response('miss', { status: 500 })
  return new Response('ok')
})
