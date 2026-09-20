import { hallHeat, hallHour } from './hall-feel.js'
import { MastCogs } from './SettingsCog.jsx'
import { useTheme } from './prefs.js'
import { useReduceMotion } from './useReduceMotion.js'
import { normalizePurse } from './purse.js'

export function BoardShell({ book, now, title, date, nav = true, cog = true, sit, look, children }) {
  const clock = now || new Date()
  const heat = hallHeat(book, clock)
  const hour = hallHour(clock)
  const coat = look || normalizePurse(book).lookOn
  const theme = useTheme()
  const reduce = useReduceMotion()
  return (
    <div
      className="di-hall"
      data-heat={heat}
      data-hour={hour}
      data-sit={sit || 'ask'}
      data-look={coat}
      data-theme={theme}
      {...(reduce ? { 'data-reduce-motion': '' } : {})}
    >
      <div className="di-board" data-heat={heat}>
        <header className="di-mast">
          <p className="di-title-static">{title || book?.title || 'Did I'}</p>
          {date ? <p className="di-date">{date}</p> : null}
          {cog ? <MastCogs /> : null}
        </header>
        {children}
      </div>
    </div>
  )
}
