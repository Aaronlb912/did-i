import { useEffect, useId, useRef, useState } from 'react'

export function HangSelect({ value, onChange, options, ariaLabel, className = '' }) {
  const [open, setOpen] = useState(false)
  const [focus, setFocus] = useState(-1)
  const rootRef = useRef(null)
  const listId = useId()
  const current = options.find((opt) => opt.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return undefined
    function onDoc(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setFocus((i) => (i + 1) % options.length)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setFocus((i) => (i <= 0 ? options.length - 1 : i - 1))
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        const pick = options[focus >= 0 ? focus : options.findIndex((o) => o.value === value)]
        if (pick) {
          onChange(pick.value)
          setOpen(false)
        }
      }
    }
    const closeTimer = window.setTimeout(() => document.addEventListener('click', onDoc), 0)
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(closeTimer)
      document.removeEventListener('click', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, focus, options, value, onChange])

  useEffect(() => {
    if (open) setFocus(options.findIndex((o) => o.value === value))
    else setFocus(-1)
  }, [open, options, value])

  function pick(next) {
    onChange(next)
    setOpen(false)
  }

  const shell = ['di-hang-select', open ? 'is-open' : '', className].filter(Boolean).join(' ')

  return (
    <div className={shell} ref={rootRef}>
      <button
        type="button"
        className="di-hang-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((was) => !was)}
      >
        <span className="di-hang-select-value">{current?.label}</span>
        <span className="di-hang-select-chev" aria-hidden="true" />
      </button>
      {open ? (
        <ul className="di-hang-select-menu" id={listId} role="listbox" aria-label={ariaLabel}>
          {options.map((opt, i) => (
            <li key={opt.value} role="presentation">
              <button
                type="button"
                className={[
                  'di-hang-select-opt',
                  opt.value === value ? 'is-on' : '',
                  focus === i ? 'is-focus' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                role="option"
                aria-selected={opt.value === value}
                onMouseEnter={() => setFocus(i)}
                onClick={() => pick(opt.value)}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
