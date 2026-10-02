import { Platform } from 'react-native'
import { nativeBridgeReady, queueWidgetSync } from './lib/defer-native.js'
import { nativeWidgetsEnabled } from './lib/widgets-enabled.js'
import { widgetAskTimes, widgetColorBook, widgetLookId, widgetTheme } from '../src/lib/widget-config.js'
import { buildTonightWidgetProps, mergeWidgetPropsIntoShelf, WIDGET_NAME } from '../src/lib/widget-tonight.js'
import { readWidgetTonightProps, writeWidgetTonightProps } from '../src/lib/widget-store.js'
import { hallColors } from './palette.js'
import { wornShapes } from '../src/lib/accessory-shapes.js'
import { readShelf } from '../src/lib/board-shelf.js'
import { isoDate } from '../src/lib/recurrence.js'
import { buildTogetherWidgetProps, readTogetherPeople, TOGETHER_WIDGET_NAME } from '../src/lib/together-widget.js'

function snapshotColors(colors, look) {
  return {
    bg: colors.bg,
    panel: colors.panel,
    ink: colors.ink,
    inkSoft: colors.inkSoft,
    on: colors.on,
    skip: colors.skip,
    miss: colors.miss,
    line: colors.line,
    look: look || 'lime',
    gem: Boolean(colors.gemLook),
  }
}

export function enrichTonightWidgetProps(shelf, props) {
  const book = widgetColorBook(shelf)
  const look = widgetLookId(shelf, book)
  const theme = widgetTheme()
  const colors = snapshotColors(hallColors(look, theme), look)
  // The iPhone widget cannot draw the accessory paths, so it gets them as
  // simple shapes (accessory-shapes.js), in the look's colour.
  const buddyShapes = props.buddyId ? wornShapes(props.buddyWorn, props.buddyId, colors.on) : null
  return { ...props, colors, buddyShapes }
}

let widgetApiPromise = null

function tonightWidgetApi() {
  if (!widgetApiPromise) {
    widgetApiPromise = import('../widgets/DidITonightWidget.tsx')
      .then((mod) => {
        const api = mod?.default ?? mod
        if (!api || typeof api.updateSnapshot !== 'function') return null
        return api
      })
      .catch((error) => {
        widgetApiPromise = null
        throw error
      })
  }
  return widgetApiPromise
}

export async function syncTonightWidget(shelf) {
  if (Platform.OS === 'web') return
  if (!nativeWidgetsEnabled()) return
  if (Platform.OS === 'ios' && !nativeBridgeReady()) {
    queueWidgetSync(shelf)
    return
  }
  const props = enrichTonightWidgetProps(shelf, buildTonightWidgetProps(shelf))
  writeWidgetTonightProps(props)
  if (Platform.OS === 'ios') {
    try {
      const api = await tonightWidgetApi()
      if (!api) return
      // One entry per ask time still to come tonight, so a question shows
      // up on the widget when its time comes without the app being open.
      const boards = (shelf?.boards || []).filter((b) => !b.archived)
      const later = widgetAskTimes(boards, new Date()).map((date) => ({
        date,
        props: enrichTonightWidgetProps(shelf, buildTonightWidgetProps(shelf, date)),
      }))
      if (later.length && api.updateTimeline) await api.updateTimeline([{ date: new Date(), props }, ...later])
      else await api.updateSnapshot(props)
    } catch (error) {
      console.warn('widget updateSnapshot', error?.message || error)
    }
    return
  }
  if (Platform.OS === 'android') {
    try {
      const widgetMod = await import('react-native-android-widget')
      const requestWidgetUpdate = widgetMod?.requestWidgetUpdate
      if (!requestWidgetUpdate) return
      const { renderDidITonightAndroidWidget } = await import('../widgets/android/DidITonightAndroidWidget.jsx')
      const stored = readWidgetTonightProps() || props
      const { saveAndroidWidgetCard } = await import('./widget-tap.android.js')
      await saveAndroidWidgetCard(stored)
      const { armAndroidWidgetAskTimes } = await import('./widget-tap.android.js')
      const boards = (shelf?.boards || []).filter((b) => !b.archived)
      await armAndroidWidgetAskTimes(widgetAskTimes(boards, new Date()))
      await requestWidgetUpdate({
        widgetName: WIDGET_NAME,
        renderWidget: (info) => renderDidITonightAndroidWidget(stored, info),
        widgetNotFound: () => {},
      })
    } catch (error) {
      console.warn('widget android update', error?.message || error)
    }
  }
}

