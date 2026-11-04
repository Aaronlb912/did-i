import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { shortLabel } from '../../src/lib/board-json.js'
import { firstAnswerMonth, monthStripNights, nightDueRows, nightWhy, yearMonths, yearTotals } from '../../src/lib/hall-pages.js'
import { openNightWhy } from './NightSheets.jsx'
import { firstWeekday, t } from '../../src/lib/i18n.js'
import { awayKey, usePrefs } from '../../src/lib/prefs.js'
import { boardDate, formatBoardDate, nightOpen } from '../../src/lib/recurrence.js'
import { showToast } from '../lib/toast-queue.js'
import { pastAnswerOpen } from '../../src/lib/board-ops.js'
import { nightWhyLines } from '../../src/lib/night-why.js'
import { knownWeCard, weCardShort, weOpenPastToday } from '../../src/lib/did-we.js'
import { publishSheet } from './SheetHost.jsx'
import { fonts } from '../theme.js'
import { Reveal, useLayoutState } from '../lib/motion.jsx'
import { missDot } from '../palette.js'
import { bestShelfStreak } from '../../src/lib/hall-feel.js'
import { scopedBooks } from '../../src/lib/tags.js'
import { passAlong } from '../../src/lib/native.js'
import { KeyButton } from './ui.jsx'

function dateLocale(code) {
  if (code === 'zh') return 'zh-CN'
  return code || 'en'
}

// What a screen reader hears for one day: "October 1, Cleared". The week
// strip on Home reads its days the same way.
export function dayLabel(night, locale, gentle = false) {
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
    const date = new Date(2026, 8, 6 + ((day + firstWeekday(locale)) % 7))
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
  // A Not yet stays a Not yet on past days; it was an answer, not a blank.
  if (status === 'skip') {
    return { key: 'skip', label: t(open ? 'jewelKey.notYet' : 'jewelKey.nope') }
  }
  if (when > 0) return { key: 'hole', label: t('cal.ahead') }
  // Gentle mode: a past night with no answer is not called missed.
  if (when < 0) return { key: 'miss', label: t('cal.notAnswered') }
  return { key: 'hole', label: upFirst(t('cal.open')) }
}

