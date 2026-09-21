import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'
import { DidButton, KeyButton } from './ui.jsx'

export function WaitPlate({ row, colors, onClose }) {
  if (!row) return null
  const after = row.lamp.askAfter || t('wait.later')
  return (
    <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
      <Text style={[styles.kicker, { color: colors.on }]}>{t('wait.kicker')}</Text>
      <Text style={[styles.title, { color: colors.ink }]}>{row.lamp.question}</Text>
      <Text style={[styles.meta, { color: colors.inkSoft }]}>{t('wait.after', { time: after })}</Text>
      <View style={styles.actions}>
        <DidButton
          label={t('wait.thisQuestion')}
          colors={colors}
          small
          onPress={() => goHash('/lamp', { id: row.lamp.id })}
        />
        <KeyButton label={t('wait.sit')} colors={colors} onPress={onClose} />
      </View>
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
  meta: { fontFamily: fonts.ui, fontSize: 14, marginTop: 10, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
})
