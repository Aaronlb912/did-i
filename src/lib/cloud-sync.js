import { useEffect, useState } from 'react'
import { recordAppError } from './app-errors.js'
import { deviceKey, deviceLabel, deviceModel, devicePlatform, takeOldDeviceKey } from './account.js'
import { noteAvatar } from './avatar.js'
import { addNotice, clearNotices, markNoticesSeen } from './notices.js'
import { giftThanksNotice } from './gift-history.js'
import { clearAuthSkip } from './auth-gate.js'
import { forgetAccountCaches } from './account-cache.js'
import { clearLocalShelf, readShelf, writeShelf } from './board-shelf.js'
import { cloud, cloudSetUp } from './cloud.js'
import { forgetAnswerKey, refreshAnswerKey } from './answer-key.js'
import { mergePrefs, readPrefs, writePrefs } from './prefs.js'
import { readSavedAt, stampSavedAt } from './saved-at.js'
import { mergeShelves } from './shelf-merge.js'
import {
  applyAnswers,
  dropSentAnswers,
  forgetAnswerMarks,
  pruneAnswers,
  pullAnswers,
  purgeDemoAnswers,
  pushAnswers,
  runPendingUndos,
  shelfWithoutAnswers,
} from './answer-log.js'
import { stripDemoShelf } from './demo-strip.js'
import { personZone } from './zone.js'
import { pushSendAnswers } from './send-answers.js'
import { shelfStreak } from './hall-feel.js'
import { clearWeNights, onWeNights, weNight } from './we-nights.js'
import { allClearTonight, boardDate, countedTonightRows, dueTonight } from './recurrence.js'
import { claimGifts, claimInvites, onGiftsWaiting, readMine, takeGiftThanks } from './people.js'
import { clearGifts, queueGifts } from './gift-inbox.js'
import { applyPendingInvite } from './invite-link.js'
import { claimGemPurchases } from './gem-claim.js'
import { applyInvitePayout, dropEarnedCoins, mergeGift, mergePurses } from './purse.js'
import { FRAME_IDS } from './frames.js'
import {
  applyCoinBalanceToShelf,
  applyCoinCatalogToShelf,
  applyGemBalanceToShelf,
  applyGemOwnedToShelf,
  grantWeeklyGem,
  readCoinCatalog,
  readGemBalance,
  readGemOwned,
} from './wallet.js'
import { closeShelfPastNights } from './daily.js'
import { noteSocialLive } from './social-live.js'
import { isAppForeground, onAppForegroundChange } from './app-foreground.js'
import { readAccountUserId, writeAccountUserId } from './session-id.js'
import { forgetTravelSkips } from './travel.js'
import { flushPendingWidgetCloud, widgetCloudPending } from './widget-cloud-sync.js'
import { awaitWidgetTimeline, reconcileShelfFromWidget, reconcileShelfFromWidgetNow } from './widget-reconcile.js'

export const SHELF_IN = 'did-i-shelf-in'

// Set when a SHELF_IN comes from a sign-in or sign-out, so the widget is
// redrawn even when tonight's questions look the same (look, buddy, Did we).
let accountChanged = false
export function takeAccountChanged() {
  const was = accountChanged
  accountChanged = false
  return was
}
const GEM_WEEK_ASKED_KEY = 'did-i-gem-week-asked'
export { accountSessionOn } from './session-id.js'
const SYNC_KEY = 'did-i-sync'

const listeners = new Set()
let timer = 0
let pulling = null
let foregroundBound = false
let authBound = false

