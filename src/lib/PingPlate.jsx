import { goHash } from '../site/hash.js'
import { shortFromQuestion } from './board-json.js'
import { BoardShell } from './BoardShell.jsx'
import { clockWords } from './hall-pages.js'
import { t } from './i18n.js'
import { upcomingPings } from './notify.js'
import { boardDate, formatBoardDate } from './recurrence.js'

function fireClock(at) {
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value) => String(value).padStart(2, '0')
  return clockWords(`${pad(date.getHours())}:${pad(date.getMinutes())}`)
}

export function PingPlate({ book, now, pingLabel, onAskPings }) {
  const clock = now || new Date()
  const labelKey = pingLabel || 'pings.state.on'
  const on = labelKey === 'pings.state.on'
  const fires = upcomingPings(book, clock)

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page">
        <p className="di-face-plate">{t('pings.kicker')}</p>
        <h2 className="di-page-title">{t('pings.title')}</h2>
        <p className="di-about-p">{t('pings.body')}</p>
        <div className="di-hang-actions">
          {onAskPings ? (
            <button className="di-did di-did-small" type="button" onClick={onAskPings}>
              {on ? t('pings.on') : t(labelKey)}
            </button>
          ) : (
            <p className="di-sit-line">{t('pings.noBrowser')}</p>
          )}
        </div>

        <div className="di-home-block">
          <p className="di-slot-label">{t('pings.waitingTonight')}</p>
          {fires.length ? (
            <ul className="di-home-list">
              {fires.map((fire) => (
                <li key={fire.id}>
                  <button
                    className="di-lamp-row"
                    type="button"
                    onClick={() => goHash('/tonight', { face: fire.id })}
                  >
                    <span>{shortFromQuestion(fire.question) || t('lamp.unnamed')}</span>
                    <span className="di-home-state">{fireClock(fire.at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="di-detail-meta">{t('pings.emptyTonight')}</p>
          )}
        </div>

        <div className="di-hang-actions">
          <button className="di-key" type="button" onClick={() => goHash('/later')}>
            {t('pings.comingUp')}
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/help')}>
            {t('pings.help')}
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
