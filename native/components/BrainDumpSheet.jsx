import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { QUESTION_MAX } from '../../src/lib/board-json.js'
import { commitBook } from '../../src/lib/achievements.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { splitDump } from '../../src/lib/brain-dump.js'
import { t } from '../../src/lib/i18n.js'
import { MORNING_CAP, addMorning, morningCount } from '../../src/lib/morning-ask.js'
import { boardDate } from '../../src/lib/recurrence.js'
import { confirmDone } from '../lib/confirm.js'
import { publishSheet } from './SheetHost.jsx'
import { DidButton, Field, KeyButton, Meta } from './ui.jsx'

function BrainDump({ book, colors, onChange, onClose }) {
  const [text, setText] = useState('')
  // Lines the person edited or removed by hand; null until they touch one.
  const [lines, setLines] = useState(null)
  const [error, setError] = useState('')
  const [lastText, setLastText] = useState('')
  if (text !== lastText) {
    setLastText(text)
    setLines(null)
  }
  const items = lines || splitDump(text)
  const shelf = readShelf().boards || [book]
  const room = Math.max(0, MORNING_CAP - morningCount(shelf, boardDate(new Date())))
  const fits = items.slice(0, room)
  const over = items.length > room

  const edit = (i, value) => setLines(items.map((item, at) => (at === i ? value : item)))
  const remove = (i) => setLines(items.filter((_, at) => at !== i))

  const add = () => {
    setError('')
    const now = new Date()
    const boards = readShelf().boards || [book]
    let live = boards.find((item) => item.id === book.id) || book
    let made = 0
    let all = boards.map((item) => (item.id === live.id ? live : item))
    for (const q of fits) {
      const out = addMorning(live, all, q, now)
      if (out.error) continue
      live = out.book
      all = all.map((item) => (item.id === live.id ? live : item))
      made += 1
    }
    if (!made) return setError(t('confirm.miss'))
    try {
      onChange(commitBook(live, now))
    } catch {
      return setError(t('confirm.miss'))
    }
    onClose()
    confirmDone(t('dump.added', { n: made }))
  }

  return (
    <View style={styles.edit}>
      <Field
        colors={colors}
        label={t('dump.hint')}
        value={text}
        onChangeText={setText}
        placeholder={t('dump.hint')}
        multiline
        autoFocus
      />
      {!items.length ? <Meta colors={colors}>{t('dump.empty')}</Meta> : null}
      {over ? <Meta colors={colors}>{t('dump.room', { n: room })}</Meta> : null}
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

export function openBrainDump({ book, colors, onChange }) {
  const close = () => publishSheet(null)
  publishSheet({
    title: t('dump.title'),
    colors,
    closeLabel: t('settings.neverMind'),
    onClose: close,
    noClose: true,
    content: <BrainDump book={book} colors={colors} onChange={onChange} onClose={close} />,
  })
}

const styles = StyleSheet.create({
  edit: { gap: 8, marginTop: 8, width: '100%' },
  line: { gap: 4, width: '100%' },
  grey: { opacity: 0.4 },
  full: { alignSelf: 'stretch' },
})
