import { Platform } from 'react-native'
import { readShelf } from '../../src/lib/board-shelf.js'
import { buildTonightWidgetProps } from '../../src/lib/widget-tonight.js'
import { saveBeforeSignOut, signedOutSync } from '../../src/lib/cloud-sync.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { clearReminds } from '../../src/lib/remind-me.js'
import { clearNativePings } from '../shim/native.js'
import { confirmDone, confirmMiss } from './confirm.js'

// The old account's reminders, cheers and requests already in the tray
// would still open and act for whoever signs in next.
function clearTray() {
  import('expo-notifications')
    .then((Notifications) => Notifications.dismissAllNotificationsAsync?.())
    .catch(() => {})
  // Through the reminder queue, so a re-arm already going cannot land after it.
  // Before the re-arm, which would put waiting ones back.
  clearReminds()
  clearNativePings()
}

// The Android card is drawn from the shelf: redraw it from the emptied shelf
// so it stops showing the old account's questions.
async function clearAndroidWidget() {
  if (Platform.OS !== 'android') return
  try {
    const shelf = readShelf()
    const { saveAndroidWidgetCard } = await import('../widget-tap.android.js')
    const { enrichTonightWidgetProps } = await import('../widget-sync.js')
    await saveAndroidWidgetCard(enrichTonightWidgetProps(shelf, buildTonightWidgetProps(shelf)))
  } catch {
    // The next redraw reads the shelf.
  }
}

// iOS keeps taps for questions not on the shelf yet inside the widget timeline.
async function clearIosWidget() {
  if (Platform.OS !== 'ios') return
  try {
    const { clearWidgetTimelineTaps } = await import('../widget-sync.js')
    await clearWidgetTimelineTaps()
  } catch {
    // The next redraw reads the shelf.
  }
}

// Leaving the account: say it worked, or say what went wrong.
// Account and the first Settings page both sign out through this.
// Returns 'unsaved' when answers did not reach the account; the caller asks
// and calls again with force to sign out anyway.
export async function leaveAccount(kind, run, force = false) {
  if (kind !== 'delete' && !force && !(await saveBeforeSignOut())) return 'unsaved'
  try {
    const out = await run()
    if (out?.miss) {
      confirmMiss(tMiss(out.miss))
      return false
    }
    confirmDone(t(kind === 'delete' ? 'confirm.deleted' : 'confirm.signedOut'))
    signedOutSync()
    clearTray()
    await clearAndroidWidget()
    await clearIosWidget()
    return true
  } catch {
    confirmMiss(t('confirm.miss'))
    return false
  }
}
