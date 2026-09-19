import { parseHash } from '../site/hash.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'

const ITEMS = [
  { path: '/', labelKey: 'nav.home', match: ['/', '/home', '/tonight', '/later'] },
  { path: '/lamps', labelKey: 'nav.questions', match: ['/lamps', '/add', '/hang', '/lamp', '/search', '/ideas'] },
]

export function AppNav() {
  usePrefs()
  const path = parseHash().path
  return (
    <nav className="di-appnav di-screws-print-hide" aria-label={t('nav.aria')}>
      {ITEMS.map((item) => {
        const on = item.match.includes(path)
        return (
          <a key={item.path} href={`#${item.path === '/' ? '/' : item.path}`} className={on ? 'is-on' : undefined}>
            {t(item.labelKey)}
          </a>
        )
      })}
    </nav>
  )
}
