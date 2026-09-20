import { useEffect, useRef, useState } from 'react'
import { NightStrip } from './NightStrip.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { answerFor } from './recurrence.js'
import { useReduceMotion } from './useReduceMotion.js'

const THRESHOLD = 72
// A shorter pull. Lifting a card takes more effort than shoving it.
const UP_THRESHOLD = 56

export function LampFace({
  row,
  onYes,
  onSkip,
  onLater,
  book,
  tag,
  keys,
  onPickHole,
  demoPull = 0,
  demoFly = '',
  demoQuiet = false,
  questionId = 'di-question',
}) {
  usePrefs()
  const reduce = useReduceMotion()
  const drag = useRef(null)
  const [dx, setDx] = useState(0)
  const [dy, setDy] = useState(0)
  const [mode, setMode] = useState('')
  const lampId = row?.lamp?.id
  const periodKey = row?.periodKey
  const demoOn = demoQuiet || demoFly || demoPull > 0

  useEffect(() => {
    setDx(0)
    setDy(0)
    setMode('')
    drag.current = null
  }, [lampId, periodKey])

  if (!row) return null
  const { lamp } = row
  const hasHistory = (keys || []).some((key) => answerFor(book, lamp.id, key))
  const liveDx = demoFly === 'did' ? 460 : demoFly === 'nope' ? -460 : demoOn ? demoPull * THRESHOLD : dx
  const liveDy = demoFly === 'later' ? -520 : dy
  const liveMode = demoFly ? 'fly' : demoOn && demoPull > 0.08 ? 'drag' : mode
  const pull = Math.max(-1, Math.min(1, liveDx / THRESHOLD))
  const lift = Math.max(0, Math.min(1, -liveDy / UP_THRESHOLD))

  function finish(way) {
    if (mode === 'fly') return
    setMode('fly')
    const go = way === 'did' ? onYes : way === 'later' ? () => onLater(row) : onSkip
    if (reduce) {
      go()
      return
    }
    if (way === 'later') setDy(-520)
    else setDx(way === 'did' ? 460 : -460)
    window.setTimeout(go, 180)
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
      if (Math.abs(mx) < 10 && Math.abs(my) < 10) return
      // Up is later tonight. Down is left alone so the card can still
      // scroll when the question and its week do not fit.
      if (Math.abs(my) > Math.abs(mx)) {
        if (my > 0 || !onLater) {
          drag.current = null
          return
        }
        start.way = 'up'
      }
      start.live = true
      setMode('drag')
    }
    start.mx = mx
    start.my = my
    event.preventDefault()
    if (start.way === 'up') setDy(Math.min(0, my))
    else setDx(mx)
  }

  function onPointerUp(event) {
    const start = drag.current
    if (!start || start.id !== event.pointerId) return
    const moved = start.mx || 0
    const lifted = start.my || 0
    const way = start.way
    drag.current = null
    if (mode === 'fly') return
    if (start.live && way === 'up' && lifted <= -UP_THRESHOLD) {
      finish('later')
      return
    }
    if (start.live && way !== 'up' && moved >= THRESHOLD) {
      finish('did')
      return
    }
    if (start.live && way !== 'up' && moved <= -THRESHOLD) {
      finish('nope')
      return
    }
    setDx(0)
    setDy(0)
    setMode('')
  }

  return (
    <section
      className={liveMode ? `di-face di-swipe is-${liveMode}` : 'di-face di-swipe'}
      aria-labelledby={questionId}
      style={{
        transform: `translate(${liveDx}px, ${liveDy}px)${reduce ? '' : ` rotate(${liveDx / 42}deg)`}`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <p className="di-swipe-stamp is-did" style={{ opacity: Math.max(0, pull) }}>
        {t('tonight.swipeDid')}
      </p>
      <p className="di-swipe-stamp is-nope" style={{ opacity: Math.max(0, -pull) }}>
        {t('tonight.swipeNope')}
      </p>
      {onLater ? (
        <p className="di-swipe-stamp is-later" style={{ opacity: lift }}>
          {t('tonight.later')}
        </p>
      ) : null}
      {/* The tag sits where the DID stamp lands, so it steps aside on a pull. */}
      <p
        className="di-face-plate"
        style={{ opacity: 1 - Math.max(Math.min(1, Math.abs(pull)), lift) }}
      >
        {tag || t('tonight.didI')}
      </p>
      <h2 id={questionId} className="di-question">
        {lamp.question}
      </h2>
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
