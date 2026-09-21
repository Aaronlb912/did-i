import { StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { edgeOpacity } from '../../src/lib/swipe-face.js'
import { fonts } from '../theme.js'

export function SwipeEdgeRails({ pull, colors, didLabel, nopeLabel, reduce = false }) {
  const didStyle = useAnimatedStyle(() => {
    const op = reduce ? 0 : edgeOpacity(pull.value, 'did')
    return {
      opacity: op,
      transform: [{ scaleX: 0.4 + op * 0.85 }],
    }
  })

  const nopeStyle = useAnimatedStyle(() => {
    const op = reduce ? 0 : edgeOpacity(pull.value, 'nope')
    return {
      opacity: op,
      transform: [{ scaleX: 0.4 + op * 0.85 }],
    }
  })

  return (
    <View pointerEvents="none" style={styles.shell}>
      <Animated.View style={[styles.edge, styles.did, { backgroundColor: colors.on }, didStyle]}>
        <Text style={[styles.label, { color: colors.bg }]}>{didLabel}</Text>
      </Animated.View>
      <Animated.View style={[styles.edge, styles.nope, { backgroundColor: colors.skip }, nopeStyle]}>
        <Text style={[styles.label, { color: colors.bg }]}>{nopeLabel}</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  edge: {
    position: 'absolute',
    top: '14%',
    bottom: '14%',
    width: 5,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  did: {
    right: 0,
  },
  nope: {
    left: 0,
  },
  label: {
    position: 'absolute',
    fontFamily: fonts.display,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    transform: [{ rotate: '-90deg' }],
    width: 72,
    textAlign: 'center',
  },
})
