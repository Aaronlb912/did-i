import { t } from '../lib/i18n.js'
import { legalEmail } from '../lib/legal.js'
import { usePrefs } from '../lib/prefs.js'
import { readMarketingPath } from './path.js'
import { SiteLocale } from './SiteLocale.jsx'
export function MarketingShell({ children, path, wide = false }) {
  usePrefs()
  const here = path || readMarketingPath()
  const email = legalEmail()
  const home = here === '/'

  return (
    <div className={['di-site', wide ? 'di-site-wide' : ''].filter(Boolean).join(' ')}>
      <nav className="di-site-nav">
        <a className="di-site-brand" href="/">
          Did I
        </a>
        <span className="di-site-links">
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
          {t('web.footer.copy')}
          {email ? (
            <>
              {' '}
              <a href={`mailto:${email}`}>{email}</a>
            </>
          ) : null}
        </p>
      </footer>
    </div>
  )
}
