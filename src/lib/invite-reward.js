import { INVITE_GEMS_CAP, inviteGemsFor, inviteGemsLeft } from './people.js'

export function inviteRewardProgress(gemsPaid) {
  const paid = Math.max(0, Math.min(INVITE_GEMS_CAP, Math.floor(Number(gemsPaid) || 0)))
  return {
    paid,
    cap: INVITE_GEMS_CAP,
    pct: paid >= INVITE_GEMS_CAP ? 100 : (paid / INVITE_GEMS_CAP) * 100,
    full: paid >= INVITE_GEMS_CAP,
    left: inviteGemsLeft(paid),
  }
}

export function inviteNextFriendGems(joined, gemsPaid) {
  const left = inviteGemsLeft(gemsPaid)
  if (left <= 0) return 0
  return Math.min(inviteGemsFor(joined + 1), left)
}
