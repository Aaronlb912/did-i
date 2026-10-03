import { useState } from 'react'
import { t } from '../lib/i18n.js'
import { APP_STORE_URL, betaLinkFor, inviteClip, savePendingInvite } from '../lib/invite-link.js'
import { INVITE_CODE_LEN, cleanInvite } from '../lib/people.js'
import { MarketingShell } from './MarketingShell.jsx'

export function AppleMark() {
  return (
    <svg className="di-invite-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.9-4.3zM13.9 5.3c.7-.9 1.2-2 1-3.2-1 0-2.2.7-3 1.5-.6.7-1.2 1.9-1.1 3.1 1.2.1 2.3-.6 3.1-1.4z"
      />
    </svg>
  )
}

export function PlayMark() {
  return (
    <svg className="di-invite-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M4.5 2.8c-.3.3-.5.8-.5 1.4v15.6c0 .6.2 1.1.5 1.4l8.7-9.2-8.7-9.2zm9.9 10.4 2.9 2.9-11 6.2c-.4.2-.8.3-1.1.2l9.2-9.3zm0-2.4L5.2 1.5c.3-.1.7 0 1.1.2l11 6.2-2.9 2.9zm4.1-2.2 3 1.7c.9.5.9 1.3 0 1.8l-3 1.7-3.1-2.6 3.1-2.6z" />
    </svg>
  )
}

// did-i.app/i/CODE. The store buttons copy the invite link first, so the
// iPhone app can pick it up on first launch; the Play link also carries the
// code as the install referrer.
export function Invite({ code: raw }) {
  const code = cleanInvite(raw)
  const [copied, setCopied] = useState(false)
  const ok = code.length === INVITE_CODE_LEN

  async function copyCode() {
    // Also kept here, so signing up on the website in this browser uses it.
    savePendingInvite(code)
    try {
      await navigator.clipboard.writeText(inviteClip(code))
      setCopied(true)
    } catch {
      // The code is on the page to type in by hand.
    }
  }

  return (
    <MarketingShell path="/download">
      <div className="di-download">
        <p className="di-face-plate">{t('web.download.kicker')}</p>
        <h1 className="di-question">{ok ? t('invite.title') : t('invite.bad')}</h1>
        {ok ? (
          <>
            <p className="di-land-lead">{t('invite.lead')}</p>
            <p className="di-invite-code">{code}</p>
            <div className="di-download-grid">
              <a className="di-did di-did-small di-invite-store" href={APP_STORE_URL} onClick={copyCode}>
                <AppleMark />
                {t('invite.ios')}
              </a>
              <a className="di-did di-did-small di-invite-store" href={betaLinkFor(`invite=${cleanInvite(code)}`)} onClick={copyCode}>
                <PlayMark />
                {t('web.store.androidBeta')}
              </a>
            </div>
            <p className="di-detail-meta">
              <a className="di-invite-open" href={`didi://invite/${code}`}>{t('invite.open')}</a>
            </p>
            {copied ? (
              <p className="di-detail-meta" role="status">
                {t('invite.copied')}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </MarketingShell>
  )
}
