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

// Whether a Tonight widget is on the home screen. Android asks the launcher;
// iOS cannot tell without native code, so it says no.
export async function widgetPlaced() {
  if (Platform.OS !== 'android') return false
  try {
    const mod = await import('react-native-android-widget')
    if (typeof mod?.getWidgetInfo !== 'function') return false
    const list = await mod.getWidgetInfo(WIDGET_NAME)
    return Array.isArray(list) && list.length > 0
  } catch {
    return false
  }
}

// The one-time widget tip. On Android the button pins it (or shows the steps
// if the launcher cannot); on iOS the steps are in the sheet and the button is
// Done. Not now (or a swipe away) lets it come back once, later.
export function showWidgetTip(colors, onDone) {
  const ios = Platform.OS === 'ios'
  publishSheet({
    title: t('widgetTip.title'),
    body: `${t('widgetTip.body')}\n\n${t(ios ? 'widget.settings.howAddIos' : 'widget.settings.howAddAndroid')}`,
    goLabel: t(ios ? 'widgetTip.done' : 'widgetTip.add'),
    closeLabel: t('widgetTip.later'),
    colors,
    onClose: () => publishSheet(null),
    onGo: () => {
      publishSheet(null)
      onDone()
      if (!ios) pinWidget(colors)
    },
  })
}
