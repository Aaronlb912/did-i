import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'
import { KeyButton } from './ui.jsx'

export function AuthGoogleSignIn({ colors, auth, or = true }) {
  if (!auth.showGoogle || auth.step !== 'start') return null

  return (
    <View style={styles.wrap}>
      {auth.showApple || !or ? null : <Text style={[styles.or, { color: colors.inkSoft }]}>{t('auth.appleOr')}</Text>}
      <KeyButton colors={colors} label={t('auth.google')} disabled={auth.busy} onPress={() => auth.signInGoogle()} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    gap: 10,
  },
  or: {
    fontFamily: fonts.ui,
    fontSize: 13,
    textAlign: 'center',
  },
})
