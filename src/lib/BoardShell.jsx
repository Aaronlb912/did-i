import { useEffect, useState } from 'react'
import { canGoBack, goBack, useSwipeBack } from '../site/nav.js'
import { hallHeat, hallHour } from './hall-feel.js'
import { MastCogs } from './SettingsCog.jsx'
import { t } from './i18n.js'
import { useTheme } from './prefs.js'
import { useReduceMotion } from './useReduceMotion.js'
import { activeLook } from './active-look.js'
import { PurseLine } from './PurseLine.jsx'
import { mergePurses, normalizePurse } from './purse.js'

export function BoardShell({
  book,
  boards = [],
  now,
  title,
  date,
  nav = true,
  cog = true,
  back,
  sit,
  look,
  children,
}) {
  const clock = now || new Date()
  const heat = hallHeat(book, clock)
  const hour = hallHour(clock)
  const coat = look || activeLook(book)
  const theme = useTheme()
  const reduce = useReduceMotion()
  const [showBack, setShowBack] = useState(() => back !== false && canGoBack())
  const shelf = boards.length ? boards : book ? [book] : []
  const purse = shelf.length ? mergePurses(shelf) : normalizePurse(book)

  useEffect(() => {
    if (back === false) {
      setShowBack(false)
      return
    }
    function sync() {
      setShowBack(back === true || canGoBack())
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [back])

  useSwipeBack(showBack)

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
          {showBack ? (
            <button className="di-back" type="button" onClick={() => goBack()} aria-label={t('nav.back')}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
          ) : null}
          <p className="di-title-static">{title || book?.title || 'Did I'}</p>
          {date ? <p className="di-date">{date}</p> : null}
          {cog ? (
            <div className="di-mast-actions">
              <PurseLine purse={purse} className="di-mast-purse" gemsLink />
              <MastCogs />
            </div>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  )
}
