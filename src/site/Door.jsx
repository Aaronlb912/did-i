import { t } from '../lib/i18n.js'
import { SiteNav } from './SiteNav.jsx'

export function Door({ hasBoard, title, canInstall, onInstall }) {
  return (
    <div className="di-site">
      <SiteNav path="/door" />
      <main className="di-door">
        <section className="di-door-plate">
          <p className="di-face-plate">{t('site.door.kicker')}</p>
          <h1 className="di-question">{t('site.door.title')}</h1>
          <p>{t('site.door.p1')}</p>
          <p>{t('site.door.p2')}</p>
          <p>{t('site.door.p3')}</p>
          <p className="di-door-actions">
            <a className="di-did di-did-small di-link-did" href="#/">
              {hasBoard ? t('site.door.openBoard', { board: title }) : t('site.door.openHome')}
            </a>
            <a className="di-skip" href="#/read">
              {t('site.door.how')}
            </a>
            <a className="di-skip" href="#/name">
              {t('site.door.namePhone')}
            </a>
            {canInstall && onInstall ? (
              <button className="di-skip" type="button" onClick={onInstall}>
                {t('settings.install')}
              </button>
            ) : null}
          </p>
        </section>
      </main>
    </div>
  )
}
