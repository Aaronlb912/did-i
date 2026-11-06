import { t } from '../lib/i18n.js'
import { BETA_PATH } from '../lib/invite-link.js'
import { MarketingShell } from './MarketingShell.jsx'
import { AppleIcon, PlayIcon, siteAppStoreUrl } from './StoreButtons.jsx'

const D = (key) => t(`web.download.${key}`)

function StoreCard({ kicker, title, note, lines, children }) {
  return (
    <article className="di-download-card">
      <p className="di-face-plate">{kicker}</p>
      <h2 className="di-question">{title}</h2>
      <p className="di-detail-meta">{note}</p>
      <ul className="di-log-list di-download-lines">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {children}
    </article>
  )
}

export function Download() {
  return (
    <MarketingShell path="/download" wide>
      <div className="di-download">
        <p className="di-face-plate">{D('kicker')}</p>
        <h1 className="di-question">{D('title')}</h1>
        <p className="di-land-lead">{D('lead')}</p>

        <div className="di-download-grid">
          <StoreCard
            kicker={D('iphoneKicker')}
            title={D('iphone')}
            note={D('iphoneNote')}
            lines={[D('i1'), D('i2'), D('i3')]}
          >
            <a className="di-did di-did-small di-link-did" href={siteAppStoreUrl()} target="_blank" rel="noopener noreferrer">
              <AppleIcon />
              {t('web.store.apple')}
            </a>
          </StoreCard>
          <StoreCard
            kicker={D('androidKicker')}
            title={D('android')}
            note={D('androidNote')}
            lines={[D('a1'), D('i3'), D('a3')]}
          >
            <p className="di-log-mono di-download-steps-title">{D('stepsTitle')}</p>
            <ol className="di-download-steps">
              <li>{t('web.beta.step1')}</li>
              <li>{t('web.beta.step2')}</li>
              <li>{t('web.beta.step3')}</li>
            </ol>
            <a className="di-did di-did-small di-link-did" href={BETA_PATH}>
              <PlayIcon />
              {t('web.store.androidBeta')}
            </a>
          </StoreCard>
        </div>

        <p className="di-land-lead di-download-close">{D('close')}</p>
      </div>
    </MarketingShell>
  )
}
