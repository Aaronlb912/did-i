import { Platform, StyleSheet, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { AuthAppleSignIn } from './AuthAppleSignIn.jsx'
import { AuthGoogleSignIn } from './AuthGoogleSignIn.jsx'
import { Slot } from './Slot.jsx'
import { DidButton, KeyButton } from './ui.jsx'

export function AuthSignInActions({ colors, auth }) {
  if (auth.step === 'start') {
    // Apple leads on iOS since it is the system button there; a branded
    // Google leads on Android. The sign-in screen puts email under both.
    const apple = (
      <Slot fallback={null} key="apple">
        <AuthAppleSignIn colors={colors} auth={auth} />
      </Slot>
    )
    const google = (
      <Slot fallback={null} key="google">
        <AuthGoogleSignIn colors={colors} auth={auth} />
      </Slot>
    )
    return (
      <View style={styles.actions}>
        {Platform.OS === 'ios' ? apple : google}
        {Platform.OS === 'ios' ? google : apple}
      </View>
    )
  }

  if (auth.step === 'reviewer') {
    return (
      <View style={styles.actions}>
        <DidButton colors={colors} label={t('account.signIn')} disabled={auth.busy} onPress={auth.openReviewer} />
        <KeyButton colors={colors} label={t('account.other')} onPress={auth.useDifferentEmail} />
      </View>
    )
  }

  return (
    <View style={styles.actions}>
      <DidButton colors={colors} label={t('account.signIn')} disabled={auth.busy} onPress={auth.openEmail} />
      <KeyButton colors={colors} label={t('account.again')} disabled={auth.busy} onPress={auth.askEmail} />
      <KeyButton colors={colors} label={t('account.other')} onPress={auth.useDifferentEmail} />
    </View>
  )
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
    marginTop: 2,
  },
})
