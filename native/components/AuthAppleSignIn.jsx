import * as AppleAuthentication from 'expo-apple-authentication'
import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'

export function AuthAppleSignIn({ colors, auth, or = true }) {
  if (!auth.showApple || auth.step !== 'start') return null

  return (
    <View style={styles.wrap}>
      {or ? <Text style={[styles.or, { color: colors.inkSoft }]}>{t('auth.appleOr')}</Text> : null}
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={10}
        style={styles.btn}
        onPress={() => auth.signInApple()}
        disabled={auth.busy}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    gap: 10,
  },
  or: {
    fontFamily: fonts.ui,
    fontSize: 13,
    textAlign: 'center',
  },
  btn: {
    width: '100%',
    height: 44,
  },
})
