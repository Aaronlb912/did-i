import { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'
import { commitBook, unlockAchievements } from '../../src/lib/achievements.js'
import { emptyBoard, normalizeBook } from '../../src/lib/board-json.js'
import {
  currentBook,
  dropBook,
  mergeSameTitles,
  nextBoardTitle,
  parkEmptyTags,
  putBook,
  readShelf,
  selectBook,
  writeShelf,
} from '../../src/lib/board-shelf.js'
import { hangInto, takeDown } from '../../src/lib/board-ops.js'
import { blankLamp } from '../../src/lib/board-json.js'
import { closePastNights, closeShelfPastNights, freshMarks, noteOpen } from '../../src/lib/daily.js'
import { forgetAnswerMarks } from '../../src/lib/answer-log.js'
import { bindForegroundSync, pullAndMerge, pushSoon, SHELF_IN } from '../../src/lib/cloud-sync.js'
import { stripDemoShelf } from '../../src/lib/demo-strip.js'
import { boardDate, isoDate } from '../../src/lib/recurrence.js'
import {
  maybeStreakMiss,
  queueStreakMoment,
  shelfHeatNow,
} from '../../src/lib/streak-moments.js'
import { scheduleNativePings, shareShelf } from '../../src/lib/native.js'
import { cloudSetUp } from '../../src/lib/cloud.js'
import {
  alignShelfPurse,
  mergePurses,
  spreadPurseFrom,
  weeklyGemBump,
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
import { syncTonightWidget } from '../widget-sync.js'
import { reconcileShelfFromWidget } from '../../src/lib/widget-reconcile.js'
import { afterNativeBridgeReady } from '../lib/defer-native.js'
import { nativeWidgetsEnabled } from '../lib/widgets-enabled.js'
import { refreshWidgetTimelineFromKit } from '../widget-bridge.js'
import { applyPendingAndroidWidgetTap } from '../widget-tap'
import { joinTagIds, tagIdsOf } from '../../src/lib/tags.js'

const DEMO_PURGE_KEY = 'did-i-demo-purge-1'

function withNightsClosed(shelf, now) {
  const heatBefore = shelfHeatNow(shelf.boards, now)
  const boards = shelf.boards.map((book) => unlockAchievements(closePastNights(book, now), now))
  const heatAfter = shelfHeatNow(boards, now)
  const miss = maybeStreakMiss({
    beforeHeat: heatBefore,
    afterHeat: heatAfter,
    dateIso: boardDate(now),
  })
  if (miss) queueStreakMoment(miss, boardDate(now))
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
  const [markNote, setMarkNote] = useState(null)
  const book = useMemo(() => currentBook(shelf), [shelf])
  const live = book || emptyBoard()
  const route = readRoute()

  // The filter may name several tags; keep only ones that still exist.
  const tagId = joinTagIds(
    tagIdsOf(route.tag).filter((id) => shelf.boards.some((item) => item.id === id && !item.archived)),
  )

  const persist = useCallback((nextShelf) => {
    const now = new Date()
    const before = currentBook(shelf)
    const heatBefore = shelfHeatNow(shelf.boards, now)
    const coinsBefore = mergePurses(shelf.boards).coins
    const bumped = weeklyGemBump(nextShelf, shelf, now, { accountSync: cloudSetUp() })
    const mapped = bumped.boards.map((item) => {
      let next = normalizeBook(item)
      next = closePastNights(next, now)
      if (next.id === bumped.currentId) next = noteOpen(next, now)
      return unlockAchievements(next, now)
    })
    const drafted = parkEmptyTags(mergeSameTitles({ ...bumped, boards: mapped }))
    const current = drafted.boards.find((item) => item.id === drafted.currentId) || drafted.boards[0]
    const written = writeShelf(spreadPurseFrom(drafted, current))
    const heatAfter = shelfHeatNow(written.boards, now)
    const miss = maybeStreakMiss({
      beforeHeat: heatBefore,
      afterHeat: heatAfter,
      dateIso: boardDate(now),
    })
    if (miss) queueStreakMoment(miss, boardDate(now))
    setShelf(written)
    pushSoon(written)
    const fold = written.boards.find((b) => b.id === written.currentId)?.dayFoldHour ?? 0
    const coinsAfter = mergePurses(written.boards).coins
    if (cloudSetUp() && coinsAfter > coinsBefore) {
      creditNightCoins(boardDate(now, fold), coinsAfter - coinsBefore).then((bal) => {
        if (bal == null) return
        const synced = writeShelf(applyCoinBalanceToShelf(readShelf(), bal))
        setShelf(synced)
        pushSoon(synced)
      })
    }
    if (cloudSetUp() && bumped.gemWeek && bumped.gemWeek !== (shelf.gemWeek || '')) {
      grantWeeklyGem(bumped.gemWeek).then((bal) => {
        if (bal == null) return
        const synced = writeShelf(applyGemBalanceToShelf(readShelf(), bal))
        setShelf(synced)
        pushSoon(synced)
      })
    }
    const after = currentBook(written)
    if (after) scheduleNativePings(after)
    syncTonightWidget(written).catch(() => {})
    // A mark that unlocks with nothing on screen may as well not have.
    if (after && after.id === before?.id && !after.quietMode) {
      const news = freshMarks(before?.unlocked, after?.unlocked)
      if (news[0]) setMarkNote({ id: news[0] })
    }
    return { written, before, after }
  }, [shelf])

  const change = useCallback(
    (next) => {
      persist(putBook(shelf, { ...next, id: next.id || book.id }))
    },
    [book, persist, shelf],
  )

  // Several folders at once, for example a bulk edit on Questions.
  const changeBooks = useCallback(
    (books) => {
      if (!books.length) return
      persist(books.reduce((next, one) => putBook(next, one), shelf))
    },
    [persist, shelf],
  )

  const saveLamp = useCallback(
    (target, lamp, fromBook, clock = new Date()) => {
      const source = fromBook && Array.isArray(fromBook.lamps) ? fromBook : null
      let next = shelf
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
  // the open folder as tonight-only questions in one write.
  const keepSent = useCallback(
    (questions) => {
      const texts = [].concat(questions).map((text) => String(text || '').trim()).filter(Boolean)
      if (!texts.length) return
      const clock = new Date()
      let dest = live
      for (const text of texts) {
        dest = hangInto(dest, { ...blankLamp(), question: text, cadence: 'once', onceOn: isoDate(clock) }, false)
      }
      persist(putBook(shelf, commitBook(dest, clock)))
    },
    [live, persist, shelf],
  )

  const setTag = useCallback(
    (id) => {
      const first = tagIdsOf(id)[0]
      if (first) persist(selectBook(shelf, first))
      const path = route.path
      const stay = path === '/tonight' || path === '/lamps' || path === '/later' || path === '/home' ? path : '/'
      goHash(stay === '/home' ? '/' : stay, { tag: id || 'all', face: route.face })
    },
    [persist, route.face, route.path, shelf],
  )

  const switchBoard = useCallback((id) => persist(selectBook(shelf, id)), [persist, shelf])
  const addBoard = useCallback(() => {
    persist(
      putBook(shelf, {
        ...emptyBoard(),
        title: nextBoardTitle(shelf.boards),
        keeperName: live.keeperName,
      }),
    )
  }, [live.keeperName, persist, shelf])
  const removeBoard = useCallback(
    (id) => {
      persist(dropBook(shelf, id))
      if (tagIdsOf(route.tag).includes(id)) {
        const rest = joinTagIds(tagIdsOf(route.tag).filter((other) => other !== id))
        goHash(route.path === '/lamps' ? '/lamps' : '/', { tag: rest || 'all' })
      }
    },
    [persist, route.path, route.tag, shelf, tagId],
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
      pullAndMerge()
        .then((result) => {
          if (cancelled) return
          const merged = result || readShelf()
          const closed =
            Platform.OS === 'android' ? withNightsClosed(merged, new Date()) : merged
          if (closed !== merged) setShelf(writeShelf(closed))
          else if (result) setShelf(result)
        })
        .catch(() => {})
      afterNativeBridgeReady(() => {
        if (cancelled) return
        if (!nativeWidgetsEnabled()) return
        refreshWidgetTimelineFromKit()
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
            if (result) setShelf(result)
          })
          .catch(() => {})
      })
    }
    boot()
    function onShelfIn(event) {
      if (event?.detail) setShelf(event.detail)
    }
    window.addEventListener(SHELF_IN, onShelfIn)
    return () => {
      cancelled = true
      window.removeEventListener(SHELF_IN, onShelfIn)
    }
  }, [])

  useEffect(() => {
    const current = currentBook(shelf)
    const closed = closePastNights(current, new Date())
    if (closed !== current) persist(putBook(shelf, closed))
  }, [route.path])

  const importShelf = useCallback((next) => persist(next), [persist])

  const startEmpty = useCallback(() => {
    change({
      ...emptyBoard(),
      id: live.id,
      title: live.title,
      keeperName: live.keeperName,
    })
  }, [change, live.id, live.keeperName, live.title])

  const sendCopy = useCallback(async () => {
    try {
      await shareShelf(readShelf())
    } catch {
      // dismissed
    }
  }, [])

  return {
    shelf,
    book: live,
    tagId,
    route,
    markNote,
    clearMark: useCallback(() => setMarkNote(null), []),
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
