import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { t } from './i18n.js'
import { boardDate, formatBoardDate } from './recurrence.js'

const IDEA_IDS = ['pills', 'door', 'keys', 'bins', 'water', 'charge']

export function Ideas({ book, now }) {
  const clock = now || new Date()

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-ideas">
        <p className="di-face-plate">{t('ideas.kicker')}</p>
        <h2 className="di-page-title">{t('ideas.title')}</h2>
        <p className="di-about-p">{t('ideas.body')}</p>
        <ul className="di-idea-list">
          {IDEA_IDS.map((id) => (
            <li key={id}>
              <article className="di-idea">
                <p className="di-face-plate">{t(`ideas.${id}.kind`)}</p>
                <h3 className="di-question">{t(`ideas.${id}.question`)}</h3>
                <p className="di-detail-meta">{t(`ideas.${id}.body`)}</p>
                <button
                  className="di-key"
                  type="button"
                  onClick={() => goHash('/add', { start: t(`ideas.${id}.start`) })}
                >
                  {t('ideas.use')}
                </button>
              </article>
            </li>
          ))}
        </ul>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/add')}>
            {t('ideas.writeOwn')}
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/help')}>
            {t('ideas.help')}
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
