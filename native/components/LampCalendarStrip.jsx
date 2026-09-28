import { StyleSheet, Text, View } from 'react-native'
import { shortLabel } from '../../src/lib/board-json.js'
import { t } from '../../src/lib/i18n.js'
import { addDaysIso, answerFor, isDueOn, periodKeyFor } from '../../src/lib/recurrence.js'
import { fonts } from '../theme.js'

const WEEKS = 5
const DAYS = WEEKS * 7

function jewelColor(state, colors) {
  if (state === 'yes') return colors.on
  if (state === 'late') return colors.late || colors.on
  if (state === 'skip') return colors.miss
  return colors.open
}

// Once questions have a single period, not one per day: only the due date
// (or the day it was answered) lights up, everything else stays off.
function onceDueOn(lamp, iso) {
  const target = String((lamp.onceWhen === 'by' ? lamp.dueBy : lamp.onceOn) || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(target) ? target === iso : false
}

/** A single lamp's last five weeks, dot-colored by answer, oldest week first. */
export function LampCalendarStrip({ book, lamp, colors, dateIso }) {
  if (!lamp || !dateIso) return null
  const due = lamp.cadence === 'once' ? onceDueOn : isDueOn

  const weeks = []
  for (let w = WEEKS - 1; w >= 0; w -= 1) {
    const row = []
    for (let d = 6; d >= 0; d -= 1) {
      row.push(addDaysIso(dateIso, -(w * 7 + d)))
    }
    weeks.push(row)
  }

  return (
    <View style={styles.wrap} accessibilityLabel={t('strip.recent', { name: shortLabel(lamp) })}>
      <Text style={[styles.label, { color: colors.inkSoft }]}>{t('strip.recent', { name: shortLabel(lamp) })}</Text>
      {weeks.map((week) => (
        <View key={week[0]} style={styles.row}>
          {week.map((iso) => {
            const isDue = due(lamp, iso)
            let state = 'hole'
            if (isDue) {
              const answer = answerFor(book, lamp.id, periodKeyFor(lamp, iso))
              if (answer?.status === 'yes') state = 'yes'
              else if (answer?.status === 'late') state = 'late'
              else if (answer?.status === 'skip') state = 'skip'
            }
            return (
              <View key={iso} style={styles.cell}>
                <View
                  style={[
                    styles.dot,
                    isDue
                      ? { backgroundColor: jewelColor(state, colors), opacity: state === 'hole' ? 0.35 : 1 }
                      : { backgroundColor: colors.lineSoft, opacity: 0.35 },
                  ]}
                />
              </View>
            )
          })}
        </View>
      ))}
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
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, marginTop: 2 },
  cell: { flex: 1, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
})
