import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState } from 'react-native'
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
import { flushPushSoon, pullAndMerge, pushSoon, SHELF_IN } from '../../src/lib/cloud-sync.js'
import { stripDemoShelf } from '../../src/lib/demo-strip.js'
import { boardDate, isoDate } from '../../src/lib/recurrence.js'
import {
  maybeStreakMiss,
  queueStreakMoment,
  shelfHeatNow,
} from '../../src/lib/streak-moments.js'
import { scheduleNativePings, shareShelf } from '../../src/lib/native.js'
import { alignShelfPurse, spreadPurseFrom, weeklyGemBump } from '../../src/lib/purse.js'
import { goHash, readRoute } from '../navigation/hash.js'

const DEMO_PURGE_KEY = 'did-i-demo-purge-1'

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
  const shelf = writeShelf(alignShelfPurse(readShelf()))
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

export function useAppShelf() {
  const [shelf, setShelf] = useState(firstShelf)
  const [markNote, setMarkNote] = useState(null)
  const book = useMemo(() => currentBook(shelf), [shelf])
  const live = book || emptyBoard()
  const route = readRoute()

  const tagId = shelf.boards.some((item) => item.id === route.tag && !item.archived) ? route.tag : ''

  const persist = useCallback((nextShelf) => {
    const now = new Date()
    const before = currentBook(shelf)
    const heatBefore = shelfHeatNow(shelf.boards, now)
    const bumped = weeklyGemBump(nextShelf, shelf, now)
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
    const after = currentBook(written)
    if (after) scheduleNativePings(after)
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

  const keepSent = useCallback(
    (question) => {
      const text = String(question || '').trim()
      if (!text) return
      saveLamp(live, { ...blankLamp(), question: text, cadence: 'once', onceOn: isoDate(new Date()) })
    },
    [live, saveLamp],
  )

  const setTag = useCallback(
    (id) => {
      if (id) persist(selectBook(shelf, id))
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
      if (tagId === id || route.tag === id) goHash(route.path === '/lamps' ? '/lamps' : '/', { tag: 'all' })
    },
    [persist, route.path, route.tag, shelf, tagId],
  )

  useEffect(() => {
    pullAndMerge()
      .then((result) => {
        if (result) setShelf(result)
      })
      .catch(() => {})
    function onShelfIn(event) {
      if (event?.detail) setShelf(event.detail)
    }
    window.addEventListener(SHELF_IN, onShelfIn)
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') flushPushSoon()
    })
    return () => {
      window.removeEventListener(SHELF_IN, onShelfIn)
      sub.remove()
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
