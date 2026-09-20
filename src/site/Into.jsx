import { t } from '../lib/i18n.js'
import { SiteNav } from './SiteNav.jsx'

export function Into() {
  return (
    <div className="di-site">
      <SiteNav path="/into" />
      <main className="di-door">
        <article className="di-door-plate di-read">
          <p className="di-face-plate">{t('site.into.kicker')}</p>
          <h1 className="di-question">{t('site.into.title')}</h1>
          <p>{t('site.into.p1')}</p>
          <pre className="di-pre">{t('site.into.code')}</pre>
          <p>{t('site.into.p2')}</p>
          <p>
            <a className="di-skip" href="#/door">
              {t('site.into.back')}
            </a>
          </p>
        </article>
      </main>
    </div>
  )
}
