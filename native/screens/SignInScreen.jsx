import { Platform, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { cloudSetUp } from '../../src/lib/cloud.js'
import { skipAuth } from '../../src/lib/auth-gate.js'
import { useAuthSignIn } from '../../src/lib/useAuthSignIn.js'
import { t } from '../../src/lib/i18n.js'
import { useHallColors } from '../hooks/useHallColors.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'
import { AuthLegalNote } from '../components/AuthLegalNote.jsx'
import { AuthMark } from '../components/AuthMark.jsx'
import { AuthSignInStage } from '../components/AuthSignInStage.jsx'
import { AuthSignInActions } from '../components/AuthSignInActions.jsx'
import { DidButton, Field, KeyButton } from '../components/ui.jsx'

// Trying the app without an account is a real choice, so it gets a real
// button. Reviewer sign-in stays behind a long-press on the mark.
function LocalButton({ colors, onPress }) {
  return (
    <View style={styles.localWrap}>
      <KeyButton colors={colors} label={t('auth.tryLocal')} onPress={onPress} />
    </View>
  )
}

export function SignInScreen({ onDone }) {
  const colors = useHallColors()
  const insets = useSafeAreaInsets()
  const auth = useAuthSignIn({ onSignedIn: onDone })

  const useLocalOnly = () => {
    skipAuth()
    onDone?.()
  }

  const body = !cloudSetUp() ? (
    <View style={styles.panel}>
      <Text style={[styles.title, { color: colors.ink }]}>{t('account.offTitle')}</Text>
      <Text style={[styles.meta, { color: colors.inkSoft }]}>{t('account.offBody')}</Text>
      <DidButton colors={colors} label={t('account.stay')} onPress={() => goHash('/tonight')} />
      <LocalButton colors={colors} onPress={useLocalOnly} />
    </View>
  ) : (
    <View style={styles.panel}>
      {auth.step !== 'start' ? (
        <Text style={[styles.title, { color: colors.ink }]}>{t('auth.title')}</Text>
      ) : null}

      {auth.step === 'start' ? <AuthSignInActions colors={colors} auth={auth} /> : null}

      <View style={[styles.emailBlock, auth.step === 'start' && styles.emailOption]}>
        {auth.step === 'start' ? (
          <Text style={[styles.note, { color: colors.inkSoft }]}>{t('auth.newEmail')}</Text>
        ) : null}
        <Field
          colors={colors}
          label={t('account.email')}
          value={auth.email}
          onChangeText={auth.setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {auth.step === 'code' ? (
          <Field colors={colors} label={t('account.code')} value={auth.code} onChangeText={auth.setCode} />
        ) : null}
        {auth.step === 'code' && !auth.miss ? (
          <Text style={[styles.meta, { color: colors.inkSoft }]}>{t('account.sent', { email: auth.email })}</Text>
        ) : null}
        {auth.step === 'reviewer' ? (
          <Field
            colors={colors}
            label={t('auth.password')}
            value={auth.password}
            onChangeText={auth.setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
        ) : null}

        {auth.miss && (auth.missSource === 'email' || !auth.missSource) ? (
          <Text style={[styles.miss, { color: colors.miss }]}>{auth.miss}</Text>
        ) : null}

        {auth.step === 'start' ? (
          <KeyButton colors={colors} label={t('account.send')} disabled={auth.busy} onPress={auth.askEmail} />
        ) : (
          <AuthSignInActions colors={colors} auth={auth} />
        )}
      </View>

      <LocalButton colors={colors} onPress={useLocalOnly} />
      <AuthLegalNote colors={colors} />
    </View>
  )

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthMark colors={colors} onMarkLongPress={auth.step === 'start' ? auth.showReviewer : undefined} />
          <AuthSignInStage colors={colors}>{body}</AuthSignInStage>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  panel: {
    gap: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
    marginBottom: 8,
  },
  meta: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  emailBlock: {
    gap: 4,
  },
  emailOption: {
    marginTop: 18,
  },
  note: {
    fontFamily: fonts.ui,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  miss: {
    fontFamily: fonts.ui,
    fontSize: 13,
    marginBottom: 10,
  },
  localWrap: {
    marginTop: 14,
  },
})
