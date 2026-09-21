import { StyleSheet, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { DidButton, KeyButton } from './ui.jsx'

export function AuthSignInActions({ colors, auth }) {
  if (auth.step === 'start') {
    return (
      <View style={styles.actions}>
        <DidButton colors={colors} label={t('account.send')} disabled={auth.busy} onPress={auth.askEmail} />
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
