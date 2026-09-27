import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { clockWords } from '../../src/lib/hall-pages.js'
import { goHash } from '../navigation/hash.js'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'
import { DidButton, KeyButton } from './ui.jsx'

export function WaitPlate({ row, colors, onClose }) {
  if (!row) return null
  const after = row.lamp.askAfter ? clockWords(row.lamp.askAfter) : t('wait.later')
  return (
    <View style={faceCardStyle(colors)}>
      <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{t('wait.kicker')}</Text>
      <Text style={[faceCardStyles.title, { color: colors.ink }]}>{row.lamp.question}</Text>
      <Text style={[faceCardStyles.meta, styles.meta, { color: colors.inkSoft }]}>{t('wait.after', { time: after })}</Text>
      <View style={[styles.actions, { borderTopColor: colors.lineSoft }]}>
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
  meta: { marginTop: 14 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, flexWrap: 'wrap' },
})
