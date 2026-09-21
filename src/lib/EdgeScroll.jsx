import { useCallback, useEffect, useRef, useState } from 'react'

const DRAG = 6

/** Horizontal chip row: touch uses native scroll; mouse gets click-drag. */
export function EdgeScroll({ className = 'di-edge', ariaLabel, children }) {
  const ref = useRef(null)
  const drag = useRef(null)
  const [scrollable, setScrollable] = useState(false)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    function measure() {
      setScrollable(el.scrollWidth > el.clientWidth + 2)
    }

    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [children])

  const onPointerDown = useCallback((event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    const el = ref.current
    if (!el || el.scrollWidth <= el.clientWidth + 2) return
    drag.current = { x: event.clientX, left: el.scrollLeft, on: false }
    el.setPointerCapture(event.pointerId)
  }, [])

  const onPointerMove = useCallback((event) => {
    const d = drag.current
    if (!d) return
    const dx = event.clientX - d.x
    if (!d.on) {
      if (Math.abs(dx) < DRAG) return
      d.on = true
      setDragging(true)
    }
    const el = ref.current
    if (el) el.scrollLeft = d.left - dx
  }, [])

  const endDrag = useCallback((event) => {
    const d = drag.current
    if (!d) return
    const el = ref.current
    if (d.on && el) el.dataset.dragBlock = '1'
    drag.current = null
    setDragging(false)
    if (el) {
      try {
        el.releasePointerCapture(event.pointerId)
      } catch {
        // Lost capture.
      }
    }
  }, [])

  const onClickCapture = useCallback((event) => {
    const el = ref.current
    if (!el?.dataset.dragBlock) return
    event.preventDefault()
    event.stopPropagation()
    delete el.dataset.dragBlock
  }, [])

  const classes = [
    className,
    scrollable ? 'is-scrollable' : '',
    dragging ? 'is-dragging' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <ul
      ref={ref}
      className={classes}
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
    >
      {children}
    </ul>
  )
}
