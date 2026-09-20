// Stripe checkout finished. Credit gems on the account.
//
// Deploy:  supabase functions deploy gem-stripe --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// Stripe webhook event: checkout.session.completed
//
// Payment Links need client_reference_id = userId:packId from the app.

import Stripe from 'npm:stripe@17'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const PACKS: Record<string, { gems: number; cents: number }> = {
  gems_1: { gems: 1, cents: 100 },
  gems_3: { gems: 3, cents: 270 },
  gems_5: { gems: 5, cents: 425 },
  gems_10: { gems: 10, cents: 700 },
  gems_25: { gems: 25, cents: 1500 },
  gems_50: { gems: 50, cents: 3000 },
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-11-20.acacia',
})
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig || !webhookSecret) {
    return new Response('not configured', { status: 500 })
  }

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return new Response('bad signature', { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ ok: true, skipped: event.type }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const session = event.data.object as Stripe.Checkout.Session
  if (session.payment_status !== 'paid') {
    return new Response(JSON.stringify({ ok: true, skipped: 'unpaid' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const ref = String(session.client_reference_id || '')
  const colon = ref.indexOf(':')
  if (colon < 1) {
    return new Response('missing reference', { status: 400 })
  }

  const userId = ref.slice(0, colon)
  const packId = ref.slice(colon + 1)
  const pack = PACKS[packId]
  if (!pack) {
    return new Response('unknown pack', { status: 400 })
  }

  const paid = session.amount_total ?? 0
  if (paid > 0 && paid < pack.cents) {
    return new Response('amount mismatch', { status: 400 })
  }

  const storeRef = String(session.id || event.id)
  const { error } = await admin.rpc('record_gem_purchase', {
    who: userId,
    pack: packId,
    gem_count: pack.gems,
    paid_cents: paid > 0 ? paid : pack.cents,
    from_store: 'stripe',
    ref: storeRef,
  })

  if (error) {
    return new Response(error.message, { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true, pack: packId, gems: pack.gems }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
