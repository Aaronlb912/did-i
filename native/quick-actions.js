import { Platform } from 'react-native'
import * as QuickActions from 'expo-quick-actions'
import { t } from '../src/lib/i18n.js'
import { onPrefs, readPrefs } from '../src/lib/prefs.js'
import { goFromDeepLink } from './deep-link.js'

let bound = false
let labelLocale = ''

// Long-press the app icon: Remind me, Tonight, Add a question, Friends and family, Scan a
// code. Android already has fixed Add and Remind me shortcuts
// (res/xml/shortcuts.xml), so they are left out of this list there. Each one opens a didi:// link.
function setLabels() {
  labelLocale = readPrefs().locale
  const ios = Platform.OS === 'ios'
  const items = [
    ...(ios ? [{ id: 'remind', title: t('quick.remind'), icon: 'symbol:mic', params: { href: 'didi://open/remind' } }] : []),
    { id: 'tonight', title: t('quick.tonight'), icon: ios ? 'symbol:moon.stars' : undefined, params: { href: 'didi://open/tonight' } },
    ...(ios ? [{ id: 'add', title: t('quick.add'), icon: 'add', params: { href: 'didi://open/add' } }] : []),
    { id: 'friends', title: t('quick.friends'), icon: ios ? 'contact' : undefined, params: { href: 'didi://open/friends' } },
    { id: 'scan', title: t('quick.scan'), icon: ios ? 'symbol:qrcode.viewfinder' : undefined, params: { href: 'didi://open/scan' } },
  ]
  Promise.resolve(QuickActions.setItems(items)).catch(() => {})
}

export function installQuickActions() {
  if (bound) return
  bound = true
  setLabels()
  // A language change renames the shortcuts right away, not at the next launch.
  onPrefs(() => {
    if (readPrefs().locale !== labelLocale) setLabels()
  })
  const go = (action) => {
    const href = action?.params?.href
    if (typeof href === 'string') goFromDeepLink(href)
    else if (typeof action?.id === 'string') goFromDeepLink(`didi://open/${action.id}`)
  }
  try {
    QuickActions.addListener(go)
    if (QuickActions.initial) go(QuickActions.initial)
  } catch {
    // A build before 1.3.0: no shortcuts.
  }
}
