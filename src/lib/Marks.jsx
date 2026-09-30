import { goHash } from '../site/hash.js'
import { ACHIEVEMENTS, MARK_SECTIONS, markLabel, shelfMarks } from './achievements.js'
import { BoardShell } from './BoardShell.jsx'
import { HeatPips } from './HeatPips.jsx'
import { hallHeat } from './hall-feel.js'
import { showedNights } from './daily.js'
import { t } from './i18n.js'
import { LOCK_PATH, markIconPath } from './mark-icons.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

function Glyph({ d }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Achievements as a grid: earned first, then the rest with how to get them.
export function Marks({ book, boards = [], now }) {
  usePrefs()
  const clock = now || new Date()
  const heat = hallHeat(book, clock)
  const shown = showedNights(book)
  const have = shelfMarks(boards.length ? boards : [book])
  const earned = ACHIEVEMENTS.filter((item) => have.has(item.id))
  const total = ACHIEVEMENTS.length

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-marks">
        <h2 className="di-page-title">{t('marks.title')}</h2>

        {book.quietMode ? (
          <p className="di-detail-meta">{t('marks.hidden')}</p>
        ) : (
          <>
            <div className="di-ach-sum" role="img" aria-label={t('marks.count', { n: earned.length, total })}>
              <p aria-hidden="true">
                <strong>{earned.length}</strong>
                <span className="di-ach-of">/ {total}</span>
                <span className="di-ach-cap">{t('marks.countCap')}</span>
              </p>
              <div className="di-ach-track" aria-hidden="true">
                <span style={{ width: `${total ? (earned.length / total) * 100 : 0}%` }} />
              </div>
            </div>
            {MARK_SECTIONS.map((section) => {
              const items = ACHIEVEMENTS.filter((item) => item.section === section)
              if (!items.length) return null
              const got = items.filter((item) => have.has(item.id))
              const rest = items.filter((item) => !have.has(item.id))
              return (
                <section key={section} className="di-ach-section">
                  <h3>
                    <span>{t(`marks.section.${section}`)}</span>
                    <span className="di-ach-section-n">
                      {got.length} / {items.length}
                    </span>
                  </h3>
                  <ul className="di-ach-grid">
                    {[...got, ...rest].map((item) => {
                      const on = have.has(item.id)
                      return (
                        <li key={item.id} className={on ? 'is-on' : 'is-off'}>
                          <span className="di-ach-badge">
                            <Glyph d={on ? markIconPath(item.id) : LOCK_PATH} />
                          </span>
                          <strong>{markLabel(item.id, 'name')}</strong>
                          <em>
                            {on ? (
                              markLabel(item.id, 'line')
                            ) : (
                              <>
                                <span className="di-visually-hidden">{t('marks.notYet')}: </span>
                                {markLabel(item.id, 'how')}
                              </>
                            )}
                          </em>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </>
        )}

        <p className="di-detail-meta">
          {t('marks.streak', { n: heat })}{' '}
          {shown === 1 ? t('marks.shownOne') : t('marks.shownN', { n: shown })}
        </p>
        <HeatPips heat={heat} />

        <div className="di-hang-actions">
          <button className="di-key" type="button" onClick={() => goHash('/stats')}>
            {t('marks.stats')}
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
