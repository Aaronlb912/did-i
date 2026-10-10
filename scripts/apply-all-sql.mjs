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
  'supabase/tonight.sql',
  'supabase/dit-board.sql',
  'supabase/gems-social.sql',
  'supabase/gem-purchases.sql',
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
]

const apply = resolve('scripts/apply-sql.mjs')

for (const file of files) {
  console.log(`\n--- ${file} ---`)
  const out = spawnSync(process.execPath, [apply, file], { stdio: 'inherit' })
  if (out.status !== 0) {
    console.error(`stopped at ${file}`)
    process.exit(out.status || 1)
  }
}

console.log('\nall sql applied')
