import { View } from 'react-native'
import { svgParts } from '../lib/svg-parts.js'

const COAT = {
  cat: { body: '#f0a64a', belly: '#ffe8c8', ear: '#f0a64a' },
  dog: { body: '#c68b52', belly: '#f3ddc4', ear: '#9a6538' },
  rabbit: { body: '#b8b8c8', belly: '#e8e8f0', ear: '#f0b8c8' },
  owl: { body: '#8b6b4a', belly: '#d4c4a8', ear: '#6b5038' },
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

export function BuddyArt({ id, width = 48, height = 58 }) {
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
        <Ellipse cx="18" cy="28" rx="2.2" ry="3" fill="#2d241c" />
        <Ellipse cx="30" cy="28" rx="2.2" ry="3" fill="#2d241c" />
        <Ellipse cx="18.8" cy="27" rx="0.7" ry="0.9" fill="#fff" opacity="0.9" />
        <Ellipse cx="30.8" cy="27" rx="0.7" ry="0.9" fill="#fff" opacity="0.9" />
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
        <Ellipse cx="18" cy="27" rx="2.3" ry="3.1" fill="#2d241c" />
        <Ellipse cx="30" cy="27" rx="2.3" ry="3.1" fill="#2d241c" />
        <Ellipse cx="19" cy="26" rx="0.7" ry="0.9" fill="#fff" opacity="0.9" />
        <Ellipse cx="31" cy="26" rx="0.7" ry="0.9" fill="#fff" opacity="0.9" />
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
        <Ellipse cx="18" cy="29" rx="2" ry="2.8" fill="#2d241c" />
        <Ellipse cx="30" cy="29" rx="2" ry="2.8" fill="#2d241c" />
        <Ellipse cx="18.7" cy="28.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9" />
        <Ellipse cx="30.7" cy="28.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9" />
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
        <Ellipse cx="18" cy="28" rx="4" ry="4.5" fill="#f0e080" />
        <Ellipse cx="30" cy="28" rx="4" ry="4.5" fill="#f0e080" />
        <Ellipse cx="18" cy="28" rx="2" ry="2.5" fill="#2d241c" />
        <Ellipse cx="30" cy="28" rx="2" ry="2.5" fill="#2d241c" />
        <Ellipse cx="18.5" cy="27.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9" />
        <Ellipse cx="30.5" cy="27.2" rx="0.6" ry="0.8" fill="#fff" opacity="0.9" />
        <Polygon points="24,31 22,34 26,34" fill="#d4a040" />
        <Ellipse cx="24" cy="38" rx="7" ry="6" fill="#c4a882" />
        <Ellipse cx="17" cy="44" rx="4.5" ry="3.2" fill="#8b6b4a" />
        <Ellipse cx="31" cy="44" rx="4.5" ry="3.2" fill="#8b6b4a" />
        <Ellipse cx="17" cy="45" rx="3" ry="2" fill="#c4a882" />
        <Ellipse cx="31" cy="45" rx="3" ry="2" fill="#c4a882" />
      </Svg>
    )
  }

  return null
}
