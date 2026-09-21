import { Pressable, StyleSheet, Text, View } from 'react-native'
import { shortLabel } from '../../src/lib/board-json.js'
import { t } from '../../src/lib/i18n.js'
import { answerFor } from '../../src/lib/recurrence.js'
import { fonts } from '../theme.js'

function jewelColor(state, colors) {
  if (state === 'yes') return colors.on
  if (state === 'late') return colors.late || colors.on
  if (state === 'skip') return colors.miss
  return colors.open
}

export function NightStrip({ book, lamp, keys, colors, onPickHole, noPickKeys = [] }) {
  if (!lamp || !keys.length) return null

  return (
    <View style={styles.wrap} accessibilityLabel={t('strip.recent', { name: shortLabel(lamp) })}>
      <Text style={[styles.label, { color: colors.inkSoft }]}>{t('strip.recent', { name: shortLabel(lamp) })}</Text>
      <View style={styles.row}>
        {keys.map((key) => {
          const answer = answerFor(book, lamp.id, key)
          let state = 'hole'
          if (answer?.status === 'yes') state = 'yes'
          else if (answer?.status === 'late') state = 'late'
          else if (answer?.status === 'skip') state = 'skip'
          const canPick =
            onPickHole && !noPickKeys.includes(key) && (!answer || answer.status === 'skip')
          const dot = (
            <View
              style={[
                styles.dot,
                { backgroundColor: jewelColor(state, colors), opacity: state === 'hole' ? 0.35 : 1 },
              ]}
            />
          )
          return (
            <View key={key} style={styles.cell}>
              {canPick ? (
                <Pressable onPress={() => onPickHole(lamp, key)} hitSlop={6}>
                  {dot}
                </Pressable>
              ) : (
                dot
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 8 },
  label: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  cell: { flex: 1, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
})
