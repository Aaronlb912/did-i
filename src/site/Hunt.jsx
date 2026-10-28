import { useState } from 'react'
import { t } from '../lib/i18n.js'
import { HUNT_APP_URL, HUNT_CLAIM_URL, savePendingHunt } from '../lib/hunt-link.js'
import { APP_STORE_URL, betaLinkFor } from '../lib/invite-link.js'
import { AppleMark, PlayMark } from './Invite.jsx'
import { MarketingShell } from './MarketingShell.jsx'

// did-i.app/hunt (and /hunt/claim, for a browser that has no app to open).
// The buttons copy the claim link first, so the iPhone app can pick it up on
// first launch; the Play link carries hunt=1 as the install referrer.
export function Hunt() {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    savePendingHunt()
    try {
      await navigator.clipboard.writeText(HUNT_CLAIM_URL)
      setCopied(true)
    } catch {
      // The app button still opens the app when it is installed.
    }
  }

  return (
    <MarketingShell path="/download">
      <div className="di-download">
        <p className="di-face-plate">{t('web.hunt.kicker')}</p>
        <h1 className="di-question">{t('web.hunt.title')}</h1>
        <p className="di-land-lead">{t('web.hunt.lead')}</p>
        <div className="di-download-grid">
          <a className="di-did di-did-small di-invite-store" href={APP_STORE_URL} onClick={copyLink}>
            <AppleMark />
            {t('invite.ios')}
          </a>
          <a className="di-did di-did-small di-invite-store" href={betaLinkFor('hunt=1')} onClick={copyLink}>
            <PlayMark />
            {t('web.store.androidBeta')}
          </a>
        </div>
        <p className="di-detail-meta">{t('web.hunt.claimNote')}</p>
        <a className="di-did di-did-small di-link-did" href={HUNT_APP_URL} onClick={copyLink}>
          {t('web.hunt.claim')}
        </a>
        {copied ? (
          <p className="di-detail-meta" role="status">
            {t('web.hunt.copied')}
          </p>
        ) : null}
        <p className="di-detail-meta">
          <a className="di-invite-open" href="/">{t('web.hunt.home')}</a>
        </p>
      </div>
    </MarketingShell>
  )
}
