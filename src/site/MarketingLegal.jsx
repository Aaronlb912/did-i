import { LegalArticle, PRIVACY_SECTIONS, TERMS_SECTIONS } from '../lib/LegalArticle.jsx'
import { t } from '../lib/i18n.js'
import { MarketingShell } from './MarketingShell.jsx'

export function MarketingPrivacy() {
  return (
    <MarketingShell path="/privacy">
      <article className="di-door-plate di-legal di-legal-web">
        <LegalArticle kind="privacy" sections={PRIVACY_SECTIONS} />
        <p className="di-door-actions">
          <a className="di-did di-did-small di-link-did" href="/download">
            {t('web.nav.download')}
          </a>
          <a className="di-skip" href="/terms">
            {t('legal.termsShort')}
          </a>
        </p>
      </article>
    </MarketingShell>
  )
}

export function MarketingTerms() {
  return (
    <MarketingShell path="/terms">
      <article className="di-door-plate di-legal di-legal-web">
        <LegalArticle kind="terms" sections={TERMS_SECTIONS} />
        <p className="di-door-actions">
          <a className="di-did di-did-small di-link-did" href="/download">
            {t('web.nav.download')}
          </a>
          <a className="di-skip" href="/privacy">
            {t('legal.privacyShort')}
          </a>
        </p>
      </article>
    </MarketingShell>
  )
}
