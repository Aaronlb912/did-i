import { t } from '../lib/i18n.js'
import { MarketingShell } from './MarketingShell.jsx'
import { appHomeHref } from './link.js'

export function Landing() {
  return (
    <MarketingShell path="/">
      <section className="di-door-plate di-landing">
        <p className="di-face-plate">{t('web.landing.kicker')}</p>
        <h1 className="di-question">{t('web.landing.title')}</h1>
        <p>{t('web.landing.lead')}</p>
        <ul className="di-landing-list">
          <li>{t('web.landing.b1')}</li>
          <li>{t('web.landing.b2')}</li>
          <li>{t('web.landing.b3')}</li>
          <li>{t('web.landing.b4')}</li>
        </ul>
        <p className="di-door-actions">
          <a className="di-did di-did-small di-link-did" href={appHomeHref()}>
            {t('web.landing.cta')}
          </a>
          <a className="di-skip" href="/privacy">
            {t('web.nav.privacy')}
          </a>
          <a className="di-skip" href="/terms">
            {t('web.nav.terms')}
          </a>
        </p>
        <p className="di-set-note">{t('web.landing.note')}</p>
      </section>
    </MarketingShell>
  )
}
