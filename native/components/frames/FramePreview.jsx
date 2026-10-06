// A small still tile for shop and collection grids: a mini card wearing the
// frame. It draws the frame at a fixed base size and scales the whole tile,
// so corners and gems keep the same proportions as on a real card.
import { StyleSheet, View } from 'react-native'
import { CardFrame } from './CardFrame.jsx'

const BASE_W = 220
const BASE_H = 264
const BASE_R = 30
const WEEK = [true, true, true, true, false, true, true]

export function FramePreview({ id, colors = {}, size = 120 }) {
  const height = Math.round(size * 1.2)
  const k = (size * 0.66) / BASE_W
  const card = colors.card || colors.panel
  return (
    <View pointerEvents="none" style={[styles.tile, { width: size, height }]}>
      <View style={{ position: 'absolute', left: (size - BASE_W) / 2, top: (height - BASE_H) / 2, width: BASE_W, height: BASE_H, transform: [{ scale: k }] }}>
        <CardFrame id={id} colors={colors} active={false} streak={30} answered={3} total={4} weekLit={WEEK} radius={BASE_R}>
          <View style={[styles.card, { backgroundColor: card, borderColor: colors.line }]}>
            <View style={[styles.kicker, { backgroundColor: colors.on }]} />
            <View style={[styles.title, { backgroundColor: colors.ink }]} />
            <View style={[styles.title, styles.short, { backgroundColor: colors.ink }]} />
            <View style={styles.dots}>
              {WEEK.map((on, i) => (
                <View key={i} style={[styles.dot, { backgroundColor: on ? colors.on : colors.miss || colors.line }]} />
              ))}
            </View>
          </View>
        </CardFrame>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  tile: { overflow: 'hidden' },
  card: { width: BASE_W, height: BASE_H, borderRadius: BASE_R, borderWidth: 1, padding: 20, gap: 12 },
  kicker: { width: 54, height: 9, borderRadius: 5 },
  title: { width: '86%', height: 18, borderRadius: 9, opacity: 0.85 },
  short: { width: '58%' },
  dots: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto' },
  dot: { width: 14, height: 14, borderRadius: 7 },
})
