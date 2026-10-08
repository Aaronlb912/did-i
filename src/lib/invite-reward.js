import { INVITE_BUDDY_AT, INVITE_FRAME_AT, INVITE_GEMS_CAP, INVITE_LOOK_AT, inviteGemsFor, inviteGemsLeft } from './people.js'
import { REFER_BUDDY } from './purse.js'

export const REFER_FRAME = 'bloom'

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

// The Refer page ladder: every reward a friend count earns, in order. Gems
// follow inviteGemsFor up to INVITE_GEMS_CAP, then the Night look, the Hive
// buddy and the Bloom frame. Each rung: { n, kind, gems?, id?, state, left },
// state 'got', 'next' or 'later'.
export function referLadder(joined) {
  const have = Math.max(0, Math.floor(Number(joined) || 0))
  const rungs = []
  let left = INVITE_GEMS_CAP
  for (let i = 1; left > 0; i += 1) {
    const gems = Math.min(inviteGemsFor(i), left)
    rungs.push({ n: i, kind: 'gems', gems })
    left -= gems
  }
  rungs.push({ n: INVITE_LOOK_AT, kind: 'look', id: 'night' })
  rungs.push({ n: INVITE_BUDDY_AT, kind: 'buddy', id: REFER_BUDDY })
  rungs.push({ n: INVITE_FRAME_AT, kind: 'frame', id: REFER_FRAME })
  rungs.sort((a, b) => a.n - b.n)
  let next = false
  for (const rung of rungs) {
    rung.left = Math.max(0, rung.n - have)
    if (!rung.left) rung.state = 'got'
    else if (!next) {
      rung.state = 'next'
      next = true
    } else rung.state = 'later'
  }
  // The big count always runs to the last reward, the frame.
  const goal = INVITE_FRAME_AT
  return {
    joined: have,
    goal,
    pct: Math.min(100, (have / goal) * 100),
    toBuddy: Math.max(0, INVITE_BUDDY_AT - have),
    toFrame: Math.max(0, INVITE_FRAME_AT - have),
    rungs,
  }
}

// The line under the count.
export function referLadderNote(ladder) {
  if (ladder.toBuddy) return { key: 'refer.toBuddy', vars: { n: ladder.toBuddy } }
  if (ladder.toFrame) return { key: 'refer.toFrame', vars: { n: ladder.toFrame } }
  return { key: 'refer.allDone', vars: {} }
}
