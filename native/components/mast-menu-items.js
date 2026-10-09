import { t } from '../../src/lib/i18n.js'
import { readRoute } from '../navigation/hash.js'

export const PEOPLE_ON = new Set([
  '/people',
  '/people/connect',
  '/people/refer',
  '/friends',
  '/family',
  '/inbox',
  '/sent',
  '/we',
  '/we/new',
])
export const ADD_ON = new Set(['/add', '/hang'])
export const HISTORY_ON = new Set(['/calendar', '/notes', '/feed', '/marks', '/stats', '/streaks', '/week'])
export const SETTINGS_ON = new Set(['/settings', '/settings/phone', '/settings/more', '/settings/seen', '/pings', '/about', '/help', '/privacy', '/terms'])

// Home and Questions already live in the system tab bar; the menu holds only
// what the tabs don't: Add, Friends and family, Shop, Collection, Settings.
// Your history has no row; Settings and the streak sheet lead there.
// Screens pushed over the tabs hide that bar, so there Home leads the menu:
// one tap back to Tonight from anywhere.
// Inbox has no row of its own, its count folds into Friends and family's
// badge. A badge never highlights a row; only where you are does.
// we: Did we asks to join (and unopened gifts). Did we lives
// on Friends and family, so its count folds into that row's badge.
export function menuItems(showAdd, inbox, asks, signedIn, we = 0, recent = 0) {
  const path = readRoute().path
  const waiting = signedIn ? inbox + asks + we : asks
  // Home always leads, so every row stays in the same place on every screen.
  const home = [{ key: 'home', path: '/tonight', label: t('nav.home'), on: path === '/tonight' || path === '/', icon: 'home', stroke: true }]
  return [
    ...home,
    { key: 'add', path: '/add', label: t('tonight.add'), on: ADD_ON.has(path), icon: 'add', stroke: true },
    {
      key: 'people',
      path: '/people',
      // The badge shows the count; the words stay short. Screen readers get both.
      label: t('people.cog'),
      a11y: waiting ? t('people.cogWaiting', { n: waiting }) : '',
      on: PEOPLE_ON.has(path),
      count: waiting,
      icon: 'people',
    },
    // Recent: achievements and Did we moments, in full. Its count is the unseen ones.
    { key: 'recent', path: '/recent', label: t('recent.cog'), on: path === '/recent', count: recent, icon: 'bell' },
    { key: 'shop', path: '/shop', label: t('shop.cog'), on: path === '/shop', icon: 'shop' },
    { key: 'kit', path: '/kit', label: t('kit.cog'), on: path === '/kit', icon: 'collection' },
    {
      key: 'settings',
      path: '/settings',
      label: t('settings.cog'),
      // Your history is reached from Settings now, so its pages light this row.
      on: SETTINGS_ON.has(path) || HISTORY_ON.has(path),
      icon: 'settings',
    },
  ]
}

export function menuIsOn(items) {
  return items.some((item) => item.on)
}
