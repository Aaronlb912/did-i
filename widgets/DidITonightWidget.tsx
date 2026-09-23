import { Button, Capsule, Circle, Ellipse, HStack, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui'
import {
  background,
  buttonBorderShape,
  buttonStyle,
  clipShape,
  clipped,
  containerBackground,
  containerRelativeFrame,
  font,
  foregroundStyle,
  frame,
  tint,
  kerning,
  multilineTextAlignment,
  offset,
  padding,
  textCase,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers'
import { createWidget, type WidgetEnvironment } from 'expo-widgets'

type TonightItem = {
  lampId: string
  label: string
  status: 'open' | 'yes' | 'skip'
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

export type DidITonightWidgetProps = {
  tagTitle: string
  question?: string
  leadLampId?: string
  items: TonightItem[]
  left: number
  footer: string
  didLabel: string
  nopeLabel: string
  openLabel: string
  openUri?: string
  buddyId?: string
  colors?: WidgetColors
}

const DidITonightWidget = (props: DidITonightWidgetProps, environment: WidgetEnvironment) => {
  'widget'
  // WidgetKit runs only this function. Helpers outside it are missing there,
  // the draw throws, and a TestFlight widget then shows an empty box.

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

  function leadItem(items: TonightItem[], leadLampId?: string) {
    const id = String(leadLampId || '').trim()
    if (id) {
      const hit = items.find((item) => item.lampId === id && item.status === 'open')
      if (hit) return hit
    }
    return items.find((item) => item.status === 'open') || null
  }

  const items = Array.isArray(props?.items) ? props.items : []
  const tagTitle = String(props?.tagTitle || 'Tonight')
  const footer = String(props?.footer || 'No questions yet.')
  const left = Number(props?.left) || 0
  const openUri = String(props?.openUri || 'didi://tonight')
  const c = { ...FALLBACK, ...(props?.colors || {}) }
  const mode = String(environment?.widgetRenderingMode || '')
  const tinted = mode.length > 0 && mode !== 'fullColor' && !mode.endsWith('fullColor')
  const ink = tinted ? { type: 'hierarchical' as const, style: 'primary' as const } : c.ink
  const on = tinted ? { type: 'hierarchical' as const, style: 'primary' as const } : c.on
  const gem = Boolean(c.gem) && !tinted
  const fill = containerRelativeFrame({ axes: 'both', alignment: 'topLeading' })
  const grow = frame({ maxWidth: 10000, maxHeight: 10000 })

  const lead = leadItem(items, props?.leadLampId)
  const questionText = String(props?.question || '').trim() || lead?.label || footer
  const didLabel = String(props?.didLabel || 'Did')
  const nopeLabel = String(props?.nopeLabel || 'Did not')
  const leadId = String(lead?.lampId || '')
  const buddyId = String(props?.buddyId || '')

  function buddyMark(id: string) {
    const known = id === 'cat' || id === 'dog' || id === 'rabbit' || id === 'owl'
    if (!known) return null
    const body = id === 'cat' ? '#f0a64a' : id === 'dog' ? '#c68b52' : id === 'rabbit' ? '#b8b8c8' : '#8b6b4a'
    const belly = id === 'cat' ? '#ffe8c8' : id === 'dog' ? '#f3ddc4' : id === 'rabbit' ? '#e8e8f0' : '#d4c4a8'
    const ear = id === 'rabbit' ? '#f0b8c8' : id === 'dog' ? '#9a6538' : id === 'owl' ? '#6b5038' : body
    const eye = id === 'owl' ? '#f0e080' : '#2d241c'
    const tall = id === 'rabbit'
    const mark = compact ? 28 : 36
    return (
      <ZStack alignment="center" modifiers={[padding({ top: 4, trailing: 6 }), frame({ width: mark, height: mark + 8 })]}>
        {tall ? (
          <HStack spacing={8} modifiers={[offset({ y: -12 })]}>
            <Capsule modifiers={[frame({ width: 5, height: 14 }), foregroundStyle(body)]} />
            <Capsule modifiers={[frame({ width: 5, height: 14 }), foregroundStyle(body)]} />
          </HStack>
        ) : (
          <HStack spacing={12} modifiers={[offset({ y: -8 })]}>
            <Circle modifiers={[frame({ width: 7, height: 7 }), foregroundStyle(ear)]} />
            <Circle modifiers={[frame({ width: 7, height: 7 }), foregroundStyle(ear)]} />
          </HStack>
        )}
        <Ellipse modifiers={[frame({ width: mark - 8, height: 18 }), foregroundStyle(body)]} />
        <Ellipse modifiers={[frame({ width: 14, height: 10 }), foregroundStyle(belly), offset({ y: 2 })]} />
        <HStack spacing={6} modifiers={[offset({ y: -1 })]}>
          <Circle modifiers={[frame({ width: 4, height: 4 }), foregroundStyle(eye)]} />
          <Circle modifiers={[frame({ width: 4, height: 4 }), foregroundStyle(eye)]} />
        </HStack>
      </ZStack>
    )
  }

  function afterTap(kind: 'did' | 'nope') {
    const status = kind === 'did' ? 'yes' : 'skip'
    const nextItems = items.map((item) => (item.lampId === leadId ? { ...item, status } : item))
    const nextLead = nextItems.find((item) => item.status === 'open') || null
    const nextLeft = nextItems.filter((item) => item.status === 'open').length
    return {
      items: nextItems,
      leadLampId: nextLead ? nextLead.lampId : '',
      question: nextLead ? String(nextLead.label || '') : '',
      left: nextLeft,
      footer: nextLead ? footer : 'No questions yet.',
    }
  }

  const family = environment?.widgetFamily

  if (family === 'accessoryCircular') {
    return (
      <VStack modifiers={[containerBackground(gem ? c.bg : c.panel, 'widget'), fill]}>
        <Text modifiers={[font({ weight: 'bold', size: 16 }), foregroundStyle(gem ? on : ink)]}>
          {left > 0 ? String(left) : '✓'}
        </Text>
      </VStack>
    )
  }

  if (family === 'accessoryInline') {
    return (
      <Text modifiers={[foregroundStyle(ink)]}>
        {lead ? questionText : footer}
      </Text>
    )
  }

  const compact = family === 'systemSmall' || family === 'accessoryRectangular'
  const titleSize = compact ? 18 : 26
  const kicker = (
    <Text
      modifiers={[
        font({ size: 11, weight: 'semibold' }),
        kerning(1.1),
        textCase('uppercase'),
        foregroundStyle(on),
        multilineTextAlignment('center'),
        frame({ maxWidth: 10000 }),
      ]}
    >
      {tagTitle}
    </Text>
  )
  const question = (
    <Text
      modifiers={[
        font({ weight: 'bold', size: titleSize }),
        foregroundStyle(ink),
        multilineTextAlignment('center'),
        frame({ maxWidth: 10000 }),
      ]}
    >
      {lead ? questionText : footer}
    </Text>
  )
  const buttons = lead ? (
    <HStack spacing={8} modifiers={[frame({ maxWidth: 10000 })]}>
      <Button
        label={nopeLabel}
        target={'nope:' + leadId}
        onPress={() => afterTap('nope')}
        modifiers={[
          buttonStyle('borderedProminent'),
          buttonBorderShape('roundedRectangle', 12),
          tint(c.skip),
          font({ size: compact ? 13 : 15, weight: 'bold' }),
          foregroundStyle(ink),
          frame({ maxWidth: 10000 }),
        ]}
      />
      <Button
        label={didLabel}
        target={'did:' + leadId}
        onPress={() => afterTap('did')}
        modifiers={[
          buttonStyle('borderedProminent'),
          buttonBorderShape('roundedRectangle', 12),
          tint(c.on),
          font({ size: compact ? 13 : 15, weight: 'bold' }),
          foregroundStyle(c.bg),
          frame({ maxWidth: 10000 }),
        ]}
      />
    </HStack>
  ) : null

  if (family === 'accessoryRectangular') {
    return (
      <VStack
        alignment="center"
        spacing={4}
        modifiers={[
          padding({ horizontal: 4, vertical: 2 }),
          containerBackground(c.panel, 'widget'),
          widgetURL(openUri),
          fill,
        ]}
      >
        {kicker}
        {question}
      </VStack>
    )
  }

  return (
    <VStack modifiers={[padding({ all: compact ? 8 : 10 }), containerBackground(gem ? c.bg : c.panel, 'widget'), widgetURL(openUri), fill, clipped(true)]}>
      <VStack
        modifiers={[
          padding({ all: 2 }),
          background(c.on),
          clipShape('roundedRectangle', 22),
          grow,
        ]}
      >
        <ZStack alignment="topTrailing" modifiers={[grow]}>
          <VStack
            alignment="center"
            spacing={8}
            modifiers={[
              padding({ horizontal: 14, vertical: 12 }),
              background(c.panel),
              clipShape('roundedRectangle', 20),
              grow,
            ]}
          >
            {kicker}
            <Spacer />
            {question}
            <Spacer />
            {buttons}
          </VStack>
          {buddyMark(buddyId)}
        </ZStack>
      </VStack>
    </VStack>
  )
}

const widget = createWidget<DidITonightWidgetProps>('DidITonight', DidITonightWidget)
export default widget
