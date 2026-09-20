import { StyleSheet, View } from 'react-native'
import { BuddyArt } from './BuddyArt.jsx'
const LOOK_ON = {
  lime: '#c9f24d',
  ink: '#b8c48a',
  brass: '#e2c36a',
  night: '#d4c07a',
  glow: '#5ee8ff',
  moss: '#8fd48a',
  plum: '#c49cff',
  rose: '#ff8ab0',
  steel: '#9eb4d4',
  wine: '#d47a8a',
  frost: '#b8e8ff',
  pulse: '#ff6ec8',
  ember: '#ff9a4a',
}

const CHEER_ON = {
  lime: '#c9f24d',
  tape: '#f4d35e',
  paper: '#f8f4e8',
  boom: '#ff6f61',
  night: '#6fb7ff',
  dance: '#ff8ab0',
  stamp: '#e07a8a',
  rain: '#8fd4ff',
  check: '#8fd48a',
  bubble: '#c9f0ff',
  spark: '#fff6a8',
  flip: '#c9f24d',
}

export function LookChip({ id, colors }) {
  const on = LOOK_ON[id] || colors?.on || '#c9f24d'
  return (
    <View style={[styles.lookChip, { borderColor: colors?.line || '#2b3140' }]}>
      <View style={[styles.lookDot, { backgroundColor: on }]} />
      <View style={[styles.lookDot, { backgroundColor: on, opacity: 0.7 }]} />
      <View style={[styles.lookDot, { backgroundColor: on, opacity: 0.45 }]} />
    </View>
  )
}

export function CheerChip({ id, stage = 1, colors }) {
  const n = Math.min(5, Math.max(1, Math.floor(Number(stage) || 1)))
  const accent = CHEER_ON[id] || colors?.on || '#c9f24d'
  if (id === 'lime') {
    return (
      <View style={styles.cheerChip}>
        {[0.5, 0.95, 1.35].slice(0, n).map((size) => (
          <View
            key={size}
            style={[
              styles.limeRing,
              {
                width: size * 14,
                height: size * 14,
                borderRadius: size * 7,
                borderColor: accent,
              },
            ]}
          />
        ))}
      </View>
    )
  }
  if (id === 'spark') {
    return (
      <View style={styles.cheerChip}>
        {[0, 45, 90, 135, 225].slice(0, n).map((deg) => (
          <View
            key={deg}
            style={[
              styles.sparkRay,
              {
                backgroundColor: deg % 90 === 0 ? accent : colors?.onDeep || accent,
                transform: [{ rotate: `${deg}deg` }],
              },
            ]}
          />
        ))}
      </View>
    )
  }
  return (
    <View style={styles.cheerChip}>
      {Array.from({ length: n }).map((_, i) => (
        <View key={i} style={[styles.cheerBit, { backgroundColor: accent, opacity: 1 - i * 0.12 }]} />
      ))}
    </View>
  )
}

export function BuddyChip({ id }) {
  if (!id) return null
  return (
    <View style={styles.buddyChip}>
      <BuddyArt id={id} width={28} height={34} />
    </View>
  )
}

export function BuddyHang({ id, inline = false }) {
  if (!id) return null
  return (
    <View style={inline ? styles.buddyInline : styles.buddyHang} pointerEvents="none">
      <BuddyArt id={id} width={inline ? 48 : 40} height={inline ? 58 : 48} />
    </View>
  )
}

const styles = StyleSheet.create({
  lookChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#16191f',
  },
  lookDot: { width: 6, height: 6, borderRadius: 3 },
  cheerChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16191f',
    overflow: 'hidden',
  },
  cheerBit: { width: 5, height: 5, borderRadius: 1, margin: 1 },
  limeRing: { position: 'absolute', borderWidth: 2, backgroundColor: 'transparent' },
  sparkRay: {
    position: 'absolute',
    width: 2,
    height: 14,
    borderRadius: 1,
    top: 11,
    left: 17,
    transformOrigin: 'bottom center',
  },
  buddyChip: { width: 36, height: 36, alignItems: 'center', justifyContent: 'flex-end' },
  buddyHang: { position: 'absolute', top: -8, right: 12, zIndex: 2 },
  buddyInline: { alignItems: 'center', justifyContent: 'center' },
})
