import { View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { svgParts } from '../lib/svg-parts.js'

const COAT = {
  cat: { body: '#f0a64a', belly: '#ffe8c8', ear: '#f0a64a' },
  dog: { body: '#c68b52', belly: '#f3ddc4', ear: '#9a6538' },
  rabbit: { body: '#b8b8c8', belly: '#e8e8f0', ear: '#f0b8c8' },
  owl: { body: '#8b6b4a', belly: '#d4c4a8', ear: '#6b5038' },
  frog: { body: '#72c45e', belly: '#e4f4c4', ear: '#72c45e' },
  ant: { body: '#b5533c', belly: '#e39a84', ear: '#b5533c' },
  possum: { body: '#9b98a3', belly: '#f4f1ec', ear: '#f2a7b4' },
  penguin: { body: '#344157', belly: '#f7f5f0', ear: '#344157' },
  fox: { body: '#e8743b', belly: '#fff6ea', ear: '#e8743b' },
  hive: { body: '#f6c443', belly: '#2b2018', ear: '#dff3ff' },
  otter: { body: '#a06a40', belly: '#f1dcc0', ear: '#8a5a36' },
  hedgehog: { body: '#8f6a52', belly: '#f3d9b6', ear: '#7a5a46' },
  panda: { body: '#f4f1ea', belly: '#f4f1ea', ear: '#2f2c33' },
  duck: { body: '#ffd34d', belly: '#fff1b8', ear: '#ff9a3c' },
  axolotl: { body: '#ffc2d4', belly: '#ffe6ee', ear: '#ff6f91' },
  turtle: { body: '#9edb86', belly: '#a0753e', ear: '#8fd27a' },
}

function spot(box, x, y, w, h, color, radius) {
  const sx = box.w / 48
  const sy = box.h / 58
  return {
    position: 'absolute',
    left: x * sx,
    top: y * sy,
    width: w * sx,
    height: h * sy,
    borderRadius: radius == null ? (w * sx) / 2 : radius,
    backgroundColor: color,
  }
}

export function BuddyPlain({ id, width = 48, height = 58 }) {
  const coat = COAT[id]
  if (!coat) return null
  const box = { w: width, h: height }
  const pupil = id === 'owl' ? '#2d241c' : '#2d241c'
  const eye = id === 'owl' ? '#f0e080' : pupil
  const tall = id === 'rabbit'
  if (id === 'ant') {
    return (
      <View style={{ width, height }}>
        <View style={spot(box, 15, 35, 18, 16, '#9c4431')} />
        <View style={spot(box, 19, 26.5, 10, 9, coat.body)} />
        <View style={spot(box, 15.5, 12.5, 17, 15, coat.body)} />
        <View style={spot(box, 17.2, 17, 4.8, 5.6, pupil)} />
        <View style={spot(box, 26, 17, 4.8, 5.6, pupil)} />
      </View>
    )
  }
  if (id === 'penguin') {
    return (
      <View style={{ width, height }}>
        <View style={spot(box, 9.5, 16, 29, 30, coat.body)} />
        <View style={spot(box, 13.3, 20.2, 21.4, 13.6, coat.belly)} />
        <View style={spot(box, 15, 30, 18, 15, coat.belly)} />
        <View style={spot(box, 17.6, 23.7, 4.4, 5.6, pupil)} />
        <View style={spot(box, 26, 23.7, 4.4, 5.6, pupil)} />
        <View style={spot(box, 21.5, 30.5, 5, 3.5, '#f5a524', 2)} />
        <View style={spot(box, 12.5, 42.2, 9, 5.6, '#f5a524')} />
        <View style={spot(box, 26.5, 42.2, 9, 5.6, '#f5a524')} />
      </View>
    )
  }
  if (id === 'fox') {
    return (
      <View style={{ width, height }}>
        <View style={spot(box, 9.5, 17, 29, 28, coat.body)} />
        <View style={spot(box, 16.5, 32, 15, 12, coat.belly)} />
        <View style={spot(box, 17.6, 24.7, 4.4, 5.6, pupil)} />
        <View style={spot(box, 26, 24.7, 4.4, 5.6, pupil)} />
        <View style={spot(box, 22.3, 31.4, 3.4, 2.4, pupil)} />
        <View style={spot(box, 12.5, 42.2, 9, 5.6, '#3a2a22')} />
        <View style={spot(box, 26.5, 42.2, 9, 5.6, '#3a2a22')} />
      </View>
    )
  }
  if (id === 'otter') {
    return (
      <View style={{ width, height }}>
        <View style={spot(box, 7, 18.4, 8, 7.2, coat.ear)} />
        <View style={spot(box, 33, 18.4, 8, 7.2, coat.ear)} />
        <View style={spot(box, 9, 17, 30, 28, coat.body)} />
        <View style={spot(box, 14, 25.5, 20, 17, coat.belly)} />
        <View style={spot(box, 15.7, 23.9, 4.6, 6.2, pupil)} />
        <View style={spot(box, 27.7, 23.9, 4.6, 6.2, pupil)} />
        <View style={spot(box, 21.4, 29.6, 5.2, 3.8, pupil)} />
        <View style={spot(box, 19, 38, 10, 5, '#f6b8c4')} />
        <View style={spot(box, 12.5, 40.8, 9, 6.4, coat.ear)} />
        <View style={spot(box, 26.5, 40.8, 9, 6.4, coat.ear)} />
      </View>
    )
  }
  if (id === 'hedgehog') {
    return (
      <View style={{ width, height }}>
        <View style={spot(box, 6, 13.5, 36, 32, coat.ear)} />
        <View style={spot(box, 12, 23.5, 24, 21, coat.belly)} />
        <View style={spot(box, 16.3, 26.1, 4.4, 5.8, pupil)} />
        <View style={spot(box, 27.3, 26.1, 4.4, 5.8, pupil)} />
        <View style={spot(box, 21.8, 31.4, 4.4, 3.2, pupil)} />
        <View style={spot(box, 12.5, 42.2, 9, 5.6, '#c48f72')} />
        <View style={spot(box, 26.5, 42.2, 9, 5.6, '#c48f72')} />
      </View>
    )
  }
  if (id === 'panda') {
    return (
      <View style={{ width, height }}>
        <View style={spot(box, 7.7, 14.9, 9.6, 9.2, coat.ear)} />
        <View style={spot(box, 30.7, 14.9, 9.6, 9.2, coat.ear)} />
        <View style={spot(box, 9, 17, 30, 28, coat.body)} />
        <View style={spot(box, 14.1, 23.3, 7.8, 9.8, coat.ear)} />
        <View style={spot(box, 26.1, 23.3, 7.8, 9.8, coat.ear)} />
        <View style={spot(box, 18, 25.4, 2, 2.2, '#ffffff')} />
        <View style={spot(box, 29.2, 25.4, 2, 2.2, '#ffffff')} />
        <View style={spot(box, 21.9, 31.9, 4.2, 3, coat.ear)} />
        <View style={spot(box, 12.5, 42.2, 9, 5.6, coat.ear)} />
        <View style={spot(box, 26.5, 42.2, 9, 5.6, coat.ear)} />
      </View>
    )
  }
  if (id === 'duck') {
    return (
      <View style={{ width, height }}>
        <View style={spot(box, 24.5, 8, 5, 10, coat.body)} />
        <View style={spot(box, 9, 17, 30, 28, coat.body)} />
        <View style={spot(box, 15, 29.5, 18, 13, coat.belly)} />
        <View style={spot(box, 15.7, 22.9, 4.6, 6.2, pupil)} />
        <View style={spot(box, 27.7, 22.9, 4.6, 6.2, pupil)} />
        <View style={spot(box, 18.5, 29, 11, 4.5, coat.ear)} />
        <View style={spot(box, 13, 43, 9, 4, coat.ear, 1.5)} />
        <View style={spot(box, 26, 43, 9, 4, coat.ear, 1.5)} />
      </View>
    )
  }
  if (id === 'axolotl') {
    return (
      <View style={{ width, height }}>
        <View style={spot(box, 0.5, 15, 9, 5, coat.ear)} />
        <View style={spot(box, 0, 22.5, 9, 5, coat.ear)} />
        <View style={spot(box, 2, 29, 8, 5, coat.ear)} />
        <View style={spot(box, 38.5, 15, 9, 5, coat.ear)} />
        <View style={spot(box, 39, 22.5, 9, 5, coat.ear)} />
        <View style={spot(box, 38, 29, 8, 5, coat.ear)} />
        <View style={spot(box, 15.5, 37, 17, 12, coat.body)} />
        <View style={spot(box, 8.5, 12.5, 31, 27, coat.body)} />
        <View style={spot(box, 15.3, 22.8, 5.4, 6.4, '#1f1a1e')} />
        <View style={spot(box, 27.3, 22.8, 5.4, 6.4, '#1f1a1e')} />
        <View style={spot(box, 16, 46.5, 6, 4, '#f2a4bd')} />
        <View style={spot(box, 26, 46.5, 6, 4, '#f2a4bd')} />
      </View>
    )
  }
  if (id === 'turtle') {
    return (
      <View style={{ width, height }}>
        <View style={spot(box, 12.5, 43, 9, 6, coat.ear)} />
        <View style={spot(box, 26.5, 43, 9, 6, coat.ear)} />
        <View style={spot(box, 8, 26, 32, 22, '#6e4f27')} />
        <View style={spot(box, 9.4, 26.6, 29.2, 19.6, coat.belly)} />
        <View style={spot(box, 20.5, 35.4, 7, 8, '#c99f62', 2)} />
        <View style={spot(box, 12.8, 15, 22.4, 20, coat.body)} />
        <View style={spot(box, 17.3, 22.2, 4.4, 5.6, pupil)} />
        <View style={spot(box, 26.3, 22.2, 4.4, 5.6, pupil)} />
      </View>
    )
  }
  if (id === 'hive') {
    return (
      <View style={{ width, height }}>
        <View style={spot(box, 5, 10, 12, 16, coat.ear)} />
        <View style={spot(box, 31, 10, 12, 16, coat.ear)} />
        <View style={spot(box, 9, 17, 30, 28, coat.body)} />
        <View style={spot(box, 11, 35, 26, 4, coat.belly, 2)} />
        <View style={spot(box, 14, 41.5, 20, 3, coat.belly, 2)} />
        <View style={spot(box, 15.7, 23.9, 4.6, 6.2, pupil)} />
        <View style={spot(box, 27.7, 23.9, 4.6, 6.2, pupil)} />
        <View style={spot(box, 12.8, 44.2, 8.4, 5.6, coat.belly)} />
        <View style={spot(box, 26.8, 44.2, 8.4, 5.6, coat.belly)} />
      </View>
    )
  }
  if (id === 'frog') {
    return (
      <View style={{ width, height }}>
        <View style={spot(box, 9, 13, 14, 13, coat.body)} />
        <View style={spot(box, 25, 13, 14, 13, coat.body)} />
        <View style={spot(box, 8, 19, 32, 26, coat.body)} />
        <View style={spot(box, 14, 30, 20, 14, coat.belly)} />
        <View style={spot(box, 11.5, 14.5, 9, 9, '#fff')} />
        <View style={spot(box, 27.5, 14.5, 9, 9, '#fff')} />
        <View style={spot(box, 14.5, 17, 4, 5, pupil)} />
        <View style={spot(box, 29.5, 17, 4, 5, pupil)} />
        <View style={spot(box, 12, 42, 9, 6, coat.body)} />
        <View style={spot(box, 27, 42, 9, 6, coat.body)} />
      </View>
    )
  }
  return (
    <View style={{ width, height }}>
      {tall ? (
        <>
          <View style={spot(box, 12, 2, 8, 22, coat.body)} />
          <View style={spot(box, 28, 2, 8, 22, coat.body)} />
          <View style={spot(box, 14, 6, 4, 14, coat.ear)} />
          <View style={spot(box, 30, 6, 4, 14, coat.ear)} />
        </>
      ) : (
        <>
          <View style={spot(box, 8, 14, 10, 12, coat.ear, 4)} />
          <View style={spot(box, 30, 14, 10, 12, coat.ear, 4)} />
        </>
      )}
      <View style={spot(box, 9, 20, 30, 26, coat.body)} />
      <View style={spot(box, 14, 26, 20, 16, coat.belly)} />
      <View style={spot(box, 16, 26, id === 'owl' ? 8 : 5, id === 'owl' ? 9 : 6, eye)} />
      <View style={spot(box, 27, 26, id === 'owl' ? 8 : 5, id === 'owl' ? 9 : 6, eye)} />
      {id === 'owl' ? (
        <>
          <View style={spot(box, 18, 28, 4, 5, pupil)} />
          <View style={spot(box, 29, 28, 4, 5, pupil)} />
        </>
      ) : null}
      <View style={spot(box, 12, 42, 9, 6, coat.body)} />
      <View style={spot(box, 27, 42, 9, 6, coat.body)} />
    </View>
  )
}

const DARK = '#2d241c'
const SHINE = ['#ffffff', 0.9]

// Each buddy's eyes, left then right, as [cx, cy, rx, ry, fill, opacity] in
// its 48x58 drawing. They are drawn apart from the rest so a blink can shut
// them: each eye is its own little picture that squashes flat, and the skin
// drawn under it shows through.
const EYES = {
  cat: [
    [[18, 28, 2.2, 3, DARK], [18.8, 27, 0.7, 0.9, ...SHINE]],
    [[30, 28, 2.2, 3, DARK], [30.8, 27, 0.7, 0.9, ...SHINE]],
  ],
  dog: [
    [[18, 27, 2.3, 3.1, DARK], [19, 26, 0.7, 0.9, ...SHINE]],
    [[30, 27, 2.3, 3.1, DARK], [31, 26, 0.7, 0.9, ...SHINE]],
  ],
  rabbit: [
    [[18, 29, 2, 2.8, DARK], [18.7, 28.2, 0.6, 0.8, ...SHINE]],
    [[30, 29, 2, 2.8, DARK], [30.7, 28.2, 0.6, 0.8, ...SHINE]],
  ],
  owl: [
    [[18, 28, 4, 4.5, '#f0e080'], [18, 28, 2, 2.5, DARK], [18.5, 27.2, 0.6, 0.8, ...SHINE]],
    [[30, 28, 4, 4.5, '#f0e080'], [30, 28, 2, 2.5, DARK], [30.5, 27.2, 0.6, 0.8, ...SHINE]],
  ],
  ant: [
    [[19.6, 19.8, 2.4, 2.8, DARK], [20.2, 19, 0.7, 0.9, ...SHINE]],
    [[28.4, 19.8, 2.4, 2.8, DARK], [29, 19, 0.7, 0.9, ...SHINE]],
  ],
  possum: [
    [[19, 28, 3.2, 3.6, '#5b5660'], [19, 28, 1.9, 2.3, '#1f1a1e'], [19.6, 27.2, 0.6, 0.8, ...SHINE]],
    [[29, 28, 3.2, 3.6, '#5b5660'], [29, 28, 1.9, 2.3, '#1f1a1e'], [29.6, 27.2, 0.6, 0.8, ...SHINE]],
  ],
  frog: [
    [[16, 19, 4.6, 4.6, '#ffffff'], [16.6, 19.6, 2.2, 2.8, DARK], [17.3, 18.6, 0.7, 0.9, ...SHINE]],
    [[32, 19, 4.6, 4.6, '#ffffff'], [31.4, 19.6, 2.2, 2.8, DARK], [32.1, 18.6, 0.7, 0.9, ...SHINE]],
  ],
  penguin: [
    [[19.8, 26.5, 2.2, 2.8, DARK], [20.5, 25.6, 0.7, 0.9, ...SHINE]],
    [[28.2, 26.5, 2.2, 2.8, DARK], [28.9, 25.6, 0.7, 0.9, ...SHINE]],
  ],
  fox: [
    [[19.8, 27.5, 2.2, 2.8, DARK], [20.5, 26.6, 0.7, 0.9, ...SHINE]],
    [[28.2, 27.5, 2.2, 2.8, DARK], [28.9, 26.6, 0.7, 0.9, ...SHINE]],
  ],
  hive: [
    [[18, 27, 2.3, 3.1, DARK], [18.8, 26, 0.7, 0.9, ...SHINE]],
    [[30, 27, 2.3, 3.1, DARK], [30.8, 26, 0.7, 0.9, ...SHINE]],
  ],
  otter: [
    [[18, 27, 2.3, 3.1, DARK], [18.8, 26, 0.7, 0.9, ...SHINE]],
    [[30, 27, 2.3, 3.1, DARK], [30.8, 26, 0.7, 0.9, ...SHINE]],
  ],
  hedgehog: [
    [[18.5, 29, 2.2, 2.9, DARK], [19.2, 28, 0.7, 0.9, ...SHINE]],
    [[29.5, 29, 2.2, 2.9, DARK], [30.2, 28, 0.7, 0.9, ...SHINE]],
  ],
  // Dark eyes on dark patches: a bigger shine keeps them reading.
  panda: [
    [[18.4, 27.6, 1.9, 2.3, '#0f0d11'], [19.1, 26.7, 0.75, 0.95, '#ffffff', 0.95]],
    [[29.6, 27.6, 1.9, 2.3, '#0f0d11'], [30.3, 26.7, 0.75, 0.95, '#ffffff', 0.95]],
  ],
  duck: [
    [[18, 26, 2.3, 3.1, DARK], [18.8, 25, 0.7, 0.9, ...SHINE]],
    [[30, 26, 2.3, 3.1, DARK], [30.8, 25, 0.7, 0.9, ...SHINE]],
  ],
  axolotl: [
    [[18, 26, 2.7, 3.19, '#1f1a1e'], [18.81, 24.92, 0.86, 1.03, '#ffffff', 0.95]],
    [[30, 26, 2.7, 3.19, '#1f1a1e'], [30.81, 24.92, 0.86, 1.03, '#ffffff', 0.95]],
  ],
  turtle: [
    [[19.5, 25, 2.2, 2.8, DARK], [20.2, 24.1, 0.7, 0.9, ...SHINE]],
    [[28.5, 25, 2.2, 2.8, DARK], [29.2, 24.1, 0.7, 0.9, ...SHINE]],
  ],
}

function EyeParts({ Ellipse, eye }) {
  return eye.map(([cx, cy, rx, ry, fill, opacity], index) => (
    <Ellipse key={index} cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} opacity={opacity} />
  ))
}

