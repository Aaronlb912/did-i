import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { shortLabel } from '../../src/lib/board-json.js'
import { firstAnswerMonth, monthStripNights, nightDueRows, nightWhy, yearMonths } from '../../src/lib/hall-pages.js'
import { openNightWhy } from './NightSheets.jsx'
import { t } from '../../src/lib/i18n.js'
import { gentleOn, usePrefs } from '../../src/lib/prefs.js'
import { boardDate, formatBoardDate, nightOpen } from '../../src/lib/recurrence.js'
import { nightWhyLines } from '../../src/lib/night-why.js'
import { weCardShort } from '../../src/lib/did-we.js'
import { publishSheet } from './SheetHost.jsx'
import { fonts } from '../theme.js'
import { Reveal, useLayoutState } from '../lib/motion.jsx'
import { missDot } from '../palette.js'

function dateLocale(code) {
  if (code === 'zh') return 'zh-CN'
  return code || 'en'
}

// What a screen reader hears for one day: "October 1, Cleared".
function dayLabel(night, locale, gentle = false) {
  const date = new Date(`${night.iso}T12:00:00`).toLocaleDateString(locale, { month: 'long', day: 'numeric' })
  const state = night.empty
    ? ''
    : night.on
      ? t('cal.keyCleared')
      : night.freeze
        ? t('freeze.dot')
        : night.miss
          ? gentle ? '' : t('cal.keyMissed')
          : t('later.tonight')
  return t('cal.day', { date: state ? `${date}, ${state}` : date })
}

function dowMarks(locale) {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => {
    const date = new Date(2026, 8, 6 + day)
    return date.toLocaleDateString(dateLocale(locale), { weekday: 'narrow' })
  })
}

// Every mark reads the same way: Did, Late, Not yet (open night) or Nope, Open.
const upFirst = (text) => text.charAt(0).toLocaleUpperCase() + text.slice(1)

// No answer reads by where the night sits: still ahead, tonight, or gone.
function markOf(answer, when = 0, open = when === 0) {
  const status = answer?.status
  if (status === 'yes') return { key: 'yes', label: t('widget.tonight.did') }
  if (status === 'late') return { key: 'late', label: upFirst(t('hole.late')) }
  // A Not yet on a day that is over is a missed day; Not yet is only for today.
  if (status === 'skip') {
    if (open || gentleOn()) return { key: 'skip', label: t(open ? 'jewelKey.notYet' : 'jewelKey.nope') }
    return { key: 'miss', label: t('cal.notAnswered') }
  }
  if (when > 0) return { key: 'hole', label: t('cal.ahead') }
  // Gentle mode: a past night with no answer is not called missed.
  if (when < 0) return { key: 'miss', label: t(gentleOn() ? 'jewelKey.open' : 'cal.notAnswered') }
  return { key: 'hole', label: upFirst(t('cal.open')) }
}

