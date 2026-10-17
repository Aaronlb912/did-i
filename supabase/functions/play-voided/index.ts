// Google Play voided purchases: every hour (cron in supabase/refunds.sql) read
// the buys Google refunded or charged back in the last 3 days and take their
// gems back off the account.
//
// Deploy:  supabase functions deploy play-voided
// Secrets: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, the same as gem-iap. The service
// account needs "View financial data" in Play Console.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { APP_ID, playToken } from '../_shared/store-auth.ts'

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

// verify_jwt checks the signature; only the cron job holds a service_role key.
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

Deno.serve(async (req) => {
  if (!fromCron(req)) return new Response('not allowed', { status: 401 })

  let token = ''
  try {
    token = await playToken()
  } catch {
    token = ''
  }
  if (!token) return new Response('play is not set up yet', { status: 503 })

  // Three days back, so a missed hour or two is caught on the next run.
  const since = Date.now() - 3 * 24 * 60 * 60 * 1000
  let pageToken = ''
  let seen = 0
  let taken = 0
  for (let page = 0; page < 20; page += 1) {
    const url = new URL(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${APP_ID}/purchases/voidedpurchases`)
    url.searchParams.set('startTime', String(since))
    url.searchParams.set('maxResults', '1000')
    if (pageToken) url.searchParams.set('token', pageToken)
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return new Response('store', { status: 503 })
    const body = await res.json()
    for (const voided of body.voidedPurchases || []) {
      seen += 1
      // gem-iap stores the order id, or the purchase token when there is none.
      for (const ref of [voided.orderId, voided.purchaseToken]) {
        if (!ref) continue
        const { data, error } = await admin.rpc('refund_gem_purchase', { from_store: 'play', ref: String(ref).slice(0, 128) })
        if (error) return new Response('miss', { status: 500 })
        if (data === 'taken' || data === 'unclaimed') {
          taken += 1
          break
        }
      }
    }
    pageToken = body.tokenPagination?.nextPageToken || ''
    if (!pageToken) break
  }
  return Response.json({ seen, taken })
})
