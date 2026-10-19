import { useEffect } from 'react'
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { fonts, radius } from '../theme.js'
import { AuthLegalNote } from './AuthLegalNote.jsx'
import { AuthSignInActions } from './AuthSignInActions.jsx'
import { Field, KeyButton } from './ui.jsx'

export function AuthEmailCard({
  colors,
  auth,
  title,
  body,
  showLegal = true,
  footer = null,
}) {
  // A sign-in error shows in red text; VoiceOver and TalkBack only hear it announced.
  useEffect(() => {
    if (auth.miss) AccessibilityInfo.announceForAccessibility(auth.miss)
  }, [auth.miss])
  const heading = title ?? t('auth.title')
  const lead = body ?? t('auth.body')

  return (
    <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
      <Text style={[styles.kicker, { color: colors.on }]}>{t('account.kicker')}</Text>
      <Text style={[styles.title, { color: colors.ink }]}>{heading}</Text>
      {lead ? <Text style={[styles.meta, { color: colors.inkSoft }]}>{lead}</Text> : null}
      {/* Start: Apple and Google first, then email with its own button, same as the sign-in screen. */}
      {auth.step === 'start' ? <AuthSignInActions colors={colors} auth={auth} /> : null}
      {auth.step === 'start' ? (
        <Text style={[styles.note, { color: colors.inkSoft }]}>{t('auth.newEmail')}</Text>
      ) : null}

      <Field
        colors={colors}
        label={t('account.email')}
        value={auth.email}
        onChangeText={auth.setEmail}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType={auth.step === 'start' ? 'send' : 'next'}
        onSubmitEditing={auth.step === 'start' && !auth.busy ? auth.askEmail : undefined}
      />
      {auth.step === 'code' ? (
        <Field
          colors={colors}
          label={t('account.code')}
          value={auth.code}
          // Digits only, from the keyboard or the code iOS and Android offer from the email.
          onChangeText={(value) => auth.setCode(String(value).replace(/\D/g, ''))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={8}
          returnKeyType="go"
          onSubmitEditing={auth.busy ? undefined : auth.openEmail}
        />
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
          textContentType="password"
          autoComplete="current-password"
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={auth.busy ? undefined : auth.openReviewer}
        />
      ) : null}

      {auth.miss ? <Text style={[styles.miss, { color: colors.miss }]}>{auth.miss}</Text> : null}

      {auth.step === 'start' ? (
        <KeyButton colors={colors} label={t('account.send')} disabled={auth.busy} onPress={auth.askEmail} />
      ) : (
        <AuthSignInActions colors={colors} auth={auth} />
      )}

      {footer ? <View style={styles.footer}>{footer}</View> : null}

      {/* Only while the App Review switch is on (supabase/reviewer-flag.sql). */}
      {auth.step === 'start' && auth.reviewerOn ? (
        <View style={styles.footer}>
          <KeyButton colors={colors} label={t('auth.reviewer')} onPress={auth.showReviewer} />
        </View>
      ) : null}

      {showLegal ? <AuthLegalNote colors={colors} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.r,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 6,
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
    marginTop: 18,
    marginBottom: 14,
  },
  miss: {
    fontFamily: fonts.ui,
    fontSize: 13,
    marginBottom: 10,
  },
  footer: {
    marginTop: 8,
    gap: 4,
  },
})
