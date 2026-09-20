import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { readReduceMotion } from '../../src/lib/useReduceMotion.js'
import { feelTap } from '../../src/lib/native.js'

const KINDS = {
  lime: ['#b8ff3c', '#d4ff7a'],
  spark: ['#ffd54a', '#fff3b0'],
  boom: ['#6ecbff', '#b8ff3c', '#ffd54a'],
  dance: ['#b8ff3c'],
  tape: ['#e8e4d8'],
  paper: ['#f5f0e6'],
  night: ['#8b9cff', '#e8ecff'],
  rain: ['#7ec8e3'],
  bubble: ['#b8ff3c', '#ffffff'],
  stamp: ['#b8ff3c'],
  check: ['#b8ff3c'],
  flip: ['#ffd54a'],
}

function Particle({ color, delay, size, x, y, onDone }) {
  const scale = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 900,
          delay: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(onDone)
  }, [delay, onDone, opacity, scale])

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  )
}

export function CheerBurst() {
  const reduce = readReduceMotion()
  const [burst, setBurst] = useState(null)
  const [particles, setParticles] = useState([])

  useEffect(() => {
    function onCheer(event) {
      if (reduce) {
        feelTap('did')
        return
      }
      const kind = event.detail?.kind || 'lime'
      const stage = Math.min(5, Math.max(1, Number(event.detail?.stage) || 1))
      const palette = KINDS[kind] || KINDS.lime
      const count = 4 + stage * 2
      const next = []
      for (let i = 0; i < count; i += 1) {
        next.push({
          id: `${Date.now()}-${i}`,
          color: palette[i % palette.length],
          delay: i * 40,
          size: 8 + (i % 4) * 6,
          x: `${12 + ((i * 17) % 76)}%`,
          y: `${18 + ((i * 23) % 64)}%`,
        })
      }
      setParticles(next)
      setBurst({ kind, key: Date.now() })
      feelTap('hall-on')
    }
    window.addEventListener('did-i-cheer', onCheer)
    return () => window.removeEventListener('did-i-cheer', onCheer)
  }, [reduce])

  useEffect(() => {
    if (!burst) return undefined
    const timer = setTimeout(() => {
      setBurst(null)
      setParticles([])
    }, 1400)
    return () => clearTimeout(timer)
  }, [burst])

  if (reduce || !burst || !particles.length) return null

  return (
    <View pointerEvents="none" style={styles.layer}>
      {particles.map((bit) => (
        <Particle key={bit.id} {...bit} onDone={() => {}} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  particle: {
    position: 'absolute',
  },
})
