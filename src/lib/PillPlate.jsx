import { useEffect, useRef, useState } from 'react'
import { BuddyHang } from './Cosmetic.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import {
  SWIPE_THRESHOLD as THRESHOLD,
  SWIPE_WAKE,
  stampOpacity,
  swipePull,
  swipeTilt,
} from './swipe-face.js'
import { mustSwipeDeadline } from './board-json.js'
import { formatBoardDate } from './recurrence.js'
import { pillStatusLabel } from './pill-status.js'
import { useSwipePullReport } from './SwipePull.jsx'
import { useReduceMotion } from './useReduceMotion.js'

// Answering from the pill, for the nights you know the answer before the
// card comes round. Same swipe as the face card.
export function PillPlate({ row, onDid, onNope, buddy = '', readOnly = false }) {
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
  const status = row.answer?.status || ''
  const isDid = status === 'yes' || status === 'late'
  const blockDid = isDid
  const blockNope = status === 'skip' || isDid
  const optionalEarly =
    row.dateIso && row.lamp && !mustSwipeDeadline(row.lamp, row.dateIso)
  const pull = swipePull(dx)
  useSwipePullReport(pull)

  if (readOnly) {
    return (
      <section className="di-face">
        <BuddyHang id={buddy} />
        <p className="di-face-plate">{row.tag || t('tonight.didI')}</p>
        <h2 className="di-question">{row.lamp.question}</h2>
        <p className="di-detail-meta">{pillStatusLabel(status)}</p>
      </section>
    )
  }

  function finish(way) {
    if (mode === 'fly') return
    if (way === 'did' && blockDid) return
    if (way === 'nope' && blockNope) return
    const go = way === 'did' ? onDid : onNope
    go()
    if (reduce || way === 'nope') return
    setMode('fly')
    setDx(460)
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
    if (start.live && moved >= THRESHOLD && !blockDid) {
      finish('did')
      return
    }
    if (start.live && moved <= -THRESHOLD && !blockNope) {
      finish('nope')
      return
    }
    setDx(0)
    setMode('')
  }

  return (
    <section
      className={mode ? `di-face di-swipe is-${mode}` : 'di-face di-swipe'}
      style={{
        transform: `translate(${dx}px, 0)${reduce ? '' : ` rotate(${swipeTilt(dx)}deg)`}`,
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
      <p className="di-face-plate" style={{ opacity: 1 - Math.min(1, Math.abs(pull)) }}>
        {row.tag || t('tonight.didI')}
      </p>
      <h2 className="di-question">{row.lamp.question}</h2>
      {optionalEarly ? (
        <p className="di-detail-meta">
          {t('tonight.deadlineOptional', { date: formatBoardDate(row.lamp.dueBy) })}
        </p>
      ) : null}
    </section>
  )
}