// Same look and theme colours as the Tonight widget.
export function enrichTogetherWidgetProps(shelf, props) {
  const look = widgetLookId(shelf, widgetColorBook(shelf))
  return { ...props, colors: snapshotColors(hallColors(look, widgetTheme()), look) }
}

let togetherApiPromise = null

function togetherWidgetApi() {
  if (!togetherApiPromise) {
    togetherApiPromise = import('../widgets/DidITogetherWidget.tsx')
      .then((mod) => {
        const api = mod?.default ?? mod
        if (!api || typeof api.updateSnapshot !== 'function') return null
        return api
      })
      .catch((error) => {
        togetherApiPromise = null
        throw error
      })
  }
  return togetherApiPromise
}

// people: the saved list (src/lib/together-widget.js). No network here.
export async function syncTogetherWidget(people = readTogetherPeople()) {
  if (Platform.OS === 'web') return
  if (!nativeWidgetsEnabled()) return
  // Nothing to queue: the next people load or prefs change redraws it.
  if (Platform.OS === 'ios' && !nativeBridgeReady()) return
  const props = enrichTogetherWidgetProps(readShelf(), buildTogetherWidgetProps(people))
  if (Platform.OS === 'ios') {
    try {
      const api = await togetherWidgetApi()
      if (!api) return
      // A second entry at midnight clears the checks without the app open.
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      const tomorrow = enrichTogetherWidgetProps(
        readShelf(),
        buildTogetherWidgetProps(people, isoDate(midnight)),
      )
      if (api.updateTimeline) {
        await api.updateTimeline([
          { date: new Date(), props },
          { date: midnight, props: tomorrow },
        ])
      } else await api.updateSnapshot(props)
    } catch (error) {
      console.warn('together widget updateSnapshot', error?.message || error)
    }
    return
  }
  if (Platform.OS === 'android') {
    try {
      const widgetMod = await import('react-native-android-widget')
      const requestWidgetUpdate = widgetMod?.requestWidgetUpdate
      if (!requestWidgetUpdate) return
      const { renderDidITogetherAndroidWidget } = await import('../widgets/android/DidITogetherAndroidWidget.jsx')
      await requestWidgetUpdate({
        widgetName: TOGETHER_WIDGET_NAME,
        renderWidget: (info) => renderDidITogetherAndroidWidget(props, info),
        widgetNotFound: () => {},
      })
    } catch (error) {
      console.warn('together widget android update', error?.message || error)
    }
  }
}

export async function pullWidgetTimelineIntoShelf(shelf) {
  if (!nativeWidgetsEnabled()) return shelf
  if (Platform.OS !== 'ios') return shelf
  if (!nativeBridgeReady()) return shelf
  try {
    const api = await tonightWidgetApi()
    if (!api?.getTimeline) return shelf
    // Taps land on whichever entry was showing, so fold in every entry
    // that has come round, not only the last one.
    const now = Date.now()
    const shown = (await api.getTimeline()).filter((entry) => entry?.props && entry.date.getTime() <= now)
    if (!shown.length) return shelf
    writeWidgetTonightProps(shown[shown.length - 1].props)
    return shown.reduce((next, entry) => mergeWidgetPropsIntoShelf(next, entry.props), shelf)
  } catch {
    return shelf
  }
}
