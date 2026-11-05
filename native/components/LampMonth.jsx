import { useIsFocused } from '@react-navigation/native'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { firstWeekday, t } from '../../src/lib/i18n.js'
import { loadProofs } from '../../src/lib/proofs.js'
import { usePrefs } from '../../src/lib/prefs.js'
import { answerFor, formatBoardDate, nightOpen, periodKeyFor } from '../../src/lib/recurrence.js'
import { lampMonthCells } from '../../src/lib/lamp-month.js'
import { pastAnswerOpen } from '../../src/lib/board-ops.js'
import { shortLabel } from '../../src/lib/board-json.js'
import { amountWords } from '../../src/lib/lamp-record.js'
import { publishSheet } from './SheetHost.jsx'
import { fonts } from '../theme.js'
import { Reveal, useLayoutState } from '../lib/motion.jsx'
import { missDot } from '../palette.js'
import { photoList } from '../lib/photo-list.js'
import { openAnswerNote } from './NightNotes.jsx'
import { KeyButton } from './ui.jsx'
import { goHash } from '../navigation/hash.js'

function pad(n) {
  return String(n).padStart(2, '0')
}

function monthOf(iso, back) {
  const [y, m] = iso.split('-').map(Number)
  const at = new Date(y, m - 1 - back, 1, 12)
  return { y: at.getFullYear(), m: at.getMonth() }
}

function cellColor(state, colors) {
  if (state === 'did') return colors.on
  if (state === 'late') return colors.late || colors.on
  if (state === 'nope') return colors.skip || colors.inkDim
  if (state === 'missed') return colors.open
  return ''
}

