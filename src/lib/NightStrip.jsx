import { answerFor } from './recurrence.js'
import { shortLabel } from './board-json.js'
import { t } from './i18n.js'

export function NightStrip({ book, lamp, keys, onPickHole }) {
  if (!lamp || !keys.length) return null
  return (
    <ol className="di-strip" aria-label={t('strip.recent', { name: shortLabel(lamp) })}>
      {keys.map((key) => {
        const answer = answerFor(book, lamp.id, key)
        let state = 'hole'
        if (answer?.status === 'yes') state = 'yes'
        else if (answer?.status === 'late') state = 'late'
        else if (answer?.status === 'skip') state = 'skip'
        const canPick = onPickHole && (!answer || answer.status === 'skip')
        const inner = (
          <>
            <span className={`di-strip-jewel is-${state}`} />
            <span className="di-visually-hidden">
              {key} {state}
            </span>
          </>
        )
        return (
          <li key={key} title={key}>
            {canPick ? (
              <button
                type="button"
                className="di-strip-hit"
                onClick={() => onPickHole(lamp, key)}
              >
                {inner}
              </button>
            ) : (
              inner
            )}
          </li>
        )
      })}
    </ol>
  )
}
