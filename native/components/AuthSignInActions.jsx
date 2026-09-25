import { StyleSheet, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { AuthAppleSignIn } from './AuthAppleSignIn.jsx'
import { AuthGoogleSignIn } from './AuthGoogleSignIn.jsx'
import { Slot } from './Slot.jsx'
import { DidButton, KeyButton } from './ui.jsx'

export function AuthSignInActions({ colors, auth }) {
  if (auth.step === 'start') {
    return (
      <View style={styles.actions}>
        <DidButton colors={colors} label={t('account.send')} disabled={auth.busy} onPress={auth.askEmail} />
        <Slot fallback={null}>
          <AuthAppleSignIn colors={colors} auth={auth} />
        </Slot>
        <Slot fallback={null}>
          <AuthGoogleSignIn colors={colors} auth={auth} />
        </Slot>
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
