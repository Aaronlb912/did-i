import { useEffect, useMemo, useState } from 'react'
import { AppState, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { useTheme } from '../../src/lib/prefs.js'
import { svgParts } from '../lib/svg-parts.js'
import { SKY_FPS, SKY_RUN_MS, STARS, isDaytime, moonAt, moonPath, moonPhase, starAt, sunAt } from '../lib/night-sky.js'

const MOON_R = 20
const SUN_R = 20

/**
 * The phone's local time, read again once a minute while the screen is open
 * and on return to the app. Held still under Reduce Motion.
 */
export function useSkyClock() {
  const reduce = useReduceMotion()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (reduce) return undefined
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') setNow(new Date())
    }, 60000)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(new Date())
    })
    return () => {
      clearInterval(timer)
      sub.remove()
    }
  }, [reduce])
  return now
}

/**
 * A quiet night behind the done card: a few stars drift and twinkle while
 * tonight's moon phase crosses slowly, stepping a handful of times a second.
 * It holds still after SKY_RUN_MS. Off with Less motion and the phone's Reduce Motion.
 * By day (DAY_START_HOUR to DAY_END_HOUR, local) a sun sits on its arc instead.
 */
export function NightSky({ colors, now }) {
  const reduce = useReduceMotion()
  const day = isDaytime(now)
  const [box, setBox] = useState({ width: 0, height: 0 })
  const tick = useSharedValue(0)

  useEffect(() => {
    if (reduce || day) return undefined
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') tick.value += 1
    }, 1000 / SKY_FPS)
    const stop = setTimeout(() => clearInterval(timer), SKY_RUN_MS)
    return () => {
      clearInterval(timer)
      clearTimeout(stop)
    }
  }, [reduce, day, tick])

  if (reduce && !day) return null
  return (
    <View
      pointerEvents="none"
      style={styles.sky}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout
        setBox({ width, height })
      }}
    >
      {box.width > 0 && day ? (
        <Sun now={now} width={box.width} height={box.height} colors={colors} />
      ) : box.width > 0 ? (
        <>
          {STARS.map((star, index) => (
            <Star key={index} star={star} index={index} tick={tick} box={box} color={colors.on} />
          ))}
          <Moon tick={tick} width={box.width} height={box.height} colors={colors} />
        </>
      ) : null}
    </View>
  )
}

function Star({ star, index, tick, box, color }) {
  const top = star.y * Math.max(0, box.height - star.size)
  const moving = useAnimatedStyle(() => {
    const at = starAt(star, index, tick.value, box.width)
    return { opacity: at.opacity, transform: [{ translateX: at.x }, { translateY: top + at.bob }] }
  })
  return (
    <Animated.View
      style={[
        styles.star,
        { width: star.size, height: star.size, borderRadius: star.size, backgroundColor: color, boxShadow: `0 0 6px ${color}` },
        moving,
      ]}
    />
  )
}

function Moon({ tick, width, height, colors }) {
  const parts = svgParts()
  // A lit moon is pale: soft ink on a dark sky, the card white on a light one.
  const light = useTheme() === 'light'
  const lit = light ? colors.panel : colors.inkSoft
  const path = useMemo(() => moonPath(moonPhase(new Date()), MOON_R), [])
  const moving = useAnimatedStyle(() => {
    const at = moonAt(tick.value, width, MOON_R * 2)
    // Low in the sky, under the card: it never rises over the card's top edge (owner call).
    return { transform: [{ translateX: at.x }, { translateY: Math.max(0, height - MOON_R * 2 - 10) + at.bob }] }
  })
  if (!parts) return null
  const { Svg, Circle, Path } = parts
  const size = MOON_R * 2
  return (
    <Animated.View style={[styles.moon, moving]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* The moon hides the stars behind it, so it sits on a disc of the sky. */}
        <Circle cx={MOON_R} cy={MOON_R} r={MOON_R - 0.5} fill={colors.bg} stroke={light ? colors.line : colors.inkSoft} strokeOpacity={light ? 1 : 0.35} />
        <Path d={path} fill={lit} opacity={light ? 1 : 0.7} />
      </Svg>
    </Animated.View>
  )
}

function Sun({ now, width, height, colors }) {
  const parts = svgParts()
  if (!parts) return null
  const { Svg, Circle, Line } = parts
  const glow = SUN_R * 1.6
  // Placed by the glow's box, so the glow is never cut flat at the sky's edges.
  const size = glow * 2
  const at = sunAt(now, width, height, size)
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4
    return { x1: glow + Math.cos(a) * (SUN_R * 0.66), y1: glow + Math.sin(a) * (SUN_R * 0.66), x2: glow + Math.cos(a) * (SUN_R * 0.8), y2: glow + Math.sin(a) * (SUN_R * 0.8) }
  })
  return (
    <View style={[styles.moon, { transform: [{ translateX: at.x }, { translateY: at.y }] }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* As quiet as the moon: a faint glow, a pale core, faint short rays. */}
        <Circle cx={glow} cy={glow} r={glow} fill={colors.sunGlow} />
        <Circle cx={glow} cy={glow} r={SUN_R * 0.46} fill={colors.sun} opacity={0.8} />
        {rays.map((ray, i) => (
          <Line key={i} {...ray} stroke={colors.sun} strokeOpacity={0.35} strokeWidth={1.5} strokeLinecap="round" />
        ))}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  sky: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  star: { position: 'absolute', left: 0, top: 0 },
  moon: { position: 'absolute', left: 0, top: 0 },
})
