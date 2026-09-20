import { t } from '../lib/i18n.js'
import { SiteNav } from './SiteNav.jsx'

export function Read() {
  return (
    <div className="di-site">
      <SiteNav path="/read" />
      <main className="di-door">
        <article className="di-door-plate di-read">
          <p className="di-face-plate">{t('site.read.kicker')}</p>
          <h1 className="di-question">{t('site.read.title')}</h1>
          <p>{t('site.read.p1')}</p>
          <p>{t('site.read.p2')}</p>
          <p>{t('site.read.p3')}</p>
          <p>{t('site.read.p4')}</p>
          <p>{t('site.read.p5')}</p>
          <p>
            <a className="di-skip" href="#/">
              {t('site.read.openHome')}
            </a>
            {' · '}
            <a className="di-skip" href="#/help">
              {t('site.read.helpInApp')}
            </a>
          </p>
        </article>
      </main>
    </div>
  )
}
