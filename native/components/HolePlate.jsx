import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { periodLabel } from '../../src/lib/recurrence.js'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'
import { DidButton, KeyButton } from './ui.jsx'

// wrap: draws the card around the words; Tonight passes its own, so the card
// wears the look and the frame like every other card.
export function HolePlate({ lamp, periodKey, wasSkip, colors, onLate, onSkip, onClose, wrap = plainCard(colors) }) {
  if (!lamp) return null
  return wrap(
    <>
      <Text style={[faceCardStyles.kicker, { color: colors.on }]}>
        {wasSkip ? t('hole.nopeKicker') : t('hole.kicker')}
      </Text>
      <Text style={[faceCardStyles.title, { color: colors.ink }]}>{lamp.question}</Text>
      <Text style={[faceCardStyles.meta, { color: colors.inkSoft }]}>
        {wasSkip ? t('hole.nopeBody') : periodLabel(lamp, periodKey)}
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
    </>,
  )
}

function plainCard(colors) {
  return (body) => <View style={faceCardStyle(colors)}>{body}</View>
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
})
