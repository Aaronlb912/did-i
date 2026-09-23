import { registerWidgetTaskHandler } from 'react-native-android-widget'
import { handleAndroidWidgetClick } from '../src/lib/widget-tonight.js'
import { readWidgetTonightProps } from '../src/lib/widget-store.js'
import { renderDidITonightAndroidWidget } from '../widgets/android/DidITonightAndroidWidget.jsx'
import { onPrefs } from '../src/lib/prefs.js'
import { syncTonightWidget } from './widget-sync.js'
import { readShelf } from '../src/lib/board-shelf.js'
import { androidWidgetCardStamp, applyPendingAndroidWidgetTap, saveAndroidWidgetCard } from './widget-tap.android.js'

async function handleDidITonightWidgetTask({ widgetAction, widgetInfo, clickAction, clickActionData, renderWidget }) {
  const stamp = await androidWidgetCardStamp()
  const applied = await applyPendingAndroidWidgetTap()
  let clicked = null
  if (widgetAction === 'WIDGET_CLICK') {
    clicked = handleAndroidWidgetClick(clickAction, clickActionData)
  }
  const shelf = clicked || applied
  const later = await androidWidgetCardStamp()
  if (stamp && later && later !== stamp) return
  const props = readWidgetTonightProps()
  if (props) await saveAndroidWidgetCard(props)
  renderWidget(renderDidITonightAndroidWidget(props, widgetInfo))
  if (shelf) await syncTonightWidget(shelf)
}

// Headless widget clicks evaluate the bundle and look for this task immediately.
// Do not move it behind the iOS bridge delay.
registerWidgetTaskHandler(handleDidITonightWidgetTask)

export function installWidgetSetup() {
  onPrefs(() => {
    syncTonightWidget(readShelf()).catch(() => {})
  })

  syncTonightWidget(readShelf()).catch(() => {})
}
