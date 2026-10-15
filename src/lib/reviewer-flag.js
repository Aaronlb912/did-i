import { cloud } from './cloud.js'

// App Review switch (supabase/reviewer-flag.sql). Offline, an error or
// anything but a plain true reads as off.
export async function readReviewerFlag(db = cloud()) {
  if (!db) return false
  try {
    const { data, error } = await db.rpc('reviewer_signin_on')
    return !error && data === true
  } catch {
    return false
  }
}

export const REVIEWER_HOLD_MS = 3000
