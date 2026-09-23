import { Platform } from 'react-native'
import { nativeBridgeReady, queueWidgetSync } from './lib/defer-native.js'
import { nativeWidgetsEnabled } from './lib/widgets-enabled.js'
import { widgetBook, widgetLookId, widgetTheme } from '../src/lib/widget-config.js'
import { buildTonightWidgetProps, mergeWidgetPropsIntoShelf, WIDGET_NAME } from '../src/lib/widget-tonight.js'
import { readWidgetTonightProps, writeWidgetTonightProps } from '../src/lib/widget-store.js'
import { hallColors } from './palette.js'

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

function enrichProps(shelf, props) {
  const book = widgetBook(shelf)
  const look = widgetLookId(shelf, book)
  const theme = widgetTheme()
  return { ...props, colors: snapshotColors(hallColors(look, theme), look) }
}

async function tonightWidgetApi() {
  const mod = await import('../widgets/DidITonightWidget.tsx')
  if (!mod) return null
  const api = mod.default ?? mod
  if (!api || typeof api.updateSnapshot !== 'function') return null
  return api
}

export async function syncTonightWidget(shelf) {
  if (Platform.OS === 'web') return
  if (!nativeWidgetsEnabled()) return
  if (Platform.OS === 'ios' && !nativeBridgeReady()) {
    queueWidgetSync(shelf)
    return
  }
  const props = enrichProps(shelf, buildTonightWidgetProps(shelf))
  writeWidgetTonightProps(props)
  if (Platform.OS === 'ios') {
    try {
      const api = await tonightWidgetApi()
      if (api) await api.updateSnapshot(props)
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

export async function pullWidgetTimelineIntoShelf(shelf) {
  if (!nativeWidgetsEnabled()) return shelf
  if (Platform.OS !== 'ios') return shelf
  if (!nativeBridgeReady()) return shelf
  try {
    const api = await tonightWidgetApi()
    if (!api?.getTimeline) return shelf
    const entries = await api.getTimeline()
    const last = entries.length ? entries[entries.length - 1] : null
    if (!last?.props) return shelf
    writeWidgetTonightProps(last.props)
    return mergeWidgetPropsIntoShelf(shelf, last.props)
  } catch {
    return shelf
  }
}
