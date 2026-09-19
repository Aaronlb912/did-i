import { goHash } from '../site/hash.js'
import { markWelcomeSeen } from './hall-pages.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { BoardShell } from './BoardShell.jsx'

export function Welcome({ book }) {
  usePrefs()

  function finish() {
    markWelcomeSeen()
    const empty = (book.lamps || []).filter((lamp) => !lamp.archived).length === 0
    goHash(empty ? '/first' : '/')
  }

  return (
    <BoardShell book={book} title={t('welcome.plate')} nav={false} cog={false}>
      <section className="di-welcome">
        <p className="di-face-plate">{t('welcome.plate')}</p>
        <h2 className="di-question">{t('welcome.title')}</h2>
        <p className="di-welcome-body">{t('welcome.body')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={finish}>
            {t('welcome.start')}
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