export function CalendarGrid({ book, boards = [], tagId = '', now, colors, startShift = 0 }) {
  const prefs = usePrefs()
  // Gentle mode: a missed night reads like any other unlit night, never a warning.
  const missTone = prefs.gentle === true ? colors.open : colors.miss
  const clock = now || new Date()
  const [monthShift, setMonthShift] = useLayoutState(startShift)
  const [picked, setPicked] = useState('')

  useEffect(() => {
    setMonthShift(startShift)
    setPicked('')
  }, [tagId])

  const shelf = boards.length ? boards : [book]
  const pack = monthStripNights(shelf, clock, tagId, monthShift)
  const locale = dateLocale(prefs.locale)
  const monthLabel = pack.start.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const dows = dowMarks(prefs.locale)
  // One row per week: a wrapped grid of square cells left a tall blank gap under it on Android.
  const weeks = []
  for (let i = 0; i < pack.nights.length; i += 7) weeks.push(pack.nights.slice(i, i + 7))

  // A day opens its sheet: why it did or did not clear, then each question.
  function openDay(iso) {
    setPicked(iso)
    const today = boardDate(clock, book?.dayFoldHour)
    const when = iso > today ? 1 : iso < today ? -1 : 0
    const why = nightWhy(shelf, iso, clock, tagId)
    // What broke the night leads: open Did wes, then anything not a Did, then the Dids.
    const done = (row) => ['yes', 'late'].includes(row.answer?.status)
    const rows = nightDueRows(shelf, iso, tagId)
    const sorted = [...rows.filter((row) => !done(row)), ...rows.filter(done)]
    const weOpen = why.weOpen || []
    const weMark = when < 0 ? { label: t(prefs.gentle === true ? 'jewelKey.open' : 'cal.notAnswered'), tone: missTone } : { label: upFirst(t('cal.open')), tone: colors.open }
    const close = () => {
      setPicked('')
      publishSheet(null)
    }
    publishSheet({
      kicker: t('why.kicker'),
      title: formatBoardDate(iso),
      body: nightWhyLines(why, { itemsShown: rows.length > 0 || weOpen.length > 0 }).join('\n'),
      content: rows.length || weOpen.length ? (
        <View style={styles.marks}>
          {weOpen.map((id) => (
            <View key={`we-${id}`} style={styles.markRow}>
              <View style={[styles.markPip, { backgroundColor: weMark.tone }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.markLabel, { color: colors.ink }]}>{weMark.label}</Text>
                <Text style={[styles.markSub, { color: colors.inkDim }]}>{weCardShort(id) || t('we.title')}</Text>
              </View>
            </View>
          ))}
          {sorted.map((row) => {
            const mark = markOf(row.answer, when, nightOpen(iso, clock))
            return (
              <View key={`${row.boardId}-${row.lamp.id}`} style={styles.markRow}>
                <View style={[styles.markPip, { backgroundColor: colors[mark.key === 'yes' ? 'on' : mark.key === 'late' ? 'late' : mark.key === 'skip' ? 'skip' : mark.key === 'miss' && prefs.gentle !== true ? 'miss' : 'open'] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.markLabel, { color: colors.ink }]}>{mark.label}</Text>
                  <Text style={[styles.markSub, { color: colors.inkDim }]}>{shortLabel(row.lamp)}</Text>
                </View>
              </View>
            )
          })}
        </View>
      ) : null,
      closeLabel: t('cal.close'),
      colors,
      onClose: close,
    })
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('cal.prev')} onPress={() => { setMonthShift((n) => n - 1); setPicked('') }} hitSlop={8}>
          <Text style={[styles.shift, { color: colors.inkDim }]}>‹</Text>
        </Pressable>
        <Text style={[styles.month, { color: colors.ink }]}>{monthLabel}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('cal.next')}
          accessibilityState={{ disabled: monthShift >= 0 }}
          disabled={monthShift >= 0}
          onPress={() => { setMonthShift((n) => Math.min(0, n + 1)); setPicked('') }}
          hitSlop={8}
        >
          <Text style={[styles.shift, { color: monthShift >= 0 ? colors.line : colors.inkDim }]}>›</Text>
        </Pressable>
      </View>
      <Reveal key={`m${monthShift}`} style={styles.grid} exiting={undefined} layout={false}>
        <View style={styles.week}>
          {dows.map((day, i) => (
            <Text key={`dow-${i}`} style={[styles.dow, { color: colors.inkDim }]}>{day}</Text>
          ))}
        </View>
        {weeks.map((week) => (
        <View key={week[0].iso} style={styles.week}>
        {week.map((night) =>
          night.pad ? (
            <View key={night.iso} style={styles.pad} />
          ) : (
            <Pressable
              key={night.iso}
              accessibilityRole="button"
              accessibilityLabel={dayLabel(night, locale, prefs.gentle === true)}
              onPress={() => openDay(night.iso)}
              style={[
                styles.day,
                {
                  borderColor: picked === night.iso ? colors.onDeep : night.isToday ? colors.on : colors.line,
                  backgroundColor: picked === night.iso ? colors.panel3 : colors.panel2,
                  opacity: night.empty ? 0.45 : 1,
                },
              ]}
            >
              <Text style={{ color: night.isToday ? colors.on : colors.ink, fontSize: 13 }}>{night.dayNum}</Text>
              {night.empty ? (
                <View style={styles.pip} />
              ) : (
                <View
                  style={[
                    styles.pip,
                    // A freeze is a ring, not a dot, so it never reads as cleared
                    // when a look tints cleared close to the freeze blue.
                    night.on
                      ? { backgroundColor: colors.on }
                      : night.freeze
                        ? { borderWidth: 1.5, borderColor: colors.freeze }
                        : night.miss
                          ? missDot(colors, missTone)
                          : { backgroundColor: colors.open },
                  ]}
                />
              )}
            </Pressable>
          ),
        )}
        </View>
        ))}
      </Reveal>
    </View>
  )
}

