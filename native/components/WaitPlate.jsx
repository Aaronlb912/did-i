import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { clockWords } from '../../src/lib/hall-pages.js'
import { goHash } from '../navigation/hash.js'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'
import { DidButton } from './ui.jsx'
import { EditPen } from './SwipeFace.jsx'

// Back to tonight sits above this card, so it has no Back of its own; the pen
// edits the question like the pen on every other card. wrap: as on HolePlate;
// penBeside moves the pen over when a buddy hangs on the card.
export function WaitPlate({ row, colors, onDid, wrap = plainCard(colors), penBeside = false }) {
  if (!row) return null
  const after = row.lamp.askAfter ? clockWords(row.lamp.askAfter) : t('wait.later')
  return wrap(
    <>
      <EditPen onPress={() => goHash('/hang', { id: row.lamp.id })} colors={colors} beside={penBeside} />
      <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{t('wait.kicker')}</Text>
      <Text style={[faceCardStyles.title, { color: colors.ink }]}>{row.lamp.question}</Text>
      <Text style={[faceCardStyles.meta, styles.meta, { color: colors.inkSoft }]}>{t('wait.after', { time: after })}</Text>
      {onDid ? (
        <View style={[styles.actions, { borderTopColor: colors.lineSoft }]}>
          <DidButton label={t('wait.didAlready')} colors={colors} small onPress={onDid} />
        </View>
      ) : null}
    </>,
  )
}

function plainCard(colors) {
  return (body) => <View style={faceCardStyle(colors)}>{body}</View>
}

const styles = StyleSheet.create({
  meta: { marginTop: 14 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, flexWrap: 'wrap' },
})
