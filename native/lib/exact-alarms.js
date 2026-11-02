import { NativeModules, Platform } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { publishSheet } from '../components/SheetHost.jsx'

const KEY = 'did-i-exact-alarms-asked'

function asked() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function markAsked() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // ok
  }
}

export function openExactAlarms() {
  NativeModules.WidgetTap?.openExactAlarmSettings?.().catch(() => {})
}

export async function exactAlarmsOn() {
  const mod = NativeModules.WidgetTap
  if (Platform.OS !== 'android' || typeof mod?.canExactAlarms !== 'function') return true
  try {
    return Boolean(await mod.canExactAlarms())
  } catch {
    return true
  }
}

// Android 12+ holds reminders and the widget's ask-time refresh back a few
// minutes unless Did I may set alarms. Asked once, right after reminders are
// allowed, since that is when someone is thinking about timing.
export async function offerExactAlarms(colors) {
  if (asked() || (await exactAlarmsOn())) return
  markAsked()
  publishSheet({
    kicker: t('notify.exactKicker'),
    title: t('notify.exactTitle'),
    body: t('notify.exactBody'),
    goLabel: t('notify.exactGo'),
    closeLabel: t('notify.primerSkip'),
    colors,
    onClose: () => publishSheet(null),
    onGo: () => {
      publishSheet(null)
      openExactAlarms()
    },
  })
}
