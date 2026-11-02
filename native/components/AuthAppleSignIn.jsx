import * as AppleAuthentication from 'expo-apple-authentication'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { fonts } from '../theme.js'

// Sign in with Apple is an iOS system button; it has no Android rendering.
export function AuthAppleSignIn({ colors, auth, or = true }) {
  if (Platform.OS !== 'ios' || !auth.showApple || auth.step !== 'start') return null

  return (
    <View style={styles.wrap}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={10}
        style={styles.btn}
        onPress={() => auth.signInApple()}
        disabled={auth.busy}
      />
      {auth.missSource === 'apple' && auth.miss ? (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.miss, { color: colors.miss }]}>{auth.miss}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  btn: {
    width: '100%',
    height: 44,
  },
  miss: {
    fontFamily: fonts.ui,
    fontSize: 13,
  },
})
