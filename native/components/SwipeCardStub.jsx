import { StyleSheet, Text, View } from 'react-native'
import { fonts } from '../theme.js'

/** Same face if the swipe card throws. No answer buttons. The line stays. */
export function SwipeCardStub({ head, kicker, title, colors, children }) {
  const line = colors?.line || '#2b3140'
  return (
    <View style={[styles.card, { backgroundColor: colors?.panel, borderColor: line }]}>
      {head}
      {kicker ? <Text style={[styles.kicker, { color: colors?.on }]}>{kicker}</Text> : null}
      <Text style={[styles.title, { color: colors?.ink || '#f4f6fa' }]}>{title}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 19,
    paddingTop: 22,
    paddingBottom: 22,
    minHeight: 168,
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
  },
})
