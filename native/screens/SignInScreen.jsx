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
import { AuthSignInStage } from '../components/AuthSignInStage.jsx'
import { AuthSignInActions } from '../components/AuthSignInActions.jsx'
import { DidButton, Field, KeyButton } from '../components/ui.jsx'

export function SignInScreen({ onDone }) {
  const colors = useHallColors()
  const insets = useSafeAreaInsets()
  const auth = useAuthSignIn({ onSignedIn: onDone })

  const body = !cloudSetUp() ? (
    <AuthSignInStage colors={colors}>
      <Text style={[styles.title, { color: colors.ink }]}>{t('account.offTitle')}</Text>
      <Text style={[styles.meta, { color: colors.inkSoft }]}>{t('account.offBody')}</Text>
      <DidButton colors={colors} label={t('account.stay')} onPress={() => goHash('/tonight')} />
      <KeyButton
        colors={colors}
        label={t('auth.local')}
        onPress={() => {
          skipAuth()
          onDone?.()
        }}
      />
    </AuthSignInStage>
  ) : (
    <AuthSignInStage colors={colors}>
      <Text style={[styles.title, { color: colors.ink }]}>{t('auth.title')}</Text>
      <Text style={[styles.meta, { color: colors.inkSoft }]}>{t('auth.body')}</Text>
      {auth.step === 'start' ? (
        <Text style={[styles.note, { color: colors.inkSoft }]}>{t('auth.newHere')}</Text>
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
      {auth.step === 'code' ? (
        <Text style={[styles.meta, { color: colors.inkSoft }]}>{t('account.sent', { email: auth.email })}</Text>
      ) : null}

      {auth.miss ? <Text style={[styles.miss, { color: colors.miss }]}>{auth.miss}</Text> : null}

      <AuthSignInActions colors={colors} auth={auth} />

      <View style={styles.foot}>
        <KeyButton
          colors={colors}
          label={t('auth.local')}
          onPress={() => {
            skipAuth()
            onDone?.()
          }}
        />
      </View>
      <AuthLegalNote colors={colors} />
    </AuthSignInStage>
  )

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
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
    justifyContent: 'center',
    paddingHorizontal: 20,
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
  foot: {
    marginTop: 8,
  },
})
