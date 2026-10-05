import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { NOTE_MAX, setAnswerNote } from '../../src/lib/board-ops.js'
import { t } from '../../src/lib/i18n.js'
import { formatBoardDate } from '../../src/lib/recurrence.js'
import { confirmDone } from '../lib/confirm.js'
import { Field, KeyButton, Meta, Row } from './ui.jsx'
import { sectionLabel } from '../theme.js'

const SHOWN = 7

function statusWord(status) {
  if (status === 'late') return t('feed.status.late')
  if (status === 'skip') return t('feed.status.nope')
  return t('feed.status.did')
}

function nightLabel(key) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? formatBoardDate(key) : key
}

/** This question's last few answered nights; tap one to write a short note on it. */
export function NightNotes({ book, lamp, colors, onChange }) {
  const [open, setOpen] = useState('')
  const [draft, setDraft] = useState('')
  const rows = useMemo(
    () =>
      (book.answers || [])
        .filter((answer) => answer.lampId === lamp.id && answer.periodKey)
        .sort((a, b) => String(b.periodKey).localeCompare(String(a.periodKey)))
        .slice(0, SHOWN),
    [book.answers, lamp.id],
  )

  function save(key) {
    onChange(setAnswerNote(book, lamp.id, key, draft))
    setOpen('')
    confirmDone(t('note.saved'))
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.inkSoft }]}>{t('note.title')}</Text>
      {!rows.length ? <Meta colors={colors}>{t('note.empty')}</Meta> : <Meta colors={colors}>{t('note.hint')}</Meta>}
      {rows.map((answer) =>
        open === answer.periodKey ? (
          <View key={answer.periodKey} style={styles.edit}>
            <Field
              colors={colors}
              label={`${nightLabel(answer.periodKey)} · ${statusWord(answer.status)}`}
              value={draft}
              onChangeText={setDraft}
              placeholder={t('note.ph')}
              maxLength={NOTE_MAX}
              autoFocus
              onSubmitEditing={() => save(answer.periodKey)}
            />
            <View style={styles.keys}>
              <KeyButton colors={colors} label={t('hang.save')} onPress={() => save(answer.periodKey)} />
              <KeyButton colors={colors} label={t('settings.neverMind')} onPress={() => setOpen('')} />
            </View>
          </View>
        ) : (
          <Row
            key={answer.periodKey}
            colors={colors}
            label={`${nightLabel(answer.periodKey)} · ${statusWord(answer.status)}`}
            note={answer.note || ''}
            onPress={() => {
              setDraft(answer.note || '')
              setOpen(answer.periodKey)
            }}
          />
        ),
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 8 },
  label: { ...sectionLabel },
  edit: { gap: 8 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
