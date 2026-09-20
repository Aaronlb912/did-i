import { goHash } from '../site/hash.js'
import { goSite } from '../site/link.js'
import { BoardShell } from './BoardShell.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function Help({ book, now }) {
  usePrefs()
  const clock = now || new Date()

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <article className="di-page di-help">
        <p className="di-face-plate">{t('help.kicker')}</p>
        <h2 className="di-page-title">{t('help.title')}</h2>
        <p className="di-about-p">{t('help.lead')}</p>

        <section className="di-help-block" id="night">
          <h3>{t('help.tonight')}</h3>
          <p>{t('help.tonightP1')}</p>
          <p>{t('help.tonightP2')}</p>
        </section>

        <section className="di-help-block" id="streak">
          <h3>{t('help.streak')}</h3>
          <p>{t('help.streakP')}</p>
          <div className="di-hang-actions">
            <button className="di-key" type="button" onClick={() => goHash('/marks')}>
              {t('help.marks')}
            </button>
          </div>
        </section>

        <section className="di-help-block" id="data">
          <h3>{t('help.phone')}</h3>
          <p>{t('help.phoneP')}</p>
        </section>

        <section className="di-help-block" id="legal">
          <h3>{t('help.legal')}</h3>
          <p>{t('help.legalP')}</p>
          <div className="di-hang-actions">
            <button className="di-key di-link-did" type="button" onClick={() => goSite('/privacy')}>
              {t('settings.privacy')}
            </button>
            <button className="di-key di-link-did" type="button" onClick={() => goSite('/terms')}>
              {t('settings.terms')}
            </button>
          </div>
        </section>

        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/home')}>
            {t('help.home')}
          </button>
        </div>
      </article>
    </BoardShell>
  )
}
