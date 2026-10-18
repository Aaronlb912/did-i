import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { ACHIEVEMENTS, markLabel } from './achievements.js'
import { shelfStreak } from './hall-feel.js'
import { statsCounts } from './hall-pages.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function StatsPage({ book, boards, now }) {
  const gentle = usePrefs().gentle === true
  const clock = now || new Date()
  const counts = statsCounts(book, clock)
  // Every folder, like the phone and the streak on Tonight.
  if (boards) counts.heat = shelfStreak(boards, clock)
  const pips = ACHIEVEMENTS.filter((item) => (book.unlocked || []).includes(item.id))

  return (
    <BoardShell
      book={book}
      now={clock}
      title={t('stats.title')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page">
        <p className="di-face-plate">{t('stats.title')}</p>
        <h2 className="di-page-title">{t('stats.title')}</h2>
        <dl className="di-stats">
          <div>
            <dt>{t('stats.questions')}</dt>
            <dd>{counts.hung}</dd>
          </div>
          <div>
            <dt>{t('stats.did')}</dt>
            <dd>{counts.did}</dd>
          </div>
          <div>
            <dt>{t('stats.late')}</dt>
            <dd>{counts.late}</dd>
          </div>
          <div>
            <dt>{t(gentle ? 'stats.nope' : 'later.missed')}</dt>
            <dd>{counts.skip}</dd>
          </div>
          {gentle ? null : (
            <div>
              <dt>{t('stats.nightsOn')}</dt>
              <dd>{counts.heat}</dd>
            </div>
          )}
        </dl>
        <div className="di-page-keys">
          <button className="di-key" type="button" onClick={() => goHash('/marks')}>
            {t('stats.marks')}
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/week')}>
            {t('streaks.seven')}
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/streaks')}>
            {t('streaks.title')}
          </button>
        </div>
        {book.quietMode || pips.length === 0 ? null : (
          <ul className="di-pips" aria-label={t('stats.marksAria')}>
            {pips.map((item) => (
              <li key={item.id}>{markLabel(item.id, 'name')}</li>
            ))}
          </ul>
        )}
      </section>
    </BoardShell>
  )
}
