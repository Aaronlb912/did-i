import { useState } from 'react'
import { t } from '../lib/i18n.js'
import { SiteNav } from './SiteNav.jsx'

export function NameBoard({ currentTitle, hasBoard, onOpenHere, onStartEmpty }) {
  const [name, setName] = useState(
    currentTitle && currentTitle !== 'My hall' && currentTitle !== 'My board' ? currentTitle : '',
  )
  const [miss, setMiss] = useState('')

  function empty() {
    const title = name.trim()
    if (!title) {
      setMiss(t('site.name.miss'))
      return
    }
    setMiss('')
    onStartEmpty(title)
  }

  return (
    <div className="di-site">
      <SiteNav path="/name" />
      <main className="di-door">
        <section className="di-door-plate">
          <p className="di-face-plate">{t('site.name.kicker')}</p>
          <h1 className="di-question">{t('site.name.title')}</h1>
          <p>{t('site.name.body')}</p>
          <label className="di-field">
            <span>{t('site.name.label')}</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('hang.tagPh')}
            />
          </label>
          {miss ? (
            <p className="di-miss" role="alert">
              {miss}
            </p>
          ) : null}
          <p className="di-door-actions">
            {hasBoard ? (
              <button className="di-did di-did-small" type="button" onClick={onOpenHere}>
                {t('site.name.openBoard', { board: currentTitle })}
              </button>
            ) : null}
            <button className="di-skip" type="button" onClick={empty}>
              {t('site.name.startEmpty')}
            </button>
          </p>
        </section>
      </main>
    </div>
  )
}
