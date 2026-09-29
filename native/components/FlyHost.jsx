import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'

// Things that fly across the app above every screen: a bought item into the
// Collection badge, gems into the balance. A flight is in window points:
//   { from: { x, y, w, h }, to: { x, y }, art, size, delay, ms, hop, onLand }
// `to` is where its middle lands, `size` how big it is by then, and `onLand`
// runs as it lands, on a timer so it always runs.

const FLY_MS = 620
const FLY_HOP = 70

let flights = []
let nextId = 1
const listeners = new Set()

function emit() {
  const now = flights
  listeners.forEach((fn) => fn(now))
}

export function launchFlight(flight) {
  const id = nextId++
  flights = [...flights, { ...flight, id }]
  emit()
  return id
}

function done(id) {
  flights = flights.filter((flight) => flight.id !== id)
  emit()
}

export function FlyHost() {
  const [now, setNow] = useState(flights)
  const [origin, setOrigin] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    listeners.add(setNow)
    setNow(flights)
    return () => {
      listeners.delete(setNow)
    }
  }, [])

  return (
    <View
      ref={ref}
      collapsable={false}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={() => ref.current?.measureInWindow?.((x, y) => setOrigin({ x, y }))}
    >
      {origin ? now.map((flight) => <Flyer key={flight.id} flight={flight} origin={origin} />) : null}
    </View>
  )
}

function Flyer({ flight, origin }) {
  const { id, from, to, art, delay = 0, ms = FLY_MS, hop = FLY_HOP } = flight
  const p = useSharedValue(0)
  const x0 = from.x - origin.x + from.w / 2
  const y0 = from.y - origin.y + from.h / 2
  const x1 = to.x - origin.x
  const y1 = to.y - origin.y
  const end = Math.min(1, (flight.size || from.w) / Math.max(from.w, from.h, 1))
  const w = from.w
  const h = from.h

  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: ms, easing: Easing.inOut(Easing.cubic) }))
    const landing = setTimeout(() => flight.onLand?.(), delay + ms)
    const gone = setTimeout(() => done(id), delay + ms + 30)
    return () => {
      clearTimeout(landing)
      clearTimeout(gone)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const moving = useAnimatedStyle(() => {
    const at = p.value
    const x = x0 + (x1 - x0) * at
    const y = y0 + (y1 - y0) * at - hop * Math.sin(Math.PI * at)
    return {
      opacity: at <= 0 ? 0 : at < 0.85 ? 1 : (1 - at) / 0.15,
      transform: [{ translateX: x - w / 2 }, { translateY: y - h / 2 }, { scale: 1 + (end - 1) * at }],
    }
  })

  return <Animated.View style={[styles.flyer, { width: w, height: h }, moving]}>{art}</Animated.View>
}

const styles = StyleSheet.create({
  flyer: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
})
