import { registerWidgetTaskHandler } from 'react-native-android-widget'
import {
  buildTonightWidgetProps,
  handleAndroidWidgetClick,
  peekNextTonightCard,
  preferStoredTonightProps,
} from '../src/lib/widget-tonight.js'
import { readWidgetTonightProps, writeWidgetTonightProps } from '../src/lib/widget-store.js'
import { renderDidITonightAndroidWidget } from '../widgets/android/DidITonightAndroidWidget.jsx'
import { onPrefs } from '../src/lib/prefs.js'
import { enrichTogetherWidgetProps, enrichTonightWidgetProps, syncTogetherWidget, syncTonightWidget } from './widget-sync.js'
import { renderDidITogetherAndroidWidget } from '../widgets/android/DidITogetherAndroidWidget.jsx'
import {
  buildTogetherWidgetProps,
  onTogetherSaved,
  readTogetherPeople,
  TOGETHER_WIDGET_NAME,
} from '../src/lib/together-widget.js'
import { readShelf } from '../src/lib/board-shelf.js'
import { resendWatchCards, sendWatchCards } from './watch-sync.js'
import { armNativePingsNow } from './shim/native.js'
import { widgetRedrawTimes } from '../src/lib/widget-config.js'
import {
  applyPendingAndroidWidgetTap,
  armAndroidWidgetAskTimes,
  loadAndroidWidgetCard,
  saveAndroidWidgetCard,
} from './widget-tap.android.js'
import { installWake, runWake, takeAndroidWake } from './wake.js'

// Here, not in installWidgetSetup: a wake can reach the headless widget task,
// which never runs that.
installWake({ first: applyPendingAndroidWidgetTap })

async function tonightPropsForWidget(shelf) {
  let props = enrichTonightWidgetProps(shelf, buildTonightWidgetProps(shelf))
  props = preferStoredTonightProps(props, readWidgetTonightProps())
  const card = await loadAndroidWidgetCard()
  if (card) props = preferStoredTonightProps(props, card)
  return props
}

async function handleDidITonightWidgetTask({ widgetAction, widgetInfo, clickAction, clickActionData, renderWidget }) {
  // The Together widget only shows the saved list; a tap opens the app by URI.
  if (widgetInfo?.widgetName === TOGETHER_WIDGET_NAME) {
    if (widgetAction === 'WIDGET_DELETED') return
    const props = enrichTogetherWidgetProps(readShelf(), buildTogetherWidgetProps(readTogetherPeople()))
    renderWidget(renderDidITogetherAndroidWidget(props, widgetInfo))
    return
  }
  // Browsing to another open question is display-only — it never touches
  // the shelf, so it skips the answer-tap plumbing below and renders straight
  // from what's already on the card.
  if (widgetAction === 'WIDGET_CLICK' && clickAction === 'PEEK') {
    const current = await tonightPropsForWidget(readShelf())
    const dir = clickActionData?.dir === 'prev' ? -1 : 1
    const peeked = peekNextTonightCard(current, dir)
    if (peeked) {
      writeWidgetTonightProps(peeked)
      await saveAndroidWidgetCard(peeked)
      renderWidget(renderDidITonightAndroidWidget(peeked, widgetInfo))
      return
    }
  }
  const applied = await applyPendingAndroidWidgetTap()
  // A silent wake while the app was closed (WakeMessagingService): pull now,
  // after this phone's own taps are applied, so they are paid here first.
  const woke = await takeAndroidWake()
  if (woke) await runWake()
  let clicked = null
  if (widgetAction === 'WIDGET_CLICK') {
    clicked = handleAndroidWidgetClick(clickAction, clickActionData)
  }
  const tappedShelf = clicked || applied
  // A tap may have come from the watch: send it the cards again either way.
  if (tappedShelf) resendWatchCards()
  const shelf = readShelf()
  const props = await tonightPropsForWidget(shelf)
  writeWidgetTonightProps(props)
  await saveAndroidWidgetCard(props)
  renderWidget(renderDidITonightAndroidWidget(props, widgetInfo))
  // A redraw from an alarm (midnight, an ask time): set the next ones, so
  // tomorrow night turns over even if the app is never opened.
  // The Wear watch gets the new night too.
  if (!tappedShelf) {
    sendWatchCards(props, shelf)
    await armAndroidWidgetAskTimes(widgetRedrawTimes((shelf?.boards || []).filter((b) => !b.archived), new Date()))
  }
  if (tappedShelf) await syncTonightWidget(tappedShelf)
  // Answered with the app closed: drop that question's later reminders now.
  if (tappedShelf || woke) await armNativePingsNow(readShelf()?.boards || []).catch(() => {})
}

// Headless widget clicks evaluate the bundle and look for this task immediately.
// Do not move it behind the iOS bridge delay.
registerWidgetTaskHandler(handleDidITonightWidgetTask)

export function installWidgetSetup() {
  onPrefs(() => {
    syncTonightWidget(readShelf()).catch(() => {})
    syncTogetherWidget().catch(() => {})
  })
  onTogetherSaved(() => {
    syncTogetherWidget().catch(() => {})
  })

  syncTonightWidget(readShelf()).catch(() => {})
  syncTogetherWidget().catch(() => {})
}
