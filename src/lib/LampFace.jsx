import { useEffect, useRef, useState } from 'react'
import { NightStrip } from './NightStrip.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { answerFor } from './recurrence.js'
import { useReduceMotion } from './useReduceMotion.js'

const THRESHOLD = 72

export function LampFace({ row, onYes, onSkip, book, tag, keys, onPickHole }) {
  usePrefs()
  const reduce = useReduceMotion()
  const drag = useRef(null)
  const [dx, setDx] = useState(0)
  const [mode, setMode] = useState('')
  const lampId = row?.lamp?.id
  const periodKey = row?.periodKey

  useEffect(() => {
    setDx(0)
    setMode('')
    drag.current = null
  }, [lampId, periodKey])

  if (!row) return null
  const { lamp } = row
  const hasHistory = (keys || []).some((key) => answerFor(book, lamp.id, key))
  const pull = Math.max(-1, Math.min(1, dx / THRESHOLD))

  function finish(way) {
    if (mode === 'fly') return
    setMode('fly')
    const go = way === 'did' ? onYes : onSkip
    if (reduce) {
      go()
      return
    }
    setDx(way === 'did' ? 460 : -460)
    window.setTimeout(go, 180)
  }

  function onPointerDown(event) {
    if (mode === 'fly') return
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
      className={mode ? `di-face di-swipe is-${mode}` : 'di-face di-swipe'}
      aria-labelledby="di-question"
      style={{
        transform: `translateX(${dx}px)${reduce ? '' : ` rotate(${dx / 42}deg)`}`,
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
      <p className="di-face-plate">{tag || t('tonight.didI')}</p>
      <h2 id="di-question" className="di-question">
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
