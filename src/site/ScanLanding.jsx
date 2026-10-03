import { useState } from 'react'
import { t } from '../lib/i18n.js'
import { APP_STORE_URL, betaLinkFor } from '../lib/invite-link.js'
import { formatFriendId } from '../lib/people.js'
import { familyQrLink, friendQrLink, readQrLink } from '../lib/qr-links.js'
import { AppleMark, PlayMark } from './Invite.jsx'
import { MarketingShell } from './MarketingShell.jsx'

// did-i.app/f/ID and did-i.app/j/CODE: what a friend or family QR code opens
// on a phone camera. With Did I installed, Open goes to the friend request or
// the family. Without it, the store buttons copy the link (iPhone reads it on
// first launch) or carry it as the Play referrer, and the app opens Connect
// after sign-in.
export function ScanLanding({ kind, code }) {
  const link = kind === 'f' ? friendQrLink(code) : familyQrLink(code)
  const found = readQrLink(link)
  const [copied, setCopied] = useState(false)
  const appLink = found?.friend ? `didi://friend/${found.friend}` : found ? `didi://family/${found.family}` : ''
  const referrer = found?.friend ? `scan=friend:${found.friend}` : found ? `scan=family:${found.family}` : ''

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      // The code is on the page to type in by hand.
    }
  }

  return (
    <MarketingShell path="/download">
      <div className="di-download">
        <p className="di-face-plate">{t('web.download.kicker')}</p>
        <h1 className="di-question">
          {!found ? t('scanPage.bad') : found.friend ? t('scanPage.friendTitle') : t('scanPage.familyTitle')}
        </h1>
        {found ? (
          <>
            <p className="di-land-lead">{found.friend ? t('scanPage.friendLead') : t('scanPage.familyLead')}</p>
            <p className="di-invite-code">{found.friend ? formatFriendId(found.friend) : found.family}</p>
            <div className="di-scan-open">
              <a className="di-did di-did-small di-invite-store" href={appLink}>{t('scanPage.open')}</a>
            </div>
            <p className="di-land-lead">{t('scanPage.noApp')}</p>
            <div className="di-download-grid">
              <a className="di-did di-did-small di-invite-store" href={APP_STORE_URL} onClick={copyLink}>
                <AppleMark />
                {t('invite.ios')}
              </a>
              <a
                className="di-did di-did-small di-invite-store"
                href={betaLinkFor(referrer)}
                onClick={copyLink}
              >
                <PlayMark />
                {t('web.store.androidBeta')}
              </a>
            </div>
            {copied ? (
              <p className="di-detail-meta" role="status">
                {t('scanPage.copied')}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </MarketingShell>
  )
}
