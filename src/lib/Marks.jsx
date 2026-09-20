import { goHash } from '../site/hash.js'
import { ACHIEVEMENTS, markText } from './achievements.js'
import { BoardShell } from './BoardShell.jsx'
import { HeatPips } from './HeatPips.jsx'
import { hallHeat } from './hall-feel.js'
import { showedNights } from './daily.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function Marks({ book, now }) {
  usePrefs()
  const clock = now || new Date()
  const heat = hallHeat(book, clock)
  const shown = showedNights(book)
  const have = new Set(book.unlocked || [])

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-marks">
        <p className="di-face-plate">{t('marks.kicker')}</p>
        <h2 className="di-page-title">{t('marks.title')}</h2>
        <p className="di-detail-meta">
          {t('marks.streak', { n: heat })}{' '}
          {shown === 1 ? t('marks.shownOne') : t('marks.shownN', { n: shown })}
        </p>
        <HeatPips heat={heat} />

        {book.quietMode ? (
          <p className="di-detail-meta">{t('marks.hidden')}</p>
        ) : (
          <ul className="di-mark-list" aria-label={t('marks.aria')}>
            {ACHIEVEMENTS.map((item) => {
              const on = have.has(item.id)
              return (
                <li key={item.id} className={on ? 'is-on' : 'is-hole'}>
                  <span className="di-mark-pip" aria-hidden="true" />
                  <span>
                    <strong>{on ? t(markText(item.id, 'name')) : t('marks.notYet')}</strong>
                    <em>{on ? t(markText(item.id, 'line')) : t(markText(item.id, 'name'))}</em>
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/')}>
            {t('marks.home')}
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/stats')}>
            {t('marks.stats')}
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
