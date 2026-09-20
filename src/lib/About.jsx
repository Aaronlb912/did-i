import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function About({ book, now }) {
  usePrefs()
  const clock = now || new Date()

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-about">
        <p className="di-face-plate">{t('about.kicker')}</p>
        <h2 className="di-page-title">{t('about.title')}</h2>
        <p className="di-about-p">{t('about.p1')}</p>
        <p className="di-about-p">{t('about.p2')}</p>
        <p className="di-about-p">{t('about.p3')}</p>
        <p className="di-about-p">{t('about.p4')}</p>
        <p className="di-about-p">{t('about.p5')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/')}>
            {t('about.home')}
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/help')}>
            {t('about.how')}
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
