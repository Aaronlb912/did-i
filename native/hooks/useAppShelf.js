import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Platform } from 'react-native'
import { commitBook, marksToToast, unlockAchievements } from '../../src/lib/achievements.js'
import { emptyBoard, normalizeBook } from '../../src/lib/board-json.js'
import {
  currentBook,
  dropBook,
  mergeSameTitles,
  nextBoardTitle,
  parkEmptyTags,
  addBook,
  putBook,
  readShelf,
  selectBook,
  writeShelf,
} from '../../src/lib/board-shelf.js'
import { bulkLamps, hangInto, takeDown } from '../../src/lib/board-ops.js'
import { blankLamp } from '../../src/lib/board-json.js'
import { keptLamp } from '../../src/lib/send-repeat.js'
import { closePastNights, closeShelfPastNights, freshMarks, noteOpen } from '../../src/lib/daily.js'
import { forgetAnswerMarks } from '../../src/lib/answer-log.js'
import { bindForegroundSync, pullAndMerge, pushSoon, SHELF_IN, takeAccountChanged } from '../../src/lib/cloud-sync.js'
import { stripDemoShelf } from '../../src/lib/demo-strip.js'
import { isoDate } from '../../src/lib/recurrence.js'
import {
  maybeStreakMiss,
  queueStreakMoment,
} from '../../src/lib/streak-moments.js'
import { scheduleNativePings, shareShelf } from '../../src/lib/native.js'
import { armNativePingsNow, pingsStale } from '../shim/native.js'
import { accountSessionOn, readAccountUserId } from '../../src/lib/session-id.js'
import { reportRejection } from '../../src/lib/report.js'
import {
  alignShelfPurse,
  spreadPurseFrom,
  weeklyGemBump,
  returnEarnedCoins,
  takeEarnedCoins,
} from '../../src/lib/purse.js'
import {
  applyCoinBalanceToShelf,
  applyGemBalanceToShelf,
  creditNightCoins,
  grantWeeklyGem,
} from '../../src/lib/wallet.js'
import { goHash, readRoute } from '../navigation/hash.js'
import { absorbStoredWidgetProps } from '../../src/lib/widget-tonight.js'
import { pushShelfAfterWidgetAnswer } from '../../src/lib/widget-cloud-sync.js'
import { markWidgetTimelineRead, syncTonightWidget, syncTonightWidgetIfChanged } from '../widget-sync.js'
import { reconcileShelfFromWidget } from '../../src/lib/widget-reconcile.js'
import { afterNativeBridgeReady } from '../lib/defer-native.js'
import { runAfterLaunchReady } from '../lib/launch-ready.js'
import { nativeWidgetsEnabled } from '../lib/widgets-enabled.js'
import { beginWidgetRefresh } from '../widget-bridge.js'
import { applyPendingAndroidWidgetTap } from '../widget-tap'
import { joinTagIds, tagIdsOf } from '../../src/lib/tags.js'
import { t, useLocale } from '../../src/lib/i18n.js'
import { confirmMiss } from '../lib/confirm.js'
import { stopCheckOns } from '../components/LampManage.jsx'

const DEMO_PURGE_KEY = 'did-i-demo-purge-1'

function withNightsClosed(shelf, now) {
  const boards = shelf.boards.map((book) => unlockAchievements(closePastNights(book, now), now))
  const miss = maybeStreakMiss(boards, now)
  if (miss) queueStreakMoment(miss, miss.dateIso)
  return { ...shelf, boards }
}

function firstShelf() {
  try {
    if (localStorage.getItem(DEMO_PURGE_KEY) !== '1') {
      localStorage.setItem(DEMO_PURGE_KEY, '1')
      forgetAnswerMarks()
      writeShelf(stripDemoShelf(readShelf()))
    }
  } catch {
    // ok
  }
  const now = new Date()
  const shelf = writeShelf(alignShelfPurse(absorbStoredWidgetProps(readShelf(), now)))
  // Android applies a stored widget tap before nights close, in the open effect.
  if (Platform.OS === 'android') return shelf
  return withNightsClosed(shelf, now)
}

