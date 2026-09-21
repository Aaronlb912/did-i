import { SetCard, SetRow } from '../lib/set-bits.jsx'
import { t } from '../lib/i18n.js'
import { FIXTURE_LAMP, FIXTURE_PERIOD, FIXTURE_WAIT_ROW } from './fixture-data.js'

function FaceCard({ kicker, title, meta, actions }) {
  return (
    <section className="di-face">
      <p className="di-face-plate">{kicker}</p>
      <h2 className="di-question">{title}</h2>
      {meta ? <p className="di-detail-meta">{meta}</p> : null}
      {actions}
    </section>
  )
}

export function WebFixtures() {
  return (
    <div className="di-hall" data-theme="dark" data-look="lime" style={{ width: 390, padding: 16, boxSizing: 'border-box' }}>
      <div id="web-jewel" data-visual-fixture="jewel" style={{ marginBottom: 16 }}>
        <ul className="di-edge" style={{ display: 'flex', gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <button type="button" className="di-jewel is-on is-face" data-filament="2">
              <span className="di-jewel-ring"><span className="di-jewel-glass" /></span>
              <span className="di-jewel-label">Door</span>
            </button>
          </li>
          <li>
            <button type="button" className="di-jewel is-hole">
              <span className="di-jewel-ring"><span className="di-jewel-glass" /></span>
              <span className="di-jewel-label">Pills</span>
            </button>
          </li>
        </ul>
      </div>

      <div id="web-face" data-visual-fixture="face" style={{ marginBottom: 16 }}>
        <FaceCard kicker={t('tonight.didI')} title={FIXTURE_LAMP.question} />
      </div>

      <div id="web-hole" data-visual-fixture="hole" style={{ marginBottom: 16 }}>
        <FaceCard
          kicker={t('hole.kicker')}
          title={FIXTURE_LAMP.question}
          meta={FIXTURE_PERIOD}
          actions={
            <div className="di-switch">
              <button className="di-did di-did-small" type="button">{t('hole.late')}</button>
              <button className="di-tape" type="button">{t('tonight.swipeNope')}</button>
            </div>
          }
        />
      </div>

      <div id="web-wait" data-visual-fixture="wait" style={{ marginBottom: 16 }}>
        <FaceCard
          kicker={t('wait.kicker')}
          title={FIXTURE_WAIT_ROW.lamp.question}
          meta={t('wait.after', { time: FIXTURE_WAIT_ROW.lamp.askAfter })}
          actions={
            <div className="di-switch">
              <button className="di-did di-did-small" type="button">{t('wait.thisQuestion')}</button>
              <button className="di-key" type="button">{t('wait.sit')}</button>
            </div>
          }
        />
      </div>

      <div id="web-settings" data-visual-fixture="settings">
        <SetCard>
          <SetRow label={t('settings.theme')} value={t('theme.dark')} chevron />
          <SetRow label={t('settings.language')} value={t('lang.en')} chevron />
        </SetCard>
      </div>
    </div>
  )
}
