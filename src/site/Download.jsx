import { t } from '../lib/i18n.js'
import { APP_STORE_URL } from '../lib/store-skus.js'
import { BETA_PATH } from '../lib/invite-link.js'
import { MarketingShell } from './MarketingShell.jsx'
import { AppleIcon, PlayIcon } from './StoreButtons.jsx'

function StoreCard({ kicker, title, note, href, label, icon, here = false }) {
  return (
    <article className="di-download-card">
      <p className="di-face-plate">{kicker}</p>
      <h2 className="di-question">{title}</h2>
      <p className="di-detail-meta">{note}</p>
      <a className="di-did di-did-small di-link-did" href={href} {...(here ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
        {icon}
        {label}
      </a>
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
            href={BETA_PATH}
            label={t('web.store.androidBeta')}
            icon={<PlayIcon />}
            here
          />
          <StoreCard
            kicker={t('web.download.iphoneKicker')}
            title={t('web.download.iphone')}
            note={t('web.download.iphoneNote')}
            href={APP_STORE_URL}
            label={t('web.store.apple')}
            icon={<AppleIcon />}
          />
        </div>
      </div>
    </MarketingShell>
  )
}
