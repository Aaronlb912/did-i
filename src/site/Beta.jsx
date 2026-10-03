import { useEffect, useState } from 'react'
import { useReduceMotion } from '../lib/useReduceMotion.js'
import { t } from '../lib/i18n.js'
import { MarketingShell } from './MarketingShell.jsx'
import { PlayIcon } from './StoreButtons.jsx'

// Android beta. Play only lets members of the beta Google Group into the
// closed test, so joining is two steps: the group, then the Play opt-in page,
// which also has the download. Testers got lost, so the steps come first.
const GROUP_URL = 'https://groups.google.com/g/did-i-beta'
const OPT_IN_URL = 'https://play.google.com/apps/testing/com.aaronbryant.didi'

// Same breakpoint as the 9:16 frame in site.css.
const PHONE = '(max-width: 639px)'

function usePhoneWidth() {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(PHONE).matches)
  useEffect(() => {
    const media = window.matchMedia(PHONE)
    const sync = () => setPhone(media.matches)
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
  return phone
}

// note says what to tap; tip is the small "if it looks wrong" line under the button.
function Step({ kicker, title, note, tip, href, label, icon = null }) {
  return (
    <article className="di-download-card">
      <p className="di-face-plate">{kicker}</p>
      <h2 className="di-question">{title}</h2>
      <p className="di-detail-meta">{note}</p>
      <a className="di-did di-did-small di-link-did" href={href} target="_blank" rel="noopener noreferrer">
        {icon}
        {label}
      </a>
      <p className="di-beta-tip">{tip}</p>
    </article>
  )
}

export function Beta() {
  const still = useReduceMotion()
  const cut = usePhoneWidth() ? 'demo-vertical' : 'demo'
  return (
    <MarketingShell path="/beta">
      <div className="di-download">
        <p className="di-face-plate">{t('web.beta.kicker')}</p>
        <h1 className="di-question">{t('web.beta.title')}</h1>
        <p className="di-land-lead">{t('web.beta.lead')}</p>

        <p className="di-beta-account">{t('web.beta.account')}</p>

        <div className="di-download-grid di-beta-steps">
          <Step
            kicker={t('web.beta.step1Kicker')}
            title={t('web.beta.step1')}
            note={t('web.beta.step1Note')}
            tip={t('web.beta.step1Tip')}
            href={GROUP_URL}
            label={t('web.beta.step1Button')}
          />
          <Step
            kicker={t('web.beta.step2Kicker')}
            title={t('web.beta.step2')}
            note={t('web.beta.step2Note')}
            tip={t('web.beta.step2Tip')}
            href={OPT_IN_URL}
            label={t('web.beta.step2Button')}
            icon={<PlayIcon />}
          />
        </div>

        <p className="di-detail-meta di-beta-fine">{t('web.beta.fine')}</p>

        <video
          className="di-beta-video"
          key={cut}
          src={`/beta/${cut}.mp4`}
          poster={`/beta/${cut}.jpg`}
          controls
          muted
          playsInline
          loop
          autoPlay={!still}
          preload="metadata"
          aria-label={t('web.beta.video')}
        />
      </div>
    </MarketingShell>
  )
}