function loadPersistedSync() {
  try {
    const raw = localStorage.getItem(SYNC_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    if (!saved || typeof saved !== 'object') return null
    return {
      how: saved.how || 'out',
      at: saved.at || '',
      miss: saved.miss || '',
    }
  } catch {
    return null
  }
}

function persistSync(next) {
  try {
    if (next.how === 'off') localStorage.removeItem(SYNC_KEY)
    else {
      localStorage.setItem(
        SYNC_KEY,
        JSON.stringify({ how: next.how, at: next.at || '', miss: next.miss || '' }),
      )
    }
  } catch {
    // ok
  }
}

let state = loadPersistedSync() || { how: cloudSetUp() ? 'out' : 'off', at: '', miss: '' }

function setState(patch) {
  state = { ...state, ...patch }
  persistSync(state)
  listeners.forEach((fn) => fn(state))
}

export function readSync() {
  return state
}

export function onSync(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useSync() {
  const [now, setNow] = useState(readSync)
  useEffect(() => onSync(setNow), [])
  return now
}

async function me() {
  const db = cloud()
  if (!db) return null
  const { data } = await db.auth.getSession()
  return data?.session?.user || null
}

// Like me(), but a failed token refresh (offline with an old access token)
// throws instead of reading as signed out: that path wipes the shelf.
async function meOrThrow() {
  const db = cloud()
  if (!db) return null
  const { data, error } = await db.auth.getSession()
  if (!data?.session && error) throw error
  return data?.session?.user || null
}

function readLastUser() {
  return readAccountUserId()
}

function writeLastUser(id) {
  writeAccountUserId(id)
}

// Whose data is on the phone, set the moment a pull lands it. Last user is
// only set once the push succeeds, so a pull cut short would otherwise leave
// one account's shelf looking phone-only and fold it into the next account.
const OWNER_KEY = 'did-i-shelf-owner'
function readShelfOwner() {
  try {
    return localStorage.getItem(OWNER_KEY) || ''
  } catch {
    return ''
  }
}
function writeShelfOwner(id) {
  try {
    if (id) localStorage.setItem(OWNER_KEY, id)
    else localStorage.removeItem(OWNER_KEY)
  } catch {
    // ok
  }
}

// Bumped on sign out so a pull already out drops its result instead of
// merging the old account's shelf into the cleared one.
let syncRun = 0

export function signedOutSync() {
  syncRun += 1
  // Every way out (here, everywhere, deleted, signed out elsewhere) lands here.
  forgetAccountCaches()
  clearGifts()
  dropEarnedCoins()
  // The next person to sign in on this phone starts from nothing.
  forgetAnswerMarks()
  forgetAnswerKey()
  clearWeNights()
  forgetTravelSkips()
  // Recent notices and your photo belong to the account that left.
  clearNotices()
  markNoticesSeen(0)
  noteAvatar('')
  const shelf = clearLocalShelf()
  keepProfileName('')
  writeLastUser('')
  writeShelfOwner('')
  clearAuthSkip()
  // Settings go with the account; theme, language and clock stay with the
  // phone. No stamps left, so the next account's own settings win the merge.
  const { theme, locale, clock, lessMotion } = readPrefs()
  try {
    localStorage.removeItem('did-i-prefs')
  } catch {
    // Nothing stored.
  }
  writePrefs({ theme, locale, clock, lessMotion, at: {} }, true)
  setState({ how: cloudSetUp() ? 'out' : 'off', at: '', miss: '', firstPull: false })
  if (typeof window !== 'undefined') {
    accountChanged = true
    window.dispatchEvent(new CustomEvent(SHELF_IN, { detail: shelf }))
  }
}

// No session. A phone that was signed in lost its account (signed out
// somewhere else), so it starts the next person from nothing. A phone-only
// shelf never belonged to an account, and wiping it throws away the
// questions someone just added.
export function sessionMissing() {
  if (readLastUser() || readShelfOwner()) {
    signedOutSync()
    return
  }
  // No last user can still mean a sign in whose id never landed: coins it
  // queued must not reach the next account.
  dropEarnedCoins()
  if (state.how !== 'out' || state.firstPull) setState({ how: 'out', miss: '', firstPull: false })
}

// Structure only. Answers go through answer-log.js, one at a time,
// because they are the part that grows without end.
async function putShelf(db, user, shelf, savedAt) {
  const at = savedAt || new Date().toISOString()
  const { error } = await db.from('shelves').upsert(
    {
      user_id: user.id,
      doc: shelfWithoutAnswers(shelf),
      saved_at: at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (!error) writeSeenAt(at)
  return error
}

// The server shelf this phone last wrote or merged. A push finds a newer one
// when another phone wrote since: it pulls and merges instead of overwriting.
const SEEN_KEY = 'did-i-shelf-seen'
function readSeenAt() {
  try {
    return localStorage.getItem(SEEN_KEY) || ''
  } catch {
    return ''
  }
}
function writeSeenAt(at) {
  try {
    localStorage.setItem(SEEN_KEY, at)
  } catch {
    // The next push pulls first.
  }
}

// The streak and the night, so friends and Did I tonight have something
// to read. Answers themselves never leave answer_log.
function nightMark(shelf, now = new Date()) {
  const boards = shelf?.boards || []
  const night = boardDate(now)
  const we = weNight(night)
  const hadAny = we.due > 0 || boards.some((book) => countedTonightRows(dueTonight(book, now)).length > 0)
  const clear =
    hadAny &&
    (!we.due || we.clear) &&
    boards.every((book) => countedTonightRows(dueTonight(book, now)).length === 0 || allClearTonight(book, now))
  // The real streak, not the room's glow that stops at five.
  return { streak: shelfStreak(boards, now), doneOn: clear ? night : null, night }
}

async function putPrefs(db, user, shelf) {
  const doc = shelf || readShelf()
  const mark = nightMark(doc)
  const { error } = await db.from('profiles').upsert(
    {
      user_id: user.id,
      prefs: readPrefs(),
      zone: personZone(),
      streak: mark.streak,
      done_on: mark.doneOn,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (!error) {
    markCleared(db, user, mark)
    markCard(db, user, doc)
    pushSendAnswers(db, user, doc)
  }
  return error || null
}

// The look and frame you wear, for the small card on a friend's page. Its
// own write, sent only when it changes, so a server without frame_on yet
// never stops the sync above.
let cardSent = ''
function markCard(db, user, shelf) {
  const purse = mergePurses(shelf?.boards || [])
  const look = /^[a-z0-9-]{1,24}$/.test(purse.lookOn || '') ? purse.lookOn : 'lime'
  const frame = FRAME_IDS.has(purse.frame) ? purse.frame : ''
  const key = `${user.id}:${look}:${frame}`
  if (key === cardSent) return
  cardSent = key
  Promise.resolve(db.from('profiles').update({ look_on: look, frame_on: frame }).eq('user_id', user.id))
    .then((res) => {
      if (res?.error) cardSent = ''
    })
    .catch(() => {
      cardSent = ''
    })
}

// Tonight cleared or not, for a friend's week. Sent only when it changes.
let clearedSent = ''
function markCleared(db, user, mark) {
  const key = `${user.id}:${mark.night}:${mark.doneOn ? 1 : 0}`
  if (key === clearedSent) return
  clearedSent = key
  Promise.resolve(db.rpc('mark_cleared', { night: mark.night, cleared: Boolean(mark.doneOn) }))
    .then((res) => {
      if (res?.error) clearedSent = ''
    })
    .catch(() => {
      clearedSent = ''
    })
}

/** Lets push run while a session exists but sync UI still says signed out. */
export function armSyncForUser() {
  if (!cloudSetUp() || state.how === 'off') return
  // Just signed in: until the first pull lands, Tonight shows loading rows,
  // not an empty "all clear" from a shelf that has not arrived yet.
  if (state.how === 'out') setState({ how: 'busy', miss: '', firstPull: true })
}

/** True from sign-in until the first pull has landed (or failed). */
export function firstPullWaiting(sync = state) {
  return sync.firstPull === true
}

/** Pull when the account session appears or returns. */
export function bindAuthSync() {
  if (authBound) return
  authBound = true
  const db = cloud()
  if (!db) return

  db.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      armSyncForUser()
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') pullAndMerge()
      // Another account signed in: drop the old one's topics first.
      if (live?.userId && live.userId !== session.user.id) stopLiveAnswers()
      if (foregroundBound && isAppForeground()) startLiveAnswers()
      return
    }
    if (event === 'SIGNED_OUT') {
      stopLiveAnswers()
      forgetAccountCaches()
      sessionMissing()
    }
  })
}

/** Push pending edits, then pull and merge when the app comes to the front. */
export function bindForegroundSync() {
  if (foregroundBound) return
  foregroundBound = true
  bindAuthSync()

  const db = cloud()
  if (db) {
    db.auth.getSession().then(({ data }) => {
      if (data?.session) armSyncForUser()
      if (data?.session && isAppForeground()) startLiveAnswers()
    })
  }

  function onWake() {
    if (!isAppForeground()) return
    pullAndMerge()
    startLiveAnswers()
  }

  // A gift arrived while the app is open: sync opens it. At most once a minute.
  let giftWakeAt = 0
  onGiftsWaiting(() => {
    if (Date.now() - giftWakeAt < 60000) return
    giftWakeAt = Date.now()
    onWake()
  })

  function onSleep() {
    stopLiveAnswers()
    reconcileLocalShelfFromWidget()
    flushPushSoon()
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onWake()
      else onSleep()
    })
  }

  onAppForegroundChange((on) => {
    if (on) onWake()
    else onSleep()
  })
}

// Answers made on another device of this account, while this one is open
// (supabase/realtime.sql). Each row goes through applyAnswers, the same merge
// a pull uses: a later answeredAt wins, so our own sends coming back and a
// row seen twice change nothing. Nothing is sent back and no coins are paid.
// A missed row (asleep, offline, a dropped socket) still comes with the next
// pull on focus or launch.
let live = null
let liveRows = []
let liveTimer = 0

function applyLiveRows() {
  liveTimer = 0
  const rows = liveRows
  liveRows = []
  // A pull in flight lands the shelf it started from; fold these in after it.
  if (pulling) {
    pulling.finally(() => {
      if (!live) return
      liveRows.push(...rows)
      if (!liveTimer) liveTimer = setTimeout(applyLiveRows, 0)
    })
    return
  }
  // In order: an undo then the answer from before it is two steps.
  let shelf = readShelf()
  let changed = 0
  for (const row of rows) {
    const step = row.gone ? dropSentAnswers(shelf, row.gone) : applyAnswers(shelf, [row])
    shelf = step.shelf
    changed += step.changed
  }
  if (!changed) return
  // Same saved stamp: only answers changed, and they travel on their own.
  const written = writeShelf(shelf, readSavedAt())
  window.dispatchEvent(new CustomEvent(SHELF_IN, { detail: written }))
}

export async function startLiveAnswers() {
  const db = cloud()
  if (!db?.channel || live) return
  live = { channel: null }
  const mine = live
  const user = await me().catch(() => null)
  if (live !== mine) return
  if (!user) {
    live = null
    return
  }
  mine.userId = user.id
  const take = (row) => {
    if (live !== mine || readLastUser() !== user.id) return
    liveRows.push(row)
    // One redraw for a batch sent in one go.
    if (!liveTimer) liveTimer = setTimeout(applyLiveRows, 50)
  }
  // Inserts and updates only: deletes are not published (realtime.sql).
  const onRow = (change) => {
    const row = change?.new
    if (row?.lamp_id && row.user_id === user.id) take(row)
  }
  mine.channel = db
    .channel(`answers:${user.id}:${Date.now()}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'answer_log', filter: `user_id=eq.${user.id}` }, onRow)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'answer_log', filter: `user_id=eq.${user.id}` }, onRow)
    .subscribe()
  // A private topic only this account may join (supabase/social-live.sql):
  // your own undos, and which kind of someone else's answer you can see
  // changed (the screens then read again the usual way).
  mine.social = db
    .channel(`didi:${user.id}`, { config: { private: true } })
    .on('broadcast', { event: 'live' }, (msg) => {
      if (live !== mine) return
      const payload = msg?.payload || {}
      if (payload.kind === 'undo') take({ gone: payload.gone })
      else noteSocialLive(payload.kind)
    })
    .subscribe()
}

export function stopLiveAnswers() {
  const old = live
  live = null
  liveRows = []
  if (old?.channel) cloud()?.removeChannel(old.channel).catch(() => {})
  if (old?.social) cloud()?.removeChannel(old.social).catch(() => {})
}

// Pull what the account has, fold it into what this phone has, then send
// the combined shelf back so every phone ends up holding the same thing.
function reconcileLocalShelfFromWidget() {
  return reconcileShelfFromWidgetNow()
}

async function pullAndMergeOnce() {
  const db = cloud()
  if (!db) return null
  const run = syncRun
  try {
    const user = await meOrThrow()
    if (!user) {
      sessionMissing()
      return null
    }
    setState({ how: 'busy', miss: '' })
    const [shelfRow, profileRow] = await Promise.all([
      db.from('shelves').select('doc, saved_at').eq('user_id', user.id).maybeSingle(),
      db.from('profiles').select('prefs').eq('user_id', user.id).maybeSingle(),
    ])
    if (shelfRow.error) throw shelfRow.error

    await awaitWidgetTimeline()
    const lastUser = readLastUser() || readShelfOwner()
    let local = reconcileLocalShelfFromWidget()
    let localSavedAt = readSavedAt()
    if (lastUser && lastUser !== user.id) {
      local = clearLocalShelf()
      // The old account's answer marks would hide the new account's older answers.
      forgetAnswerMarks()
      localSavedAt = ''
    }
    const remote = shelfRow.data?.doc || null
    const remoteSavedAt = shelfRow.data?.saved_at || ''
    const merged = mergeShelves(local, remote, localSavedAt, remoteSavedAt)
    const metaAt = remoteSavedAt > localSavedAt ? remoteSavedAt : localSavedAt
    // A delete or a tap made on this phone while the pull was out would be
    // written over by the older shelf the pull started from. When the phone
    // saved since, fold its newest copy in first (its gone list included).
    // `next` was built from the copy saved at seenAt, so that is its stamp
    // in the compare; `at` (upload time) would let it beat newer local edits.
    let seenAt = readSavedAt()
    const purseOf = (shelf) => `${shelf?.boards?.[0]?.gems}|${shelf?.boards?.[0]?.coins}`
    let seenPurse = purseOf(readShelf())
    const land = (next, at) => {
      if (run !== syncRun) throw new Error('account.signedOut')
      const nowAt = readSavedAt()
      let base = next
      if (nowAt !== seenAt) {
        // A buy or an earn during the sync wrote the server's newer balance
        // here; the merge would keep the larger, older one.
        const local = readShelf()
        const purse = local?.boards?.[0]
        base = mergeShelves(local, next, nowAt, seenAt)
        if (purseOf(local) !== seenPurse) {
          if (Number.isFinite(purse?.gems)) base = applyGemBalanceToShelf(base, purse.gems)
          if (Number.isFinite(purse?.coins)) base = applyCoinBalanceToShelf(base, purse.coins)
        }
      }
      const out = writeShelf(base, at)
      seenAt = readSavedAt()
      seenPurse = purseOf(out)
      return out
    }

    // An undo that missed the server goes first, or the pull brings the Did back.
    await runPendingUndos()
    // Fold in every answer the account has that this phone has not seen.
    const pulled = await pullAnswers(merged, { stillCurrent: () => run === syncRun })
    if (pulled.miss) throw new Error(pulled.miss)

    writeShelfOwner(user.id)
    let written = land(closeShelfPastNights(pulled.shelf), metaAt)
    // The account's questions are on the phone now; Tonight can draw them.
    if (state.firstPull) setState({ firstPull: false })
    // Gifts go straight into the collection; the rest wait for the pop-up.
    // claim_gifts (readthrough-8.sql) already sent back the ones the account
    // owned, so one this phone already has is just not shown again.
    const { gifts } = await claimGifts()
    if (gifts.length) {
      const fresh = []
      let boards = written.boards
      for (const gift of gifts) {
        if (boards.some((book) => mergeGift(book, gift).had)) continue
        boards = boards.map((book) => mergeGift(book, gift).book)
        fresh.push(gift)
      }
      written = land({ ...written, boards }, metaAt)
      queueGifts(fresh)
    }
    // Thanks for gifts you sent go on Recent, once per account.
    for (const row of await takeGiftThanks().catch(() => [])) addNotice(giftThanksNotice(row))
    await claimGemPurchases()
    // A code saved from an invite link is used here, so the claim below pays it.
    await applyPendingInvite().catch(() => {})
    const invited = await claimInvites()
    if (invited.gems > 0 || invited.looks.length || invited.buddies.length || invited.frames.length) {
      let changed = false
      const boards = written.boards.map((item) => {
        if (item.id !== written.currentId) return item
        const next = applyInvitePayout(item, invited)
        if (next !== item) changed = true
        return next
      })
      if (changed) written = land({ ...written, boards }, metaAt)
    }

    // A weekly gem earned signed out only lived on the phone, and the server
    // balance below replaced it. Ask the server for that week once per
    // account; it checks the week and pays each week at most once.
    const gemWeek = String(written.gemWeek || '')
    const gemAsk = `${user.id}:${gemWeek}`
    let gemAsked = ''
    try {
      gemAsked = localStorage.getItem(GEM_WEEK_ASKED_KEY) || ''
    } catch {
      gemAsked = ''
    }
    if (gemWeek && gemAsked !== gemAsk) {
      const paid = await grantWeeklyGem(gemWeek).catch(() => null)
      if (paid != null) {
        try {
          localStorage.setItem(GEM_WEEK_ASKED_KEY, gemAsk)
        } catch {
          // Asks again next sync; the server still pays once.
        }
      }
    }

    const bal = await readGemBalance()
    if (bal != null) written = applyGemBalanceToShelf(written, bal)
    const coinBag = await readCoinCatalog()
    if (coinBag) written = applyCoinCatalogToShelf(written, coinBag)
    const gemBag = await readGemOwned()
    if (gemBag) written = applyGemOwnedToShelf(written, gemBag)

    const uploadAt = new Date().toISOString()
    written = reconcileShelfFromWidget(written)
    written = land(written, uploadAt)
    if (lastUser !== user.id) accountChanged = true
    window.dispatchEvent(new CustomEvent(SHELF_IN, { detail: written }))

    const remotePrefs = profileRow.data?.prefs
    if (remotePrefs) {
      const now = readPrefs()
      const merged = mergePrefs(now, remotePrefs, !!remoteSavedAt && remoteSavedAt > localSavedAt)
      if (JSON.stringify(merged) !== JSON.stringify(now)) writePrefs(merged, true)
    }

    const bad = (await putShelf(db, user, written, uploadAt)) || (await putPrefs(db, user, written))
    if (bad) throw bad
    // The shelf landed for this account: later pushes may send it.
    writeLastUser(user.id)

    // Opening the app is the one moment worth reconciling in full: send
    // everything, then clear out answers whose question is gone.
    const sent = await pushAnswers(written, true)
    if (sent.miss) throw new Error(sent.miss)
    await pruneAnswers(written)
    if (widgetCloudPending()) await flushPendingWidgetCloud()

    touchDevice()
    writeLastUser(user.id)
    setState({ how: 'saved', at: new Date().toISOString(), miss: '' })
    return written
  } catch (error) {
    if (run !== syncRun) return null
    setState({ how: 'miss', miss: error?.message || 'account.syncMiss' })
    recordAppError('sync', error).catch(() => {})
    return null
  }
}

// A pull still out for the account before a sign-out is not this account's pull.
let pullingRun = -1

export function pullAndMerge() {
  if (pulling && pullingRun === syncRun) return pulling
  pullingRun = syncRun
  const mine = pullAndMergeOnce().finally(() => {
    if (pulling !== mine) return
    pulling = null
    if (state.firstPull) setState({ firstPull: false })
  })
  pulling = mine
  return mine
}

export async function pushNow(shelf) {
  const db = cloud()
  if (!db) return
  let user
  try {
    user = await meOrThrow()
  } catch (error) {
    setState({ how: 'miss', miss: error?.message || 'account.syncMiss' })
    return
  }
  if (!user) {
    sessionMissing()
    return
  }
  setState({ how: 'busy', miss: '' })
  try {
    let doc = shelf || readShelf()
    // Usually one answer. The document only moves because a tag or a
    // question changed, and those are small.
    const sent = await pushAnswers(doc)
    if (sent.miss) throw new Error(sent.miss)
    // No pull has landed for this account on this phone yet (the last user id
    // is written only after one does), so the local shelf may be the empty one
    // sign out left. Sending it would overwrite the account's questions.
    // Pull instead (shared with any pull already running); a landed pull opens
    // the gate, and only a failed one shows as a miss.
    if (readLastUser() !== user.id) {
      await pullAndMerge()
      if (readLastUser() !== user.id) return
      // Landed: send what is on the phone now, edits made during the pull too.
      doc = readShelf()
    } else {
      const row = await db.from('shelves').select('saved_at').eq('user_id', user.id).maybeSingle()
      if (row.error) throw row.error
      const at = row.data?.saved_at || ''
      // Compared as times: the server sends +00:00 where JS wrote Z.
      if (at && Date.parse(at) !== Date.parse(readSeenAt())) {
        await pullAndMerge()
        return
      }
    }
    const uploadAt = new Date().toISOString()
    stampSavedAt(uploadAt)
    const bad = (await putShelf(db, user, doc, uploadAt)) || (await putPrefs(db, user, doc))
    if (bad) throw bad
    setState({ how: 'saved', at: new Date().toISOString(), miss: '' })
  } catch (error) {
    setState({ how: 'miss', miss: error?.message || 'account.syncMiss' })
    recordAppError('sync', error).catch(() => {})
  }
}

let weMark = ''
onWeNights(() => {
  const now = weNight(boardDate(new Date()))
  const mark = `${boardDate(new Date())}:${now.due}:${now.done}`
  if (mark === weMark) return
  const first = !weMark
  weMark = mark
  if (!first) pushSoon(readShelf())
})

export function pushSoon(shelf) {
  if (!cloudSetUp()) return
  if (state.how === 'off') return
  if (state.how === 'out') {
    armSyncForUser()
    if (state.how === 'out') return
  }
  window.clearTimeout(timer)
  const doc = shelf
  timer = window.setTimeout(() => pushNow(doc), 300)
}

export function flushPushSoon() {
  if (!cloudSetUp()) return
  if (state.how === 'off' || state.how === 'out') return
  if (!timer) return
  window.clearTimeout(timer)
  timer = 0
  return pushNow(readShelf())
}

// Before signing out: send anything still waiting, then try once more if the
// last send missed. False means some answers never reached the account, so
// the caller asks before signedOutSync wipes them.
export async function saveBeforeSignOut(ms = 8000) {
  if (!cloudSetUp() || state.how === 'off' || state.how === 'out') return true
  let timer
  try {
    // No session: pushNow would wipe the shelf without asking. Ask instead.
    if (!(await me())) return false
    const sent = (async () => {
      // iOS widget taps since the last open are only in the WidgetKit timeline;
      // read them in (registered reader, a no-op off iOS) so they send too.
      await awaitWidgetTimeline()
      const shelf = readShelf()
      const next = reconcileShelfFromWidget(shelf)
      if (next !== shelf && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SHELF_IN, { detail: next }))
      const flushed = flushPushSoon()
      if (flushed) await flushed
      else if (next !== shelf) await pushNow(next)
      if (state.how === 'miss') await pushNow(readShelf())
      return state.how !== 'miss'
    })()
    // A stalled network asks too, instead of spinning the button.
    const late = new Promise((resolve) => { timer = setTimeout(() => resolve(false), ms) })
    return await Promise.race([sent, late])
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function touchDevice() {
  const db = cloud()
  if (!db) return
  const user = await me()
  if (!user) return
  const row = {
    user_id: user.id,
    device_key: deviceKey(),
    label: deviceLabel(),
    platform: devicePlatform(),
    last_seen_at: new Date().toISOString(),
  }
  // This phone moved to its stable id: its old row is the same phone.
  // Gone first, so a failed upsert never leaves it counted twice.
  const old = takeOldDeviceKey()
  if (old && old !== deviceKey()) {
    await db.from('devices').delete().eq('user_id', user.id).eq('device_key', old)
  }
  const model = deviceModel()
  const first = await db.from('devices').upsert(model ? { ...row, model } : row, { onConflict: 'user_id,device_key' })
  // Before supabase/device-names.sql is applied there is no model column.
  if (first?.error && model) await db.from('devices').upsert(row, { onConflict: 'user_id,device_key' })
  // The device row exists now, so this phone can get its answer key.
  await refreshAnswerKey(user.id, row.device_key)
}

// Phones seen in the last 90 days. The server removes older rows when a
// phone checks in (supabase/reliability.sql).
export const DEVICE_FRESH_DAYS = 90

export async function listDevices() {
  const db = cloud()
  if (!db) return []
  const user = await me()
  if (!user) return []
  const since = new Date(Date.now() - DEVICE_FRESH_DAYS * 86400000).toISOString()
  const pick = (cols) =>
    db
      .from('devices')
      .select(cols)
      .eq('user_id', user.id)
      .gt('last_seen_at', since)
      .order('last_seen_at', { ascending: false })
  const named = await pick('device_key, label, platform, last_seen_at, model, name')
  if (!named.error) return named.data || []
  // Older database: no model or name yet.
  const { data, error } = await pick('device_key, label, platform, last_seen_at')
  // null, not [], so a screen can tell a failed load from no phones.
  if (error) return null
  return data || []
}

// The owner's own name for a phone. 40 characters, same as the server check.
export const DEVICE_NAME_MAX = 40

export async function renameDevice(key, name) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const clean = String(name || '').trim().slice(0, DEVICE_NAME_MAX)
  const { error } = await db.from('devices').update({ name: clean }).eq('user_id', user.id).eq('device_key', key)
  return { miss: error ? error.message : '' }
}

// Every phone but this one. Their app signs in again on next open if still
// signed in; this only clears the list (and their push token).
export async function forgetOtherDevices() {
  const db = cloud()
  if (!db) return
  const user = await me()
  if (!user) return
  const { error } = await db.from('devices').delete().eq('user_id', user.id).neq('device_key', deviceKey())
  if (error) return { miss: error.message }
}

export async function forgetDevice(key) {
  const db = cloud()
  if (!db) return
  const user = await me()
  if (!user) return
  const { error } = await db.from('devices').delete().eq('user_id', user.id).eq('device_key', key)
  if (error) return { miss: error.message }
}

// Your display name from the last profile load, so Account and Friends show
// it right away instead of "Add your name" while the server answers.
const NAME_KEY = 'did-i-profile-name'

export function keptProfileName() {
  try {
    return localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}

function keepProfileName(name) {
  try {
    if (name) localStorage.setItem(NAME_KEY, String(name))
    else localStorage.removeItem(NAME_KEY)
  } catch {
    // Shows again after the next profile load.
  }
}

// strict: throw on a failed read instead of returning null (export).
export async function loadProfile({ strict = false } = {}) {
  const db = cloud()
  if (!db) return null
  const user = await me()
  if (!user) return null
  const { data, error } = await db
    .from('profiles')
    .select('display_name, look_on, badge_cheer, prefs, gem_balance, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error && strict) throw error
  if (data) {
    noteAvatar(data.avatar_url)
    keepProfileName(data.display_name || '')
  }
  return data || null
}

export async function saveProfile(patch) {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const user = await me()
  if (!user) return { miss: 'out' }
  const { error } = await db.from('profiles').upsert(
    { user_id: user.id, ...patch, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
  if (!error && typeof patch?.display_name === 'string') keepProfileName(patch.display_name)
  return { miss: error ? error.message : '' }
}

export async function exportAll() {
  const shelf = readShelf()
  // A failed read throws, so the caller says the export missed instead of
  // handing over a file with parts quietly left out.
  const profile = await loadProfile({ strict: true })
  const devices = await listDevices()
  if (!devices) throw new Error('devices')
  const social = await exportSocial()
  return {
    kind: 'did-i-account',
    pulledAt: new Date().toISOString(),
    prefs: readPrefs(),
    profile,
    devices,
    shelf,
    ...social,
  }
}

// The server hands back at most 1000 rows a read, so an export reads page by page.
async function allPages(query, page = 1000) {
  const data = []
  for (let from = 0; ; from += page) {
    const res = await query().range(from, from + page - 1)
    if (res.error) return res
    data.push(...(res.data || []))
    if ((res.data || []).length < page) return { data, error: null }
  }
}

// Your side of Did we and Did you: the cards you are on, your own rows and
// answers, and what you sent or got. Only what the database lets you read.
async function exportSocial() {
  const db = cloud()
  const user = db ? await me() : null
  if (!db || !user) return {}
  const [mine, answers, sends] = await Promise.all([
    db
      .from('we_members')
      .select('card_id, state, turn, asked_at, joined_at, said_no_at, folder, topics')
      .eq('user_id', user.id),
    allPages(() =>
      db.from('we_answers').select('card_id, night, status, answered_at').eq('user_id', user.id).order('card_id').order('night'),
    ),
    allPages(() =>
      db
        .from('sends')
        .select('id, from_id, to_id, kind, question, note, due_on, state, made_at, repeat')
        .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
        .order('id'),
    ),
  ])
  const failed = [mine, answers, sends].find((res) => res.error)
  if (failed) throw failed.error
  const ids = (mine.data || []).map((row) => row.card_id)
  let cards = []
  if (ids.length) {
    const res = await db
      .from('we_cards')
      .select('id, question, mode, shows, cadence, weekdays, goal_nights, starts_on, archived, made_at')
      .in('id', ids)
    if (res.error) throw res.error
    cards = res.data || []
  }
  return {
    didWe: { cards, memberships: mine.data || [], answers: answers.data || [] },
    didYou: sends.data || [],
  }
}
