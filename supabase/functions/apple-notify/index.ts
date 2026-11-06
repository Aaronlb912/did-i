// App Store Server Notifications V2: Apple posts here when a gem pack is
// refunded or revoked, and the pack's gems come back off the account. When
// Apple reverses a refund (REFUND_REVERSED, after a dispute) the buyer has
// paid again, so the gems go back on (unrefund_gem_purchase, supabase/unrefund.sql).
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
// answer takes gems back (a revocationDate on one of our buys) or gives them
// back (a refunded buy of ours with no revocationDate).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { APP_ID, appleTransaction, jwsPayload } from '../_shared/store-auth.ts'

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const ACTS_ON = new Set(['REFUND', 'REVOKE'])
const REVERSES = 'REFUND_REVERSED'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })
  // Apple's notices are a few KB.
  const text = await req.text()
  if (text.length > 64_000) return new Response('too big', { status: 413 })

  let transactionId = ''
  let reversal = false
  try {
    const notice = jwsPayload(String(JSON.parse(text)?.signedPayload || ''))
    const kind = String(notice?.notificationType || '')
    reversal = kind === REVERSES
    if (!ACTS_ON.has(kind) && !reversal) return new Response('ok')
    if (notice?.data?.bundleId && notice.data.bundleId !== APP_ID) return new Response('ok')
    transactionId = String(jwsPayload(String(notice?.data?.signedTransactionInfo || ''))?.transactionId || '')
  } catch {
    return new Response('bad', { status: 400 })
  }
  if (!/^\d{6,32}$/.test(transactionId)) return new Response('bad', { status: 400 })

  // Only buys we credited are worth a call to Apple. A refund wants a buy not
  // refunded yet; a reversal wants one that was.
  const { data: buy } = await admin
    .from('gem_purchases')
    .select('id, refunded_at, store_checked_at')
    .eq('store', 'apple')
    .eq('store_ref', transactionId)
    .maybeSingle()
  if (!buy || (reversal ? !buy.refunded_at : buy.refunded_at)) return new Response('ok')
  // One check with Apple per buy per 15 minutes (forged notices repeat). Not
  // 200: Apple retries a notice it was not answered 200, so a real refund that
  // lands in the wait is checked on a retry, never dropped.
  const last = Date.parse(String(buy.store_checked_at || ''))
  if (last && Date.now() - last < 15 * 60 * 1000) return new Response('later', { status: 503 })
  await admin.from('gem_purchases').update({ store_checked_at: new Date().toISOString() }).eq('id', buy.id)

  let info: Record<string, unknown> | null = null
  try {
    info = await appleTransaction(transactionId)
  } catch {
    info = null
  }
  // Apple retries a notice that is not answered 200, so a miss here comes back.
  if (!info) return new Response('store', { status: 503 })
  if (info.bundleId !== APP_ID) return new Response('ok')
  // Apple's answer decides: a reversed refund has no revocationDate any more.
  if (reversal ? info.revocationDate : !info.revocationDate) return new Response('ok')

  const { error } = await admin.rpc(reversal ? 'unrefund_gem_purchase' : 'refund_gem_purchase', {
    from_store: 'apple',
    ref: transactionId,
  })
  if (error) return new Response('miss', { status: 500 })
  return new Response('ok')
})
