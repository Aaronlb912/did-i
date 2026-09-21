import { StyleSheet, Text } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { railOpacity, swipePull } from '../../src/lib/swipe-face.js'
import { fonts } from '../theme.js'

const SHELL_PAD = 16
const LABEL_W = 120
const BOTTOM_TRIM = 56
const RAIL_DROP = 58
const FULL_RAIL_RATIO = 0.74
const RAIL_W = 50

function EdgeRail({ x, mode, reduce, way, fill, label, ink, winH }) {
  const fullH = Math.round(winH * FULL_RAIL_RATIO)
  const H = fullH - BOTTOM_TRIM
  const isNope = way === 'nope'

  const shellStyle = useAnimatedStyle(() => {
    if (reduce || mode.value !== 'drag') return { opacity: 0 }
    const op = railOpacity(swipePull(x.value), way, true)
    const pull = swipePull(x.value)
    const lean = way === 'did' ? pull : -pull
    const pop = 0.9 + Math.max(0, Math.min(1, lean)) * 0.1
    return {
      opacity: op,
      transform: [{ scale: pop }],
    }
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.shell,
        {
          width: RAIL_W,
          height: H,
          top: '50%',
          marginTop: -H / 2 + RAIL_DROP,
          backgroundColor: fill,
          borderTopRightRadius: isNope ? RAIL_W : 0,
          borderBottomRightRadius: isNope ? RAIL_W : 0,
          borderTopLeftRadius: isNope ? 0 : RAIL_W,
          borderBottomLeftRadius: isNope ? 0 : RAIL_W,
        },
        isNope ? styles.shellNope : styles.shellDid,
        shellStyle,
      ]}
    >
      <Text pointerEvents="none" style={[styles.label, { color: ink }]}>
        {label}
      </Text>
    </Animated.View>
  )
}

export function SwipeEdgeRails({ x, mode, colors, winH, didLabel, nopeLabel, reduce = false }) {
  return (
    <>
      <EdgeRail
        x={x}
        mode={mode}
        reduce={reduce}
        way="nope"
        fill={colors.skip}
        label={nopeLabel}
        ink={colors.bg}
        winH={winH}
      />
      <EdgeRail
        x={x}
        mode={mode}
        reduce={reduce}
        way="did"
        fill={colors.on}
        label={didLabel}
        ink={colors.bg}
        winH={winH}
      />
    </>
  )
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    zIndex: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  shellNope: {
    left: -SHELL_PAD,
  },
  shellDid: {
    right: -SHELL_PAD,
  },
  label: {
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    width: LABEL_W,
    transform: [{ rotate: '-90deg' }],
  },
})
