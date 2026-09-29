import { StyleSheet, View } from 'react-native'
import { radius } from '../theme.js'

/** The sign-in form on a plain card, nothing moving behind it. */
export function AuthSignInStage({ colors, children }) {
  return (
    <View style={styles.stage}>
      <View style={[styles.panel, { borderColor: colors.line, backgroundColor: colors.panel }]}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  stage: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  panel: {
    borderWidth: 1,
    borderRadius: radius.r,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 16,
  },
})
