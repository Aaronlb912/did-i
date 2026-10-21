// Apply every SQL migration in the order docs/running-it.md lists.
// Usage: set SUPABASE_ACCESS_TOKEN in .env.local, then:
//   npm run db:apply:all

import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const files = [
  'supabase/schema.sql',
  'supabase/people.sql',
  'supabase/handle-safe.sql',
  'supabase/hardening.sql',
  'supabase/rls-subselect.sql',
  'supabase/invite-guard.sql',
  'supabase/answers.sql',
  'supabase/blocks.sql',
  'supabase/push.sql',
  'supabase/family-summary.sql',
  'supabase/gems-social.sql',
  'supabase/gem-purchases.sql',
  'supabase/iap-tries.sql',
  'supabase/shop-catalog.sql',
  'supabase/wallet.sql',
  'supabase/waitlist.sql',
  'supabase/friend-cheers.sql',
  'supabase/auto-add.sql',
  'supabase/did-we.sql',
  'supabase/did-you-repeat.sql',
  'supabase/did-we-guard.sql',
  'supabase/gifts.sql',
  'supabase/lockdown.sql',
  'supabase/friend-ids.sql',
  'supabase/family-join.sql',
  'supabase/avatars.sql',
  'supabase/app-version.sql',
  'supabase/did-you-links.sql',
  'supabase/share-links.sql',
  'supabase/unfriend.sql',
  'supabase/reliability.sql',
  'supabase/shop-drops.sql',
  'supabase/device-names.sql',
  'supabase/friends-week.sql',
  'supabase/streak-guard.sql',
  'supabase/referral-rewards.sql',
  'supabase/friend-notes.sql',
  'supabase/milestones.sql',
  'supabase/social-gentle.sql',
  'supabase/social-amounts.sql',
  'supabase/shared-every.sql',
  'supabase/admin.sql',
  'supabase/admin-mail.sql',
  'supabase/send-answers.sql',
  'supabase/consent-guards.sql',
  'supabase/app-send-answer-upsert.sql',
  'supabase/server-stamps.sql',
  'supabase/readthrough-5.sql',
  'supabase/readthrough-6.sql',
  'supabase/readthrough-7.sql',
  'supabase/readthrough-8.sql',
  'supabase/gift-owned.sql',
  'supabase/readthrough-9.sql',
  'supabase/readthrough-12.sql',
  'supabase/reviewer-flag.sql',
  'supabase/realtime.sql',
  'supabase/social-live.sql',
  'supabase/answer-keys.sql',
  'supabase/wake-push.sql',
  'supabase/gift-thanks.sql',
  'supabase/friend-ask-name.sql',
  'supabase/abuse-caps.sql',
  'supabase/refunds.sql',
  'supabase/invite-owner.sql',
  'supabase/live-more.sql',
  'supabase/morning-cap.sql',
  'supabase/sweep-guards.sql',
  'supabase/sweep2-guards.sql',
  'supabase/store-version.sql',
  'supabase/we-slots.sql',
  'supabase/family-code-10.sql',
  'supabase/gem-cap.sql',
  'supabase/keep-did.sql',
  'supabase/family-edit.sql',
  'supabase/we-keep-done.sql',
  'supabase/coin-race.sql',
  'supabase/big-purse.sql',
  'supabase/family-guard.sql',
  'supabase/friend-id-ask.sql',
  'supabase/we-wake.sql',
  'supabase/we-joined-push.sql',
  'supabase/social-pushes.sql',
  'supabase/report-push.sql',
  'supabase/tour-coins.sql',
  'supabase/note-merge.sql',
  'supabase/answer-merge.sql',
  'supabase/drop-tonight.sql',
]

const apply = resolve('scripts/apply-sql.mjs')

for (const file of files) {
  console.log(`\n--- ${file} ---`)
  const out = spawnSync(process.execPath, [apply, file, '--in-order'], { stdio: 'inherit' })
  if (out.status !== 0) {
    console.error(`stopped at ${file}`)
    process.exit(out.status || 1)
  }
}

console.log('\nall sql applied')
