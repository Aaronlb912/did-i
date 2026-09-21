import { useEffect, useId, useState } from 'react'
import { parseHash } from '../site/hash.js'
import { showMainNavInMenu } from './app-nav.js'
import { useAccount } from './account.js'
import { DIT_ENABLED } from './features.js'
import { t } from './i18n.js'
import { feelTap } from './native.js'
import { usePeopleCount } from './people.js'
import { usePrefs } from './prefs.js'

const HOME_ON = ['/', '/home', '/tonight', '/later']
const QUESTIONS_ON = ['/lamps', '/add', '/hang', '/lamp', '/search', '/ideas']
const EVERYONE_ON = ['/everyone']
const SETTINGS_ON = ['/settings', '/settings/phone', '/pings', '/about', '/help', '/privacy', '/terms']
const PEOPLE_ON = ['/people', '/people/connect', '/people/refer', '/friends', '/family', '/inbox', '/sent']
const ADD_ON = ['/add', '/hang']

const ICONS = {
  add: 'M12 5v14M5 12h14',
  people:
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7.5.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 13c-3.33 0-7 1.67-7 4v2h14v-2c0-2.33-3.67-4-7-4Zm8.25.5c-.6 0-1.17.05-1.7.14 1.2.84 1.95 1.94 1.95 3.36V19h5v-1.75c0-2.07-3.1-3.75-5.25-3.75Z',
  shop: 'M7 8V6a5 5 0 0 1 10 0v2h3.1c.5 0 .9.45.85.95l-1.2 12A1 1 0 0 1 18.76 22H5.24a1 1 0 0 1-.99-1.05l-1.2-12A.86.86 0 0 1 3.9 8H7Zm2 0h6V6a3 3 0 0 0-6 0v2Z',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  boards: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z',
  collection:
    'M12 2a9.5 9.5 0 0 0-9.2 11.9L12 22l9.2-8.1A9.5 9.5 0 0 0 12 2Zm-1.5 6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-4.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z',
  settings:
    'M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.05.24.25.42.5.42h3.84c.25 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z',
}

function MenuIcon({ path, stroke = false }) {
  if (stroke) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d={path} />
    </svg>
  )
}

function mastMenuItems(showAdd, waiting) {
  const path = parseHash().path
  const items = []
  if (showMainNavInMenu(path)) {
    items.push(
      {
        key: 'home',
        href: '#/tonight',
        label: t('nav.home'),
        on: HOME_ON.includes(path),
        icon: 'home',
        stroke: true,
      },
      {
        key: 'questions',
        href: '#/lamps',
        label: t('nav.questions'),
        on: QUESTIONS_ON.includes(path),
        icon: 'boards',
        stroke: true,
      },
    )
    if (DIT_ENABLED) {
      items.push({
        key: 'everyone',
        href: '#/everyone',
        label: t('nav.everyone'),
        on: EVERYONE_ON.includes(path),
        icon: 'people',
      })
    }
    items.push({ key: 'nav-divider', divider: true })
  }
  if (showAdd) {
    items.push({
      key: 'add',
      href: '#/add',
      label: t('tonight.add'),
      on: ADD_ON.includes(path),
      icon: 'add',
      stroke: true,
    })
  }
  items.push(
    {
      key: 'people',
      href: '#/people',
      label: waiting ? t('people.cogWaiting', { n: waiting }) : t('people.cog'),
      on: PEOPLE_ON.includes(path),
      icon: 'people',
      pip: waiting > 0,
    },
    {
      key: 'shop',
      href: '#/shop',
      label: t('shop.cog'),
      on: path === '/shop',
      icon: 'shop',
    },
    {
      key: 'kit',
      href: '#/kit',
      label: t('kit.cog'),
      on: path === '/kit',
      icon: 'collection',
    },
    {
      key: 'settings',
      href: '#/settings',
      label: t('settings.cog'),
      on: SETTINGS_ON.includes(path),
      icon: 'settings',
    },
  )
  return items
}

function menuIsOn(showAdd, waiting) {
  return mastMenuItems(showAdd, waiting).some((item) => item.on)
}

export function MastMenu({ showAdd = false }) {
  usePrefs()
  const account = useAccount()
  const waiting = usePeopleCount(account.user)
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const items = mastMenuItems(showAdd, waiting)
  const on = menuIsOn(showAdd, waiting)

  useEffect(() => {
    function sync() {
      setOpen(false)
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function toggle() {
    feelTap()
    setOpen((live) => !live)
  }

  function close() {
    setOpen(false)
  }

  return (
    <div className={open ? 'di-mast-menu is-open' : 'di-mast-menu'}>
      <button
        type="button"
        className={on ? 'di-mast-menu-btn is-on' : 'di-mast-menu-btn'}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={t('mast.menu')}
        onClick={toggle}
      >
        <MenuIcon path={ICONS.grid} />
        {waiting ? <i className="di-mast-menu-pip" aria-hidden="true" /> : null}
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="di-mast-menu-back"
            aria-label={t('mast.menuClose')}
            onClick={close}
          />
          <div className="di-mast-menu-panel" id={menuId} role="menu">
            {items.map((item) =>
              item.divider ? (
                <div key={item.key} className="di-mast-menu-divider" aria-hidden="true" />
              ) : (
                <a
                  key={item.key}
                  role="menuitem"
                  href={item.href}
                  className={item.on ? 'di-mast-menu-row is-on' : 'di-mast-menu-row'}
                  onClick={() => {
                    feelTap()
                    close()
                  }}
                >
                  <span className="di-mast-menu-ico">
                    <MenuIcon path={ICONS[item.icon]} stroke={item.stroke} />
                  </span>
                  <span className="di-mast-menu-text">{item.label}</span>
                  {item.pip ? <i className="di-mast-menu-row-pip" aria-hidden="true" /> : null}
                </a>
              ),
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

export function MastCogs({ showAdd = false }) {
  return <MastMenu showAdd={showAdd} />
}

export function ShopCog() {
  usePrefs()
  const on = parseHash().path === '/shop'
  return (
    <a className={on ? 'di-cog is-on' : 'di-cog'} href="#/shop" aria-label={t('shop.cog')}>
      <MenuIcon path={ICONS.shop} />
    </a>
  )
}

export function KitCog() {
  usePrefs()
  const on = parseHash().path === '/kit'
  return (
    <a className={on ? 'di-cog di-cog-kit is-on' : 'di-cog di-cog-kit'} href="#/kit" aria-label={t('kit.cog')}>
      <MenuIcon path={ICONS.collection} />
    </a>
  )
}

export function PeopleCog({ waiting = 0 }) {
  usePrefs()
  const on = PEOPLE_ON.includes(parseHash().path)
  return (
    <a
      className={on ? 'di-cog di-cog-people is-on' : 'di-cog di-cog-people'}
      href="#/people"
      aria-label={waiting ? t('people.cogWaiting', { n: waiting }) : t('people.cog')}
    >
      <MenuIcon path={ICONS.people} />
      {waiting ? <i className="di-cog-pip" aria-hidden="true" /> : null}
    </a>
  )
}

export function SettingsCog() {
  usePrefs()
  const on = SETTINGS_ON.includes(parseHash().path)
  return (
    <a className={on ? 'di-cog is-on' : 'di-cog'} href="#/settings" aria-label={t('settings.cog')}>
      <MenuIcon path={ICONS.settings} />
    </a>
  )
}