/** Both eyes, drawn in place inside the buddy's own picture. */
function EyesInline({ parts, id }) {
  return EYES[id].map((eye, index) => <EyeParts key={index} Ellipse={parts.Ellipse} eye={eye} />)
}

/** One eye as its own picture over the buddy; `blink` 0 is open, 1 shut. */
function BlinkEye({ parts, eye, width, height, blink }) {
  const shut = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 - 0.92 * blink.value }] }))
  // The eye's box in the drawing, a hair wider so its soft edge is not cut.
  const left = Math.min(...eye.map(([cx, , rx]) => cx - rx)) - 0.5
  const top = Math.min(...eye.map(([, cy, , ry]) => cy - ry)) - 0.5
  const w = Math.max(...eye.map(([cx, , rx]) => cx + rx)) + 0.5 - left
  const h = Math.max(...eye.map(([, cy, , ry]) => cy + ry)) + 0.5 - top
  // The drawing fits its box by the tighter side and sits in the middle.
  const k = Math.min(width / 48, height / 58)
  const ox = (width - 48 * k) / 2
  const oy = (height - 58 * k) / 2
  const { Svg } = parts
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: ox + left * k, top: oy + top * k, width: w * k, height: h * k }, shut]}
    >
      <Svg width={w * k} height={h * k} viewBox={`${left} ${top} ${w} ${h}`}>
        <EyeParts Ellipse={parts.Ellipse} eye={eye} />
      </Svg>
    </Animated.View>
  )
}

