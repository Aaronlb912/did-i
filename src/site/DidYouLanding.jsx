import { useEffect, useState } from 'react'
import { t } from '../lib/i18n.js'
import { APP_STORE_URL, betaLinkFor } from '../lib/invite-link.js'
import { deadDidYouLinkKey, didYouAsk, didYouLink, isWeLinkCode, lookUpDidYouLink, lookUpWeLink } from '../lib/did-you-links.js'
import { AppleMark, PlayMark } from './Invite.jsx'
import { MarketingShell } from './MarketingShell.jsx'
import { webAppPublic } from './web-app.js'

// did-i.app/d/CODE: a Did you link. With Did I installed, Open asks to add
// the question to tonight. Without it, the store buttons copy the link
// (iPhone reads it on first launch) or carry it as the Play referrer.
// A 12 letter code is a Did we link: Open asks to join it. Where the web app
// is public, it can also be joined and answered on the web (/app#/we?link=).
export function DidYouLanding({ code }) {
  const link = didYouLink(code)
  const we = isWeLinkCode(code)
  const [found, setFound] = useState(link ? undefined : null)
  const [copied, setCopied] = useState(false)
  const [deadKey, setDeadKey] = useState('didYouLink.bad')

  useEffect(() => {
    if (!link) return undefined
    let alive = true
    ;(we ? lookUpWeLink(code) : lookUpDidYouLink(code)).then(async (next) => {
      // Nothing came back: say "stopped" when its maker stopped it.
      if (!next && !we) {
        const key = await deadDidYouLinkKey(code)
        if (alive) setDeadKey(key)
      }
      if (alive) setFound(next)
    })
    return () => {
      alive = false
    }
  }, [code, link, we])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      // Open in Did I still works once it is installed.
    }
  }

  const ready = found && !found.miss
  const title =
    found === undefined
      ? t('family.loading')
      : found?.miss
        ? t('didYouLink.reach')
        : found
          ? we
            ? t('weLink.asked', { name: found.name || t('weLink.someone') })
            : t('didYouLink.asked', { name: found.name || 'Did I' })
          : t(deadKey)

  return (
    <MarketingShell path="/download">
      <div className="di-download">
        <p className="di-face-plate">{t('web.download.kicker')}</p>
        <h1 className="di-question">{title}</h1>
        {ready ? (
          <>
            <p className="di-invite-code">{didYouAsk(found.question, t('people.sendWhat'))}</p>
            <div className="di-scan-open">
              <a className="di-did di-did-small di-invite-store" href={`didi://d/${code.toLowerCase()}`}>
                {t('scanPage.open')}
              </a>
            </div>
            {we && webAppPublic() ? (
              <>
                <p className="di-land-lead">{t('weLink.webLead')}</p>
                <div className="di-scan-open">
                  <a className="di-key di-invite-store" href={`/app#/we?link=${code.toLowerCase()}`}>
                    {t('weLink.webJoin')}
                  </a>
                </div>
              </>
            ) : null}
            <p className="di-land-lead">{t(we ? 'weLink.noApp' : 'didYouLink.noApp')}</p>
            <div className="di-download-grid">
              <a className="di-did di-did-small di-invite-store" href={APP_STORE_URL} onClick={copyLink}>
                <AppleMark />
                {t('invite.ios')}
              </a>
              <a
                className="di-did di-did-small di-invite-store"
                href={betaLinkFor(`did=${code.toLowerCase()}`)}
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
