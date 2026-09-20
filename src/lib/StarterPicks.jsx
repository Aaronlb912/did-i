import { t } from './i18n.js'
import { hangStarter, unusedStarters } from './starters.js'

export function StarterPicks({
  book,
  onChange,
  now,
  label = t('first.picks'),
  readyNow = false,
}) {
  const clock = now || new Date()
  const open = unusedStarters(book, clock, readyNow)
  if (!open.length || !onChange) return null

  return (
    <div className="di-starters">
      <p className="di-slot-label">{label}</p>
      <div className="di-tray-files">
        {open.map((starter) => (
          <button
            key={starter.short}
            className="di-key"
            type="button"
            onClick={() => onChange(hangStarter(book, starter, clock, readyNow))}
          >
            {starter.short}
          </button>
        ))}
      </div>
    </div>
  )
}