/** A buddy; with `blink` (a shared value, 0 open to 1 shut) it can blink. */
export function BuddyArt({ id, width = 48, height = 58, blink = null }) {
  const parts = svgParts()
  if (!blink || !parts || !EYES[id]) return <BuddyDrawing id={id} width={width} height={height} eyes />
  return (
    <View style={{ width, height }}>
      <BuddyDrawing id={id} width={width} height={height} eyes={false} />
      {EYES[id].map((eye, index) => (
        <BlinkEye key={index} parts={parts} eye={eye} width={width} height={height} blink={blink} />
      ))}
    </View>
  )
}

function BuddyDrawing({ id, width, height, eyes }) {
  const parts = svgParts()
  if (!parts) return <BuddyPlain id={id} width={width} height={height} />
  const { Svg, Ellipse, Line, Path, Polygon } = parts
  if (id === 'cat') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Ellipse cx="24" cy="30" rx="15" ry="14" fill="#f0a64a" />
        <Ellipse cx="24" cy="32" rx="11" ry="9" fill="#ffe8c8" opacity="0.85" />
        <Polygon points="10,18 14,8 18,19" fill="#f0a64a" />
        <Polygon points="30,19 34,8 38,18" fill="#f0a64a" />
        <Polygon points="11,17 14,10 16,18" fill="#ffd4a8" />
        <Polygon points="32,18 34,10 37,17" fill="#ffd4a8" />
        {eyes ? <EyesInline parts={parts} id="cat" /> : null}
        <Path d="M24 31 L22 34 L26 34 Z" fill="#e07a8a" />
        <Line x1="14" y1="33" x2="6" y2="31" stroke="#5c4a3a" strokeWidth="0.9" />
        <Line x1="14" y1="35" x2="6" y2="36" stroke="#5c4a3a" strokeWidth="0.9" />
        <Line x1="34" y1="33" x2="42" y2="31" stroke="#5c4a3a" strokeWidth="0.9" />
        <Line x1="34" y1="35" x2="42" y2="36" stroke="#5c4a3a" strokeWidth="0.9" />
        <Ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#f0a64a" />
        <Ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#f0a64a" />
        <Ellipse cx="17" cy="45" rx="3" ry="2" fill="#ffe8c8" />
        <Ellipse cx="31" cy="45" rx="3" ry="2" fill="#ffe8c8" />
      </Svg>
    )
  }

  if (id === 'dog') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Ellipse cx="24" cy="30" rx="15" ry="14" fill="#c68b52" />
        <Ellipse cx="24" cy="34" rx="8" ry="6.5" fill="#f3ddc4" />
        <Ellipse cx="11" cy="24" rx="5.5" ry="9" fill="#9a6538" transform="rotate(-18 11 24)" />
        <Ellipse cx="37" cy="24" rx="5.5" ry="9" fill="#9a6538" transform="rotate(18 37 24)" />
        {eyes ? <EyesInline parts={parts} id="dog" /> : null}
        <Ellipse cx="24" cy="33.5" rx="3.2" ry="2.4" fill="#2d241c" />
        <Path d="M22 36 Q24 40 26 36" fill="#e07a8a" />
        <Ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#c68b52" />
        <Ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#c68b52" />
        <Ellipse cx="17" cy="45" rx="3" ry="2" fill="#f3ddc4" />
        <Ellipse cx="31" cy="45" rx="3" ry="2" fill="#f3ddc4" />
      </Svg>
    )
  }

  if (id === 'rabbit') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Ellipse cx="17" cy="12" rx="4" ry="11" fill="#b8b8c8" transform="rotate(-8 17 12)" />
        <Ellipse cx="31" cy="12" rx="4" ry="11" fill="#b8b8c8" transform="rotate(8 31 12)" />
        <Ellipse cx="17" cy="12" rx="2.2" ry="7" fill="#f0b8c8" transform="rotate(-8 17 12)" />
        <Ellipse cx="31" cy="12" rx="2.2" ry="7" fill="#f0b8c8" transform="rotate(8 31 12)" />
        <Ellipse cx="24" cy="32" rx="14" ry="13" fill="#b8b8c8" />
        <Ellipse cx="24" cy="34" rx="9" ry="8" fill="#e8e8f0" />
        {eyes ? <EyesInline parts={parts} id="rabbit" /> : null}
        <Ellipse cx="24" cy="33" rx="2" ry="1.5" fill="#f0b8c8" />
        <Ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#b8b8c8" />
        <Ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#b8b8c8" />
        <Ellipse cx="17" cy="45" rx="3" ry="2" fill="#e8e8f0" />
        <Ellipse cx="31" cy="45" rx="3" ry="2" fill="#e8e8f0" />
      </Svg>
    )
  }

  if (id === 'owl') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Polygon points="14,14 16,6 18,15" fill="#6b5038" />
        <Polygon points="30,15 32,6 34,14" fill="#6b5038" />
        <Ellipse cx="24" cy="32" rx="14" ry="13" fill="#8b6b4a" />
        <Ellipse cx="24" cy="30" rx="11" ry="10" fill="#d4c4a8" />
        {eyes ? <EyesInline parts={parts} id="owl" /> : null}
        <Polygon points="24,31 22,34 26,34" fill="#d4a040" />
        <Ellipse cx="24" cy="38" rx="7" ry="6" fill="#c4a882" />
        <Ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#8b6b4a" />
        <Ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#8b6b4a" />
        <Ellipse cx="17" cy="45" rx="3" ry="2" fill="#c4a882" />
        <Ellipse cx="31" cy="45" rx="3" ry="2" fill="#c4a882" />
      </Svg>
    )
  }

  if (id === 'ant') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Line x1="20" y1="15" x2="17" y2="8" stroke="#7a3526" strokeWidth="1.4" strokeLinecap="round" />
        <Line x1="17" y1="8" x2="12" y2="6" stroke="#7a3526" strokeWidth="1.4" strokeLinecap="round" />
        <Line x1="28" y1="15" x2="31" y2="8" stroke="#7a3526" strokeWidth="1.4" strokeLinecap="round" />
        <Line x1="31" y1="8" x2="36" y2="6" stroke="#7a3526" strokeWidth="1.4" strokeLinecap="round" />
        <Ellipse cx="12" cy="6" rx="1.4" ry="1.4" fill="#7a3526" />
        <Ellipse cx="36" cy="6" rx="1.4" ry="1.4" fill="#7a3526" />
        <Line x1="20" y1="29" x2="12" y2="25" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="12" y1="25" x2="8" y2="28" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="19.5" y1="31" x2="11" y2="32.5" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="11" y1="32.5" x2="7" y2="37" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="20" y1="33" x2="13" y2="38" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="13" y1="38" x2="10" y2="44" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="28" y1="29" x2="36" y2="25" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="36" y1="25" x2="40" y2="28" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="28.5" y1="31" x2="37" y2="32.5" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="37" y1="32.5" x2="41" y2="37" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="28" y1="33" x2="35" y2="38" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <Line x1="35" y1="38" x2="38" y2="44" stroke="#7a3526" strokeWidth="1.5" strokeLinecap="round" />
        <Ellipse cx="24" cy="43" rx="9" ry="8" fill="#9c4431" />
        <Line x1="16.5" y1="41" x2="31.5" y2="41" stroke="#7a3526" strokeWidth="1.1" strokeLinecap="round" />
        <Line x1="16" y1="45" x2="32" y2="45" stroke="#7a3526" strokeWidth="1.1" strokeLinecap="round" />
        <Ellipse cx="20.5" cy="39.5" rx="2.6" ry="1.5" fill="#ffffff" opacity="0.2" />
        <Ellipse cx="24" cy="31" rx="5" ry="4.5" fill="#b5533c" />
        <Ellipse cx="24" cy="20" rx="8.5" ry="7.5" fill="#b5533c" />
        <Ellipse cx="21" cy="16.8" rx="2.2" ry="1.2" fill="#ffffff" opacity="0.25" />
        {eyes ? <EyesInline parts={parts} id="ant" /> : null}
        <Ellipse cx="22.2" cy="26.4" rx="1.3" ry="0.9" fill="#7a3526" />
        <Ellipse cx="25.8" cy="26.4" rx="1.3" ry="0.9" fill="#7a3526" />
      </Svg>
    )
  }

  if (id === 'possum') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Line x1="37" y1="41" x2="43" y2="38" stroke="#f2a7b4" strokeWidth="2.2" strokeLinecap="round" />
        <Line x1="43" y1="38" x2="43.5" y2="33" stroke="#f2a7b4" strokeWidth="2.2" strokeLinecap="round" />
        <Ellipse cx="13" cy="19" rx="5" ry="5.5" fill="#3a3438" />
        <Ellipse cx="35" cy="19" rx="5" ry="5.5" fill="#3a3438" />
        <Ellipse cx="13" cy="19.5" rx="3" ry="3.4" fill="#f2a7b4" />
        <Ellipse cx="35" cy="19.5" rx="3" ry="3.4" fill="#f2a7b4" />
        <Ellipse cx="24" cy="32" rx="15" ry="13.5" fill="#9b98a3" />
        <Ellipse cx="24" cy="29" rx="10.5" ry="9" fill="#f4f1ec" />
        <Ellipse cx="24" cy="34.5" rx="5.5" ry="4.2" fill="#f4f1ec" />
        {eyes ? <EyesInline parts={parts} id="possum" /> : null}
        <Ellipse cx="24" cy="37.2" rx="1.9" ry="1.4" fill="#e07a8a" />
        <Ellipse cx="15" cy="33.5" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.6" />
        <Ellipse cx="33" cy="33.5" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.6" />
        <Ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#9b98a3" />
        <Ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#9b98a3" />
        <Ellipse cx="17" cy="45" rx="3" ry="2" fill="#f2a7b4" />
        <Ellipse cx="31" cy="45" rx="3" ry="2" fill="#f2a7b4" />
      </Svg>
    )
  }

  if (id === 'frog') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Ellipse cx="16" cy="20" rx="7" ry="6.5" fill="#72c45e" />
        <Ellipse cx="32" cy="20" rx="7" ry="6.5" fill="#72c45e" />
        <Ellipse cx="24" cy="32" rx="16" ry="13" fill="#72c45e" />
        <Ellipse cx="24" cy="37" rx="10" ry="7" fill="#e4f4c4" />
        <Ellipse cx="11" cy="35" rx="1.8" ry="1.3" fill="#4e9a42" />
        <Ellipse cx="37" cy="34" rx="1.6" ry="1.2" fill="#4e9a42" />
        {eyes ? <EyesInline parts={parts} id="frog" /> : null}
        <Ellipse cx="22.5" cy="27.5" rx="0.6" ry="0.45" fill="#2f5a28" />
        <Ellipse cx="25.5" cy="27.5" rx="0.6" ry="0.45" fill="#2f5a28" />
        <Path d="M17 30 Q24 35.5 31 30" fill="none" stroke="#2f5a28" strokeWidth="1.3" strokeLinecap="round" />
        <Ellipse cx="12.5" cy="30.5" rx="2.4" ry="1.4" fill="#f59aa8" opacity="0.75" />
        <Ellipse cx="35.5" cy="30.5" rx="2.4" ry="1.4" fill="#f59aa8" opacity="0.75" />
        <Ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#72c45e" />
        <Ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#72c45e" />
        <Ellipse cx="17" cy="45" rx="3" ry="2" fill="#e4f4c4" />
        <Ellipse cx="31" cy="45" rx="3" ry="2" fill="#e4f4c4" />
      </Svg>
    )
  }

  if (id === 'penguin') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Ellipse cx="11" cy="33" rx="3.4" ry="8" fill="#344157" transform="rotate(22 11 33)" />
        <Ellipse cx="37" cy="33" rx="3.4" ry="8" fill="#344157" transform="rotate(-22 37 33)" />
        <Ellipse cx="24" cy="31" rx="14.5" ry="15" fill="#344157" />
        <Ellipse cx="19.5" cy="27" rx="6.2" ry="6.8" fill="#f7f5f0" />
        <Ellipse cx="28.5" cy="27" rx="6.2" ry="6.8" fill="#f7f5f0" />
        <Ellipse cx="24" cy="37.5" rx="9" ry="7.5" fill="#f7f5f0" />
        <Ellipse cx="20.5" cy="18.5" rx="2.6" ry="1.4" fill="#ffffff" opacity="0.2" />
        {eyes ? <EyesInline parts={parts} id="penguin" /> : null}
        <Polygon points="21.5,30.5 26.5,30.5 24,34" fill="#f5a524" />
        <Ellipse cx="15.5" cy="31.5" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <Ellipse cx="32.5" cy="31.5" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <Ellipse cx="17" cy="45" rx="4.5" ry="2.8" fill="#f5a524" />
        <Ellipse cx="31" cy="45" rx="4.5" ry="2.8" fill="#f5a524" />
        <Ellipse cx="17" cy="45.6" rx="2.8" ry="1.5" fill="#ffc766" />
        <Ellipse cx="31" cy="45.6" rx="2.8" ry="1.5" fill="#ffc766" />
      </Svg>
    )
  }

  if (id === 'fox') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Ellipse cx="36.5" cy="41.5" rx="9" ry="4.6" fill="#e8743b" transform="rotate(-32 36.5 41.5)" />
        <Ellipse cx="42.8" cy="37.2" rx="3.3" ry="2.6" fill="#fff6ea" transform="rotate(-32 42.8 37.2)" />
        <Polygon points="10.5,21 20.5,21 15.5,9" fill="#e8743b" />
        <Polygon points="27.5,21 37.5,21 32.5,9" fill="#e8743b" />
        <Polygon points="13.1,20 18.3,20 15.7,13" fill="#3a2a22" />
        <Polygon points="29.699999999999996,20 34.9,20 32.3,13" fill="#3a2a22" />
        <Ellipse cx="24" cy="31" rx="14.5" ry="14" fill="#e8743b" />
        <Ellipse cx="17" cy="34.5" rx="5.6" ry="4.4" fill="#fff6ea" />
        <Ellipse cx="31" cy="34.5" rx="5.6" ry="4.4" fill="#fff6ea" />
        <Ellipse cx="24" cy="38" rx="7.5" ry="6" fill="#fff6ea" />
        {eyes ? <EyesInline parts={parts} id="fox" /> : null}
        <Ellipse cx="24" cy="32.6" rx="1.7" ry="1.2" fill="#2d241c" />
        <Ellipse cx="14.5" cy="31.8" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <Ellipse cx="33.5" cy="31.8" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <Ellipse cx="17" cy="45" rx="4.5" ry="2.8" fill="#3a2a22" />
        <Ellipse cx="31" cy="45" rx="4.5" ry="2.8" fill="#3a2a22" />
      </Svg>
    )
  }

  if (id === 'otter') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Ellipse cx="11" cy="22" rx="4" ry="3.6" fill="#8a5a36" />
        <Ellipse cx="37" cy="22" rx="4" ry="3.6" fill="#8a5a36" />
        <Ellipse cx="24" cy="31" rx="15" ry="14" fill="#a06a40" />
        <Ellipse cx="24" cy="34" rx="10" ry="8.5" fill="#f1dcc0" />
        {eyes ? <EyesInline parts={parts} id="otter" /> : null}
        <Ellipse cx="24" cy="31.5" rx="2.6" ry="1.9" fill="#2b2018" />
        <Path d="M21.5 34 Q24 36.2 26.5 34" fill="none" stroke="#2b2018" strokeWidth="1" strokeLinecap="round" />
        <Path d="M17 33 L11 32 M31 33 L37 32" fill="none" stroke="#7a5038" strokeWidth="0.7" strokeLinecap="round" />
        <Path d="M19 41 L24 37 L29 41 Q24 44 19 41 Z" fill="#f6b8c4" stroke="#d98aa0" strokeWidth="0.8" strokeLinejoin="round" />
        <Path d="M24 37.8 V42.4 M24 37.8 L21.4 41.7 M24 37.8 L26.6 41.7" fill="none" stroke="#d98aa0" strokeWidth="0.6" strokeLinecap="round" />
        <Ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#8a5a36" />
        <Ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#8a5a36" />
      </Svg>
    )
  }

  if (id === 'hedgehog') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Polygon points="9.97,34.75 5.71,32.95 9.42,30.22 6.07,27.07 10.52,25.79 8.43,21.63 13.12,21.93 12.53,17.23 16.94,19.09 17.93,14.39 21.56,17.59 24,13.4 26.44,17.59 30.07,14.39 31.06,19.09 35.47,17.23 34.88,21.93 39.57,21.63 37.48,25.79 41.93,27.07 38.58,30.22 42.29,32.95 38.03,34.75" fill="#7a5a46" />
        <Ellipse cx="24" cy="31" rx="15" ry="14" fill="#8f6a52" />
        <Path d="M16 21.5 L14.6 19.4 M20.3 19.4 L19.6 17.1 M24 18.8 V16.4 M27.7 19.4 L28.4 17.1 M32 21.5 L33.4 19.4" fill="none" stroke="#b08a6c" strokeWidth="0.9" strokeLinecap="round" />
        <Ellipse cx="13.6" cy="25" rx="2.6" ry="2.4" fill="#e8b89a" />
        <Ellipse cx="34.4" cy="25" rx="2.6" ry="2.4" fill="#e8b89a" />
        <Ellipse cx="24" cy="34" rx="12" ry="10.5" fill="#f3d9b6" />
        {eyes ? <EyesInline parts={parts} id="hedgehog" /> : null}
        <Ellipse cx="24" cy="33" rx="2.2" ry="1.6" fill="#2b2018" />
        <Path d="M22 35.4 Q24 37 26 35.4" fill="none" stroke="#2b2018" strokeWidth="1" strokeLinecap="round" />
        <Ellipse cx="14.8" cy="33.2" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <Ellipse cx="33.2" cy="33.2" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <Ellipse cx="17" cy="45" rx="4.5" ry="2.8" fill="#c48f72" />
        <Ellipse cx="31" cy="45" rx="4.5" ry="2.8" fill="#c48f72" />
      </Svg>
    )
  }

  if (id === 'panda') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Ellipse cx="12.5" cy="19.5" rx="4.8" ry="4.6" fill="#2f2c33" />
        <Ellipse cx="35.5" cy="19.5" rx="4.8" ry="4.6" fill="#2f2c33" />
        <Ellipse cx="24" cy="31" rx="15" ry="14" fill="#f4f1ea" />
        <Ellipse cx="11" cy="38.5" rx="3.6" ry="5.4" fill="#2f2c33" transform="rotate(28 11 38.5)" />
        <Ellipse cx="37" cy="38.5" rx="3.6" ry="5.4" fill="#2f2c33" transform="rotate(-28 37 38.5)" />
        <Ellipse cx="18" cy="28.2" rx="3.9" ry="4.9" fill="#2f2c33" transform="rotate(32 18 28.2)" />
        <Ellipse cx="30" cy="28.2" rx="3.9" ry="4.9" fill="#2f2c33" transform="rotate(-32 30 28.2)" />
        {eyes ? <EyesInline parts={parts} id="panda" /> : null}
        <Ellipse cx="24" cy="33.4" rx="2.1" ry="1.5" fill="#2f2c33" />
        <Path d="M22 35.4 Q24 37 26 35.4" fill="none" stroke="#2f2c33" strokeWidth="1" strokeLinecap="round" />
        <Ellipse cx="13.6" cy="34" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <Ellipse cx="34.4" cy="34" rx="2.2" ry="1.3" fill="#f59aa8" opacity="0.7" />
        <Ellipse cx="17" cy="45" rx="4.5" ry="2.8" fill="#2f2c33" />
        <Ellipse cx="31" cy="45" rx="4.5" ry="2.8" fill="#2f2c33" />
      </Svg>
    )
  }

  if (id === 'duck') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Path d="M24 17 Q22 11 25 8 Q25 12 28 13 Q27 9 30 8 Q29 13 27 17 Z" fill="#ffd34d" />
        <Ellipse cx="24" cy="31" rx="15" ry="14" fill="#ffd34d" />
        <Path d="M9.5 33 Q5.5 35 6.5 39 Q10.5 39 12.5 36 Z M38.5 33 Q42.5 35 41.5 39 Q37.5 39 35.5 36 Z" fill="#f3bd2e" />
        <Ellipse cx="24" cy="36" rx="9" ry="6.5" fill="#fff1b8" />
        {eyes ? <EyesInline parts={parts} id="duck" /> : null}
        <Path d="M18.5 31 Q24 28 29.5 31 Q24 35.5 18.5 31 Z" fill="#ff9a3c" stroke="#e07a22" strokeWidth="0.8" strokeLinejoin="round" />
        <Ellipse cx="13.5" cy="31" rx="2.4" ry="1.5" fill="#f08a7a" opacity="0.55" />
        <Ellipse cx="34.5" cy="31" rx="2.4" ry="1.5" fill="#f08a7a" opacity="0.55" />
        <Path d="M13 43 H22 L20 47 H15 Z M26 43 H35 L33 47 H28 Z" fill="#ff9a3c" />
      </Svg>
    )
  }

  // The gills stay still: the shop sway turns the whole buddy, not its parts.
  if (id === 'axolotl') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Ellipse cx="24" cy="43" rx="8.5" ry="6" fill="#ffc2d4" />
        <Ellipse cx="24" cy="44" rx="5" ry="3.6" fill="#ffe6ee" />
        <Path d="M31 44 Q37 44 39 40 Q39.5 44 36 46 Q34 47 31 46.5 Z" fill="#f2a4bd" />
        <Path d="M9.5 19.75 C5.82 21.09 2.18 18.99 2.23 15.55 C5.18 13.79 8.82 15.89 9.5 19.75 Z M9 25 C6.22 27.9 1.76 27.75 0.08 24.69 C1.97 21.75 6.43 21.91 9 25 Z M9.5 30.25 C8.82 34.01 5.35 35.86 2.55 33.95 C2.53 30.56 6.01 28.71 9.5 30.25 Z M38.5 19.75 C39.18 15.89 42.82 13.79 45.77 15.55 C45.82 18.99 42.18 21.09 38.5 19.75 Z M39 25 C41.57 21.91 46.03 21.75 47.92 24.69 C46.24 27.75 41.78 27.9 39 25 Z M38.5 30.25 C41.99 28.71 45.47 30.56 45.45 33.95 C42.65 35.86 39.18 34.01 38.5 30.25 Z" fill="#ff6f91" />
        <Path d="M8.46 19.15 L3.78 16.45 M7.8 24.96 L1.88 24.75 M8.44 30.81 L4.14 33.1 M39.54 19.15 L44.22 16.45 M40.2 24.96 L46.12 24.75 M39.56 30.81 L43.86 33.1" fill="none" stroke="#e2426e" strokeWidth="1" strokeLinecap="round" opacity="0.75" />
        <Ellipse cx="24" cy="26" rx="15.5" ry="13.5" fill="#ffc2d4" />
        <Ellipse cx="24" cy="30.5" rx="10" ry="6.5" fill="#ffe6ee" opacity="0.6" />
        {eyes ? <EyesInline parts={parts} id="axolotl" /> : null}
        <Path d="M21 31 Q22.5 32.65 24 31 Q25.5 32.65 27 31" fill="none" stroke="#2d1a20" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
        <Ellipse cx="12.5" cy="31" rx="2.3" ry="1.4" fill="#ff6f91" opacity="0.55" />
        <Ellipse cx="35.5" cy="31" rx="2.3" ry="1.4" fill="#ff6f91" opacity="0.55" />
        <Ellipse cx="19" cy="48.5" rx="3" ry="2" fill="#f2a4bd" />
        <Ellipse cx="29" cy="48.5" rx="3" ry="2" fill="#f2a4bd" />
      </Svg>
    )
  }

  if (id === 'turtle') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Ellipse cx="17" cy="46" rx="4.5" ry="3" fill="#8fd27a" />
        <Ellipse cx="31" cy="46" rx="4.5" ry="3" fill="#8fd27a" />
        <Path d="M7.5 42 C7.5 28 14.5 23 24 23 C33.5 23 40.5 28 40.5 42 Q24 47 7.5 42 Z" fill="#6e4f27" />
        <Path d="M9.6 40.8 C9.6 29.5 15.6 25.2 24 25.2 C32.4 25.2 38.4 29.5 38.4 40.8 Q24 45 9.6 40.8 Z" fill="#a0753e" />
        <Path d="M18.6 35.5 H29.4 L31 41.6 Q24 43.8 17 41.6 Z M11.3 39.8 C11.2 34 12.8 30.2 16.2 28.4 L17.2 35 L15.6 41.1 Q13 40.8 11.3 39.8 Z M36.7 39.8 C36.8 34 35.2 30.2 31.8 28.4 L30.8 35 L32.4 41.1 Q35 40.8 36.7 39.8 Z" fill="#c99f62" />
        <Path d="M8.4 41.8 Q24 46.6 39.6 41.8" fill="none" stroke="#e2c58c" strokeWidth="1.5" strokeLinecap="round" />
        <Ellipse cx="13.2" cy="33.5" rx="1.1" ry="2.8" fill="#ffffff" opacity="0.3" transform="rotate(22 13.2 33.5)" />
        <Ellipse cx="24" cy="25" rx="11.2" ry="10" fill="#9edb86" />
        {eyes ? <EyesInline parts={parts} id="turtle" /> : null}
        <Path d="M21.8 29.4 Q24 31.2 26.2 29.4" fill="none" stroke="#2f5a28" strokeWidth="1" strokeLinecap="round" />
        <Ellipse cx="15.8" cy="28.6" rx="2.1" ry="1.2" fill="#f59aa8" opacity="0.7" />
        <Ellipse cx="32.2" cy="28.6" rx="2.1" ry="1.2" fill="#f59aa8" opacity="0.7" />
      </Svg>
    )
  }

  if (id === 'hive') {
    return (
      <Svg width={width} height={height} viewBox="0 0 48 58">
        <Ellipse cx="11" cy="18" rx="6" ry="8" fill="#dff3ff" opacity="0.9" stroke="#8fb8d4" strokeWidth="1" transform="rotate(-25 11 18)" />
        <Ellipse cx="37" cy="18" rx="6" ry="8" fill="#dff3ff" opacity="0.9" stroke="#8fb8d4" strokeWidth="1" transform="rotate(25 37 18)" />
        <Path d="M19 17 Q16 10 13 8 M29 17 Q32 10 35 8" fill="none" stroke="#2b2018" strokeWidth="1.4" strokeLinecap="round" />
        <Ellipse cx="13" cy="8" rx="2.2" ry="2.2" fill="#2b2018" />
        <Ellipse cx="35" cy="8" rx="2.2" ry="2.2" fill="#2b2018" />
        <Ellipse cx="24" cy="31" rx="15" ry="14" fill="#f6c443" />
        <Path d="M10.5 35 Q24 40 37.5 35 V38.4 Q24 43.4 10.5 38.4 Z M12 41.5 Q24 45.5 36 41.5 L34 44.1 Q24 47.1 14 44.1 Z" fill="#2b2018" />
        {eyes ? <EyesInline parts={parts} id="hive" /> : null}
        <Ellipse cx="14" cy="32" rx="2.4" ry="1.5" fill="#f08a7a" opacity="0.55" />
        <Ellipse cx="34" cy="32" rx="2.4" ry="1.5" fill="#f08a7a" opacity="0.55" />
        <Path d="M22 31.5 Q24 33.3 26 31.5" fill="none" stroke="#2b2018" strokeWidth="1" strokeLinecap="round" />
        <Ellipse cx="17" cy="47" rx="4.2" ry="2.8" fill="#2b2018" />
        <Ellipse cx="31" cy="47" rx="4.2" ry="2.8" fill="#2b2018" />
      </Svg>
    )
  }

  return null
}
