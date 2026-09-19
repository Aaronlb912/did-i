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
        <p className="di-face-plate">About</p>
        <h2 className="di-page-title">What this is</h2>
        <p className="di-about-p">
          Did I is the unanswered question for tonight. One at a time. Hit DID
          if you did it. Hit nope if tonight is not that night.
        </p>
        <p className="di-about-p">
          {t('about.p2')}
        </p>
        <p className="di-about-p">
          {t('about.p3')}
        </p>
        <p className="di-about-p">
          The day folds at the hour you set. A 1am tap still belongs to last
          night if the fold is 4. Reminders fire on this device when a question
          is due, if you turned them on.
        </p>
        <p className="di-about-p">
          {t('about.p5')}
        </p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/')}>
            Home
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/help')}>
            How to use it
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
