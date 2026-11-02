import * as StoreReview from 'expo-store-review'
import { markRateAsked, streakReviewDue } from '../src/lib/rate-ask.js'

// After a Did that takes the shelf streak to 7 (or the first one past it):
// the store's review sheet, once ever. Does nothing where the phone has none.
export async function askReviewAtStreak(streak) {
  if (!streakReviewDue(streak)) return
  try {
    if (!(await StoreReview.isAvailableAsync())) return
    markRateAsked()
    await StoreReview.requestReview()
  } catch {
    // The sheet is a nicety; never surface an error for it.
  }
}
