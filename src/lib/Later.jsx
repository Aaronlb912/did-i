import { goHash } from '../site/hash.js'
import { isOnceBy, shortLabel } from './board-json.js'
import { BoardShell } from './BoardShell.jsx'
import { clockWords, comingDays } from './hall-pages.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

function answerLabel(row, nightIso) {
  if (!row.answer) {
    if (isOnceBy(row.lamp)) {
      const dueBy = String(row.lamp.dueBy || '').trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(dueBy)) {
        if (dueBy === nightIso) return t('later.dueTonight')
        return t('later.dueBy', { date: formatBoardDate(dueBy) })
      }
    }
    return row.lamp.askAfter ? clockWords(row.lamp.askAfter) : t('later.open')
  }
  if (row.answer.status === 'yes') return t('later.did')
  if (row.answer.status === 'late') return t('later.late')
  return t('later.nope')
}

export function Later({ book, now }) {
  usePrefs()
  const clock = now || new Date()
  const nights = comingDays(book, clock, 7).filter((night) => night.due.length)
  const hung = (book.lamps || []).filter((lamp) => !lamp.archived)

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-later">
        <p className="di-face-plate">{t('later.kicker')}</p>
        <h2 className="di-page-title">{t('later.title')}</h2>
        <p className="di-about-p">{t('later.body')}</p>
        {!hung.length ? (
          <p className="di-detail-meta">{t('later.empty')}</p>
        ) : !nights.length ? (
          <p className="di-detail-meta">{t('later.emptyWeek')}</p>
        ) : (
          nights.map((night) => (
            <section key={night.iso} className="di-later-night">
              <p className="di-slot-label">
                {night.isToday ? t('later.tonight') : night.weekday} · {night.label}
              </p>
              <ul className="di-home-list">
                {night.due.map((row) => (
                  <li key={row.lamp.id}>
                    <button
                      className="di-lamp-row"
                      type="button"
                      onClick={() =>
                        night.isToday
                          ? goHash('/tonight', { face: row.lamp.id })
                          : goHash('/lamp', { id: row.lamp.id })
                      }
                    >
                      <span>{shortLabel(row.lamp)}</span>
                      <span className="di-home-state">{answerLabel(row, night.iso)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/tonight')}>
            {t('later.tonightBtn')}
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/add')}>
            {t('tonight.add')}
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
