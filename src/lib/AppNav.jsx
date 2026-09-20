import { useEffect, useState } from 'react'
import { parseHash } from '../site/hash.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'

const ITEMS = [
  { path: '/', labelKey: 'nav.home', match: ['/', '/home', '/tonight', '/later'] },
  { path: '/lamps', labelKey: 'nav.questions', match: ['/lamps', '/add', '/hang', '/lamp', '/search', '/ideas'] },
  { path: '/everyone', labelKey: 'nav.everyone', ariaKey: 'title.everyone', match: ['/everyone'] },
]

function tabOf(path) {
  const index = ITEMS.findIndex((item) => item.match.includes(path))
  return index < 0 ? 'none' : String(index)
}

export function AppNav() {
  usePrefs()
  const [path, setPath] = useState(() => parseHash().path)
  const [live, setLive] = useState(false)
  const at = tabOf(path)

  useEffect(() => {
    function onHash() {
      setPath(parseHash().path)
    }
    window.addEventListener('hashchange', onHash)
    const frame = window.requestAnimationFrame(() => setLive(true))
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <nav
      className={live ? 'di-appnav di-screws-print-hide is-live' : 'di-appnav di-screws-print-hide'}
      aria-label={t('nav.aria')}
      data-at={at}
    >
      <i className="di-appnav-pip" aria-hidden="true" />
      {ITEMS.map((item) => {
        const on = item.match.includes(path)
        return (
          <a
            key={item.path}
            href={`#${item.path === '/' ? '/' : item.path}`}
            className={on ? 'is-on' : undefined}
            aria-label={item.ariaKey ? t(item.ariaKey) : undefined}
          >
            {t(item.labelKey)}
          </a>
        )
      })}
    </nav>
  )
}