export function CalendarGrid({ book, boards = [], tagId = '', now, colors, startShift = 0, onAnswer }) {
  const prefs = usePrefs()
  // A missed day reads like any other unlit day, never a warning (gentle or not).
  const missTone = colors.open
  const clock = now || new Date()
  const [monthShift, setMonthShift] = useLayoutState(startShift)
  const [picked, setPicked] = useState('')

  useEffect(() => {
    setMonthShift(startShift)
    setPicked('')
  }, [tagId])

  const shelf = boards.length ? boards : [book]
  const dayIso = boardDate(clock, book?.dayFoldHour)
  // Up to 31 day walks: once per shelf, day, folder and month, not on every tap.
  const pack = useMemo(
    () => monthStripNights(shelf, clock, tagId, monthShift, firstWeekday(prefs.locale)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boards, book, dayIso, tagId, monthShift, awayKey(), prefs.locale],
  )
  // History starts at the first month with an answer; the back arrow stops there.
  const firstMonth = useMemo(() => firstAnswerMonth(shelf, clock, tagId), [boards, book, dayIso, tagId])
  const minShift = (Number(firstMonth.slice(0, 4)) - pack.start.getFullYear()) * 12 + Number(firstMonth.slice(5, 7)) - 1 - pack.start.getMonth() + monthShift
  const canBack = monthShift > Math.min(0, minShift)
  const locale = dateLocale(prefs.locale)
  const monthLabel = pack.start.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const dows = dowMarks(prefs.locale)
  // One row per week: a wrapped grid of square cells left a tall blank gap under it on Android.
  const weeks = []
  for (let i = 0; i < pack.nights.length; i += 7) weeks.push(pack.nights.slice(i, i + 7))

  // A day opens its sheet: why it did or did not clear, then each question.
  function openDay(iso, shelfNow = shelf) {
    setPicked(iso)
    const today = boardDate(clock, book?.dayFoldHour)
    const when = iso > today ? 1 : iso < today ? -1 : 0
    const why = nightWhy(shelfNow, iso, clock, tagId)
    // What broke the night leads: open Did wes, then anything not a Did, then the Dids.
    const done = (row) => ['yes', 'late'].includes(row.answer?.status)
    const rows = nightDueRows(shelfNow, iso, tagId)
    const sorted = [...rows.filter((row) => !done(row)), ...rows.filter(done)]
    const weOpen = why.weOpen || []
    // A monthly card is still open until its month ends, so it is not a missed day yet.
    const realToday = boardDate(new Date(), book?.dayFoldHour)
    const weMarkOf = (id) => {
      const card = knownWeCard(id)
      const over = when < 0 && !(card && weOpenPastToday(card, realToday))
      return over ? { label: t('cal.notAnswered'), tone: missTone } : { label: upFirst(t('cal.open')), tone: colors.open }
    }
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
          {weOpen.map((id) => {
            const weMark = weMarkOf(id)
            return (
            <View key={`we-${id}`} style={styles.markRow}>
              <View style={[styles.markPip, { backgroundColor: weMark.tone }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.markLabel, { color: colors.ink }]}>{weMark.label}</Text>
                <Text style={[styles.markSub, { color: colors.inkDim }]}>{weCardShort(id) || t('we.title')}</Text>
              </View>
            </View>
            )
          })}
          {sorted.map((row) => {
            const mark = markOf(row.answer, when, nightOpen(iso, clock))
            const canAnswer = Boolean(onAnswer) && pastAnswerOpen(row, new Date())
            const date = formatBoardDate(iso)
            const answer = (status) => {
              const next = onAnswer(row, status)
              if (next) openDay(iso, shelfNow.map((item) => (item.id === next.id ? next : item)))
              // A sheet left open past midnight can be outside the window now: redraw without the buttons.
              else if (!pastAnswerOpen(row, new Date())) openDay(iso, shelfNow)
            }
            return (
              <Pressable
                key={`${row.boardId}-${row.lamp.id}`}
                style={styles.markRow}
                disabled={!onAnswer || canAnswer || iso >= boardDate(new Date())}
                accessibilityRole={onAnswer && !canAnswer && iso < boardDate(new Date()) ? 'text' : undefined}
                accessibilityLabel={`${shortLabel(row.lamp)}, ${mark.label}`}
                accessibilityHint={onAnswer && !canAnswer && iso < boardDate(new Date()) ? t('calendar.tooOld') : undefined}
                onPress={() => showToast({ id: 'cal-old', kind: 'error', text: t('calendar.tooOld'), ms: 3000 })}
              >
                <View style={[styles.markPip, { backgroundColor: colors[mark.key === 'yes' ? 'on' : mark.key === 'late' ? 'late' : mark.key === 'skip' ? 'skip' : 'open'] }]} />
                <View style={{ flex: 1 }}>
                  <Text maxFontSizeMultiplier={1.4} style={[styles.markLabel, { color: colors.ink }]}>{mark.label}</Text>
                  <Text maxFontSizeMultiplier={1.4} style={[styles.markSub, { color: colors.inkDim }]}>{shortLabel(row.lamp)}</Text>
                </View>
                {canAnswer ? (
                  <View style={styles.markBtns}>
                    {[['yes', t('widget.tonight.did'), 'cal.markDid'], ['skip', t('later.nope'), 'cal.markNotYet']].map(([status, label, key]) => {
                      const on = status === 'yes' ? row.answer?.status === 'yes' || row.answer?.status === 'late' : row.answer?.status === 'skip'
                      return (
                        <Pressable
                          key={status}
                          accessibilityRole="button"
                          accessibilityLabel={t(key, { question: shortLabel(row.lamp), date })}
                          accessibilityState={{ selected: on }}
                          onPress={() => answer(status)}
                          style={[styles.markBtn, { borderColor: colors.line, backgroundColor: on ? colors.line : 'transparent' }]}
                        >
                          <Text style={[styles.markBtnText, { color: colors.ink }]}>{label}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                ) : null}
              </Pressable>
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
        <Pressable accessibilityRole="button" accessibilityLabel={t('cal.prev')} accessibilityState={{ disabled: !canBack }} disabled={!canBack} onPress={() => { setMonthShift((n) => n - 1); setPicked('') }} hitSlop={8}>
          <Text style={[styles.shift, { color: canBack ? colors.inkDim : colors.line }]}>‹</Text>
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
export function YearGrid({ book, boards, tagId = '', lampId = '', now, colors, onMonth }) {
  const prefs = usePrefs()
  const missTone = colors.open
  const clock = now || new Date()
  // With a lampId, every book keeps only that question, so the walk counts its days alone.
  const shelf = useMemo(() => {
    const all = boards?.length ? boards : [book]
    if (!lampId) return all
    return all.map((b) => ({ ...b, lamps: (b.lamps || []).filter((l) => l.id === lampId) }))
  }, [boards, book, lampId])
  // The year and month of the day on screen, not the wall clock: just after
  // midnight the day has not turned yet.
  const dateIso = boardDate(clock, book?.dayFoldHour)
  const thisYear = Number(dateIso.slice(0, 4))
  const thisMonth = Number(dateIso.slice(5, 7)) - 1
  const [year, setYear] = useState(thisYear)

  useEffect(() => {
    setYear(thisYear)
  }, [tagId, thisYear])

  const firstMonth = useMemo(() => firstAnswerMonth(shelf, clock, tagId), [shelf, tagId, dateIso, awayKey()])
  const firstYear = Number(firstMonth.slice(0, 4))
  // One walk per [shelf, year]; the night changing also refreshes today.
  // The first year starts at the first month with answers, not January.
  const months = useMemo(() => {
    const all = yearMonths(shelf, year, clock, tagId, firstWeekday(prefs.locale))
    if (year !== firstYear) return all
    const from = Number(firstMonth.slice(5, 7)) - 1
    return all.filter((pack) => pack.start.getMonth() >= from)
  }, [shelf, year, tagId, dateIso, firstMonth, firstYear, prefs.locale, awayKey()]) // eslint-disable-line react-hooks/exhaustive-deps
  const totals = useMemo(() => yearTotals(months), [months])
  // Best streak is shelf-wide, so it is left out while a folder is picked.
  const best = useMemo(() => (tagId || lampId || prefs.gentle === true ? 0 : bestShelfStreak(shelf, clock)), [shelf, tagId, lampId, dateIso, awayKey()]) // eslint-disable-line react-hooks/exhaustive-deps
  const cardRef = useRef(null)
  // A picture of the year to share. Falls back to the text when the phone
  // cannot capture or share an image.
  const shareYear = async () => {
    const folder = tagId ? scopedBooks(shelf, tagId).map((b) => b.title).join(', ') : ''
    const text = folder
      ? t('cal.yearShareFolder', { year, folder, did: totals.did, rate: totals.rate })
      : t('cal.yearShareText', { year, did: totals.did, rate: totals.rate, best })
    try {
      const [{ captureRef }, Sharing] = await Promise.all([import('react-native-view-shot'), import('expo-sharing')])
      if (!cardRef.current || !(await Sharing.isAvailableAsync())) throw new Error('no image share')
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' })
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('cal.yearShare'), UTI: 'public.png' })
    } catch {
      passAlong(text)
    }
  }
  const locale = dateLocale(prefs.locale)
  const canBack = year > firstYear
  const canNext = year < thisYear

  const monthDots = (pack) => (
    <View style={styles.miniGrid}>
      {pack.nights.map((night) =>
        night.pad ? (
          <View key={night.iso} style={styles.miniCell} />
        ) : (
          <View key={night.iso} accessible accessibilityLabel={dayLabel(night, locale, prefs.gentle === true)} style={styles.miniCell}>
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
          </View>
        ),
      )}
    </View>
  )

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
      {totals.did ? (
        <>
          <Text style={[styles.totals, { color: colors.inkDim }]}>
            {t('cal.yearTotals', { did: totals.did, rate: totals.rate })}
            {best ? ` · ${t('cal.yearBest', { n: best })}` : ''}
          </Text>
          <KeyButton colors={colors} label={t('cal.yearShare')} onPress={shareYear} />
        </>
      ) : null}
      <Reveal key={`y${year}`} style={styles.year} exiting={undefined} layout={false}>
        {months.map((pack) => (
          <View key={pack.start.getMonth()} style={styles.mini}>
            {/* The squares are small: the month name opens that month full size. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pack.start.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
              disabled={!onMonth}
              onPress={() => onMonth?.((year - thisYear) * 12 + pack.start.getMonth() - thisMonth)}
              hitSlop={8}
            >
              <Text style={[styles.miniLabel, { color: onMonth ? colors.on : colors.inkDim }]}>
                {`${pack.start.toLocaleDateString(locale, { month: 'short' })}${onMonth ? ' ›' : ''}`}
              </Text>
            </Pressable>
            {monthDots(pack)}
          </View>
        ))}
        {/* Fill the last row of three, so a short year keeps its columns. */}
        {Array.from({ length: (3 - (months.length % 3)) % 3 }, (_, at) => (
          <View key={`pad${at}`} style={styles.mini} />
        ))}
      </Reveal>
      {/* Drawn off screen, only to be captured as the picture to share. */}
      {totals.did ? (
      <View ref={cardRef} collapsable={false} pointerEvents="none" style={[styles.card, { backgroundColor: colors.bg }]}>
        <Text style={[styles.cardYear, { color: colors.ink }]}>{String(year)}</Text>
        <Text style={[styles.cardLine, { color: colors.on }]}>{t('cal.yearTotals', { did: totals.did, rate: totals.rate })}</Text>
        {best ? <Text style={[styles.cardLine, { color: colors.inkDim }]}>{t('cal.yearBest', { n: best })}</Text> : null}
        <View style={styles.year}>
          {months.map((pack) => (
            <View key={pack.start.getMonth()} style={styles.mini}>
              <Text style={[styles.miniLabel, { color: colors.inkDim }]}>{pack.start.toLocaleDateString(locale, { month: 'short' })}</Text>
              {monthDots(pack)}
            </View>
          ))}
        </View>
        <Text style={[styles.cardMark, { color: colors.inkDim }]}>Did I</Text>
      </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  card: { position: 'absolute', left: -2000, top: 0, width: 360, padding: 20, gap: 8 },
  cardYear: { fontFamily: fonts.uiBold, fontSize: 34 },
  cardLine: { fontFamily: fonts.uiSemi, fontSize: 15 },
  cardMark: { fontFamily: fonts.uiBold, fontSize: 14, textAlign: 'right', marginTop: 4 },
  year: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  mini: { width: '31%', gap: 4 },
  miniLabel: { fontFamily: fonts.uiSemi, fontSize: 12 },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  miniCell: { width: '14.28%', aspectRatio: 1, padding: 1 },
  miniDot: { flex: 1, borderRadius: 2, borderWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shift: { fontSize: 20, paddingHorizontal: 8, paddingVertical: 6 },
  totals: { fontFamily: fonts.ui, fontSize: 13, textAlign: 'center' },
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
  markRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 },
  markPip: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  markLabel: { fontFamily: fonts.uiSemi, fontSize: 14 },
  markBtns: { flexDirection: 'row', gap: 8 },
  markBtn: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, borderWidth: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  markBtnText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  markSub: { fontFamily: fonts.ui, fontSize: 13 },
})
