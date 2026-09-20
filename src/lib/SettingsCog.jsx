import { parseHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { t } from './i18n.js'
import { usePeopleCount } from './people.js'
import { usePrefs } from './prefs.js'

const SETTINGS_ON = ['/settings', '/pings', '/about', '/help', '/privacy', '/terms']

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
    <a className={on ? 'di-cog di-cog-kit is-on' : 'di-cog di-cog-kit'} href="#/kit" aria-label={t('kit.cog')}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"
        />
      </svg>
    </a>
  )
}

const PEOPLE_ON = ['/people', '/friends', '/family', '/inbox', '/sent']

export function PeopleCog({ waiting = 0 }) {
  usePrefs()
  const on = PEOPLE_ON.includes(parseHash().path)
  return (
    <a
      className={on ? 'di-cog di-cog-people is-on' : 'di-cog di-cog-people'}
      href="#/people"
      aria-label={
        waiting ? t('people.cogWaiting', { n: waiting }) : t('people.cog')
      }
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7.5.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 13c-3.33 0-7 1.67-7 4v2h14v-2c0-2.33-3.67-4-7-4Zm8.25.5c-.6 0-1.17.05-1.7.14 1.2.84 1.95 1.94 1.95 3.36V19h5v-1.75c0-2.07-3.1-3.75-5.25-3.75Z"
        />
      </svg>
      {waiting ? <i className="di-cog-pip" aria-hidden="true" /> : null}
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
  const account = useAccount()
  const waiting = usePeopleCount(account.user)
  return (
    <div className="di-mast-tools">
      <PeopleCog waiting={waiting} />
      <ShopCog />
      <KitCog />
      <SettingsCog />
    </div>
  )
}
