import { useEffect, useRef } from 'react'
import { reopenQuestion } from '../../src/lib/board-ops.js'
import { followReopen } from '../../src/lib/check-on.js'
import { finishKey, finishLine, finishedToShow } from '../../src/lib/lamp-finish.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { t } from '../../src/lib/i18n.js'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { tourActive } from '../lib/tour.js'
import { publishSheet, sheetIsUp, whenNoSheet } from './SheetHost.jsx'

// A question whose end date passed gets one popup on Today: the record, and
// a way to ask again. Shown once per question and end date; Done is marked
// seen when tapped (markFinishSeen), so only dates set in advance show it.
const KEY = 'did-i-finish-seen'
const KEEP = 200
const TODAY = new Set(['/', '/home', '/tonight'])

function readSeen() {
  try {
    const list = JSON.parse(globalThis.localStorage?.getItem(KEY) || '[]')
    return Array.isArray(list) ? list.map(String) : []
  } catch {
    return []
  }
}

export function markFinishSeen(lamp) {
  if (!lamp?.endsOn) return
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify([...new Set([...readSeen(), finishKey(lamp)])].slice(-KEEP)))
  } catch {
    // Shown again next open is fine.
  }
}

export function FinishedHost({ colors, path, onChange }) {
  const live = useRef({ colors, onChange })
  live.current = { colors, onChange }

  useEffect(() => {
    if (!TODAY.has(path)) return undefined
    let alive = true
    // One popup at a time, each after the last is closed.
    async function next() {
      await whenNoSheet()
      if (!alive || sheetIsUp() || tourActive()) return
      const now = new Date()
      const [one] = finishedToShow(readShelf().boards, new Set(readSeen()), now)
      if (!one) return
      const { book, lamp } = one
      markFinishSeen(lamp)
      const record = finishLine(book, lamp, boardDate(now, book.dayFoldHour))
      publishSheet({
        title: t('lamp.finishedTitle', { question: lamp.question }),
        body: record || t('lamp.endedOn', { date: formatBoardDate(lamp.endsOn) }),
        goLabel: t('lamp.finishedAgain'),
        closeLabel: t('lamp.finishedOk'),
        colors: live.current.colors,
        onClose: () => {
          publishSheet(null)
          next()
        },
        onGo: () => {
          publishSheet(null)
          const fresh = (readShelf().boards || []).find((item) => item.id === book.id) || book
          const here = (fresh.lamps || []).find((item) => item.id === lamp.id)
          if (here) {
            const reopened = reopenQuestion(fresh, here)
            live.current.onChange(reopened)
            followReopen(here, reopened).catch(() => confirmMiss(t('confirm.checkOnMiss')))
          }
          confirmDone(t('confirm.questionResumed'))
          next()
        },
      })
    }
    // After the app has settled and the other first asks have had their turn.
    const timer = setTimeout(next, 3000)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [path])

  return null
}