/** A small month calendar under the recent nights, back to the month the question was made. */
export function LampMonth({ book, lamp, colors, dateIso, onAnswer, onNote }) {
  const [back, setBack] = useLayoutState(0)
  const made = /^\d{4}-\d{2}-\d{2}$/.test(String(lamp?.createdOn || '')) ? lamp.createdOn : dateIso
  const { y, m } = monthOf(dateIso, back)
  const first = monthOf(made, 0)
  const canBack = y > first.y || (y === first.y && m > first.m)
  const monthKey = `${y}-${m}`
  const prefs = usePrefs()
  const gentle = prefs.gentle === true
  const locale = prefs.locale || undefined
  const weekStart = firstWeekday(prefs.locale)
  const uid = useAccount().user?.id
  const focused = useIsFocused()
  const sendId = lamp?.sendId || ''
  const [photos, setPhotos] = useState([])
  // My photos on this question. Read again on return, since the viewer can remove one.
  useEffect(() => {
    if (!sendId || !uid) {
      setPhotos([])
      return undefined
    }
    if (!focused) return undefined
    let live = true
    loadProofs({ sendIds: [sendId] })
      .then((out) => {
        if (live && !out.miss) setPhotos(out.rows.filter((row) => row.owner_id === uid).map((row) => ({ ...row, kind: 'you', question: lamp.question || '', name: '' })))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [sendId, uid, focused])
  const photoOn = useMemo(() => new Map(photos.map((photo) => [photo.night, photo])), [photos])
  const cells = useMemo(
    () => (lamp && dateIso ? lampMonthCells(book, lamp, dateIso, y, m, gentle, weekStart) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book, lamp, dateIso, monthKey, gentle, weekStart],
  )
  if (!lamp || !dateIso || lamp.cadence === 'once') return null
  let title = ''
  try {
    title = new Date(y, m, 1, 12).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  } catch {
    title = `${y}-${pad(m + 1)}`
  }
  const letters = [0, 1, 2, 3, 4, 5, 6].map((d) => Array.from(t(`hang.day.${(d + weekStart) % 7}`))[0] || '')
  const rows = []
  for (let at = 0; at < cells.length; at += 7) rows.push(cells.slice(at, at + 7))
  const last = rows[rows.length - 1]
  if (last) while (last.length < 7) last.push(null)

  // A tapped night opens a small sheet for this question, like a night in Your history.
  const STATE_WORD = { did: 'jewelKey.did', late: 'jewelKey.late', nope: 'jewelKey.nope', missed: 'later.missed', open: 'jewelKey.open' }
  // A skip on a night that is still open reads Not yet.
  const stateWord = (cell) => (cell.state === 'nope' && nightOpen(cell.iso) ? 'jewelKey.notYet' : STATE_WORD[cell.state])
  function openDay(cell, bookNow = book) {
    const answer = answerFor(bookNow, lamp.id, periodKeyFor(lamp, cell.iso))
    const note = String(answer?.note || '').trim()
    const close = () => publishSheet(null)
    const row = { lamp, boardId: bookNow.id, dateIso: cell.iso, periodKey: periodKeyFor(lamp, cell.iso), answer }
    const canAnswer = Boolean(onAnswer) && Boolean(cell.state || cell.ask) && pastAnswerOpen(row, new Date())
    const photo = photoOn.get(cell.iso)
    const didIt = answer?.status === 'yes' || answer?.status === 'late'
    const reply = (status) => {
      const next = onAnswer(row, status)
      // A changed answer offers Undo in the toast, which sits under the sheet.
      if (next && answer) close()
      else if (next) openDay(cell, next)
      else if (!pastAnswerOpen(row, new Date())) openDay(cell, bookNow)
    }
    publishSheet({
      kicker: shortLabel(lamp),
      title: formatBoardDate(cell.iso),
      body: [cell.state ? t(stateWord(cell)) : '', amountWords(answer?.amount, lamp.amountUnit), note].filter(Boolean).join('\n'),
      content: canAnswer || (didIt && onNote) ? (
        <>
        {canAnswer ? (
        <View style={styles.sheetBtns}>
          {[['yes', t('widget.tonight.did'), 'cal.markDid'], ['skip', t('later.nope'), 'cal.markNotYet']].map(([status, label, key]) => {
            const on = status === 'yes' ? answer?.status === 'yes' || answer?.status === 'late' : answer?.status === 'skip'
            return (
              <Pressable
                key={status}
                accessibilityRole="button"
                accessibilityLabel={t(key, { question: shortLabel(lamp), date: formatBoardDate(cell.iso) })}
                accessibilityState={{ selected: on }}
                onPress={() => reply(status)}
                style={[styles.sheetBtn, { borderColor: colors.line, backgroundColor: on ? colors.line : 'transparent' }]}
              >
                <Text style={[styles.sheetBtnText, { color: colors.ink }]}>{label}</Text>
              </Pressable>
            )
          })}
        </View>
        ) : null}
        {didIt && onNote ? (
          <View style={styles.sheetNote}>
            <KeyButton
              colors={colors}
              label={note ? t('note.edit') : t('note.add')}
              onPress={() => openAnswerNote({ boardId: bookNow.id, lampId: lamp.id, periodKey: row.periodKey, colors, onChange: onNote })}
            />
          </View>
        ) : null}
        </>
      ) : null,
      ...(photo
        ? {
            moreLabel: t('photos.viewDay'),
            onMore: () => {
              close()
              photoList.rows = [...photos].sort((a, b) => String(b.night).localeCompare(String(a.night)))
              photoList.uid = uid
              goHash('/photo', { id: photo.id })
            },
          }
        : null),
      closeLabel: t('cal.close'),
      colors,
      onClose: close,
    })
  }

  const hasMore = (cell) => {
    const a = answerFor(book, lamp.id, periodKeyFor(lamp, cell.iso))
    return Boolean(String(a?.note || '').trim() || a?.amount)
  }
  const hasLate = cells.some((cell) => cell?.state === 'late')

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
      <Reveal key={`m${back}`} exiting={undefined} layout={false}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((cell, c) => {
            if (!cell) return <View key={c} style={styles.cell} />
            const fill = cellColor(cell.state, colors)
            return (
              <Pressable
                key={cell.iso}
                style={styles.cell}
                hitSlop={8}
                disabled={!cell.state && !cell.ask}
                onPress={() => openDay(cell)}
                accessibilityRole={cell.state || cell.ask ? 'button' : undefined}
                accessibilityLabel={cell.state ? `${formatBoardDate(cell.iso)}, ${t(stateWord(cell))}${photoOn.has(cell.iso) ? `, ${t('photos.dayMark')}` : ''}` : cell.iso > dateIso ? `${formatBoardDate(cell.iso)}, ${t('cal.ahead')}` : formatBoardDate(cell.iso)}
              >
                <View
                  style={[
                    styles.day,
                    cell.state === 'missed'
                      ? missDot(colors)
                      : fill
                      ? { backgroundColor: fill }
                      : cell.state === 'open'
                        ? { borderWidth: 1, borderColor: colors.open || colors.line }
                        : null,
                  ]}
                >
                  <Text maxFontSizeMultiplier={1.4} style={[styles.dayText, { color: fill && !(cell.state === 'missed' && colors.missRing) ? colors.bg : cell.state ? colors.ink : colors.inkDim }]}>
                    {cell.day}
                  </Text>
                  {cell.state && hasMore(cell) ? <View style={[styles.more, { backgroundColor: colors.inkDim }]} /> : null}
                  {photoOn.has(cell.iso) ? <View style={[styles.photo, { borderColor: colors.ink }]} /> : null}
                </View>
              </Pressable>
            )
          })}
        </View>
      ))}
      </Reveal>
      <View style={styles.key}>
        {[
          { id: 'did', color: colors.on, label: t('jewelKey.did') },
          { id: 'late', color: colors.late || colors.on, label: t('jewelKey.late') },
          { id: 'nope', color: colors.skip || colors.inkDim, label: t(gentle ? 'jewelKey.nope' : 'jewelKey.notYet') },
          ...(gentle ? [] : [{ id: 'missed', color: colors.open, label: t('later.missed') }]),
        ].map((item) => (
          <View key={item.id} style={styles.keyItem}>
            <View style={[styles.keyDot, item.id === 'missed' ? missDot(colors, colors.open) : { backgroundColor: item.color }]} />
            <Text style={[styles.keyText, { color: colors.inkSoft }]}>{item.label}</Text>
          </View>
        ))}
        <View style={styles.keyItem}>
          <View style={[styles.keyDot, { borderWidth: 1, borderColor: colors.openRing || colors.open || colors.line }]} />
          <Text style={[styles.keyText, { color: colors.inkSoft }]}>{t('jewelKey.open')}</Text>
        </View>
        {photos.length ? (
          <View style={styles.keyItem}>
            <View style={[styles.photo, styles.keyPhoto, { borderColor: colors.ink }]} />
            <Text style={[styles.keyText, { color: colors.inkSoft }]}>{t('photos.dayMark')}</Text>
          </View>
        ) : null}
        {hasLate ? <Text style={[styles.keyText, styles.keyWhy, { color: colors.inkDim }]}>{t('jewelKey.lateWhy')}</Text> : null}
      </View>
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
  letter: { fontFamily: fonts.mono, fontSize: 11, textAlign: 'center' },
  day: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontFamily: fonts.mono, fontSize: 11 },
  key: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 12, rowGap: 4, marginTop: 8 },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  keyDot: { width: 10, height: 10, borderRadius: 5 },
  keyText: { fontFamily: fonts.ui, fontSize: 11 },
  sheetNote: { alignSelf: 'flex-start', marginTop: 8 },
  sheetBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  sheetBtn: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetBtnText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  more: { position: 'absolute', top: 0, right: 0, width: 5, height: 5, borderRadius: 3 },
  photo: { position: 'absolute', bottom: 0, right: 0, width: 7, height: 6, borderRadius: 2, borderWidth: 1.5 },
  keyPhoto: { position: 'relative', bottom: undefined, right: undefined },
  keyWhy: { width: '100%', textAlign: 'center' },
})
