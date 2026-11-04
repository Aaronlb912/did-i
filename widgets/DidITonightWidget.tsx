import { AccessoryWidgetBackground, Button, Ellipse, HStack, Rectangle, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui'
import {
  accessibilityLabel,
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
  // Every so often: "Last time: 6 days ago" or "Never yet".
  since?: string
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
  // The showing question's "Last time" line (every so often only), or ''.
  sinceLine?: string
  leadLampId?: string
  // The lead's night, so a question shown twice (last night and tonight)
  // points at one card. Older props have none and match on lampId alone.
  leadNight?: string
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
  // The buddy's own shapes (src/lib/buddy-parts.js), for a buddy newer than
  // this build's BUDDY table.
  buddyParts?: (string | number)[][] | null
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

  function leadItem(items: TonightItem[], leadLampId?: string, leadNight?: string) {
    const hasOpen = items.some((item) => item.status === 'open')
    const id = String(leadLampId || '').trim()
    const night = String(leadNight || '').trim()
    if (id) {
      const hit = items.find(
        (item) =>
          item.lampId === id &&
          (!night || String(item.periodKey || '') === night) &&
          (item.status === 'open' || (!hasOpen && item.status === 'skip')),
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
  const tagTitle = String(props?.tagTitle || 'Today')
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

  const lead = leadItem(items, props?.leadLampId, props?.leadNight)
  // The text comes from the question the buttons answer: a later timeline
  // entry can keep an old lead whose night was already answered.
  const sameLead = !!lead && lead.lampId === props?.leadLampId && (!props?.leadNight || String(lead.periodKey || '') === props.leadNight)
  const questionText = (sameLead ? String(props?.question || '').trim() : '') || String(lead?.question || lead?.label || '') || footer
  const didLabel = String(props?.didLabel || 'Did')
  const nopeLabel = String(props?.nopeLabel || 'Not yet')
  const leadId = String(lead?.lampId || '')
  const gentle = props?.gentle === true
  const leadNight = String(lead?.periodKey || '')
  // The night rides along so a "Last night" card answers last night.
  const leadTarget = leadNight ? leadId + '|' + leadNight : leadId
  const sinceText = lead
    ? String(lead.since || (lead.lampId === props?.leadLampId ? props?.sinceLine : '') || '').trim()
    : ''
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
    // The shell is a triangle on a flat oval; mouth and whiskers are lines.
    otter: [
      ['e', 11, 22, 4, 3.6, '#8a5a36'],
      ['e', 37, 22, 4, 3.6, '#8a5a36'],
      ['e', 24, 31, 15, 14, '#a06a40'],
      ['e', 24, 34, 10, 8.5, '#f1dcc0'],
      ['e', 18, 27, 2.3, 3.1, '#2d241c'],
      ['e', 30, 27, 2.3, 3.1, '#2d241c'],
      ['e', 18.8, 26, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 30.8, 26, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 24, 31.5, 2.6, 1.9, '#2b2018'],
      ['l', 21.5, 34, 24, 35.2, '#2b2018', 1],
      ['l', 24, 35.2, 26.5, 34, '#2b2018', 1],
      ['l', 17, 33, 11, 32, '#7a5038', 0.7],
      ['l', 31, 33, 37, 32, '#7a5038', 0.7],
      ['t', 24, 41, 5.4, 4.4, '#d98aa0'],
      ['e', 24, 41.4, 5.4, 1.9, '#d98aa0'],
      ['t', 24, 41, 4.6, 3.6, '#f6b8c4'],
      ['e', 24, 41.3, 4.6, 1.4, '#f6b8c4'],
      ['l', 24, 38, 24, 42.2, '#d98aa0', 0.6],
      ['e', 17, 44, 4.5, 3.2, '#8a5a36'],
      ['e', 31, 44, 4.5, 3.2, '#8a5a36'],
    ],
    // The spiky outline is a polygon in the SVG; one turned oval per spike here.
    hedgehog: [
      ['e', 8.5, 32.64, 2.3, 3.6, '#7a5a46', -96.36],
      ['e', 8.79, 27.69, 2.3, 3.6, '#7a5a46', -77.09],
      ['e', 10.8, 23.12, 2.3, 3.6, '#7a5a46', -57.82],
      ['e', 14.28, 19.42, 2.3, 3.6, '#7a5a46', -38.55],
      ['e', 18.85, 17.03, 2.3, 3.6, '#7a5a46', -19.27],
      ['e', 24, 16.2, 2.3, 3.6, '#7a5a46'],
      ['e', 29.15, 17.03, 2.3, 3.6, '#7a5a46', 19.27],
      ['e', 33.72, 19.42, 2.3, 3.6, '#7a5a46', 38.55],
      ['e', 37.2, 23.12, 2.3, 3.6, '#7a5a46', 57.82],
      ['e', 39.21, 27.69, 2.3, 3.6, '#7a5a46', 77.09],
      ['e', 39.5, 32.64, 2.3, 3.6, '#7a5a46', 96.36],
      ['e', 24, 31, 15, 14, '#8f6a52'],
      ['l', 16, 21.5, 14.6, 19.4, '#b08a6c', 0.9],
      ['l', 20.3, 19.4, 19.6, 17.1, '#b08a6c', 0.9],
      ['l', 24, 18.8, 24, 16.4, '#b08a6c', 0.9],
      ['l', 27.7, 19.4, 28.4, 17.1, '#b08a6c', 0.9],
      ['l', 32, 21.5, 33.4, 19.4, '#b08a6c', 0.9],
      ['e', 13.6, 25, 2.6, 2.4, '#e8b89a'],
      ['e', 34.4, 25, 2.6, 2.4, '#e8b89a'],
      ['e', 24, 34, 12, 10.5, '#f3d9b6'],
      ['e', 18.5, 29, 2.2, 2.9, '#2d241c'],
      ['e', 29.5, 29, 2.2, 2.9, '#2d241c'],
      ['e', 19.2, 28, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 30.2, 28, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 24, 33, 2.2, 1.6, '#2b2018'],
      ['l', 22, 35.4, 24, 36.2, '#2b2018', 1],
      ['l', 24, 36.2, 26, 35.4, '#2b2018', 1],
      ['e', 14.8, 33.2, 2.2, 1.3, '#f59aa8', 0, 0.7],
      ['e', 33.2, 33.2, 2.2, 1.3, '#f59aa8', 0, 0.7],
      ['e', 17, 45, 4.5, 2.8, '#c48f72'],
      ['e', 31, 45, 4.5, 2.8, '#c48f72'],
    ],
    panda: [
      ['e', 12.5, 19.5, 4.8, 4.6, '#2f2c33'],
      ['e', 35.5, 19.5, 4.8, 4.6, '#2f2c33'],
      ['e', 24, 31, 15, 14, '#f4f1ea'],
      ['e', 11, 38.5, 3.6, 5.4, '#2f2c33', 28],
      ['e', 37, 38.5, 3.6, 5.4, '#2f2c33', -28],
      ['e', 18, 28.2, 3.9, 4.9, '#2f2c33', 32],
      ['e', 30, 28.2, 3.9, 4.9, '#2f2c33', -32],
      ['e', 18.4, 27.6, 1.9, 2.3, '#0f0d11'],
      ['e', 29.6, 27.6, 1.9, 2.3, '#0f0d11'],
      ['e', 19.1, 26.7, 0.75, 0.95, '#ffffff', 0, 0.95],
      ['e', 30.3, 26.7, 0.75, 0.95, '#ffffff', 0, 0.95],
      ['e', 24, 33.4, 2.1, 1.5, '#2f2c33'],
      ['l', 22, 35.4, 24, 36.2, '#2f2c33', 1],
      ['l', 24, 36.2, 26, 35.4, '#2f2c33', 1],
      ['e', 13.6, 34, 2.2, 1.3, '#f59aa8', 0, 0.7],
      ['e', 34.4, 34, 2.2, 1.3, '#f59aa8', 0, 0.7],
      ['e', 17, 45, 4.5, 2.8, '#2f2c33'],
      ['e', 31, 45, 4.5, 2.8, '#2f2c33'],
    ],
    // Tuft, wings, beak and feet are paths in the SVG; triangles, ovals and bars here.
    duck: [
      ['t', 25.4, 17, 2.4, 9, '#ffd34d'],
      ['t', 28.8, 16, 1.9, 8, '#ffd34d'],
      ['e', 24, 31, 15, 14, '#ffd34d'],
      ['e', 9.2, 36.2, 2.4, 3.4, '#f3bd2e', 35],
      ['e', 38.8, 36.2, 2.4, 3.4, '#f3bd2e', -35],
      ['e', 24, 36, 9, 6.5, '#fff1b8'],
      ['e', 18, 26, 2.3, 3.1, '#2d241c'],
      ['e', 30, 26, 2.3, 3.1, '#2d241c'],
      ['e', 18.8, 25, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 30.8, 25, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 24, 31.3, 6, 2.5, '#e07a22'],
      ['e', 24, 31.3, 5.3, 1.9, '#ff9a3c'],
      ['e', 13.5, 31, 2.4, 1.5, '#f08a7a', 0, 0.55],
      ['e', 34.5, 31, 2.4, 1.5, '#f08a7a', 0, 0.55],
      ['r', 13, 43, 9, 4, '#ff9a3c', 1.5],
      ['r', 26, 43, 9, 4, '#ff9a3c', 1.5],
    ],
    // Each gill frond is a turned oval with its vein as a line.
    axolotl: [
      ['e', 24, 43, 8.5, 6, '#ffc2d4'],
      ['e', 24, 44, 5, 3.6, '#ffe6ee'],
      ['e', 35.2, 43.4, 4.4, 2, '#f2a4bd', -28],
      ['e', 5.86, 17.65, 4.2, 2.25, '#ff6f91', -150],
      ['e', 4.54, 24.84, 4.46, 2.25, '#ff6f91', -178],
      ['e', 6.02, 32.1, 3.94, 2.25, '#ff6f91', 152],
      ['e', 42.14, 17.65, 4.2, 2.25, '#ff6f91', -30],
      ['e', 43.46, 24.84, 4.46, 2.25, '#ff6f91', -2],
      ['e', 41.98, 32.1, 3.94, 2.25, '#ff6f91', 28],
      ['l', 8.46, 19.15, 3.78, 16.45, '#ea527a', 1],
      ['l', 7.8, 24.96, 1.88, 24.75, '#ea527a', 1],
      ['l', 8.44, 30.81, 4.14, 33.1, '#ea527a', 1],
      ['l', 39.54, 19.15, 44.22, 16.45, '#ea527a', 1],
      ['l', 40.2, 24.96, 46.12, 24.75, '#ea527a', 1],
      ['l', 39.56, 30.81, 43.86, 33.1, '#ea527a', 1],
      ['e', 24, 26, 15.5, 13.5, '#ffc2d4'],
      ['e', 24, 30.5, 10, 6.5, '#ffe6ee', 0, 0.6],
      ['e', 18, 26, 2.7, 3.19, '#1f1a1e'],
      ['e', 30, 26, 2.7, 3.19, '#1f1a1e'],
      ['e', 18.81, 24.92, 0.86, 1.03, '#ffffff', 0, 0.95],
      ['e', 30.81, 24.92, 0.86, 1.03, '#ffffff', 0, 0.95],
      ['l', 21, 31, 22.5, 32.1, '#2d1a20', 1.15],
      ['l', 22.5, 32.1, 24, 31, '#2d1a20', 1.15],
      ['l', 24, 31, 25.5, 32.1, '#2d1a20', 1.15],
      ['l', 25.5, 32.1, 27, 31, '#2d1a20', 1.15],
      ['e', 12.5, 31, 2.3, 1.4, '#ff6f91', 0, 0.55],
      ['e', 35.5, 31, 2.3, 1.4, '#ff6f91', 0, 0.55],
      ['e', 19, 48.5, 3, 2, '#f2a4bd'],
      ['e', 29, 48.5, 3, 2, '#f2a4bd'],
    ],
    // The shell's six-sided plates are ovals here.
    turtle: [
      ['e', 17, 46, 4.5, 3, '#8fd27a'],
      ['e', 31, 46, 4.5, 3, '#8fd27a'],
      ['e', 24, 36, 16.5, 11.5, '#6e4f27'],
      ['e', 24, 35.6, 14.6, 10, '#a0753e'],
      ['e', 24, 40, 6, 3.4, '#c99f62'],
      ['e', 13.8, 35.6, 2.6, 5, '#c99f62', 12],
      ['e', 34.2, 35.6, 2.6, 5, '#c99f62', -12],
      ['e', 24, 25, 11.2, 10, '#9edb86'],
      ['e', 19.5, 25, 2.2, 2.8, '#2d241c'],
      ['e', 28.5, 25, 2.2, 2.8, '#2d241c'],
      ['e', 20.2, 24.1, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 29.2, 24.1, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['l', 21.8, 29.4, 24, 30.3, '#2f5a28', 1],
      ['l', 24, 30.3, 26.2, 29.4, '#2f5a28', 1],
      ['e', 15.8, 28.6, 2.1, 1.2, '#f59aa8', 0, 0.7],
      ['e', 32.2, 28.6, 2.1, 1.2, '#f59aa8', 0, 0.7],
    ],
    // Antlers are lines behind the head; hats sit in front of their bases.
    reindeer: [
      ['l', 18, 18, 14, 9, '#c9a06a', 1.8],
      ['l', 15.6, 12.6, 11, 11.4, '#c9a06a', 1.6],
      ['l', 30, 18, 34, 9, '#c9a06a', 1.8],
      ['l', 32.4, 12.6, 37, 11.4, '#c9a06a', 1.6],
      ['e', 10.5, 23, 5, 2.6, '#a8703f', 28],
      ['e', 37.5, 23, 5, 2.6, '#a8703f', -28],
      ['e', 11, 23.2, 3, 1.3, '#f3d9b6', 28],
      ['e', 37, 23.2, 3, 1.3, '#f3d9b6', -28],
      ['e', 24, 31, 15, 14, '#a8703f'],
      ['e', 24, 36, 9, 7, '#f0d6b0'],
      ['e', 19.5, 27, 2.2, 2.8, '#2d241c'],
      ['e', 28.5, 27, 2.2, 2.8, '#2d241c'],
      ['e', 20.2, 26.1, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 29.2, 26.1, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 24, 33.2, 2.3, 1.6, '#c4525a'],
      ['e', 14.8, 32, 2.2, 1.3, '#f59aa8', 0, 0.7],
      ['e', 33.2, 32, 2.2, 1.3, '#f59aa8', 0, 0.7],
      ['e', 17, 45, 4.5, 2.8, '#5a3a22'],
      ['e', 31, 45, 4.5, 2.8, '#5a3a22'],
    ],
    // Two snowballs: a blue-gray one under each white one is its shade.
    snowman: [
      ['l', 13.5, 34, 5, 28, '#7a5a3c', 1.4],
      ['l', 7.6, 29.8, 7, 26.6, '#7a5a3c', 1.1],
      ['l', 34.5, 34, 43, 28, '#7a5a3c', 1.4],
      ['l', 40.4, 29.8, 41, 26.6, '#7a5a3c', 1.1],
      ['e', 24, 38.8, 14, 9.4, '#b9c8d8'],
      ['e', 24, 38.2, 13.2, 8.6, '#f4f7fa'],
      ['e', 24, 24.5, 10.4, 9.8, '#b9c8d8'],
      ['e', 24, 24.1, 9.6, 9.1, '#f4f7fa'],
      ['e', 20.5, 18.6, 2.4, 1.3, '#ffffff', 0, 0.8],
      ['e', 20, 23, 2.2, 2.8, '#2d241c'],
      ['e', 28, 23, 2.2, 2.8, '#2d241c'],
      ['e', 20.7, 22.1, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 28.7, 22.1, 0.7, 0.9, '#ffffff', 0, 0.9],
      ['e', 26.6, 27.4, 3.4, 1.3, '#f28c38', 12],
      ['e', 16.8, 28.6, 2, 1.2, '#f59aa8', 0, 0.6],
      ['e', 31.6, 28.6, 2, 1.2, '#f59aa8', 0, 0.6],
      ['e', 24, 35, 1.1, 1.1, '#2d241c'],
      ['e', 24, 39, 1.1, 1.1, '#2d241c'],
      ['e', 24, 43, 1.1, 1.1, '#2d241c'],
    ],
    // Folded wings are two ovals with three scallops and thin finger lines; the fang is a small white triangle.
    bat: [
      ['t', 14, 19, 5, 12.5, '#6b5a8e'],
      ['t', 34, 19, 5, 12.5, '#6b5a8e'],
      ['t', 14, 18.5, 2.8, 8, '#f4a6c4'],
      ['t', 34, 18.5, 2.8, 8, '#f4a6c4'],
      ['e', 24, 31, 15, 14, '#6b5a8e'],
      ['e', 24, 37, 9, 7, '#d9ccef'],
      ['t', 8, 42.9, 7.4, 13.2, '#40345e'],
      ['t', 3.5, 42.3, 2.7, -4.8, '#40345e'],
      ['t', 8, 42.3, 2.7, -4.8, '#40345e'],
      ['t', 12.5, 42.3, 2.7, -4.8, '#40345e'],
      ['t', 8, 42.3, 6.6, 12.4, '#5d4e84'],
      ['t', 3.6, 42.3, 2.1, -3.8, '#5d4e84'],
      ['t', 8, 42.3, 2.1, -3.8, '#5d4e84'],
      ['t', 12.4, 42.3, 2.1, -3.8, '#5d4e84'],
      ['l', 8, 29.5, 3.6, 46.3, '#40345e', 0.6],
      ['l', 8, 29.5, 8, 46.3, '#40345e', 0.6],
      ['l', 8, 29.5, 12.4, 46.3, '#40345e', 0.6],
      ['t', 6.2, 31.6, 0.9, 3, '#d9ccef'],
      ['t', 40, 42.9, 7.4, 13.2, '#40345e'],
      ['t', 44.5, 42.3, 2.7, -4.8, '#40345e'],
      ['t', 40, 42.3, 2.7, -4.8, '#40345e'],
      ['t', 35.5, 42.3, 2.7, -4.8, '#40345e'],
      ['t', 40, 42.3, 6.6, 12.4, '#5d4e84'],
      ['t', 44.4, 42.3, 2.1, -3.8, '#5d4e84'],
      ['t', 40, 42.3, 2.1, -3.8, '#5d4e84'],
      ['t', 35.6, 42.3, 2.1, -3.8, '#5d4e84'],
      ['l', 40, 29.5, 44.4, 46.3, '#40345e', 0.6],
      ['l', 40, 29.5, 40, 46.3, '#40345e', 0.6],
      ['l', 40, 29.5, 35.6, 46.3, '#40345e', 0.6],
      ['t', 41.8, 31.6, 0.9, 3, '#d9ccef'],
      ['e', 19.5, 27, 2.4, 3, '#2d241c'],
      ['e', 28.5, 27, 2.4, 3, '#2d241c'],
      ['e', 20.3, 26, 0.8, 1, '#ffffff', 0, 0.9],
      ['e', 29.3, 26, 0.8, 1, '#ffffff', 0, 0.9],
      ['e', 24, 32.2, 1.7, 1.2, '#f4a6c4'],
      ['l', 22.4, 34.6, 25.6, 34.6, '#4f4170', 0.7],
      ['t', 25.1, 34.9, 1.3, -3.2, '#4f4170'],
      ['t', 25.1, 34.9, 0.9, -2.4, '#ffffff'],
      ['e', 16.5, 32.2, 2.2, 1.3, '#f59aa8', 0, 0.7],
      ['e', 31.5, 32.2, 2.2, 1.3, '#f59aa8', 0, 0.7],
      ['e', 17, 45.5, 4.5, 2.8, '#4f4170'],
      ['e', 31, 45.5, 4.5, 2.8, '#4f4170'],
    ],
    // A fan of red, orange and gold tail feathers (rotated ovals) behind a round brown body; the beak is a small triangle.
    turkey: [
      ['e', 11.64, 23.43, 4.6, 9.6, '#c8452c', -62],
      ['e', 14.82, 19.43, 4.6, 9.6, '#e8862f', -41],
      ['e', 19.1, 16.89, 4.6, 9.6, '#f2bf47', -20.5],
      ['e', 24, 16, 4.6, 9.6, '#e8862f', 0],
      ['e', 28.9, 16.89, 4.6, 9.6, '#f2bf47', 20.5],
      ['e', 33.18, 19.43, 4.6, 9.6, '#e8862f', 41],
      ['e', 36.36, 23.43, 4.6, 9.6, '#c8452c', 62],
      ['e', 6.87, 20.89, 2.8, 3.6, '#e46a48', -62],
      ['e', 11.27, 15.36, 2.8, 3.6, '#f4a65a', -41],
      ['e', 17.21, 11.83, 2.8, 3.6, '#ffd98a', -20.5],
      ['e', 24, 10.6, 2.8, 3.6, '#f4a65a', 0],
      ['e', 30.79, 11.83, 2.8, 3.6, '#ffd98a', 20.5],
      ['e', 36.73, 15.36, 2.8, 3.6, '#f4a65a', 41],
      ['e', 41.13, 20.89, 2.8, 3.6, '#e46a48', 62],
      ['e', 16.51, 24.15, 3.4, 6.6, '#7a4a26', -52],
      ['e', 19.11, 21.86, 3.4, 6.6, '#7a4a26', -31],
      ['e', 22.27, 20.66, 3.4, 6.6, '#7a4a26', -10.5],
      ['e', 25.73, 20.66, 3.4, 6.6, '#7a4a26', 10.5],
      ['e', 28.89, 21.86, 3.4, 6.6, '#7a4a26', 31],
      ['e', 31.49, 24.15, 3.4, 6.6, '#7a4a26', 52],
      ['e', 24, 32, 14, 13, '#8a5a34'],
      ['e', 11.8, 36, 3.6, 6.6, '#6f4527', -14],
      ['e', 36.2, 36, 3.6, 6.6, '#6f4527', 14],
      ['e', 24, 38, 8.6, 6.6, '#d1a271'],
      ['e', 19.5, 28, 2.4, 3, '#2d241c'],
      ['e', 28.5, 28, 2.4, 3, '#2d241c'],
      ['e', 20.3, 27, 0.8, 1, '#ffffff', 0, 0.9],
      ['e', 29.3, 27, 0.8, 1, '#ffffff', 0, 0.9],
      ['t', 24, 31.4, 2.3, -3.4, '#f2a93b'],
      ['t', 24, 31.4, 1.3, -1.9, '#ffd27a'],
      ['e', 25.7, 35.4, 1.2, 2.4, '#d8372c'],
      ['e', 16.5, 32, 2.2, 1.3, '#f59aa8', 0, 0.7],
      ['e', 31.5, 32, 2.2, 1.3, '#f59aa8', 0, 0.7],
      ['e', 18, 45.6, 3.8, 2.2, '#e39a34'],
      ['e', 30, 45.6, 3.8, 2.2, '#e39a34'],
    ],
    // Curved stripes and antennae are paths in the SVG; bars and lines here.
    rocket: [
      ['t', 24, 46, 4.4, -9, '#ff9f1c'],
      ['t', 24, 46, 2.3, -5.5, '#ffe27a'],
      ['e', 12.8, 41, 3.2, 7.8, '#c7362b', 26],
      ['e', 35.2, 41, 3.2, 7.8, '#c7362b', -26],
      ['e', 24, 31, 12.5, 15, '#ff6154'],
      ['t', 24, 22, 10.2, 15.5, '#ff6154'],
      ['e', 27.5, 32, 6, 13, '#e5493d', 0, 0.55],
      ['e', 18.5, 29, 1.8, 9, '#ffffff', -6, 0.35],
      ['t', 24, 12.8, 4.1, 6.3, '#c7362b'],
      ['e', 24, 45.3, 5.6, 1.8, '#8f2a22'],
      ['e', 24, 27, 6, 6, '#fff3e0'],
      ['e', 24, 27, 4.4, 4.4, '#5fb6f0'],
      ['o', 24, 27, 6, 6, '#c7362b', 1.1],
      ['e', 22.6, 25.4, 1.4, 1, '#ffffff', -30, 0.85],
    ],
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

  // A buddy this build has no table for is drawn from the parts the app sent.
  function buddyBody(id: string) {
    if (!id) return null
    if (BUDDY[id]) return BUDDY[id]
    const sent = props?.buddyParts
    return Array.isArray(sent) && sent.length ? sent.filter((part) => Array.isArray(part)) : null
  }

  function buddyMark(id: string) {
    const parts = buddyBody(id)
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
    const nextItems = items.map((item) =>
      item.lampId === leadId && String(item.periodKey || '') === leadNight ? { ...item, status } : item,
    )
    const nextLead = leadItem(nextItems, '')
    const nextLeft = stackLeft(nextItems)
    const nextQuestion = nextLead ? String(nextLead.question || nextLead.label || '') : ''
    const clearLine = String(props?.clearLabel || props?.footer || 'All clear for today')
    const emptyLine = String(props?.emptyLabel || 'No questions yet')
    const nextFooter = nextLead ? footer : nextLeft === 0 ? (nextItems.length ? clearLine : emptyLine) : footer
    return {
      ...props,
      items: nextItems,
      leadLampId: nextLead ? nextLead.lampId : '',
      leadNight: nextLead ? String(nextLead.periodKey || '') : '',
      question: nextQuestion,
      tagTitle: String(nextLead?.tag || '').trim() || tagTitle,
      sinceLine: String(nextLead?.since || ''),
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
      leadNight: String(next.periodKey || ''),
      question: String(next.question || next.label || ''),
      tagTitle: String(next.tag || '').trim() || tagTitle,
      sinceLine: String(next.since || ''),
      openUri: openUriForLead(next.lampId),
    }
  }

  const family = environment?.widgetFamily

  // The lock screen circle draws in the system's own tint, so it uses the
  // system disc and a centered number. The old top-left frame put the number
  // in the corner the circle clips away, which left it blank.
  if (family === 'accessoryCircular') {
    // No snapshot yet or no questions: a plus, and VoiceOver says to add one.
    const glyph = left > 0 ? (gentle ? '…' : String(left)) : items.length ? '✓' : '+'
    const circleLabel = items.length ? String(props?.footer || '') : String(props?.emptyLabel || 'Add a question in Did I')
    return (
      <ZStack modifiers={[containerBackground(c.panel, 'widget'), widgetURL(openUri), grow, accessibilityLabel(circleLabel)]}>
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
        minimumScaleFactor(0.6),
        allowsTightening(true),
        frame({ maxWidth: 10000 }),
      ]}
    >
      {lead ? questionText : footer}
    </Text>
  )
  // Under the question on home sizes: when an every so often question was last done.
  const sinceRow = home && sinceText ? (
    <Text
      modifiers={[
        font({ size: compact ? 10 : 12, weight: 'semibold' }),
        foregroundStyle(tinted ? ink : c.inkSoft),
        multilineTextAlignment('center'),
        lineLimit(1),
        minimumScaleFactor(0.6),
        frame({ maxWidth: 10000 }),
      ]}
    >
      {sinceText}
    </Text>
  ) : null
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
        accessibilityLabel(String(props?.nextLabel || 'Next') + ': ' + questionText),
      ]}
    />
  ) : null
  const buttons = lead ? (
    <HStack spacing={compact ? 4 : 8} modifiers={[frame({ maxWidth: 10000 })]}>
      {lead.status === 'skip' ? null : (
      <Button
        label={nopeLabel}
        target={'nope:' + leadTarget}
        onPress={() => afterTap('nope')}
        modifiers={[
          buttonStyle('borderedProminent'),
          buttonBorderShape('roundedRectangle', 12),
          tint(c.skip),
          accessibilityLabel(nopeLabel + ': ' + questionText),
          font({ size: compact ? 12 : 15, weight: 'bold' }),
          foregroundStyle(ink),
          controlSize(compact ? 'small' : 'regular'),
          lineLimit(1),
          minimumScaleFactor(0.7),
          frame({ maxWidth: 10000 }),
        ]}
      />
      )}
      <Button
        label={didLabel}
        target={'did:' + leadTarget}
        onPress={() => afterTap('did')}
        modifiers={[
          buttonStyle('borderedProminent'),
          buttonBorderShape('roundedRectangle', 12),
          tint(c.on),
          accessibilityLabel(didLabel + ': ' + questionText),
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
              padding({ trailing: buddyBody(buddyId) ?(compact ? 22 : 32) : 0 }),
            ]}
          >
            {nextButton}
            {kicker}
          </HStack>
          <Spacer />
          {question}
          {sinceRow}
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
