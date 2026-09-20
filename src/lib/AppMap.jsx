import { goHash } from '../site/hash.js'
import { t } from './i18n.js'

const ROOM_PATHS = [
  '/tonight',
  '/later',
  '/lamps',
  '/ideas',
  '/feed',
  '/week',
  '/calendar',
  '/streaks',
  '/marks',
  '/kit',
  '/stats',
  '/pings',
  '/help',
  '/me',
  '/settings',
]

export function AppMap({ except = [] }) {
  const rooms = ROOM_PATHS.filter((path) => !except.includes(path))
  return (
    <ul className="di-map">
      {rooms.map((path) => {
        const key = path.slice(1).replace(/\//g, '.') || 'tonight'
        return (
          <li key={path}>
            <button className="di-map-row" type="button" onClick={() => goHash(path)}>
              <span className="di-map-kicker">{t(`map.${key}.kicker`)}</span>
              <span className="di-map-title">{t(`map.${key}.title`)}</span>
              <span className="di-map-body">{t(`map.${key}.body`)}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
