import { useEffect } from 'react'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { fonts } from '../theme.js'

// Iffy, the lime question mark that becomes a check. Big eyes only; the body
// does the acting. Drawn the same way as docs/ideas/iffy-draw.js.
// Poses: ask (tall, looking aside), did (a check, happy), sleep (lying flat).

let parts
function svg() {
  if (parts !== undefined) return parts
  try {
    const mod = require('react-native-svg')
    const Svg = mod && !mod.__didISvgFallback && (mod.default || mod.Svg)
    parts = Svg && mod.LinearGradient && mod.Mask ? { ...mod, Svg } : null
  } catch (error) {
    global.__didISvgError = String((error && error.message) || error)
    parts = null
  }
  return parts
}

const LIME = '#c9f24d'
const DEEP = '#7fa21a'

const POSES = {
  ask: { d: 'M64 66 C64 16 136 16 136 66 C136 102 100 110 100 138', w: 34, dot: [100, 174, 17], face: [100, 33, 1.35], gloss: 'M72 80 C68 58 70 46 77 38', eyes: 'side', tilt: 6, shadow: [100, 186, 38] },
  did: { d: 'M40 108 L80 148 L160 58', w: 38, face: [126, 94, 1.3], gloss: 'M50 101 L72 123', eyes: 'happy', tilt: 0, shadow: [100, 186, 38], sparkle: true },
  sleep: { d: 'M28 146 L62 172 L162 146', w: 36, face: [128, 155, 1.15], gloss: 'M38 140 L58 156', eyes: 'closed', tilt: 0, shadow: [96, 190, 64], night: true },
}

function Eyes({ S, kind }) {
  const { Circle, Path, G } = S
  return [-8.5, 8.5].map((x) => {
    if (kind === 'happy' || kind === 'closed') {
      const up = kind === 'happy'
      return <Path key={x} d={`M${x - 7} ${up ? 2 : -1} q7 ${up ? -9 : 7} 14 0`} fill="none" stroke="#111" strokeWidth={3.2} strokeLinecap="round" />
    }
    const dx = kind === 'side' ? 3.2 : 0.8
    return (
      <G key={x}>
        <Circle cx={x} cy={0} r={8} fill="#fff" />
        <Circle cx={x + dx} cy={0} r={4} fill="#111" />
        <Circle cx={x + dx + 1.5} cy={-1.6} r={1.4} fill="#fff" />
      </G>
    )
  })
}

/** Iffy in one pose, `size` points square. Nothing when svg is unavailable. */
export function Iffy({ pose = 'ask', size = 96, ink = '#a3abb8', still = false, style }) {
  const S = svg()
  const reduce = useReduceMotion()
  const bob = useSharedValue(0)
  const moving = !still && !reduce && pose !== 'did'

  useEffect(() => {
    if (!moving) return
    // A slow breath: up a little and back, forever. Sleep breathes slower.
    const ms = pose === 'sleep' ? 1800 : 1200
    const ease = Easing.inOut(Easing.quad)
    bob.value = withRepeat(withSequence(withTiming(1, { duration: ms, easing: ease }), withTiming(0, { duration: ms, easing: ease })), -1)
  }, [bob, moving, pose])

  const breathe = useAnimatedStyle(() => ({ transform: [{ translateY: -bob.value * size * 0.025 }] }))
  if (!S) return null
  const { Svg, Defs, LinearGradient, RadialGradient, Stop, Path, Circle, Ellipse, G, Mask, Rect, Text } = S
  const p = POSES[pose] || POSES.ask
  const [fx, fy, fs] = p.face

  return (
    <Animated.View style={[{ width: size, height: size }, breathe, style]} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="iffyBody" x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor="#e4ff7a" />
            <Stop offset="0.55" stopColor={LIME} />
            <Stop offset="1" stopColor="#9cc72a" />
          </LinearGradient>
          <RadialGradient id="iffyDot" cx="0.35" cy="0.3" r="0.8">
            <Stop offset="0" stopColor="#efffa6" />
            <Stop offset="0.5" stopColor={LIME} />
            <Stop offset="1" stopColor="#8fb51c" />
          </RadialGradient>
          {p.night ? (
            <Mask id="iffyMoon">
              <Rect x="0" y="0" width="200" height="200" fill="#fff" />
              <Circle cx="168" cy="34" r="15" fill="#000" />
            </Mask>
          ) : null}
        </Defs>
        <Ellipse cx={p.shadow[0]} cy={p.shadow[1]} rx={p.shadow[2]} ry={6} fill="#000" opacity={0.3} />
        <G rotation={p.tilt} origin="100, 120">
          <Path d={p.d} translate="2.5, 4" fill="none" stroke={DEEP} strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round" />
          <Path d={p.d} fill="none" stroke="url(#iffyBody)" strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round" />
          <Path d={p.gloss} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={4.5} strokeLinecap="round" />
          {p.dot ? (
            <G>
              <Circle cx={p.dot[0] + 2.5} cy={p.dot[1] + 3.5} r={p.dot[2]} fill={DEEP} />
              <Circle cx={p.dot[0]} cy={p.dot[1]} r={p.dot[2]} fill="url(#iffyDot)" />
              <Circle cx={p.dot[0] - p.dot[2] * 0.32} cy={p.dot[1] - p.dot[2] * 0.36} r={p.dot[2] * 0.26} fill="#fff" opacity={0.6} />
            </G>
          ) : null}
          <G translate={`${fx}, ${fy}`} scale={fs}>
            <Eyes S={S} kind={p.eyes} />
          </G>
        </G>
        {p.sparkle ? <Path translate="176, 36" d="M0 -12 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3 l9 -3z" fill="#ffd166" /> : null}
        {p.night ? (
          <G>
            <Circle cx="160" cy="40" r="17" fill="#fff4cf" mask="url(#iffyMoon)" />
            <Text x="104" y="118" fontFamily={fonts.uiBold} fontWeight="800" fontSize="20" fill={ink}>z</Text>
            <Text x="120" y="100" fontFamily={fonts.uiBold} fontWeight="800" fontSize="26" fill={ink}>z</Text>
          </G>
        ) : null}
      </Svg>
    </Animated.View>
  )
}
