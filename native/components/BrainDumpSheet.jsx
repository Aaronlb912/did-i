import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { QUESTION_MAX, blankLamp, didQuestion, shortFromQuestion } from '../../src/lib/board-json.js'
import { commitBook } from '../../src/lib/achievements.js'
import { hangInto } from '../../src/lib/board-ops.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { splitDump } from '../../src/lib/brain-dump.js'
import { t } from '../../src/lib/i18n.js'
import { MORNING_CAP, addMorning, morningCount } from '../../src/lib/morning-ask.js'
import { questionRoom } from '../../src/lib/question-cap.js'
import { boardDate } from '../../src/lib/recurrence.js'
import { confirmDone } from '../lib/confirm.js'
import { publishSheet } from './SheetHost.jsx'
import { DidButton, Field, KeyButton, Meta } from './ui.jsx'

const plain = (text) => String(text || '').trim().toLowerCase()

function BrainDump({ book, colors, every: startEvery, lamp: extra, onChange, onClose }) {
  const [text, setText] = useState('')
  // 'today' adds one-day questions; 'every' adds daily ones.
  const [mode, setMode] = useState(startEvery ? 'every' : 'today')
  // Lines the person edited or removed by hand; null until they touch one.
  const [lines, setLines] = useState(null)
  const [error, setError] = useState('')
  const [lastText, setLastText] = useState('')
  if (text !== lastText) {
    setLastText(text)
    setLines(null)
  }
  const daily = mode === 'every'
  const items = lines || splitDump(text)
  const kept = items.map((item) => item.trim()).filter(Boolean)
  const shelf = readShelf().boards || [book]
  const room = daily ? questionRoom(shelf) : Math.max(0, MORNING_CAP - morningCount(shelf, boardDate(new Date())))
  const fits = kept.slice(0, room)
  const over = kept.length > room

  const edit = (i, value) => setLines(items.map((item, at) => (at === i ? value : item)))
  const remove = (i) => setLines(items.filter((_, at) => at !== i))

  const add = () => {
    setError('')
    const now = new Date()
    const boards = readShelf().boards || [book]
    let live = boards.find((item) => item.id === book.id) || book
    let made = 0
    let all = boards.map((item) => (item.id === live.id ? live : item))
    const have = new Set(all.flatMap((item) => (item.lamps || []).filter((lamp) => !lamp.archived).map((lamp) => plain(lamp.question))))
    for (const q of fits) {
      if (daily) {
        const question = didQuestion(q)
        if (!question || have.has(plain(question))) continue
        have.add(plain(question))
        live = hangInto(live, { ...blankLamp(now), ...extra, question, short: shortFromQuestion(question) })
        made += 1
        continue
      }
      const out = addMorning(live, all, q, now)
      if (out.error) continue
      live = out.book
      all = all.map((item) => (item.id === live.id ? live : item))
      made += 1
    }
    if (!made) return setError(t(daily && !fits.length ? 'hang.cap' : 'confirm.miss'))
    try {
      onChange(commitBook(live, now))
    } catch {
      return setError(t('confirm.miss'))
    }
    onClose()
    confirmDone(daily ? t(made === 1 ? 'dump.addedEveryOne' : 'dump.addedEvery', { n: made }) : t('dump.added', { n: made }))
  }

  return (
    <View style={styles.edit}>
      <View style={styles.full} accessibilityRole="radiogroup">
        <KeyButton colors={colors} label={t('dump.modeToday')} picked={!daily} onPress={() => setMode('today')} />
        <View style={styles.gap} />
        <KeyButton colors={colors} label={t('dump.modeEvery')} picked={daily} onPress={() => setMode('every')} />
      </View>
      <Field
        colors={colors}
        label={daily ? t('dump.hintEvery') : t('dump.hint')}
        value={text}
        onChangeText={setText}
        placeholder={daily ? t('dump.hintEvery') : t('dump.hint')}
        multiline
        autoFocus
      />
      {!items.length ? <Meta colors={colors}>{t('dump.empty')}</Meta> : null}
      {over ? <Meta colors={colors}>{daily ? t('hang.cap') : t('dump.room', { n: room })}</Meta> : null}
      {items.map((item, i) => (
        <View key={i} style={[styles.line, i >= room ? styles.grey : null]}>
          <Field
            colors={colors}
            label=""
            value={item}
            onChangeText={(value) => edit(i, value)}
            maxLength={QUESTION_MAX}
          />
          <View style={styles.full}>
            <KeyButton colors={colors} label={t('dump.remove')} onPress={() => remove(i)} />
          </View>
        </View>
      ))}
      {error ? <Meta colors={colors}>{error}</Meta> : null}
      <DidButton
        colors={colors}
        label={t('dump.add', { n: fits.length })}
        disabled={!fits.length}
        onPress={add}
      />
    </View>
  )
}

// every: start on Every day, for a first list from another app. lamp: fields
// each daily question starts with (first run's reminder time).
export function openBrainDump({ book, colors, onChange, every = false, lamp = null }) {
  const close = () => publishSheet(null)
  publishSheet({
    title: t('dump.title'),
    colors,
    closeLabel: t('settings.neverMind'),
    onClose: close,
    noClose: true,
    content: <BrainDump book={book} colors={colors} every={every} lamp={lamp} onChange={onChange} onClose={close} />,
  })
}

const styles = StyleSheet.create({
  edit: { gap: 8, marginTop: 8, width: '100%' },
  line: { gap: 4, width: '100%' },
  grey: { opacity: 0.4 },
  full: { alignSelf: 'stretch' },
  gap: { height: 8 },
})
