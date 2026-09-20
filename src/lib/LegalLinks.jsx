import { goSite } from '../site/link.js'
import { t } from './i18n.js'

export function LegalLinks({ leadKey = 'legal.linksLead' }) {
  return (
    <p className="di-set-note di-legal-links">
      {t(leadKey)}{' '}
      <button className="di-legal-link" type="button" onClick={() => goSite('/terms')}>
        {t('legal.termsShort')}
      </button>
      {t('legal.linksAnd')}
      <button className="di-legal-link" type="button" onClick={() => goSite('/privacy')}>
        {t('legal.privacyShort')}
      </button>
      .
    </p>
  )
}
