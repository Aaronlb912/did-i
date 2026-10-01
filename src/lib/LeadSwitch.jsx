import { useEffect, useRef, useState } from 'react'
import { goHash } from '../site/hash.js'
import { t } from './i18n.js'

const PAGES = { i: '/add', we: '/we/new', you: '/you' }

function leadOf(mode) {
  if (mode === 'we') return t('we.title')
  if (mode === 'you') return t('lead.you')
  return t('tonight.didI')
}

// The words after "Did I" / "Did we" / "Did you", so they carry across.
export function wordsAfterLead(question) {
  let text = String(question || '').trim()
  for (const mode of ['i', 'we', 'you']) {
    const lead = leadOf(mode)
    if (text.toLowerCase().startsWith(`${lead.toLowerCase()} `)) {
      text = text.slice(lead.length).trim()
      break
    }
  }
  return text.replace(/\?+$/, '').trim()
}

// The web's "Did I ▾": the same three choices as the phone's Add screen.
// Each is its own page; the words typed so far come along.
export function LeadSwitch({ mode, question = '' }) {
  const [open, setOpen] = useState(false)
  const box = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const away = (event) => {
      if (box.current && !box.current.contains(event.target)) setOpen(false)
    }
    const key = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  function pick(next) {
    setOpen(false)
    if (next === mode) return
    const words = wordsAfterLead(question)
    goHash(PAGES[next], words ? { start: words } : {})
  }

  return (
    <div className="di-lead-switch" ref={box}>
      <button
        type="button"
        className={`di-lead-switch-btn is-${mode}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('lead.change', { lead: leadOf(mode) })}
        onClick={() => setOpen((now) => !now)}
      >
        {leadOf(mode)} <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="di-lead-menu" role="menu" aria-label={t('lead.pick')}>
          <p className="di-set-cap">{t('lead.pick')}</p>
          {[
            ['i', t('lead.iNote')],
            ['we', t('lead.weNote')],
            ['you', t('lead.youNote')],
          ].map(([id, note]) => (
            <button
              key={id}
              type="button"
              role="menuitemradio"
              aria-checked={mode === id}
              className={`di-lead-option is-${id}${mode === id ? ' is-on' : ''}`}
              onClick={() => pick(id)}
            >
              <strong>{leadOf(id)}</strong>
              <span>{note}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
