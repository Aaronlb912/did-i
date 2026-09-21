import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'
import { DidButton, KeyButton } from './ui.jsx'

export function HolePlate({ lamp, periodKey, wasSkip, colors, onLate, onSkip, onClose }) {
  if (!lamp) return null
  return (
    <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
      <Text style={[styles.kicker, { color: colors.on }]}>
        {wasSkip ? t('hole.nopeKicker') : t('hole.kicker')}
      </Text>
      <Text style={[styles.title, { color: colors.ink }]}>{lamp.question}</Text>
      <Text style={[styles.meta, { color: colors.inkSoft }]}>
        {wasSkip ? t('hole.nopeBody') : periodKey}
      </Text>
      <View style={styles.actions}>
        <DidButton label={t('hole.late')} colors={colors} small onPress={onLate} />
        {!wasSkip && onSkip ? (
          <KeyButton label={t('tonight.swipeNope')} colors={colors} onPress={onSkip} />
        ) : null}
      </View>
      {onClose ? (
        <KeyButton
          label={wasSkip ? t('settings.neverMind') : t('hole.leave')}
          colors={colors}
          onPress={onClose}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 24,
    minHeight: 168,
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: { fontFamily: fonts.display, fontSize: 26, fontWeight: '700', lineHeight: 32 },
  meta: { fontFamily: fonts.ui, fontSize: 14, marginTop: 10, lineHeight: 20, marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
})
