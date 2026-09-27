import { useEffect, useRef } from 'react'
import { t } from '../lib/i18n.js'
import { LandingPhone } from './LandingPhone.jsx'
import { MarketingShell } from './MarketingShell.jsx'
import { StoreButtons } from './StoreButtons.jsx'

const STEPS = ['web.landing.step1', 'web.landing.step2', 'web.landing.step3']
const TOGETHER = ['one', 'two', 'three']

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
            <StoreButtons />
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

        <section className="di-land-together" data-reveal>
          <p className="di-face-plate">{t('web.landing.together.kicker')}</p>
          <h2 className="di-question di-land-together-title">{t('web.landing.together.title')}</h2>
          <p className="di-land-lead">{t('web.landing.together.lead')}</p>
          <ul className="di-land-together-list">
            {TOGETHER.map((key) => (
              <li key={key} className="di-land-together-card">
                <h3>{t(`web.landing.together.${key}.title`)}</h3>
                <p>{t(`web.landing.together.${key}.line`)}</p>
              </li>
            ))}
          </ul>
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
          <StoreButtons compact />
        </section>
      </div>
    </MarketingShell>
  )
}
