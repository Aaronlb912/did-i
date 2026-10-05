import { Platform } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { WIDGET_NAME } from '../../src/lib/widget-tonight.js'
import { publishSheet } from '../components/SheetHost.jsx'

export function showWidgetHow(colors) {
  publishSheet({
    title: t('widget.settings.howAdd'),
    body: t(Platform.OS === 'ios' ? 'widget.settings.howAddIos' : 'widget.settings.howAddAndroid'),
    closeLabel: t('settings.close'),
    colors,
    onClose: () => publishSheet(null),
  })
}

// Asks the launcher to put the widget on the home screen. Launchers that
// cannot (or a build without the call, or iOS) get the steps instead.
export async function pinWidget(colors) {
  let asked = false
  if (Platform.OS === 'android') {
    try {
      const mod = await import('react-native-android-widget')
      if (typeof mod?.requestPinWidget === 'function') {
        asked = await mod.requestPinWidget({ widgetName: WIDGET_NAME })
      }
    } catch {
      asked = false
    }
  }
  if (!asked) showWidgetHow(colors)
}
