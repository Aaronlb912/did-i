import { registerWidgetTaskHandler } from 'react-native-android-widget'
import { handleAndroidWidgetClick, WIDGET_NAME } from '../src/lib/widget-tonight.js'
import { readWidgetTonightProps } from '../src/lib/widget-store.js'
import { renderDidITonightAndroidWidget } from '../widgets/android/DidITonightAndroidWidget.jsx'
import { onPrefs } from '../src/lib/prefs.js'
import { syncTonightWidget } from './widget-sync.js'
import { readShelf } from '../src/lib/board-shelf.js'

export function installWidgetSetup() {
  onPrefs(() => {
    syncTonightWidget(readShelf()).catch(() => {})
  })

  registerWidgetTaskHandler(async ({ widgetAction, widgetInfo, clickAction, clickActionData, renderWidget }) => {
    if (widgetAction === 'WIDGET_CLICK') {
      const next = handleAndroidWidgetClick(clickAction, clickActionData)
      if (next) syncTonightWidget(next)
    }
    const props = readWidgetTonightProps()
    renderWidget(renderDidITonightAndroidWidget(props, widgetInfo))
  })

  syncTonightWidget(readShelf()).catch(() => {})
}
