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
        <Ellipse cx="19.8" cy="26.5" rx="2.2" ry="2.8" fill="#2d241c" />
        <Ellipse cx="28.2" cy="26.5" rx="2.2" ry="2.8" fill="#2d241c" />
        <Ellipse cx="20.5" cy="25.6" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
        <Ellipse cx="28.9" cy="25.6" rx="0.7" ry="0.9" fill="#ffffff" opacity="0.9" />
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

  return null
}
