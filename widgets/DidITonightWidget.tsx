import { Button, Ellipse, HStack, Rectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui'
import {
  allowsTightening,
  background,
  buttonBorderShape,
  buttonStyle,
  clipShape,
  clipped,
  containerBackground,
  containerRelativeFrame,
  controlSize,
  font,
  foregroundStyle,
  frame,
  tint,
  kerning,
  lineLimit,
  minimumScaleFactor,
  multilineTextAlignment,
  offset,
  opacity,
  padding,
  rotationEffect,
  scaleEffect,
  textCase,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers'
import { createWidget, type WidgetEnvironment } from 'expo-widgets'

type TonightItem = {
  lampId: string
  label: string
  question?: string
  periodKey?: string
  tag?: string
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
  nextLabel?: string
  openLabel: string
  clearLabel?: string
  emptyLabel?: string
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
    const hasOpen = items.some((item) => item.status === 'open')
    const id = String(leadLampId || '').trim()
    if (id) {
      const hit = items.find(
        (item) =>
          item.lampId === id && (item.status === 'open' || (!hasOpen && item.status === 'skip')),
      )
      if (hit) return hit
    }
    return (
      items.find((item) => item.status === 'open') ||
      items.find((item) => item.status === 'skip') ||
      null
    )
  }

  function stackLeft(items: TonightItem[]) {
    const open = items.filter((item) => item.status === 'open').length
    if (open) return open
    return items.filter((item) => item.status === 'skip').length
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

  // The app buddy SVG (native/components/BuddyArt.jsx, same markup as the
  // Android widget's BUDDY_SVG) on its 48x58 grid, in SVG draw order.
  // SwiftUI here has no SVG or path, so: e = ellipse [cx, cy, rx, ry, fill,
  // rotate, opacity], t = triangle [base center x, base y, half width,
  // height (negative points down), fill], l = line [x1, y1, x2, y2, stroke, width].
  const BUDDY: Record<string, (string | number)[][]> = {
    cat: [
      ['e', 24, 30, 15, 14, '#f0a64a'],
      ['e', 24, 32, 11, 9, '#ffe8c8', 0, 0.85],
      ['t', 14, 18.5, 4, 10.5, '#f0a64a'],
      ['t', 34, 18.5, 4, 10.5, '#f0a64a'],
      ['t', 13.5, 17.5, 2.5, 7.5, '#ffd4a8'],
      ['t', 34.5, 17.5, 2.5, 7.5, '#ffd4a8'],
      ['e', 18, 28, 2.2, 3, '#2d241c'],
      ['e', 30, 28, 2.2, 3, '#2d241c'],
      ['e', 18.8, 27, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 30.8, 27, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['t', 24, 34, 2, 3, '#e07a8a'],
      ['l', 14, 33, 6, 31, '#5c4a3a', 0.9],
      ['l', 14, 35, 6, 36, '#5c4a3a', 0.9],
      ['l', 34, 33, 42, 31, '#5c4a3a', 0.9],
      ['l', 34, 35, 42, 36, '#5c4a3a', 0.9],
      ['e', 17, 44, 4.5, 3.2, '#f0a64a'],
      ['e', 31, 44, 4.5, 3.2, '#f0a64a'],
      ['e', 17, 45, 3, 2, '#ffe8c8'],
      ['e', 31, 45, 3, 2, '#ffe8c8'],
    ],
    dog: [
      ['e', 24, 30, 15, 14, '#c68b52'],
      ['e', 24, 34, 8, 6.5, '#f3ddc4'],
      ['e', 11, 24, 5.5, 9, '#9a6538', -18],
      ['e', 37, 24, 5.5, 9, '#9a6538', 18],
      ['e', 18, 27, 2.3, 3.1, '#2d241c'],
      ['e', 30, 27, 2.3, 3.1, '#2d241c'],
      ['e', 19, 26, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 31, 26, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 24, 33.5, 3.2, 2.4, '#2d241c'],
      ['t', 24, 36, 2, -2, '#e07a8a'],
      ['e', 17, 44, 4.5, 3.2, '#c68b52'],
      ['e', 31, 44, 4.5, 3.2, '#c68b52'],
      ['e', 17, 45, 3, 2, '#f3ddc4'],
      ['e', 31, 45, 3, 2, '#f3ddc4'],
    ],
    rabbit: [
      ['e', 17, 12, 4, 11, '#b8b8c8', -8],
      ['e', 31, 12, 4, 11, '#b8b8c8', 8],
      ['e', 17, 12, 2.2, 7, '#f0b8c8', -8],
      ['e', 31, 12, 2.2, 7, '#f0b8c8', 8],
      ['e', 24, 32, 14, 13, '#b8b8c8'],
      ['e', 24, 34, 9, 8, '#e8e8f0'],
      ['e', 18, 29, 2, 2.8, '#2d241c'],
      ['e', 30, 29, 2, 2.8, '#2d241c'],
      ['e', 18.7, 28.2, 0.6, 0.8, '#ffffff', 0, 0.9],
      ['e', 30.7, 28.2, 0.6, 0.8, '#ffffff', 0, 0.9],
      ['e', 24, 33, 2, 1.5, '#f0b8c8'],
      ['e', 17, 44, 4.5, 3.2, '#b8b8c8'],
      ['e', 31, 44, 4.5, 3.2, '#b8b8c8'],
      ['e', 17, 45, 3, 2, '#e8e8f0'],
      ['e', 31, 45, 3, 2, '#e8e8f0'],
    ],
    owl: [
      ['t', 16, 14.5, 2, 8.5, '#6b5038'],
      ['t', 32, 14.5, 2, 8.5, '#6b5038'],
      ['e', 24, 32, 14, 13, '#8b6b4a'],
      ['e', 24, 30, 11, 10, '#d4c4a8'],
      ['e', 18, 28, 4, 4.5, '#f0e080'],
      ['e', 30, 28, 4, 4.5, '#f0e080'],
      ['e', 18, 28, 2, 2.5, '#2d241c'],
      ['e', 30, 28, 2, 2.5, '#2d241c'],
      ['e', 18.5, 27.2, 0.6, 0.8, '#ffffff', 0, 0.9],
      ['e', 30.5, 27.2, 0.6, 0.8, '#ffffff', 0, 0.9],
      ['t', 24, 34, 2, 3, '#d4a040'],
      ['e', 24, 38, 7, 6, '#c4a882'],
      ['e', 17, 44, 4.5, 3.2, '#8b6b4a'],
      ['e', 31, 44, 4.5, 3.2, '#8b6b4a'],
      ['e', 17, 45, 3, 2, '#c4a882'],
      ['e', 31, 45, 3, 2, '#c4a882'],
    ],
  }

  function buddyPart(part: (string | number)[], k: number) {
    const kind = part[0]
    const n = (i: number) => Number(part[i]) || 0
    if (kind === 'e') {
      const mods = [frame({ width: n(3) * 2 * k, height: n(4) * 2 * k }), foregroundStyle(String(part[5]))]
      if (n(7)) mods.push(opacity(n(7)))
      if (n(6)) mods.push(rotationEffect(n(6)))
      mods.push(offset({ x: (n(1) - n(3)) * k, y: (n(2) - n(4)) * k }))
      return <Ellipse modifiers={mods} />
    }
    if (kind === 'l') {
      const dx = n(3) - n(1)
      const dy = n(4) - n(2)
      const len = Math.sqrt(dx * dx + dy * dy)
      const w = n(6)
      return (
        <Rectangle
          modifiers={[
            frame({ width: len * k, height: w * k }),
            foregroundStyle(String(part[5])),
            rotationEffect((Math.atan2(dy, dx) * 180) / Math.PI),
            offset({ x: ((n(1) + n(3)) / 2 - len / 2) * k, y: ((n(2) + n(4)) / 2 - w / 2) * k }),
          ]}
        />
      )
    }
    // A square turned 45° and stretched is a diamond; the box clips it to
    // the half above (or below) the base line, which is the triangle.
    const half = n(3)
    const tall = Math.abs(n(4))
    const side = half * Math.SQRT2 * k
    const up = n(4) > 0
    return (
      <ZStack
        modifiers={[
          frame({ width: half * 2 * k, height: tall * k }),
          clipped(true),
          offset({ x: (n(1) - half) * k, y: (up ? n(2) - tall : n(2)) * k }),
        ]}
      >
        <Rectangle
          modifiers={[
            frame({ width: side, height: side }),
            foregroundStyle(String(part[5])),
            rotationEffect(45),
            scaleEffect({ x: 1, y: tall / half }),
            offset({ y: ((up ? 1 : -1) * tall * k) / 2 }),
          ]}
        />
      </ZStack>
    )
  }

  function buddyMark(id: string) {
    const parts = BUDDY[id]
    if (!parts) return null
    const w = compact ? 30 : 38
    const k = w / 48
    return (
      <ZStack
        alignment="topLeading"
        modifiers={[
          frame({ width: w, height: 58 * k }),
          offset({ x: compact ? -8 : -10, y: compact ? 8 : 9 }),
        ]}
      >
        {parts.map((part) => buddyPart(part, k))}
      </ZStack>
    )
  }

  function openUriForLead(lampId: string) {
    const face = String(lampId || '').trim()
    if (face) return 'didi://tonight?face=' + encodeURIComponent(face)
    return 'didi://tonight'
  }

  function afterTap(kind: 'did' | 'nope') {
    const status: TonightItem['status'] = kind === 'did' ? 'yes' : 'skip'
    const nextItems = items.map((item) => (item.lampId === leadId ? { ...item, status } : item))
    const nextLead = leadItem(nextItems, '')
    const nextLeft = stackLeft(nextItems)
    const nextQuestion = nextLead ? String(nextLead.question || nextLead.label || '') : ''
    const clearLine = String(props?.clearLabel || props?.footer || 'All clear for tonight.')
    const emptyLine = String(props?.emptyLabel || 'No questions yet.')
    const nextFooter = nextLead ? footer : nextLeft === 0 ? (nextItems.length ? clearLine : emptyLine) : footer
    return {
      ...props,
      items: nextItems,
      leadLampId: nextLead ? nextLead.lampId : '',
      question: nextQuestion,
      tagTitle: String(nextLead?.tag || '').trim() || tagTitle,
      left: nextLeft,
      footer: nextFooter,
      openUri: openUriForLead(nextLead ? nextLead.lampId : ''),
    }
  }

  // Next steps through the open questions, or the did-nots once none are
  // open. It only moves the card; it never answers (peekNextTonightCard).
  const openItems = items.filter((item) => item.status === 'open')
  const browsable = openItems.length ? openItems : items.filter((item) => item.status === 'skip')

  function afterNext() {
    if (browsable.length < 2) return props
    const at = lead
      ? browsable.findIndex(
          (item) => item.lampId === lead.lampId && String(item.periodKey || '') === String(lead.periodKey || ''),
        )
      : -1
    const next = browsable[((at === -1 ? 0 : at) + 1) % browsable.length]
    return {
      ...props,
      leadLampId: next.lampId,
      question: String(next.question || next.label || ''),
      tagTitle: String(next.tag || '').trim() || tagTitle,
      openUri: openUriForLead(next.lampId),
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
  const home = family !== 'accessoryRectangular'
  const showNext = home && Boolean(lead) && browsable.length > 1
  // The tag of the question showing, since the card mixes every tag.
  const leadTag = String(lead?.tag || '').trim() || tagTitle
  const sidePad = home && (showNext || BUDDY[buddyId]) ? (compact ? 38 : 52) : 0
  const kicker = (
    <Text
      modifiers={[
        font({ size: 11, weight: 'semibold' }),
        kerning(1.1),
        textCase('uppercase'),
        foregroundStyle(on),
        multilineTextAlignment('center'),
        lineLimit(1),
        minimumScaleFactor(0.8),
        padding({ leading: sidePad, trailing: sidePad, top: compact && showNext ? 26 : 0 }),
        frame({ maxWidth: 10000 }),
      ]}
    >
      {leadTag}
    </Text>
  )
  // Shrinks to fit the card instead of cutting off mid-line (Android's fitQuestion).
  const question = (
    <Text
      modifiers={[
        font({ weight: 'bold', size: titleSize }),
        foregroundStyle(ink),
        multilineTextAlignment('center'),
        lineLimit(compact ? 4 : 5),
        minimumScaleFactor(0.45),
        allowsTightening(true),
        frame({ maxWidth: 10000 }),
      ]}
    >
      {lead ? questionText : footer}
    </Text>
  )
  const nextPill = showNext ? (
    <VStack alignment="leading" modifiers={[grow, padding({ leading: compact ? 8 : 10, top: compact ? 8 : 9 })]}>
      <HStack>
        <Button
          label={String(props?.nextLabel || 'Next') + ' ›'}
          target={'next:' + leadId}
          onPress={() => afterNext()}
          modifiers={[
            buttonStyle('bordered'),
            buttonBorderShape('capsule'),
            tint(c.on),
            font({ size: compact ? 10 : 11, weight: 'bold' }),
            foregroundStyle(on),
          ]}
        />
        <Spacer />
      </HStack>
      <Spacer />
    </VStack>
  ) : null
  const buttons = lead ? (
    <HStack spacing={compact ? 4 : 8} modifiers={[frame({ maxWidth: 10000 })]}>
      <Button
        label={nopeLabel}
        target={'nope:' + leadId}
        onPress={() => afterTap('nope')}
        modifiers={[
          buttonStyle('borderedProminent'),
          buttonBorderShape('roundedRectangle', 12),
          tint(c.skip),
          font({ size: compact ? 12 : 15, weight: 'bold' }),
          foregroundStyle(ink),
          controlSize(compact ? 'small' : 'regular'),
          lineLimit(1),
          minimumScaleFactor(0.7),
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
          font({ size: compact ? 12 : 15, weight: 'bold' }),
          foregroundStyle(c.bg),
          controlSize(compact ? 'small' : 'regular'),
          lineLimit(1),
          minimumScaleFactor(0.7),
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
    <VStack modifiers={[padding({ all: compact ? 2 : 10 }), containerBackground(gem ? c.bg : c.panel, 'widget'), widgetURL(openUri), fill]}>
      <VStack
        modifiers={[
          padding({ all: 2 }),
          background(c.on),
          clipShape('roundedRectangle', 22),
          grow,
          clipped(true),
        ]}
      >
        <ZStack alignment="topTrailing" modifiers={[grow]}>
          <VStack
            alignment="center"
            spacing={8}
            modifiers={[
              padding({ horizontal: compact ? 6 : 14, vertical: compact ? 8 : 12 }),
              background(c.panel),
              clipShape('roundedRectangle', 20),
              grow,
              clipped(true),
            ]}
          >
            {kicker}
            <Spacer />
            {question}
            <Spacer />
            {buttons}
          </VStack>
          {buddyMark(buddyId)}
          {nextPill}
        </ZStack>
      </VStack>
    </VStack>
  )
}

const widget = createWidget<DidITonightWidgetProps>('DidITonight', DidITonightWidget)
export default widget
