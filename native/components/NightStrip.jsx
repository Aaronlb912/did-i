import { Pressable, StyleSheet, Text, View } from 'react-native'
import { shortLabel } from '../../src/lib/board-json.js'
import { t } from '../../src/lib/i18n.js'
import { usePrefs } from '../../src/lib/prefs.js'
import { answerFor, boardDate, openFloorIso, periodPassed } from '../../src/lib/recurrence.js'
import { fonts } from '../theme.js'
import { missDot } from '../palette.js'

function jewelColor(state, colors) {
  if (state === 'yes') return colors.on
  if (state === 'late') return colors.late || colors.on
  if (state === 'skip') return colors.miss
  return colors.open
}

// The one-letter day under a dot. A weekly or monthly key has no day, so no letter.
function dayLetter(key, locale) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key))) return ''
  try {
    return new Date(`${key}T12:00:00`).toLocaleDateString(locale === 'zh' ? 'zh-CN' : locale || 'en', {
      weekday: 'narrow',
    })
  } catch {
    return ''
  }
}

// The last few nights for this question, packed together at the foot of the
// card: a dot per night with its day under it, tonight ringed.
export function NightStrip({ book, lamp, keys, colors, onPickHole, noPickKeys = [] }) {
  const prefs = usePrefs()
  if (!lamp || !keys.length) return null
  const today = boardDate(new Date())

  return (
    <View style={styles.row} accessibilityLabel={t('strip.recent', { name: shortLabel(lamp) })}>
      {keys.map((key) => {
        const answer = answerFor(book, lamp.id, key)
        let state = 'hole'
        if (answer?.status === 'yes') state = 'yes'
        else if (answer?.status === 'late') state = 'late'
        else if (answer?.status === 'skip') state = 'skip'
        const tonight = key === today
        const canPick =
          onPickHole &&
          !noPickKeys.includes(key) &&
          !periodPassed(lamp, key, openFloorIso()) &&
          (!answer || answer.status === 'skip')
        const dot = (
          <View
            style={[
              styles.dot,
              state === 'hole'
                ? { borderColor: tonight ? colors.inkSoft : colors.line, borderWidth: tonight ? 2 : 1.5 }
                : state === 'skip'
                  ? missDot(colors)
                  : { backgroundColor: jewelColor(state, colors) },
            ]}
          />
        )
        return (
          <View key={key} style={styles.cell}>
            {canPick ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('a11y.answerNight', { date: key })}
                onPress={() => onPickHole(lamp, key)}
                hitSlop={8}
              >
                {dot}
              </Pressable>
            ) : (
              dot
            )}
            <Text style={[styles.day, { color: tonight ? colors.ink : colors.inkDim }]}>
              {dayLetter(key, prefs.locale)}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginTop: 14, alignSelf: 'flex-start' },
  cell: { alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  day: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.4 },
})
