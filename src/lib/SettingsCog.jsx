import { parseHash } from '../site/hash.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'

const SETTINGS_ON = ['/settings', '/pings', '/about', '/help']

export function ShopCog() {
  usePrefs()
  const on = parseHash().path === '/shop'
  return (
    <a className={on ? 'di-cog is-on' : 'di-cog'} href="#/shop" aria-label={t('shop.cog')}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 8V6a5 5 0 0 1 10 0v2h3.1c.5 0 .9.45.85.95l-1.2 12A1 1 0 0 1 18.76 22H5.24a1 1 0 0 1-.99-1.05l-1.2-12A.86.86 0 0 1 3.9 8H7Zm2 0h6V6a3 3 0 0 0-6 0v2Z"
        />
      </svg>
    </a>
  )
}

export function KitCog() {
  usePrefs()
  const on = parseHash().path === '/kit'
  return (
    <a className={on ? 'di-cog is-on' : 'di-cog'} href="#/kit" aria-label={t('kit.cog')}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"
        />
      </svg>
    </a>
  )
}

export function SettingsCog() {
  usePrefs()
  const on = SETTINGS_ON.includes(parseHash().path)
  return (
    <a className={on ? 'di-cog is-on' : 'di-cog'} href="#/settings" aria-label={t('settings.cog')}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.05.24.25.42.5.42h3.84c.25 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
        />
      </svg>
    </a>
  )
}

export function MastCogs() {
  return (
    <div className="di-mast-tools">
      <ShopCog />
      <KitCog />
      <SettingsCog />
    </div>
  )
}
