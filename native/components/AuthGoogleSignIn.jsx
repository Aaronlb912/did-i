import { Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'

// Google's own guidance keeps this button white/light regardless of the
// host app's theme; the "G" is a simplified monogram, not the licensed
// four-color mark, since that asset does not ship in this repo.
export function AuthGoogleSignIn({ colors, auth }) {
  if (!auth.showGoogle || auth.step !== 'start') return null

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => auth.signInGoogle()}
        disabled={auth.busy}
        accessibilityRole="button"
        style={[styles.btn, { opacity: auth.busy ? 0.6 : 1 }]}
      >
        <View style={styles.mark}>
          <Text style={styles.markG}>G</Text>
        </View>
        <Text style={styles.label}>{t('auth.google')}</Text>
      </Pressable>
      {auth.missSource === 'google' && auth.miss ? (
        <Text style={[styles.miss, { color: colors.miss }]}>{auth.miss}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  btn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dadce0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markG: {
    fontFamily: fonts.ui,
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  label: {
    fontFamily: fonts.ui,
    fontSize: 15,
    fontWeight: '600',
    color: '#3c4043',
  },
  miss: {
    fontFamily: fonts.ui,
    fontSize: 13,
  },
})
