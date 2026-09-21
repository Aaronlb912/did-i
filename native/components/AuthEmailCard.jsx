import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { fonts, radius } from '../theme.js'
import { AuthLegalNote } from './AuthLegalNote.jsx'
import { AuthSignInActions } from './AuthSignInActions.jsx'
import { Field } from './ui.jsx'

export function AuthEmailCard({
  colors,
  auth,
  title,
  body,
  showLegal = true,
  footer = null,
}) {
  const heading = title ?? t('auth.title')
  const lead = body ?? t('auth.body')

  return (
    <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
      <Text style={[styles.kicker, { color: colors.on }]}>{t('account.kicker')}</Text>
      <Text style={[styles.title, { color: colors.ink }]}>{heading}</Text>
      {lead ? <Text style={[styles.meta, { color: colors.inkSoft }]}>{lead}</Text> : null}
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

      {footer ? <View style={styles.footer}>{footer}</View> : null}

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