// A whole year: twelve small month grids of cleared and not cleared nights.
// Arrows go back to the year of the first answer. A day opens its sheet.
export function YearGrid({ book, boards, tagId = '', now, colors, onMonth }) {
  const prefs = usePrefs()
  const missTone = prefs.gentle === true ? colors.open : colors.miss
  const clock = now || new Date()
  const shelf = useMemo(() => (boards?.length ? boards : [book]), [boards, book])
  const thisYear = clock.getFullYear()
  const [year, setYear] = useState(thisYear)
  const dateIso = boardDate(clock, book?.dayFoldHour)

  useEffect(() => {
    setYear(thisYear)
  }, [tagId, thisYear])

  const firstMonth = useMemo(() => firstAnswerMonth(shelf, clock, tagId), [shelf, tagId, dateIso])
  const firstYear = Number(firstMonth.slice(0, 4))
  // One walk per [shelf, year]; the night changing also refreshes today.
  // The first year starts at the first month with answers, not January.
  const months = useMemo(() => {
    const all = yearMonths(shelf, year, clock, tagId)
    if (year !== firstYear) return all
    const from = Number(firstMonth.slice(5, 7)) - 1
    return all.filter((pack) => pack.start.getMonth() >= from)
  }, [shelf, year, tagId, dateIso, firstMonth, firstYear])
  const locale = dateLocale(prefs.locale)
  const canBack = year > firstYear
  const canNext = year < thisYear

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('cal.prevYear')}
          accessibilityState={{ disabled: !canBack }}
          disabled={!canBack}
          onPress={() => setYear((y) => y - 1)}
          hitSlop={8}
        >
          <Text style={[styles.shift, { color: canBack ? colors.inkDim : colors.line }]}>‹</Text>
        </Pressable>
        <Text style={[styles.month, { color: colors.ink }]}>{String(year)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('cal.nextYear')}
          accessibilityState={{ disabled: !canNext }}
          disabled={!canNext}
          onPress={() => setYear((y) => Math.min(thisYear, y + 1))}
          hitSlop={8}
        >
          <Text style={[styles.shift, { color: canNext ? colors.inkDim : colors.line }]}>›</Text>
        </Pressable>
      </View>
      <Reveal key={`y${year}`} style={styles.year} exiting={undefined} layout={false}>
        {months.map((pack) => (
          <View key={pack.start.getMonth()} style={styles.mini}>
            {/* The squares are small: the month name opens that month full size. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pack.start.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
              disabled={!onMonth}
              onPress={() => onMonth?.((year - thisYear) * 12 + pack.start.getMonth() - clock.getMonth())}
              hitSlop={8}
            >
              <Text style={[styles.miniLabel, { color: onMonth ? colors.on : colors.inkDim }]}>
                {`${pack.start.toLocaleDateString(locale, { month: 'short' })}${onMonth ? ' ›' : ''}`}
              </Text>
            </Pressable>
            <View style={styles.miniGrid}>
              {pack.nights.map((night) =>
                night.pad ? (
                  <View key={night.iso} style={styles.miniCell} />
                ) : (
                  <Pressable
                    key={night.iso}
                    accessibilityRole="button"
                    accessibilityLabel={dayLabel(night, locale, prefs.gentle === true)}
                    onPress={() => openNightWhy({ colors, boards: shelf, iso: night.iso, now: clock, tagId })}
                    hitSlop={2}
                    style={styles.miniCell}
                  >
                    <View
                      style={[
                        styles.miniDot,
                        {
                          backgroundColor: night.empty ? colors.panel2 : night.on ? colors.on : night.miss ? missTone : colors.open,
                          borderColor: night.isToday ? colors.ink : 'transparent',
                        },
                        !night.empty && !night.on && night.miss && !night.isToday ? missDot(colors, missTone) : null,
                      ]}
                    />
                  </Pressable>
                ),
              )}
            </View>
          </View>
        ))}
        {/* Fill the last row of three, so a short year keeps its columns. */}
        {Array.from({ length: (3 - (months.length % 3)) % 3 }, (_, at) => (
          <View key={`pad${at}`} style={styles.mini} />
        ))}
      </Reveal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  year: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  mini: { width: '31%', gap: 4 },
  miniLabel: { fontFamily: fonts.uiSemi, fontSize: 12 },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  miniCell: { width: '14.28%', aspectRatio: 1, padding: 1 },
  miniDot: { flex: 1, borderRadius: 2, borderWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shift: { fontSize: 20, paddingHorizontal: 8 },
  month: { fontFamily: fonts.uiSemi, fontSize: 17 },
  grid: {},
  week: { flexDirection: 'row' },
  dow: { width: '14.28%', textAlign: 'center', fontSize: 11, marginBottom: 4 },
  pad: { width: '14.28%', aspectRatio: 1 },
  day: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
    gap: 2,
  },
  pip: { width: 6, height: 6, borderRadius: 3 },
  marks: { marginTop: 2 },
  markRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  markPip: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  markLabel: { fontFamily: fonts.uiSemi, fontSize: 14 },
  markSub: { fontFamily: fonts.ui, fontSize: 13 },
})
