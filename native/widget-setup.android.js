import { registerWidgetTaskHandler } from 'react-native-android-widget'
import {
  buildTonightWidgetProps,
  handleAndroidWidgetClick,
  preferStoredTonightProps,
} from '../src/lib/widget-tonight.js'
import { readWidgetTonightProps, writeWidgetTonightProps } from '../src/lib/widget-store.js'
import { renderDidITonightAndroidWidget } from '../widgets/android/DidITonightAndroidWidget.jsx'
import { onPrefs } from '../src/lib/prefs.js'
import { enrichTonightWidgetProps, syncTonightWidget } from './widget-sync.js'
import { readShelf } from '../src/lib/board-shelf.js'
import {
  androidWidgetCardStamp,
  applyPendingAndroidWidgetTap,
  loadAndroidWidgetCard,
  saveAndroidWidgetCard,
} from './widget-tap.android.js'

async function tonightPropsForWidget(shelf) {
  let props = enrichTonightWidgetProps(shelf, buildTonightWidgetProps(shelf))
  props = preferStoredTonightProps(props, readWidgetTonightProps())
  const card = await loadAndroidWidgetCard()
  if (card) props = preferStoredTonightProps(props, card)
  return props
}

async function handleDidITonightWidgetTask({ widgetAction, widgetInfo, clickAction, clickActionData, renderWidget }) {
  const stamp = await androidWidgetCardStamp()
  const applied = await applyPendingAndroidWidgetTap()
  let clicked = null
  if (widgetAction === 'WIDGET_CLICK') {
    clicked = handleAndroidWidgetClick(clickAction, clickActionData)
  }
  const tappedShelf = clicked || applied
  const later = await androidWidgetCardStamp()
  const shelf = readShelf()
  const props = await tonightPropsForWidget(shelf)
  writeWidgetTonightProps(props)
  await saveAndroidWidgetCard(props)
  renderWidget(renderDidITonightAndroidWidget(props, widgetInfo))
  if (stamp && later && later !== stamp) {
    if (tappedShelf) await syncTonightWidget(tappedShelf)
    return
  }
  if (tappedShelf) await syncTonightWidget(tappedShelf)
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
