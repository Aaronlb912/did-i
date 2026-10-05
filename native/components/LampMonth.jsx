import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { readPrefs } from '../../src/lib/prefs.js'
import { answerFor, isDueOn, periodKeyFor } from '../../src/lib/recurrence.js'
import { fonts } from '../theme.js'

function pad(n) {
  return String(n).padStart(2, '0')
}

function monthOf(iso, back) {
  const [y, m] = iso.split('-').map(Number)
  const at = new Date(y, m - 1 - back, 1, 12)
  return { y: at.getFullYear(), m: at.getMonth() }
}

// One month of nights for this question, laid out Sunday first. Each cell is
// 'did', 'late', 'nope', 'missed', 'open' (tonight, not answered) or '' (not asked).
export function lampMonthCells(book, lamp, dateIso, y, m) {
  const shown = { ...lamp, archived: false }
  const made = /^\d{4}-\d{2}-\d{2}$/.test(String(lamp.createdOn || '')) ? lamp.createdOn : ''
  const days = new Date(y, m + 1, 0, 12).getDate()
  const lead = new Date(y, m, 1, 12).getDay()
  const cells = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= days; d += 1) {
    const iso = `${y}-${pad(m + 1)}-${pad(d)}`
    let state = ''
    if (iso <= dateIso && (!made || iso >= made) && isDueOn(shown, iso)) {
      const status = answerFor(book, lamp.id, periodKeyFor(lamp, iso))?.status
      state =
        status === 'yes' ? 'did' : status === 'late' ? 'late' : status === 'skip' ? 'nope' : iso === dateIso ? 'open' : 'missed'
    }
    cells.push({ iso, day: d, state })
  }
  return cells
}

function cellColor(state, colors) {
  if (state === 'did') return colors.on
  if (state === 'late') return colors.late || colors.on
  if (state === 'nope') return colors.skip || colors.inkDim
  if (state === 'missed') return colors.miss
  return ''
}

/** A small month calendar under the recent nights, back to the month the question was made. */
export function LampMonth({ book, lamp, colors, dateIso }) {
  const [back, setBack] = useState(0)
  const made = /^\d{4}-\d{2}-\d{2}$/.test(String(lamp?.createdOn || '')) ? lamp.createdOn : dateIso
  const { y, m } = monthOf(dateIso, back)
  const first = monthOf(made, 0)
  const canBack = y > first.y || (y === first.y && m > first.m)
  const monthKey = `${y}-${m}`
  const cells = useMemo(
    () => (lamp && dateIso ? lampMonthCells(book, lamp, dateIso, y, m) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book, lamp, dateIso, monthKey],
  )
  if (!lamp || !dateIso || lamp.cadence === 'once') return null
  const locale = readPrefs().locale || undefined
  let title = ''
  try {
    title = new Date(y, m, 1, 12).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  } catch {
    title = `${y}-${pad(m + 1)}`
  }
  const letters = [0, 1, 2, 3, 4, 5, 6].map((d) => Array.from(t(`hang.day.${d}`))[0] || '')
  const rows = []
  for (let at = 0; at < cells.length; at += 7) rows.push(cells.slice(at, at + 7))
  const last = rows[rows.length - 1]
  if (last) while (last.length < 7) last.push(null)

  function Arrow({ label, glyph, on, onPress }) {
    return (
      <Pressable
        onPress={onPress}
        disabled={!on}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !on }}
        style={[styles.arrow, { borderColor: colors.line, opacity: on ? 1 : 0.3 }]}
      >
        <Text style={[styles.arrowText, { color: colors.ink }]}>{glyph}</Text>
      </Pressable>
    )
  }

  return (
    <View style={[styles.wrap, { borderColor: colors.lineSoft, backgroundColor: colors.panel }]}>
      <View style={styles.head}>
        <Arrow label={t('lamp.monthPrev')} glyph="‹" on={canBack} onPress={() => setBack((n) => n + 1)} />
        <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
        <Arrow label={t('lamp.monthNext')} glyph="›" on={back > 0} onPress={() => setBack((n) => Math.max(0, n - 1))} />
      </View>
      <View style={styles.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {letters.map((letter, index) => (
          <Text key={index} style={[styles.cell, styles.letter, { color: colors.inkDim }]}>
            {letter}
          </Text>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((cell, c) => {
            if (!cell) return <View key={c} style={styles.cell} />
            const fill = cellColor(cell.state, colors)
            return (
              <View key={cell.iso} style={styles.cell}>
                <View
                  style={[
                    styles.day,
                    fill
                      ? { backgroundColor: fill }
                      : cell.state === 'open'
                        ? { borderWidth: 1, borderColor: colors.open || colors.line }
                        : null,
                  ]}
                >
                  <Text style={[styles.dayText, { color: fill ? colors.bg : cell.state ? colors.ink : colors.inkDim }]}>
                    {cell.day}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 12, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontFamily: fonts.uiSemi, fontSize: 15 },
  arrow: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontFamily: fonts.ui, fontSize: 20, lineHeight: 22 },
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  letter: { fontFamily: fonts.mono, fontSize: 10, textAlign: 'center' },
  day: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontFamily: fonts.mono, fontSize: 11 },
})
