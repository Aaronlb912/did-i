import { goHash } from '../site/hash.js'
import { t } from './i18n.js'

export function LegalLinks({ leadKey = 'legal.linksLead', subtle = false }) {
  const className = subtle ? 'di-set-note di-legal-links di-legal-links-subtle' : 'di-set-note di-legal-links'
  return (
    <p className={className}>
      {t(leadKey)}{' '}
      <button className="di-legal-link" type="button" onClick={() => goHash('/terms')}>
        {t('legal.termsShort')}
      </button>
      {t('legal.linksAnd')}
      <button className="di-legal-link" type="button" onClick={() => goHash('/privacy')}>
        {t('legal.privacyShort')}
      </button>
      .
    </p>
  )
}
