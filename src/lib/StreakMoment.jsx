import { useEffect, useState } from 'react'
import { t } from './i18n.js'
import { gentleOn } from './prefs.js'
import { streakHitCopy } from './streak-copy.js'
import { markStreakSeen, takePendingStreakMoment } from './streak-moments.js'
import { boardDate } from './recurrence.js'

function copy(moment) {
  if (moment.kind === 'hit') {
    return {
      kicker: t('streak.hitKicker'),
      ...streakHitCopy(moment.n),
      yes: t('streak.hitOk'),
    }
  }
  return {
    kicker: t('streak.missKicker'),
    title: t('streak.missTitle'),
    body: t('streak.missBody', { was: moment.was || 0 }),
    yes: t('streak.missOk'),
  }
}

export function StreakMomentHost({ now }) {
  const [moment, setMoment] = useState(null)
  const clock = now || new Date()
  const dateIso = boardDate(clock)

  useEffect(() => {
    const pending = takePendingStreakMoment()
    // Gentle mode: no streak cards, so no count and no broken-streak note.
    if (pending && gentleOn()) markStreakSeen(pending.kind, pending.dateIso || boardDate(new Date()))
    else if (pending) setMoment(pending)
  }, [])

  useEffect(() => {
    function onStreak(event) {
      const detail = event?.detail
      if (!detail?.kind) return
      if (gentleOn()) {
        markStreakSeen(detail.kind, detail.dateIso || boardDate(new Date()))
        return
      }
      setMoment(detail)
    }
    window.addEventListener('did-i-streak', onStreak)
    return () => window.removeEventListener('did-i-streak', onStreak)
  }, [])

  if (!moment) return null
  const text = copy(moment)

  function close() {
    markStreakSeen(moment.kind, moment.dateIso || dateIso)
    setMoment(null)
  }

  return (
    <div className="di-set-veil" role="dialog" aria-modal="true" aria-labelledby="streak-moment-title">
      <section
        className={`di-set-sheet di-streak-moment is-${moment.kind}`}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="di-set-cap">{text.kicker}</p>
        <h2 className="di-page-title" id="streak-moment-title">{text.title}</h2>
        <p className="di-set-note">{text.body}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={close}>
            {text.yes}
          </button>
        </div>
      </section>
    </div>
  )
}
