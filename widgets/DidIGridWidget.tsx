import { HStack, RoundedRectangle, Spacer, Text, VStack } from '@expo/ui/swift-ui'
import {
  background,
  clipShape,
  clipped,
  containerBackground,
  containerRelativeFrame,
  containerShape,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  padding,
  strokeBorder,
  textCase,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers'
import { createWidget, type WidgetEnvironment } from 'expo-widgets'

type WidgetColors = {
  bg: string
  panel: string
  ink: string
  inkSoft: string
  on: string
  skip: string
  miss: string
  line: string
  look?: string
  gem?: boolean
}

// weeks: 12 strings of 7 characters, oldest week first (src/lib/widget-grid.js).
// y = Did, n = Not yet, . = no mark, space = a day still ahead.
export type DidIGridWidgetProps = {
  weeks: string[]
  // Where today sits, so it can be marked. Optional.
  todayWeek?: number
  todayRow?: number
  title: string
  countLine: string
  emptyLabel: string
  openUri?: string
  colors?: WidgetColors
}

const DidIGridWidget = (props: DidIGridWidgetProps, environment: WidgetEnvironment) => {
  'widget'
  // WidgetKit runs only this function. Helpers outside it are missing there.

  const FALLBACK: WidgetColors = {
    bg: '#0e1014',
    panel: '#16191f',
    ink: '#f4f6fa',
    inkSoft: '#99a1b0',
    on: '#c9f24d',
    skip: '#7d8694',
    miss: '#2b3140',
    line: '#2b3140',
  }

  const weeks = Array.isArray(props?.weeks) ? props.weeks.map((w) => String(w || '')) : []
  const title = String(props?.title || 'Last 12 weeks')
  const countLine = String(props?.countLine || '')
  const emptyLabel = String(props?.emptyLabel || 'Your days fill in here as you answer.')
  const openUri = String(props?.openUri || 'didi://open/calendar')
  const c = { ...FALLBACK, ...(props?.colors || {}) }
  const mode = String(environment?.widgetRenderingMode || '')
  const tinted = mode.length > 0 && mode !== 'fullColor' && !mode.endsWith('fullColor')
  const on = tinted ? { type: 'hierarchical' as const, style: 'primary' as const } : c.on
  const soft = tinted ? { type: 'hierarchical' as const, style: 'secondary' as const } : c.inkSoft
  const missed = tinted ? { type: 'hierarchical' as const, style: 'tertiary' as const } : c.miss
  const none = tinted ? { type: 'hierarchical' as const, style: 'quinary' as const } : c.line
  const gem = Boolean(c.gem) && !tinted
  const fill = containerRelativeFrame({ axes: 'both', alignment: 'topLeading' })
  const grow = frame({ maxWidth: 10000, maxHeight: 10000 })

  const small = environment?.widgetFamily === 'systemSmall'
  const cell = small ? 9 : 12
  const gap = small ? 2 : 3
  const anyDay = weeks.some((w) => /[yn]/.test(w))

  const todayWeek = Number.isInteger(props?.todayWeek) ? Number(props.todayWeek) : -1
  const todayRow = Number.isInteger(props?.todayRow) ? Number(props.todayRow) : -1

  function square(ch: string, isToday: boolean) {
    // A day still ahead is left empty, so the last column ends where today does.
    const color = ch === 'y' ? on : ch === 'n' ? missed : ch === ' ' ? c.panel : isToday ? soft : none
    return <RoundedRectangle cornerRadius={2} modifiers={[frame({ maxWidth: 10000, height: cell }), foregroundStyle(color)]} />
  }

  const body = !anyDay ? (
    <Text
      modifiers={[
        font({ size: small ? 12 : 14, weight: 'medium' }),
        foregroundStyle(soft),
        lineLimit(3),
        minimumScaleFactor(0.6),
        frame({ maxWidth: 10000, maxHeight: 10000 }),
      ]}
    >
      {emptyLabel}
    </Text>
  ) : (
    <HStack spacing={gap} modifiers={[frame({ maxWidth: 10000 })]}>
      {weeks.map((week, w) => (
        <VStack spacing={gap} modifiers={[frame({ maxWidth: 10000 })]}>
          {Array.from({ length: 7 }, (_, d) => square(week.charAt(d) || ' ', w === todayWeek && d === todayRow))}
        </VStack>
      ))}
    </HStack>
  )

  return (
    <VStack
      modifiers={[
        containerBackground(gem ? c.bg : c.panel, 'widget'),
        containerShape({ shape: 'containerRelativeShape' }),
        widgetURL(openUri),
        fill,
      ]}
    >
      <VStack
        alignment="center"
        spacing={small ? 4 : 6}
        modifiers={[
          padding({ horizontal: small ? 8 : 14, vertical: small ? 8 : 12 }),
          background(c.panel),
          clipShape('containerRelativeShape'),
          strokeBorder({
            content: c.on,
            style: { lineWidth: 2 },
            shape: 'containerRelativeShape',
          }),
          grow,
          clipped(true),
        ]}
      >
        <Text
          modifiers={[
            font({ size: small ? 10 : 12, weight: 'semibold' }),
            textCase('uppercase'),
            foregroundStyle(on),
            lineLimit(1),
            minimumScaleFactor(0.6),
            frame({ maxWidth: 10000 }),
          ]}
        >
          {title}
        </Text>
        {countLine ? (
          <Text
            modifiers={[
              font({ size: small ? 10 : 12, weight: 'medium' }),
              foregroundStyle(soft),
              lineLimit(1),
              minimumScaleFactor(0.6),
            ]}
          >
            {countLine}
          </Text>
        ) : null}
        <Spacer />
        {body}
        <Spacer />
      </VStack>
    </VStack>
  )
}

const widget = createWidget<DidIGridWidgetProps>('DidIGrid', DidIGridWidget)
export default widget
