import { useEffect, useRef, useState } from 'react'
import { feedbackMailto } from '../lib/feedback.js'
import { t } from '../lib/i18n.js'
import { legalEmail } from '../lib/legal.js'
import { usePrefs } from '../lib/prefs.js'
import { readMarketingPath } from './path.js'
import { SiteLocale } from './SiteLocale.jsx'

// On narrow screens the links fold behind a menu button; this keeps the fold honest.
function useNavFold() {
  const [open, setOpen] = useState(false)
  const nav = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onDown = (event) => {
      if (nav.current && !nav.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  return { open, setOpen, nav }
}

export function MarketingShell({ children, path, wide = false }) {
  usePrefs()
  const here = path || readMarketingPath()
  const email = legalEmail()
  const feedback = feedbackMailto()
  const home = here === '/'
  const { open, setOpen, nav } = useNavFold()

  return (
    <div className={['di-site', wide ? 'di-site-wide' : ''].filter(Boolean).join(' ')}>
      <nav className={['di-site-nav', open ? 'is-open' : ''].filter(Boolean).join(' ')} ref={nav}>
        <a className="di-site-brand" href="/">
          Did I
        </a>
        {here !== '/download' ? (
          <a href="/download" className="di-site-download di-site-quick">
            {t('web.nav.download')}
          </a>
        ) : null}
        <button
          type="button"
          className="di-site-burger"
          aria-label={t('web.nav.menu')}
          aria-expanded={open}
          aria-controls="di-site-links"
          onClick={() => setOpen((was) => !was)}
        >
          <span aria-hidden="true" />
        </button>
        <span className="di-site-links" id="di-site-links">
          {!home ? (
            <a href="/" className={here === '/' ? 'is-on' : undefined}>
              {t('web.nav.home')}
            </a>
          ) : null}
          <a href="/privacy" className={here === '/privacy' ? 'is-on' : undefined}>
            {t('web.nav.privacy')}
          </a>
          <a href="/terms" className={here === '/terms' ? 'is-on' : undefined}>
            {t('web.nav.terms')}
          </a>
          {feedback ? (
            <a href={feedback} className="di-site-feedback">
              {t('web.nav.feedback')}
            </a>
          ) : null}
          <a
            href="/download"
            className={['di-site-download', here === '/download' ? 'is-on' : '']
              .filter(Boolean)
              .join(' ')}
          >
            {t('web.nav.download')}
          </a>
          <SiteLocale />
        </span>
      </nav>
      <main className={wide ? 'di-door di-door-wide' : 'di-door'}>{children}</main>
      <footer className="di-site-foot">
        <p>
          {t('tonight.didI')}. {t('web.landing.end.title')}
          {email ? (
            <>
              {' '}
              <a href={`mailto:${email}`}>{email}</a>
            </>
          ) : null}{' '}
          <a href="/press">{t('web.nav.press')}</a>{' '}
          <a href="/guides/">{t('web.nav.guides')}</a>
        </p>
        <p>{t('legal.copyright')}</p>
      </footer>
    </div>
  )
}
