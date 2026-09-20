import { useEffect, useRef } from 'react'
import { t } from '../lib/i18n.js'
import { LandingPhone } from './LandingPhone.jsx'
import { MarketingShell } from './MarketingShell.jsx'
import { WaitlistForm } from './WaitlistForm.jsx'

const STEPS = ['web.landing.step1', 'web.landing.step2', 'web.landing.step3']

function useReveal() {
  const root = useRef(null)

  useEffect(() => {
    const node = root.current
    if (!node || typeof IntersectionObserver === 'undefined') return undefined

    const bits = node.querySelectorAll('[data-reveal]')
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add('is-in')
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )

    bits.forEach((bit) => io.observe(bit))
    return () => io.disconnect()
  }, [])

  return root
}

export function Landing() {
  const root = useReveal()

  return (
    <MarketingShell path="/" wide>
      <div className="di-land" ref={root}>
        <section className="di-land-hero">
          <div className="di-land-hero-copy">
            <p className="di-face-plate">{t('web.landing.kicker')}</p>
            <h1 className="di-question di-land-title">{t('web.landing.title')}</h1>
            <p className="di-land-lead">{t('web.landing.lead')}</p>
            <WaitlistForm />
          </div>
          <LandingPhone />
        </section>

        <section className="di-land-steps" data-reveal>
          <h2 className="di-land-steps-title">{t('web.landing.stepsTitle')}</h2>
          <ol className="di-land-steps-list">
            {STEPS.map((key) => (
              <li key={key} className="di-land-step">
                <span className="di-land-step-num">{t(`${key}.num`)}</span>
                <div>
                  <h3>{t(`${key}.title`)}</h3>
                  <p>{t(`${key}.line`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="di-land-band" data-reveal>
          <p className="di-land-band-line">{t('web.landing.band')}</p>
          <ul className="di-land-band-list">
            <li>{t('web.landing.b1')}</li>
            <li>{t('web.landing.b2')}</li>
            <li>{t('web.landing.b3')}</li>
            <li>{t('web.landing.b4')}</li>
          </ul>
        </section>

        <section className="di-land-close" data-reveal>
          <h2 className="di-question di-land-close-title">{t('web.landing.closeTitle')}</h2>
          <p className="di-land-lead">{t('web.landing.closeLead')}</p>
          <WaitlistForm compact />
          <p className="di-set-note">{t('web.landing.note')}</p>
        </section>
      </div>
    </MarketingShell>
  )
}
