import { Ellipse, HStack, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui'
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
  multilineTextAlignment,
  padding,
  strokeBorder,
  textCase,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers'
import { createWidget, type WidgetEnvironment } from 'expo-widgets'

type TogetherPerson = {
  id: string
  name: string
  initials: string
  shared: boolean
  done: boolean
}

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

export type DidITogetherWidgetProps = {
  people: TogetherPerson[]
  title: string
  countLine: string
  emptyLabel: string
  openUri?: string
  colors?: WidgetColors
}

const DidITogetherWidget = (props: DidITogetherWidgetProps, environment: WidgetEnvironment) => {
  'widget'
  // WidgetKit runs only this function. Helpers outside it are missing there.

  const FALLBACK: WidgetColors = {
    bg: '#0e1014',
    panel: '#16191f',
    ink: '#f4f6fa',
    inkSoft: '#99a1b0',
    on: '#c9f24d',
    skip: '#7d8694',
    miss: '#ff6f61',
    line: '#2b3140',
  }

  const people = Array.isArray(props?.people) ? props.people : []
  const title = String(props?.title || 'Together tonight')
  const countLine = String(props?.countLine || '')
  const emptyLabel = String(props?.emptyLabel || 'Add friends or family in Did I.')
  const openUri = String(props?.openUri || 'didi://open/friends')
  const c = { ...FALLBACK, ...(props?.colors || {}) }
  const mode = String(environment?.widgetRenderingMode || '')
  const tinted = mode.length > 0 && mode !== 'fullColor' && !mode.endsWith('fullColor')
  const ink = tinted ? { type: 'hierarchical' as const, style: 'primary' as const } : c.ink
  const on = tinted ? { type: 'hierarchical' as const, style: 'primary' as const } : c.on
  const soft = tinted ? { type: 'hierarchical' as const, style: 'secondary' as const } : c.inkSoft
  const gem = Boolean(c.gem) && !tinted
  const fill = containerRelativeFrame({ axes: 'both', alignment: 'topLeading' })
  const grow = frame({ maxWidth: 10000, maxHeight: 10000 })

  const family = environment?.widgetFamily
  const small = family === 'systemSmall'
  const large = family === 'systemLarge'
  const max = small ? 6 : large ? 14 : 6
  const shown = people.slice(0, max)

  function avatar(person: TogetherPerson, size: number) {
    return (
      <ZStack modifiers={[frame({ width: size, height: size })]}>
        <Ellipse
          modifiers={[
            frame({ width: size, height: size }),
            foregroundStyle(person.done ? c.on : c.bg),
            strokeBorder({ content: person.done ? c.on : c.line, style: { lineWidth: 1.5 }, shape: 'ellipse' }),
          ]}
        />
        <Text
          modifiers={[
            font({ size: size * 0.4, weight: 'bold' }),
            foregroundStyle(person.done ? c.bg : person.shared ? ink : soft),
            lineLimit(1),
            minimumScaleFactor(0.5),
          ]}
        >
          {person.initials || '?'}
        </Text>
      </ZStack>
    )
  }

  function check(person: TogetherPerson, size: number) {
    return (
      <Text modifiers={[font({ size, weight: 'bold' }), foregroundStyle(on), frame({ width: size + 4 })]}>
        {person.done ? '✓' : ' '}
      </Text>
    )
  }

  // Small: a grid of initials, two rows of three, check under each one done.
  function smallCell(person: TogetherPerson) {
    return (
      <VStack spacing={1} modifiers={[frame({ maxWidth: 10000 })]}>
        {avatar(person, 30)}
        {check(person, 10)}
      </VStack>
    )
  }

  // Medium and large: two columns of rows, initials, name, check.
  function row(person: TogetherPerson) {
    return (
      <HStack spacing={6} modifiers={[frame({ maxWidth: 10000 })]}>
        {avatar(person, large ? 26 : 22)}
        <Text
          modifiers={[
            font({ size: large ? 14 : 13, weight: 'semibold' }),
            foregroundStyle(person.shared ? ink : soft),
            lineLimit(1),
            minimumScaleFactor(0.7),
          ]}
        >
          {person.name || person.initials}
        </Text>
        <Spacer />
        {check(person, large ? 14 : 12)}
      </HStack>
    )
  }

  const perColumn = Math.ceil(shown.length / 2)
  const left = shown.slice(0, perColumn)
  const right = shown.slice(perColumn)

  const body = !shown.length ? (
    <Text
      modifiers={[
        font({ size: small ? 13 : 15, weight: 'medium' }),
        foregroundStyle(soft),
        multilineTextAlignment('center'),
        lineLimit(4),
        minimumScaleFactor(0.6),
        frame({ maxWidth: 10000, maxHeight: 10000 }),
      ]}
    >
      {emptyLabel}
    </Text>
  ) : small ? (
    <VStack spacing={4} modifiers={[frame({ maxWidth: 10000 })]}>
      <HStack spacing={4}>{shown.slice(0, 3).map((p) => smallCell(p))}</HStack>
      {shown.length > 3 ? <HStack spacing={4}>{shown.slice(3, 6).map((p) => smallCell(p))}</HStack> : null}
    </VStack>
  ) : (
    <HStack alignment="top" spacing={12} modifiers={[frame({ maxWidth: 10000 })]}>
      <VStack alignment="leading" spacing={large ? 8 : 5} modifiers={[frame({ maxWidth: 10000 })]}>
        {left.map((p) => row(p))}
      </VStack>
      <VStack alignment="leading" spacing={large ? 8 : 5} modifiers={[frame({ maxWidth: 10000 })]}>
        {right.map((p) => row(p))}
      </VStack>
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
        spacing={small ? 4 : 8}
        modifiers={[
          padding({ horizontal: small ? 10 : 14, vertical: small ? 10 : 12 }),
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
            font({ size: small ? 11 : 13, weight: 'semibold' }),
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
              font({ size: small ? 11 : 12, weight: 'medium' }),
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

const widget = createWidget<DidITogetherWidgetProps>('DidITogether', DidITogetherWidget)
export default widget
