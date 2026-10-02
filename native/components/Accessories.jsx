import { createElement } from 'react'
import { View } from 'react-native'
import { ACCESSORY_PAD, ACCESSORY_VIEWBOX, accessoryNodes } from '../../src/lib/accessories.js'
import { svgParts } from '../lib/svg-parts.js'

let groupCached
function svgGroup() {
  if (groupCached !== undefined) return groupCached
  try {
    const mod = require('react-native-svg')
    groupCached = (mod && !mod.__didISvgFallback && mod.G) || null
  } catch {
    groupCached = null
  }
  return groupCached
}

// The shared drawings call h('path', ...); this maps those tags onto
// react-native-svg and keys children so React stays quiet.
function factory(parts, G) {
  const tags = { path: parts.Path, circle: parts.Circle, ellipse: parts.Ellipse, polygon: parts.Polygon, g: G }
  let n = 0
  return (tag, props, ...children) => createElement(tags[tag], { ...(props || {}), key: (n += 1) }, ...children)
}

// One layer of accessories over (or under) a buddy drawn at width x height.
// It reaches ACCESSORY_PAD past the buddy's box on every side.
export function AccessoryLayer({ ids, buddyId, tone, width, height }) {
  const parts = svgParts()
  const G = svgGroup()
  if (!ids?.length || !parts || !G) return null
  const sx = width / 48
  const sy = height / 58
  const h = factory(parts, G)
  const { Svg } = parts
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -ACCESSORY_PAD * sx,
        top: -ACCESSORY_PAD * sy,
        width: (48 + ACCESSORY_PAD * 2) * sx,
        height: (58 + ACCESSORY_PAD * 2) * sy,
      }}
    >
      <Svg width="100%" height="100%" viewBox={ACCESSORY_VIEWBOX}>
        {ids.flatMap((id) => accessoryNodes(h, id, buddyId, tone))}
      </Svg>
    </View>
  )
}