export function useAppShelf() {
  const [shelf, setShelf] = useState(firstShelf)
  // The latest shelf, for saves that run after a delay (undo toasts, sheets):
  // building from the render-time shelf would drop edits made since.
  const shelfRef = useRef(shelf)
  shelfRef.current = shelf
  // Marks unlocked together wait their turn instead of only the first showing.
  const [marks, setMarks] = useState([])
  // The General folder's name follows the app language. Reading the shelf
  // again renames it, so a language change shows at once, not on next launch.
  const locale = useLocale()
  const lastLocale = useRef(locale)
  useEffect(() => {
    if (lastLocale.current === locale) return
    lastLocale.current = locale
    setShelf(readShelf())
  }, [locale])
  const book = useMemo(() => currentBook(shelf), [shelf])
  const live = book || emptyBoard()
  const route = readRoute()

  // The filter may name several tags; keep only ones that still exist.
  const tagId = joinTagIds(
    tagIdsOf(route.tag).filter((id) => shelf.boards.some((item) => item.id === id && !item.archived)),
  )

  const persist = useCallback((nextShelf) => {
    const shelf = shelfRef.current
    const now = new Date()
    const before = currentBook(shelf)
    const bumped = weeklyGemBump(nextShelf, shelf, now, { accountSync: accountSessionOn() })
    const mapped = bumped.boards.map((item) => {
      let next = normalizeBook(item)
      next = closePastNights(next, now)
      if (next.id === bumped.currentId) next = noteOpen(next, now)
      return unlockAchievements(next, now)
    })
    const drafted = parkEmptyTags(mergeSameTitles({ ...bumped, boards: mapped }))
    const current = drafted.boards.find((item) => item.id === drafted.currentId) || drafted.boards[0]
    const written = writeShelf(spreadPurseFrom(drafted, current))
    const miss = maybeStreakMiss(written.boards, now)
    if (miss) queueStreakMoment(miss, miss.dateIso)
    shelfRef.current = written
    setShelf(written)
    pushSoon(written)
    // Signed in, taps queue their coins (payTap); signed out, the phone keeps them.
    // Crediting without a session failed, re-queued, and paid twice on sign-in.
    // A reply that lands after a sign out or account switch belongs to the old account.
    const who = readAccountUserId()
    const sameAccount = () => !who || readAccountUserId() === who
    const taken = accountSessionOn() ? takeEarnedCoins() : {}
    for (const [night, earned] of Object.entries(taken)) {
      creditNightCoins(night, earned).then((bal) => {
        if (!sameAccount()) return
        // Not paid: keep the coins for the next save to try again.
        if (bal == null) return returnEarnedCoins(night, earned, new Date(), taken.gen)
        const synced = writeShelf(applyCoinBalanceToShelf(readShelf(), bal))
        setShelf(synced)
        pushSoon(synced)
      }).catch((err) => {
        if (sameAccount()) returnEarnedCoins(night, earned, new Date(), taken.gen)
        reportRejection('night-coins')(err)
      })
    }
    if (accountSessionOn() && bumped.gemWeek && bumped.gemWeek !== (shelf.gemWeek || '')) {
      grantWeeklyGem(bumped.gemWeek).then((bal) => {
        if (!sameAccount()) return
        // Not granted: forget the week so the next cleared night asks again.
        if (bal == null) {
          const now = readShelf()
          if (now.gemWeek === bumped.gemWeek) setShelf(writeShelf({ ...now, gemWeek: shelf.gemWeek || '' }))
          return
        }
        const synced = writeShelf(applyGemBalanceToShelf(readShelf(), bal))
        setShelf(synced)
        pushSoon(synced)
      }).catch(reportRejection('weekly-gem'))
    }
    const after = currentBook(written)
    // Every board, the same as armLampPings: one board would cancel the rest.
    if (written?.boards) scheduleNativePings(written.boards).catch(reportRejection('schedule-pings'))
    syncTonightWidget(written).catch(() => {})
    // A mark that unlocks with nothing on screen may as well not have.
    if (after && after.id === before?.id && !after.quietMode) {
      const news = freshMarks(before?.unlocked, after?.unlocked)
      // One toast per batch, never a stack (marksToToast).
      const toasts = news.length ? marksToToast(news) : []
      if (toasts.length) setMarks((queue) => [...queue, ...toasts.filter((mark) => !queue.some((item) => item.id === mark.id))])
    }
    return { written, before, after }
  }, [])

  const change = useCallback(
    (next) => {
      persist(putBook(shelfRef.current, { ...next, id: next.id || book.id }))
    },
    [book, persist],
  )

  // Several folders at once, for example a bulk edit on Questions.
  const changeBooks = useCallback(
    (books) => {
      if (!books.length) return
      persist(books.reduce((next, one) => putBook(next, one), shelfRef.current))
    },
    [persist],
  )

  const saveLamp = useCallback(
    (staleTarget, lamp, fromBook, clock = new Date()) => {
      let next = shelfRef.current
      // The screen's copies can miss a widget tap or sync since its last render.
      const fresh = (book) => (book && (next.boards || []).find((item) => item.id === book.id)) || book
      const target = fresh(staleTarget)
      const source = fromBook && Array.isArray(fromBook.lamps) ? fresh(fromBook) : null
      let dest = target
      if (source && source.id !== target.id) {
        const answers = (source.answers || []).filter((item) => item.lampId === lamp.id)
        next = putBook(next, takeDown(source, lamp))
        dest = {
          ...hangInto(target, lamp, false),
          answers: [...(target.answers || []).filter((item) => item.lampId !== lamp.id), ...answers],
        }
      } else {
        dest = hangInto(target, lamp, Boolean(source && source.id === target.id))
      }
      persist(putBook(next, commitBook(dest, clock)))
    },
    [persist, shelf],
  )

  // A did you kept from the inbox, or several added on their own, land on
  // the open folder in one write: tonight only, or on the sender's repeat.
  const keepSent = useCallback(
    (questions) => {
      const clock = new Date()
      const lamps = [].concat(questions).map((item) => keptLamp(item, clock, live.dayFoldHour)).filter(Boolean)
      if (!lamps.length) return []
      const latest = shelfRef.current
      let dest = currentBook(latest) || live
      for (const lamp of lamps) {
        dest = hangInto(dest, lamp, false)
      }
      persist(putBook(latest, commitBook(dest, clock)))
      // The new questions' ids, so a link can open Tonight right on them.
      return lamps.map((lamp) => lamp.id)
    },
    [live, persist],
  )

  const setTag = useCallback(
    (id) => {
      const first = tagIdsOf(id)[0]
      if (first) persist(selectBook(shelfRef.current, first))
      // The route is read on tap, not kept as a dependency: a new setTag on
      // every navigation re-rendered every mounted screen mid-transition.
      const { path, face } = readRoute()
      const stay = path === '/tonight' || path === '/lamps' || path === '/later' || path === '/home' ? path : '/'
      goHash(stay === '/home' ? '/' : stay, { tag: id || 'all', face, keepFocus: true })
    },
    [persist],
  )

  const switchBoard = useCallback((id) => persist(selectBook(shelfRef.current, id)), [persist])
  const addBoard = useCallback((name) => {
    const latest = shelfRef.current
    persist(
      addBook(latest, {
        ...emptyBoard(),
        title: String(name || '').trim() || nextBoardTitle(latest.boards),
        keeperName: live.keeperName,
      }),
    )
  }, [live.keeperName, persist])
  const removeBoard = useCallback(
    (id) => {
      // Friends' check-ons on its questions stop once the undo window ends,
      // unless the folder came back.
      const lampIds = (shelfRef.current.boards || []).find((book) => book.id === id)?.lamps?.map((lamp) => lamp.id) || []
      if (lampIds.length) stopCheckOns(lampIds)
      persist(dropBook(shelfRef.current, id))
      const now = readRoute()
      if (tagIdsOf(now.tag).includes(id)) {
        const rest = joinTagIds(tagIdsOf(now.tag).filter((other) => other !== id))
        // Stay on the folders page: leaving it would drop its Undo toast.
        const stay = now.path === '/lamps' || now.path === '/me'
        goHash(stay ? now.path : '/', { tag: rest || 'all' })
      }
    },
    [persist],
  )

  useEffect(() => {
    bindForegroundSync()
    let cancelled = false
    async function boot() {
      if (Platform.OS === 'android') {
        try {
          const applied = await applyPendingAndroidWidgetTap()
          if (cancelled) return
          if (applied) syncTonightWidget(applied).catch(() => {})
        } catch {
          // The row stays in storage when take did not run.
        }
      }
      if (cancelled) return
      try {
        const jsMerged = reconcileShelfFromWidget(readShelf())
        if (jsMerged !== readShelf()) setShelf(writeShelf(jsMerged))
      } catch {
        // ok
      }
      // Tonight paints from the stored shelf first; the cloud pull waits for that frame.
      runAfterLaunchReady(() => {
        if (cancelled) return undefined
        return pullAndMerge().then((result) => {
          if (cancelled) return
          // The stored shelf, not result: a delete made after the pull wrote
          // is only there, and writing result back would undo it.
          const merged = readShelf()
          const closed =
            Platform.OS === 'android' ? withNightsClosed(merged, new Date()) : merged
          if (closed !== merged) setShelf(writeShelf(closed))
          else if (result) setShelf(merged)
        })
      })
      afterNativeBridgeReady(() => {
        if (cancelled) return
        if (!nativeWidgetsEnabled()) return
        // Shared with the queued widget write, so the taps are read once, first.
        beginWidgetRefresh()
          .then((merged) => {
            if (cancelled) return merged
            const before = readShelf()
            setShelf(merged)
            if (merged !== before) pushShelfAfterWidgetAnswer(merged, { now: true }).catch(() => {})
            return merged
          })
          .then(() => pullAndMerge())
          .then((result) => {
            if (cancelled) return
            if (result) setShelf(readShelf())
          })
          .catch(() => {})
      })
    }
    boot()
    // Back from the home screen: a widget tap made while the app sat in the
    // background is on disk (or still queued natively), so show it now
    // instead of waiting for the next cold start.
    const wake = AppState.addEventListener('change', (next) => {
      // A new time zone or a long gap: reminders are fixed instants set a week ahead.
      if (next === 'active' && pingsStale()) armNativePingsNow(readShelf()?.boards || []).catch(() => {})
      if (next !== 'active' || Platform.OS !== 'android') return
      applyPendingAndroidWidgetTap()
        .catch(() => null)
        .then(() => {
          if (cancelled) return
          setShelf(reconcileShelfFromWidget(readShelf()))
        })
    })
    function onShelfIn(event) {
      if (!event?.detail) return
      setShelf(event.detail)
      // Answers from another phone (sync): the widget shows them too. After a
      // sign-in or sign-out it always redraws (new look, buddy, or nothing).
      const changed = takeAccountChanged()
      // The widget timeline holds the old account's taps: overwrite it, never
      // read them into this shelf.
      if (changed) markWidgetTimelineRead(true)
      const redraw = changed ? syncTonightWidget : syncTonightWidgetIfChanged
      redraw(event.detail).catch(() => {})
      // Rebuilt on every pull: another phone may have added, moved, deleted or
      // answered a question. After an account change, the last one's pings go.
      scheduleNativePings(event.detail.boards || []).catch(reportRejection('schedule-pings'))
    }
    window.addEventListener(SHELF_IN, onShelfIn)
    return () => {
      cancelled = true
      wake.remove()
      window.removeEventListener(SHELF_IN, onShelfIn)
    }
  }, [])

  useEffect(() => {
    const current = currentBook(shelf)
    const closed = closePastNights(current, new Date())
    if (closed !== current) persist(putBook(shelf, closed))
  }, [route.path])

  const importShelf = useCallback((next) => persist(next), [persist])

  // Clear this folder goes the delete path: the shared purse stays, and other
  // phones get gone marks instead of bringing the questions back.
  const startEmpty = useCallback(() => {
    const now = currentBook(shelfRef.current) || live
    const picks = (now.lamps || []).map((lamp) => ({ boardId: now.id, lampId: lamp.id }))
    const [cleared] = bulkLamps([now], picks, 'delete')
    change({ ...(cleared || now), answers: [] })
  }, [change, live])

  const sendCopy = useCallback(async () => {
    try {
      await shareShelf(readShelf())
    } catch {
      // Closing the sheet resolves; a throw is a real failure.
      confirmMiss(t('confirm.shareMiss'))
    }
  }, [])

  // A coin balance the server returned (tour coins): same steps as creditNightCoins.
  const applyCoinBalance = useCallback((bal, who) => {
    if (who && readAccountUserId() !== who) return
    const synced = writeShelf(applyCoinBalanceToShelf(readShelf(), bal))
    setShelf(synced)
    pushSoon(synced)
  }, [])

  return {
    shelf,
    book: live,
    applyCoinBalance,
    tagId,
    route,
    markNote: marks[0] || null,
    clearMark: useCallback(() => setMarks((queue) => queue.slice(1)), []),
    persist,
    change,
    changeBooks,
    saveLamp,
    keepSent,
    setTag,
    switchBoard,
    addBoard,
    removeBoard,
    importShelf,
    startEmpty,
    sendCopy,
  }
}
