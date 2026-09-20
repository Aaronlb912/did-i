import { t } from '../lib/i18n.js'
import { legalEmail } from '../lib/legal.js'
import { readMarketingPath } from './path.js'
import { appHomeHref } from './link.js'

export function MarketingShell({ children, path }) {
  const here = path || readMarketingPath()
  const email = legalEmail()

  return (
    <div className="di-site">
      <nav className="di-site-nav">
        <a className="di-site-brand" href="/">
          Did I
        </a>
        <span className="di-site-links">
          <a href="/" className={here === '/' ? 'is-on' : undefined}>
            {t('web.nav.home')}
          </a>
          <a href="/privacy" className={here === '/privacy' ? 'is-on' : undefined}>
            {t('web.nav.privacy')}
          </a>
          <a href="/terms" className={here === '/terms' ? 'is-on' : undefined}>
            {t('web.nav.terms')}
          </a>
          <a href={appHomeHref()} className="di-site-app-link">
            {t('web.nav.app')}
          </a>
        </span>
      </nav>
      <main className="di-door">{children}</main>
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
