import { AccessoryWidgetBackground, Button, Ellipse, HStack, Rectangle, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui'
import {
  allowsTightening,
  background,
  buttonBorderShape,
  buttonStyle,
  clipShape,
  clipped,
  containerBackground,
  containerRelativeFrame,
  containerShape,
  controlSize,
  font,
  foregroundStyle,
  frame,
  tint,
  kerning,
  layoutPriority,
  lineLimit,
  minimumScaleFactor,
  multilineTextAlignment,
  offset,
  opacity,
  padding,
  rotationEffect,
  scaleEffect,
  strokeBorder,
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
  // Did we, one line: "Did we · waiting on Sam". Medium and large only.
  weLine?: string
  // Gentle mode. The widget shows no streak numbers today; keep it that way when set.
  gentle?: boolean
  // What the buddy has on, as shapes (src/lib/accessory-shapes.js).
  buddyShapes?: { behind?: (string | number)[][]; front?: (string | number)[][] } | null
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

  const items = Array.isArray(props?.items) ? props.items.filter((item) => item && typeof item === 'object') : []
  const tagTitle = String(props?.tagTitle || 'Tonight')
  const footer = String(props?.footer || 'No questions yet')
  const left = Number(props?.left) || 0
  const openUri = String(props?.openUri || 'didi://tonight')
  // A colour that is missing or not a string falls back, so a look (gem or
  // not) can never take the whole card down.
  const c: WidgetColors = { ...FALLBACK }
  try {
    const given = props?.colors && typeof props.colors === 'object' ? props.colors : {}
    for (const key of Object.keys(FALLBACK) as (keyof WidgetColors)[]) {
      const value = (given as Record<string, unknown>)[key]
      if (typeof value === 'string' && value) (c as Record<string, unknown>)[key] = value
    }
    c.gem = Boolean((given as WidgetColors).gem)
  } catch {
    c.gem = false
  }
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
  const nopeLabel = String(props?.nopeLabel || 'Not yet')
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
    ant: [
      ['l', 20, 15, 17, 8, '#7a3526', 1.4],
      ['l', 17, 8, 12, 6, '#7a3526', 1.4],
      ['l', 28, 15, 31, 8, '#7a3526', 1.4],
      ['l', 31, 8, 36, 6, '#7a3526', 1.4],
      ['e', 12, 6, 1.4, 1.4, '#7a3526'],
      ['e', 36, 6, 1.4, 1.4, '#7a3526'],
      ['l', 20, 29, 12, 25, '#7a3526', 1.5],
      ['l', 12, 25, 8, 28, '#7a3526', 1.5],
      ['l', 19.5, 31, 11, 32.5, '#7a3526', 1.5],
      ['l', 11, 32.5, 7, 37, '#7a3526', 1.5],
      ['l', 20, 33, 13, 38, '#7a3526', 1.5],
      ['l', 13, 38, 10, 44, '#7a3526', 1.5],
      ['l', 28, 29, 36, 25, '#7a3526', 1.5],
      ['l', 36, 25, 40, 28, '#7a3526', 1.5],
      ['l', 28.5, 31, 37, 32.5, '#7a3526', 1.5],
      ['l', 37, 32.5, 41, 37, '#7a3526', 1.5],
      ['l', 28, 33, 35, 38, '#7a3526', 1.5],
      ['l', 35, 38, 38, 44, '#7a3526', 1.5],
      ['e', 24, 43, 9, 8, '#9c4431'],
      ['l', 16.5, 41, 31.5, 41, '#7a3526', 1.1],
      ['l', 16, 45, 32, 45, '#7a3526', 1.1],
      ['e', 20.5, 39.5, 2.6, 1.5, '#ffffff', 0, 0.2],
      ['e', 24, 31, 5, 4.5, '#b5533c'],
      ['e', 24, 20, 8.5, 7.5, '#b5533c'],
      ['e', 21, 16.8, 2.2, 1.2, '#ffffff', 0, 0.25],
      ['e', 19.6, 19.8, 2.4, 2.8, '#2d241c'],
      ['e', 28.4, 19.8, 2.4, 2.8, '#2d241c'],
      ['e', 20.2, 19, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 29, 19, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 22.2, 26.4, 1.3, 0.9, '#7a3526'],
      ['e', 25.8, 26.4, 1.3, 0.9, '#7a3526'],
    ],
    possum: [
      ['l', 37, 41, 43, 38, '#f2a7b4', 2.2],
      ['l', 43, 38, 43.5, 33, '#f2a7b4', 2.2],
      ['e', 13, 19, 5, 5.5, '#3a3438'],
      ['e', 35, 19, 5, 5.5, '#3a3438'],
      ['e', 13, 19.5, 3, 3.4, '#f2a7b4'],
      ['e', 35, 19.5, 3, 3.4, '#f2a7b4'],
      ['e', 24, 32, 15, 13.5, '#9b98a3'],
      ['e', 24, 29, 10.5, 9, '#f4f1ec'],
      ['e', 24, 34.5, 5.5, 4.2, '#f4f1ec'],
      ['e', 19, 28, 3.2, 3.6, '#5b5660'],
      ['e', 29, 28, 3.2, 3.6, '#5b5660'],
      ['e', 19, 28, 1.9, 2.3, '#1f1a1e'],
      ['e', 29, 28, 1.9, 2.3, '#1f1a1e'],
      ['e', 19.6, 27.2, 0.6, 0.8, '#ffffff', 0, 0.9],
      ['e', 29.6, 27.2, 0.6, 0.8, '#ffffff', 0, 0.9],
      ['e', 24, 37.2, 1.9, 1.4, '#e07a8a'],
      ['e', 15, 33.5, 2.2, 1.3, '#f59aa8', 0, 0.6],
      ['e', 33, 33.5, 2.2, 1.3, '#f59aa8', 0, 0.6],
      ['e', 17, 44, 4.5, 3.2, '#9b98a3'],
      ['e', 31, 44, 4.5, 3.2, '#9b98a3'],
      ['e', 17, 45, 3, 2, '#f2a7b4'],
      ['e', 31, 45, 3, 2, '#f2a7b4'],
    ],
    // The smile is a curve in the SVG; two short lines here.
    frog: [
      ['e', 16, 20, 7, 6.5, '#72c45e'],
      ['e', 32, 20, 7, 6.5, '#72c45e'],
      ['e', 24, 32, 16, 13, '#72c45e'],
      ['e', 24, 37, 10, 7, '#e4f4c4'],
      ['e', 11, 35, 1.8, 1.3, '#4e9a42'],
      ['e', 37, 34, 1.6, 1.2, '#4e9a42'],
      ['e', 16, 19, 4.6, 4.6, '#ffffff'],
      ['e', 32, 19, 4.6, 4.6, '#ffffff'],
      ['e', 16.6, 19.6, 2.2, 2.8, '#2d241c'],
      ['e', 31.4, 19.6, 2.2, 2.8, '#2d241c'],
      ['e', 17.3, 18.6, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 32.1, 18.6, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 22.5, 27.5, 0.6, 0.45, '#2f5a28'],
      ['e', 25.5, 27.5, 0.6, 0.45, '#2f5a28'],
      ['l', 17, 30, 24, 32.8, '#2f5a28', 1.3],
      ['l', 24, 32.8, 31, 30, '#2f5a28', 1.3],
      ['e', 12.5, 30.5, 2.4, 1.4, '#f59aa8', 0, 0.75],
      ['e', 35.5, 30.5, 2.4, 1.4, '#f59aa8', 0, 0.75],
      ['e', 17, 44, 4.5, 3.2, '#72c45e'],
      ['e', 31, 44, 4.5, 3.2, '#72c45e'],
      ['e', 17, 45, 3, 2, '#e4f4c4'],
      ['e', 31, 45, 3, 2, '#e4f4c4'],
    ],
    penguin: [
      ['e', 11, 33, 3.4, 8, '#344157', 22],
      ['e', 37, 33, 3.4, 8, '#344157', -22],
      ['e', 24, 31, 14.5, 15, '#344157'],
      ['e', 19.5, 27, 6.2, 6.8, '#f7f5f0'],
      ['e', 28.5, 27, 6.2, 6.8, '#f7f5f0'],
      ['e', 24, 37.5, 9, 7.5, '#f7f5f0'],
      ['e', 20.5, 18.5, 2.6, 1.4, '#ffffff', 0, 0.2],
      ['e', 19.8, 26.5, 2.2, 2.8, '#2d241c'],
      ['e', 28.2, 26.5, 2.2, 2.8, '#2d241c'],
      ['e', 20.5, 25.6, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 28.9, 25.6, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['t', 24, 30.5, 2.5, -3.5, '#f5a524'],
      ['e', 15.5, 31.5, 2.2, 1.3, '#f59aa8', 0, 0.7],
      ['e', 32.5, 31.5, 2.2, 1.3, '#f59aa8', 0, 0.7],
      ['e', 17, 45, 4.5, 2.8, '#f5a524'],
      ['e', 31, 45, 4.5, 2.8, '#f5a524'],
      ['e', 17, 45.6, 2.8, 1.5, '#ffc766'],
      ['e', 31, 45.6, 2.8, 1.5, '#ffc766'],
    ],
    fox: [
      ['e', 36.5, 41.5, 9, 4.6, '#e8743b', -32],
      ['e', 42.8, 37.2, 3.3, 2.6, '#fff6ea', -32],
      ['t', 15.5, 21, 5, 12, '#e8743b'],
      ['t', 32.5, 21, 5, 12, '#e8743b'],
      ['t', 15.7, 20, 2.6, 7, '#3a2a22'],
      ['t', 32.3, 20, 2.6, 7, '#3a2a22'],
      ['e', 24, 31, 14.5, 14, '#e8743b'],
      ['e', 17, 34.5, 5.6, 4.4, '#fff6ea'],
      ['e', 31, 34.5, 5.6, 4.4, '#fff6ea'],
      ['e', 24, 38, 7.5, 6, '#fff6ea'],
      ['e', 19.8, 27.5, 2.2, 2.8, '#2d241c'],
      ['e', 28.2, 27.5, 2.2, 2.8, '#2d241c'],
      ['e', 20.5, 26.6, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 28.9, 26.6, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 24, 32.6, 1.7, 1.2, '#2d241c'],
      ['e', 14.5, 31.8, 2.2, 1.3, '#f59aa8', 0, 0.7],
      ['e', 33.5, 31.8, 2.2, 1.3, '#f59aa8', 0, 0.7],
      ['e', 17, 45, 4.5, 2.8, '#3a2a22'],
      ['e', 31, 45, 4.5, 2.8, '#3a2a22'],
    ],
    // Curved stripes and antennae are paths in the SVG; bars and lines here.
    hive: [
      ['e', 11, 18, 6, 8, '#8fb8d4', -25],
      ['e', 37, 18, 6, 8, '#8fb8d4', 25],
      ['e', 11, 18, 5.2, 7.2, '#dff3ff', -25],
      ['e', 37, 18, 5.2, 7.2, '#dff3ff', 25],
      ['l', 19, 17, 15.5, 11, '#2b2018', 1.4],
      ['l', 15.5, 11, 13, 8, '#2b2018', 1.4],
      ['l', 29, 17, 32.5, 11, '#2b2018', 1.4],
      ['l', 32.5, 11, 35, 8, '#2b2018', 1.4],
      ['e', 13, 8, 2.2, 2.2, '#2b2018'],
      ['e', 35, 8, 2.2, 2.2, '#2b2018'],
      ['e', 24, 31, 15, 14, '#f6c443'],
      ['r', 10.5, 35.6, 27, 3.6, '#2b2018', 1.8],
      ['r', 13, 41.6, 22, 2.8, '#2b2018', 1.4],
      ['e', 18, 27, 2.3, 3.1, '#2d241c'],
      ['e', 30, 27, 2.3, 3.1, '#2d241c'],
      ['e', 18.8, 26, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 30.8, 26, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 14, 32, 2.4, 1.5, '#f08a7a', 0, 0.55],
      ['e', 34, 32, 2.4, 1.5, '#f08a7a', 0, 0.55],
      ['l', 22, 31.5, 24, 32.6, '#2b2018', 1],
      ['l', 24, 32.6, 26, 31.5, '#2b2018', 1],
      ['e', 17, 47, 4.2, 2.8, '#2b2018'],
      ['e', 31, 47, 4.2, 2.8, '#2b2018'],
    ],
  }

  function buddyPart(part: (string | number)[], k: number) {
    const kind = part[0]
    const n = (i: number) => Number(part[i]) || 0
    if (kind === 'r') {
      const mods = [frame({ width: n(3) * k, height: n(4) * k }), foregroundStyle(String(part[5]))]
      if (n(7)) mods.push(rotationEffect(n(7)))
      mods.push(offset({ x: n(1) * k, y: n(2) * k }))
      return <RoundedRectangle cornerRadius={n(6) * k} modifiers={mods} />
    }
    if (kind === 'o') {
      return (
        <Ellipse
          modifiers={[
            frame({ width: n(3) * 2 * k, height: n(4) * 2 * k }),
            foregroundStyle('transparent'),
            strokeBorder({ content: String(part[5]), style: { lineWidth: n(6) * k }, shape: 'ellipse' }),
            offset({ x: (n(1) - n(3)) * k, y: (n(2) - n(4)) * k }),
          ]}
        />
      )
    }
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
    // Accessories are drawn one by one; a bad one is left off.
    const worn = (list: unknown) =>
      (Array.isArray(list) ? list : [])
        .map((part) => {
          try {
            return Array.isArray(part) ? buddyPart(part, k) : null
          } catch {
            return null
          }
        })
        .filter(Boolean)
    // If the buddy itself cannot be drawn, the card goes on without it.
    try {
      return (
        <ZStack
          alignment="topLeading"
          modifiers={[
            frame({ width: w, height: 58 * k }),
            offset({ x: compact ? -8 : -10, y: compact ? 8 : 9 }),
          ]}
        >
          {worn(props?.buddyShapes?.behind)}
          {parts.map((part) => buddyPart(part, k))}
          {worn(props?.buddyShapes?.front)}
        </ZStack>
      )
    } catch {
      return null
    }
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
    const clearLine = String(props?.clearLabel || props?.footer || 'All clear for tonight')
    const emptyLine = String(props?.emptyLabel || 'No questions yet')
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

  // The lock screen circle draws in the system's own tint, so it uses the
  // system disc and a centered number. The old top-left frame put the number
  // in the corner the circle clips away, which left it blank.
  if (family === 'accessoryCircular') {
    // No snapshot yet (the widget gallery): the app's question marks, not a check.
    const glyph = left > 0 ? String(left) : items.length ? '✓' : '???'
    return (
      <ZStack modifiers={[containerBackground(c.panel, 'widget'), widgetURL(openUri), grow]}>
        <AccessoryWidgetBackground />
        <Text
          modifiers={[
            font({ weight: 'bold', size: left > 9 || !items.length ? 18 : 24 }),
            foregroundStyle(ink),
            lineLimit(1),
            minimumScaleFactor(0.5),
          ]}
        >
          {glyph}
        </Text>
      </ZStack>
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
  const titleSize = compact ? 18 : family === 'systemMedium' ? 24 : 28
  const home = family !== 'accessoryRectangular'
  const showNext = home && Boolean(lead) && browsable.length > 1
  // The tag of the question showing, since the card mixes every tag.
  // Size follows the widget family. WidgetKit cannot scroll, so a long tag
  // wraps on the small card and shrinks instead of turning into an ellipsis.
  const leadTag = String(lead?.tag || '').trim() || tagTitle
  const tagSize = family === 'systemMedium' ? 13 : compact ? 11 : 16
  const kicker = (
    <Text
      modifiers={[
        font({ size: tagSize, weight: 'semibold' }),
        kerning(tagSize >= 16 ? 1.1 : tagSize >= 13 ? 0.6 : 0.2),
        textCase('uppercase'),
        foregroundStyle(on),
        multilineTextAlignment('center'),
        lineLimit(compact ? 2 : 1),
        minimumScaleFactor(0.45),
        allowsTightening(true),
        layoutPriority(1),
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
        lineLimit(compact ? 5 : 6),
        minimumScaleFactor(0.35),
        allowsTightening(true),
        frame({ maxWidth: 10000 }),
      ]}
    >
      {lead ? questionText : footer}
    </Text>
  )
  const nextButton = showNext ? (
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

  // The Did we line is extra; if it cannot be drawn, the card goes on without it.
  let weRow = null
  try {
    const weText = compact ? '' : String(props?.weLine || '').trim()
    weRow = weText ? (
      <Text
        modifiers={[
          font({ size: 11, weight: 'semibold' }),
          foregroundStyle(on),
          multilineTextAlignment('center'),
          lineLimit(1),
          minimumScaleFactor(0.6),
          frame({ maxWidth: 10000 }),
        ]}
      >
        {weText}
      </Text>
    ) : null
  } catch {
    weRow = null
  }

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
    <VStack
      modifiers={[
        containerBackground(gem ? c.bg : c.panel, 'widget'),
        containerShape({ shape: 'containerRelativeShape' }),
        widgetURL(openUri),
        fill,
      ]}
    >
      <ZStack alignment="topTrailing" modifiers={[grow]}>
        <VStack
          alignment="center"
          spacing={compact ? 6 : 8}
          modifiers={[
            padding({ horizontal: compact ? 8 : 14, vertical: compact ? 8 : 12 }),
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
          <HStack
            spacing={compact ? 4 : 8}
            modifiers={[
              frame({ maxWidth: 10000 }),
              padding({ trailing: BUDDY[buddyId] ? (compact ? 22 : 32) : 0 }),
            ]}
          >
            {nextButton}
            {kicker}
          </HStack>
          <Spacer />
          {question}
          <Spacer />
          {buttons}
          {weRow}
        </VStack>
        {buddyMark(buddyId)}
      </ZStack>
    </VStack>
  )
}

const widget = createWidget<DidITonightWidgetProps>('DidITonight', DidITonightWidget)
export default widget
