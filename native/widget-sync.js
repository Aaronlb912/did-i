import { Platform } from 'react-native'
import { nativeBridgeReady, queueWidgetSync } from './lib/defer-native.js'
import { nativeWidgetsEnabled } from './lib/widgets-enabled.js'
import { widgetRedrawTimes, widgetTimelineTimes, widgetColorBook, widgetLookId, widgetTheme } from '../src/lib/widget-config.js'
import { buildTonightWidgetProps, mergeWidgetPropsIntoShelf, tonightWidgetKey, WIDGET_NAME } from '../src/lib/widget-tonight.js'
import { readWidgetTonightProps, writeWidgetTonightProps } from '../src/lib/widget-store.js'
import { hallColors } from './palette.js'
import { wornShapes } from '../src/lib/accessory-shapes.js'
import { BUDDY_PARTS } from '../src/lib/buddy-parts.js'
import { readShelf } from '../src/lib/board-shelf.js'
import { boardDate } from '../src/lib/recurrence.js'
import { recordAppError } from '../src/lib/app-errors.js'
import { buildTogetherWidgetProps, readTogetherPeople, TOGETHER_WIDGET_NAME } from '../src/lib/together-widget.js'
import { sendWatchCards } from './watch-sync.js'

// The native side takes plain records. undefined, functions or Dates in the
// props can make the whole update throw, so send a JSON copy.
function plainProps(props) {
  try {
    return JSON.parse(JSON.stringify(props ?? {}))
  } catch {
    return props
  }
}

// One string, so the code and message survive in the device log too
// (a second console argument is often dropped there).
function warnWidget(where, error) {
  const code = error?.code ? ` [${error.code}]` : ''
  const text = error?.message || (typeof error === 'string' ? error : JSON.stringify(error))
  console.warn(`${where} failed${code}: ${text}`)
  // Also to the crash reports (when on), so a blank widget shows up there.
  recordAppError('widget', error).catch(() => {})
}

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
  // The buddy's own shapes too, so a widget built before this buddy still draws it.
  const buddyParts = BUDDY_PARTS[String(props.buddyId || '')] || null
  return { ...props, colors, buddyShapes, buddyParts }
}

// Answers that came in from another phone (sync) or a shelf that changed
// while the app sat open: redraw only when tonight's card would change.
let lastTonightKey = ''

export function syncTonightWidgetIfChanged(shelf) {
  if (Platform.OS === 'web' || !nativeWidgetsEnabled()) return Promise.resolve()
  // Built from the enriched props, so a look or theme change redraws.
  const key = tonightWidgetKey(enrichTonightWidgetProps(shelf, buildTonightWidgetProps(shelf)))
  if (key === lastTonightKey) return Promise.resolve()
  return syncTonightWidget(shelf)
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

// iOS: updateTimeline replaces the stored timeline, widget taps included, so
// after a cold start or a return to the app the timeline has to be read
// (widget-bridge.js) before it is written again.
let timelineRead = false
let readTimeline = null

export function setWidgetTimelineReader(fn) {
  readTimeline = typeof fn === 'function' ? fn : null
}

export function markWidgetTimelineRead(read = true) {
  timelineRead = read
}

export async function syncTonightWidget(shelf) {
  if (Platform.OS === 'web') return
  if (!nativeWidgetsEnabled()) return
  if (Platform.OS === 'ios' && !nativeBridgeReady()) {
    queueWidgetSync(shelf)
    return
  }
  if (Platform.OS === 'ios' && !timelineRead && readTimeline) {
    // A failed read must not hold the widget back for good.
    await readTimeline().catch(() => {})
    // The read merged the taps into the stored shelf; read it again so an
    // answer made in the app meanwhile is not drawn over.
    shelf = readShelf()
  }
  const built = buildTonightWidgetProps(shelf)
  const props = enrichTonightWidgetProps(shelf, built)
  lastTonightKey = tonightWidgetKey(props)
  writeWidgetTonightProps(props)
  if (Platform.OS === 'ios') {
    // Same cards to the Apple Watch, when one is paired (native/watch-sync.js).
    sendWatchCards(props, shelf)
    try {
      const api = await tonightWidgetApi()
      if (!api) return
      // One entry per ask time, midnight and grace end, for the next few
      // nights, so a widget-only night still shows its own card.
      const boards = (shelf?.boards || []).filter((b) => !b.archived)
      const times = widgetTimelineTimes(boards, new Date())
      const later = times.map((date) => ({
        date,
        props: enrichTonightWidgetProps(shelf, buildTonightWidgetProps(shelf, date)),
      }))
      if (later.length && api.updateTimeline) {
        const entries = [{ date: new Date(), props }, ...later]
        await api.updateTimeline(entries.map((entry) => ({ date: entry.date, props: plainProps(entry.props) })))
      } else await api.updateSnapshot(plainProps(props))
    } catch (error) {
      warnWidget('widget updateSnapshot', error)
    }
    return
  }
  if (Platform.OS === 'android') {
    // Same cards to the Wear OS app, when one is paired (native/watch-sync.js).
    sendWatchCards(props, shelf)
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
      // Alarms at each ask time, at midnight, and when last night's grace ends.
      await armAndroidWidgetAskTimes(widgetRedrawTimes(boards, new Date()))
      await requestWidgetUpdate({
        widgetName: WIDGET_NAME,
        renderWidget: (info) => renderDidITonightAndroidWidget(stored, info),
        widgetNotFound: () => {},
      })
    } catch (error) {
      warnWidget('widget android update', error)
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
        buildTogetherWidgetProps(people, boardDate(midnight)),
      )
      if (api.updateTimeline) {
        await api.updateTimeline([
          { date: new Date(), props: plainProps(props) },
          { date: midnight, props: plainProps(tomorrow) },
        ])
      } else await api.updateSnapshot(plainProps(props))
    } catch (error) {
      warnWidget('together widget updateSnapshot', error)
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
    // Only a read that worked lets the next updateTimeline replace the taps.
    timelineRead = true
    if (!shown.length) return shelf
    // The timeline also holds the app's own snapshots. A status the app wrote
    // itself is no tap: merging it back would undo an undo made elsewhere.
    const mine = new Map((readWidgetTonightProps()?.items || []).map((item) => [`${item.lampId}|${item.periodKey}`, item.status]))
    const taps = (props) => ({ ...props, items: (props.items || []).filter((item) => mine.get(`${item.lampId}|${item.periodKey}`) !== item.status) })
    const merged = shown.reduce((next, entry) => mergeWidgetPropsIntoShelf(next, taps(entry.props)), shelf)
    // Only after the merge: a stored tap status would hide that tap next time.
    writeWidgetTonightProps(shown[shown.length - 1].props)
    return merged
  } catch {
    return shelf
  }
}
