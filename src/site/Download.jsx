import { t } from '../lib/i18n.js'
import { MarketingShell } from './MarketingShell.jsx'

function StoreCard({ kicker, title, note }) {
  return (
    <article className="di-download-card">
      <p className="di-face-plate">{kicker}</p>
      <h2 className="di-question">{title}</h2>
      <p className="di-detail-meta">{note}</p>
      <button className="di-did di-did-small" type="button" disabled aria-disabled="true">
        {t('web.download.soon')}
      </button>
    </article>
  )
}

export function Download() {
  return (
    <MarketingShell path="/download">
      <div className="di-download">
        <p className="di-face-plate">{t('web.download.kicker')}</p>
        <h1 className="di-question">{t('web.download.title')}</h1>
        <p className="di-land-lead">{t('web.download.lead')}</p>

        <div className="di-download-grid">
          <StoreCard
            kicker={t('web.download.androidKicker')}
            title={t('web.download.android')}
            note={t('web.download.androidNote')}
          />
          <StoreCard
            kicker={t('web.download.iphoneKicker')}
            title={t('web.download.iphone')}
            note={t('web.download.iphoneNote')}
          />
        </div>
      </div>
    </MarketingShell>
  )
}
