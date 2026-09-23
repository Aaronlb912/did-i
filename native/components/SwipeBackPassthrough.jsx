import { StyleSheet, View } from 'react-native'

/** Swipe-back without RNGH / Reanimated (shell still navigates via header back). */
export function SwipeBackPassthrough({ children, backChild, enabled, back }) {
  return (
    <View style={styles.shell}>
      {enabled && back ? <View style={styles.back}>{backChild}</View> : null}
      <View style={styles.front}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: { flex: 1, overflow: 'hidden' },
  back: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  front: {
    flex: 1,
    zIndex: 2,
  },
})
