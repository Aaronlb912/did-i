import { useEffect, useRef, useState } from 'react'
import { BuddyHang } from './Cosmetic.jsx'
import { NightStrip } from './NightStrip.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { answerFor, boardDate, isEvery } from './recurrence.js'
import { lastTimeLine } from './every-copy.js'
import {
  SWIPE_THRESHOLD as THRESHOLD,
  SWIPE_WAKE,
  stampOpacity,
  swipePull,
  swipeTilt,
} from './swipe-face.js'
import { useSwipePullReport } from './SwipePull.jsx'
import { useReduceMotion } from './useReduceMotion.js'

export function LampFace({
  row,
  onYes,
  onSkip,
  book,
  tag,
  keys,
  onPickHole,
  demoPull = 0,
  demoFly = '',
  demoQuiet = false,
  questionId = 'di-question',
  buddy = '',
  dateIso = '',
}) {
  usePrefs()
  const reduce = useReduceMotion()
  const drag = useRef(null)
  const [dx, setDx] = useState(0)
  const [mode, setMode] = useState('')
  const lampId = row?.lamp?.id
  const periodKey = row?.periodKey
  const demoOn = demoQuiet || demoFly || demoPull > 0

  useEffect(() => {
    setDx(0)
    setMode('')
    drag.current = null
  }, [lampId, periodKey])

  if (!row) return null
  const { lamp } = row
  const hasHistory = (keys || []).some((key) => answerFor(book, lamp.id, key))
  const liveDx = demoFly === 'did' ? 460 : demoFly === 'nope' ? -460 : demoOn ? demoPull * THRESHOLD : dx
  const liveMode = demoFly ? 'fly' : demoOn && demoPull > 0.08 ? 'drag' : mode
  const pull = swipePull(liveDx)
  // Edges are for the drag only: once the card is thrown they clear.
  useSwipePullReport(liveMode === 'fly' ? 0 : pull)

  function finish(way) {
    if (mode === 'fly') return
    const go = way === 'did' ? onYes : onSkip
    go()
    if (reduce || way === 'nope') return
    setMode('fly')
    setDx(460)
  }

  function onPointerDown(event) {
    if (demoQuiet || mode === 'fly') return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (event.target.closest('button, a, input')) return
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      live: false,
      mx: 0,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event) {
    const start = drag.current
    if (!start || start.id !== event.pointerId || mode === 'fly') return
    const mx = event.clientX - start.x
    const my = event.clientY - start.y
    if (!start.live) {
      if (Math.abs(mx) < SWIPE_WAKE && Math.abs(my) < SWIPE_WAKE) return
      if (Math.abs(my) > Math.abs(mx)) {
        drag.current = null
        return
      }
      start.live = true
      setMode('drag')
    }
    start.mx = mx
    event.preventDefault()
    setDx(mx)
  }

  function onPointerUp(event) {
    const start = drag.current
    if (!start || start.id !== event.pointerId) return
    const moved = start.mx || 0
    drag.current = null
    if (mode === 'fly') return
    if (start.live && moved >= THRESHOLD) {
      finish('did')
      return
    }
    if (start.live && moved <= -THRESHOLD) {
      finish('nope')
      return
    }
    setDx(0)
    setMode('')
  }

  return (
    <section
      className={liveMode ? `di-face di-swipe is-${liveMode}` : 'di-face di-swipe'}
      aria-labelledby={questionId}
      style={{
        transform: `translate(${liveDx}px, 0)${reduce ? '' : ` rotate(${swipeTilt(liveDx)}deg)`}`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <BuddyHang id={buddy} />
      <p className="di-swipe-stamp is-did" style={{ opacity: stampOpacity(pull, 'did') }}>
        {t('tonight.swipeDid')}
      </p>
      <p className="di-swipe-stamp is-nope" style={{ opacity: stampOpacity(pull, 'nope') }}>
        {t('tonight.swipeNope')}
      </p>
      {/* The tag sits where the DID stamp lands, so it steps aside on a pull. */}
      <p className="di-face-plate" style={{ opacity: 1 - Math.min(1, Math.abs(pull)) }}>
        {tag || t('tonight.didI')}
      </p>
      <h2 id={questionId} className="di-question">
        {lamp.question}
      </h2>
      {isEvery(lamp) && book ? (
        <p className="di-detail-meta">
          {lastTimeLine(book, lamp, dateIso || boardDate(new Date(), book.dayFoldHour))}
        </p>
      ) : null}
      {hasHistory ? (
        <NightStrip
          book={book}
          lamp={lamp}
          keys={keys}
          onPickHole={onPickHole ? (item, key) => onPickHole(item, key, row) : undefined}
        />
      ) : null}
    </section>
  )
}
