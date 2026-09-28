import { useState } from 'react'
import { t } from '../lib/i18n.js'
import { legalEmail } from '../lib/legal.js'
import { MarketingShell } from './MarketingShell.jsx'

// Brand hex values, the same as the dark theme tokens in src/lib/did-i.css.
const COLORS = [
  { key: 'lime', hex: '#C9F24D' },
  { key: 'night', hex: '#0E1014' },
  { key: 'panel', hex: '#16191F' },
  { key: 'ink', hex: '#F4F6FA' },
  { key: 'soft', hex: '#99A1B0' },
  { key: 'miss', hex: '#FF6F61' },
]

const SHOTS = [1, 2, 3, 4, 5, 6]

function Save({ href, name }) {
  return (
    <a className="di-press-save" href={href} download={name} aria-label={t('web.press.save')}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  )
}

function Swatch({ name, hex }) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(hex)
      setCopied(true)
      setFailed(false)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setFailed(true)
    }
  }
  return (
    <button type="button" className="di-press-swatch" style={{ background: hex }} onClick={copy}>
      <span className="di-press-chip">
        <span>{name}</span>
        <span>{failed ? hex : copied ? t('web.press.copied') : hex}</span>
      </span>
    </button>
  )
}

export function Press() {
  const email = legalEmail()
  return (
    <MarketingShell path="/press" wide>
      <div className="di-press">
        <header className="di-press-head">
          <h1 className="di-question">{t('web.press.title')}</h1>
          <p className="di-land-lead">
            {t('web.press.lead')} {email ? <a href={`mailto:${email}`}>{email}</a> : null}
          </p>
        </header>

        <section className="di-press-card di-press-icons" aria-label={t('web.press.icon')}>
          <img src="/press/app-icon.png" alt={t('web.press.icon')} width="128" height="128" />
          <img src="/press/app-icon.png" alt="" width="80" height="80" />
          <img src="/press/app-icon.png" alt="" width="48" height="48" />
          <Save href="/press/app-icon.png" name="did-i-icon.png" />
        </section>

        <div className="di-press-marks">
          <section className="di-press-card di-press-mark is-light" aria-label={t('web.press.wordmark')}>
            <span className="di-press-word">Did I</span>
            <Save href="/press/wordmark-light.png" name="did-i-wordmark-light.png" />
          </section>
          <section className="di-press-card di-press-mark is-dark" aria-label={t('web.press.wordmarkDark')}>
            <span className="di-press-word">Did I</span>
            <Save href="/press/wordmark-dark.png" name="did-i-wordmark-dark.png" />
          </section>
        </div>

        <h2 className="di-press-label">{t('web.press.colors')}</h2>
        <div className="di-press-colors">
          {COLORS.map((c) => (
            <Swatch key={c.key} name={t(`web.press.color.${c.key}`)} hex={c.hex} />
          ))}
        </div>

        <h2 className="di-press-label">{t('web.press.shots')}</h2>
        <div className="di-press-shots">
          {SHOTS.map((n) => (
            <figure key={n} className="di-press-shot">
              <img
                src={`/press/shot-${n}.jpg`}
                alt={t('web.press.shotAlt', { n })}
                loading="lazy"
                width="540"
                height="1080"
              />
              <Save href={`/press/shot-${n}.jpg`} name={`did-i-screenshot-${n}.jpg`} />
            </figure>
          ))}
        </div>
      </div>
    </MarketingShell>
  )
}
