import { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import { starterBlank } from '../../src/lib/starters.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { fonts, sectionLabel } from '../theme.js'

const WAVE_STEP = 70
const WOBBLE = [-1, 1, -0.6, 0.6, 0]
const WOBBLE_STEP = 90
// Gaps between wobbles: 5s, then 10s, then every 20s after that.
const WOBBLE_GAPS = [5000, 10000, 20000]

// Each idea rocks in turn, left to right, as a "tap one of these" cue.
// It repeats while `active`; `nudge` runs it right now.
export function useWobble(count, active, reduce) {
  const rocks = useRef([]).current
  while (rocks.length < count) rocks.push(new Animated.Value(0))
  const run = useRef(null)

  function nudge() {
    if (reduce || !count) return
    run.current?.stop()
    const lit = rocks.slice(0, count)
    lit.forEach((rock) => rock.setValue(0))
    run.current = Animated.stagger(
      WOBBLE_STEP,
      lit.map((rock) =>
        Animated.sequence(
          WOBBLE.map((toValue) =>
            Animated.timing(rock, {
              toValue,
              duration: 80,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ),
        ),
      ),
    )
    run.current.start()
  }

  const nudgeRef = useRef(nudge)
  nudgeRef.current = nudge

  useEffect(() => {
    if (!active || reduce) return undefined
    let round = 0
    const gap = () => WOBBLE_GAPS[Math.min(round, WOBBLE_GAPS.length - 1)]
    let timer = setTimeout(function again() {
      nudgeRef.current()
      round += 1
      timer = setTimeout(again, gap())
    }, gap())
    return () => {
      clearTimeout(timer)
      run.current?.stop()
    }
  }, [active, reduce])

  const tilt = (index) =>
    rocks[index].interpolate({ inputRange: [-1, 1], outputRange: ['-2.5deg', '2.5deg'] })
  return { nudge, tilt }
}

// Lime runs through "Did I" letter by letter, left to right, each time `wave` ticks.
export function WaveLead({ text, wave, colors, style }) {
  const reduce = useReduceMotion()
  const chars = Array.from(text)
  const glow = useRef([]).current
  while (glow.length < chars.length) glow.push(new Animated.Value(0))

  useEffect(() => {
    if (!wave || reduce) return undefined
    const lit = glow.slice(0, chars.length)
    lit.forEach((value) => value.setValue(0))
    const run = Animated.stagger(
      WAVE_STEP,
      lit.map((value) =>
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: 160,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 520,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
      ),
    )
    run.start()
    return () => run.stop()
  }, [wave, reduce, chars.length, glow])

  return (
    <View style={styles.waveRow} accessible accessibilityLabel={text}>
      {chars.map((char, index) => (
        <Animated.Text
          key={index}
          style={[
            style,
            {
              color: glow[index].interpolate({
                inputRange: [0, 1],
                outputRange: [colors.ink, colors.on],
              }),
            },
          ]}
        >
          {char}
        </Animated.Text>
      ))}
    </View>
  )
}

// Starter ideas that fill the "Did I ___" blank. `tilt` comes from useWobble.
// `isOn` lets more than one be picked (first run).
// `grid` (first run) shows big two-column tiles with the short name on top.
export function IdeaPicks({ label, starters, picked, isOn, onPick, tilt, colors, grid = false }) {
  if (!starters.length) return null
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.inkSoft }]}>{label}</Text>
      <View style={styles.picks}>
        {starters.map((starter, index) => {
          const on = isOn ? isOn(starter) : picked === starter
          return (
            <Animated.View key={starter.short} style={[grid && styles.cell, { transform: [{ rotate: tilt(index) }] }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={starter.question}
                onPress={() => onPick(starter)}
                style={[
                  grid ? styles.tile : styles.pick,
                  {
                    borderColor: on ? colors.onDeep : colors.line,
                    backgroundColor: on ? colors.panel3 : colors.panel2,
                  },
                ]}
              >
                {grid ? (
                  <>
                    <Text style={[styles.tileName, { color: on ? colors.on : colors.ink }]} numberOfLines={1}>
                      {starter.short}
                    </Text>
                    <Text style={[styles.tileSub, { color: colors.inkSoft }]} numberOfLines={2}>
                      {starterBlank(starter)}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.pickText, { color: on ? colors.on : colors.ink }]}>
                    {starterBlank(starter)}
                  </Text>
                )}
              </Pressable>
            </Animated.View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  waveRow: { flexDirection: 'row', flexWrap: 'wrap' },
  wrap: { gap: 8, marginTop: 12, marginBottom: 12 },
  label: { ...sectionLabel, marginBottom: 2 },
  picks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pick: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  pickText: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '500' },
  cell: { width: '48%', flexGrow: 1 },
  tile: { borderWidth: 1, borderRadius: 16, minHeight: 76, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center', gap: 2 },
  tileName: { fontFamily: fonts.display, fontSize: 19, fontWeight: '700' },
  tileSub: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 17 },
})
