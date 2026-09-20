import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { shortLabel } from './board-json.js'
import { weekCell, weekLamps, weekNights } from './hall-pages.js'
import { t } from './i18n.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function WeekGrid({ book, now }) {
  const clock = now || new Date()
  const nights = weekNights(book, clock, 7)
  const lamps = weekLamps(nights)

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page">
        <p className="di-face-plate">{t('streaks.seven')}</p>
        <h2 className="di-page-title">{t('streaks.seven')}</h2>
        {lamps.length === 0 ? (
          <p className="di-sit-line">{t('streaks.empty')}</p>
        ) : (
          <div className="di-week" role="table" aria-label={t('streaks.seven')}>
            <div className="di-week-head" role="row">
              <span className="di-week-name" />
              {nights.map((night) => (
                <span
                  key={night.iso}
                  className={night.isToday ? 'is-today' : undefined}
                  title={night.label}
                >
                  <b>{night.weekday}</b>
                  {night.dayNum}
                </span>
              ))}
            </div>
            {lamps.map((lamp) => (
              <div key={lamp.id} className="di-week-row" role="row">
                <button
                  className="di-week-name"
                  type="button"
                  onClick={() => goHash('/lamp', { id: lamp.id })}
                >
                  {shortLabel(lamp)}
                </button>
                {nights.map((night) => {
                  const cell = weekCell(night, lamp)
                  return (
                    <span
                      key={night.iso}
                      className={`di-week-cell is-${cell.state}`}
                      title={`${shortLabel(lamp)} ${night.label}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        )}
        <div className="di-page-keys">
          <button className="di-key" type="button" onClick={() => goHash('/streaks')}>
            {t('streaks.title')}
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
