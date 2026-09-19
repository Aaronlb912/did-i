import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { clockWords } from './hall-pages.js'
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
  const label = pingLabel || 'Pings on'
  const fires = upcomingPings(book, clock)
  const on = label === 'Pings on' || label === 'On'

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page">
        <p className="di-face-plate">Reminders</p>
        <h2 className="di-page-title">When it is due</h2>
        <p className="di-about-p">
          This phone can tap you when a question opens. No account. The tap
          stays on this device. Chrome and the Android app can do it. An
          iPhone page install stays weak.
        </p>
        <div className="di-hang-actions">
          {onAskPings ? (
            <button className="di-did di-did-small" type="button" onClick={onAskPings}>
              {on ? 'Reminders are on' : label}
            </button>
          ) : (
            <p className="di-sit-line">This browser will not tap you.</p>
          )}
        </div>

        <div className="di-home-block">
          <p className="di-slot-label">Still waiting tonight</p>
          {fires.length ? (
            <ul className="di-home-list">
              {fires.map((fire) => (
                <li key={fire.id}>
                  <button
                    className="di-lamp-row"
                    type="button"
                    onClick={() => goHash('/tonight', { face: fire.id })}
                  >
                    <span>{fire.question.replace(/^Did I\s+/i, '').replace(/\?+$/, '')}</span>
                    <span className="di-home-state">{fireClock(fire.at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="di-detail-meta">Nothing left waiting on a clock time tonight.</p>
          )}
        </div>

        <div className="di-hang-actions">
          <button className="di-key" type="button" onClick={() => goHash('/later')}>
            Coming up
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/help')}>
            Help
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
