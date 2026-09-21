import { useRef, useState } from 'react'
import { t } from './i18n.js'
import {
  SWIPE_THRESHOLD as THRESHOLD,
  SWIPE_WAKE,
  stampOpacity,
  swipePull,
  swipeTilt,
} from './swipe-face.js'
import { useSwipePullReport } from './SwipePull.jsx'
import { useReduceMotion } from './useReduceMotion.js'

export function FinishFace({ count, onContinue, onRest }) {
  const reduce = useReduceMotion()
  const drag = useRef(null)
  const [dx, setDx] = useState(0)
  const [mode, setMode] = useState('')
  const pull = swipePull(dx)
  useSwipePullReport(pull)

  function go(way) {
    if (mode === 'fly') return
    const done = way === 'did' ? onContinue : onRest
    if (reduce || way === 'nope') {
      done()
      return
    }
    setMode('fly')
    setDx(460)
    window.setTimeout(done, 180)
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
    if (start.live && moved >= THRESHOLD) {
      go('did')
      return
    }
    if (start.live && moved <= -THRESHOLD) {
      go('nope')
      return
    }
    setDx(0)
    setMode('')
  }

  const title = count === 1 ? t('tonight.finishOne') : t('tonight.finishTitle', { n: count })

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
      <p className="di-swipe-stamp is-did" style={{ opacity: stampOpacity(pull, 'did') }}>
        {t('tonight.finishKeep')}
      </p>
      <p className="di-swipe-stamp is-nope" style={{ opacity: stampOpacity(pull, 'nope') }}>
        {t('tonight.finishLeave')}
      </p>
      <p className="di-face-plate" style={{ opacity: 1 - Math.min(1, Math.abs(pull)) }}>
        {t('tonight.finishKicker')}
      </p>
      <h2 className="di-question">{title}</h2>
    </section>
  )
}
