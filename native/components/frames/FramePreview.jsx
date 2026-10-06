// A small still tile for shop and collection grids: a mini card wearing the
// frame. It draws the frame at a fixed base size and scales the whole tile,
// so corners and gems keep the same proportions as on a real card.
// Tiles never move (no clock, no particles), and the frame art mounts a few
// tiles at a time after the screen has opened, so a grid of 30 opens at once.
import { memo, useEffect, useState } from 'react'
import { InteractionManager, StyleSheet, View } from 'react-native'
import { CardFrame } from './CardFrame.jsx'

const BASE_W = 220
const BASE_H = 264
const BASE_R = 30
const WEEK = [true, true, true, true, false, true, true]
// The tile knows its size, so the art draws on the first frame, not after layout.
const FIXED = { w: BASE_W, h: BASE_H }
const PER_FRAME = 3

const queue = []
let pumping = false

function pump() {
  if (pumping) return
  pumping = true
  InteractionManager.runAfterInteractions(() => {
    const step = () => {
      queue.splice(0, PER_FRAME).forEach((fn) => fn())
      if (queue.length) requestAnimationFrame(step)
      else pumping = false
    }
    step()
  })
}

function useLazyReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    const fn = () => alive && setReady(true)
    queue.push(fn)
    pump()
    return () => {
      alive = false
      const i = queue.indexOf(fn)
      if (i >= 0) queue.splice(i, 1)
    }
  }, [])
  return ready
}

// Frames that draw their own row along the bottom edge (moons, stars) hide the
// sample dots, so the tile does not show two rows.
const OWN_ROW = new Set(['moon', 'gems'])

function MiniCard({ colors, weekLit, dots = true }) {
  const card = colors.card || colors.panel
  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: colors.line }]}>
      <View style={[styles.kicker, { backgroundColor: colors.on }]} />
      <View style={[styles.title, { backgroundColor: colors.ink }]} />
      <View style={[styles.title, styles.short, { backgroundColor: colors.ink }]} />
      <View style={[styles.dots, !dots && styles.noDots]}>
        {weekLit.map((on, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: on ? colors.on : colors.miss || colors.line }]} />
        ))}
      </View>
    </View>
  )
}

// The sample streak grows Vine; still tiles never print it (Polaroid shows the date only).
function Preview({ id, colors = {}, size = 120, weekLit = WEEK, streak = 30 }) {
  const ready = useLazyReady()
  const height = Math.round(size * 1.2)
  const k = (size * 0.66) / BASE_W
  const mini = <MiniCard colors={colors} weekLit={weekLit} dots={!OWN_ROW.has(id)} />
  return (
    <View pointerEvents="none" style={[styles.tile, { width: size, height }]}>
      <View style={{ position: 'absolute', left: (size - BASE_W) / 2, top: (height - BASE_H) / 2, width: BASE_W, height: BASE_H, transform: [{ scale: k }] }}>
        {ready ? (
          <CardFrame id={id} colors={colors} active={false} still streak={streak} answered={3} total={4} weekLit={weekLit} radius={BASE_R} fixedSize={FIXED}>
            {mini}
          </CardFrame>
        ) : (
          mini
        )}
      </View>
    </View>
  )
}

const COLOR_KEYS = ['card', 'panel', 'line', 'on', 'ink', 'inkDim', 'miss', 'freeze']
const sameWeek = (a = WEEK, b = WEEK) => a === b || a.join() === b.join()

export const FramePreview = memo(
  Preview,
  (a, b) =>
    a.id === b.id &&
    a.size === b.size &&
    a.streak === b.streak &&
    sameWeek(a.weekLit, b.weekLit) &&
    (a.colors === b.colors || COLOR_KEYS.every((key) => a.colors?.[key] === b.colors?.[key])),
)

const styles = StyleSheet.create({
  tile: { overflow: 'hidden' },
  card: { width: BASE_W, height: BASE_H, borderRadius: BASE_R, borderWidth: 1, padding: 20, gap: 12 },
  kicker: { width: 54, height: 9, borderRadius: 5 },
  title: { width: '86%', height: 18, borderRadius: 9, opacity: 0.85 },
  short: { width: '58%' },
  dots: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto' },
  dot: { width: 14, height: 14, borderRadius: 7 },
  noDots: { opacity: 0 },
})
