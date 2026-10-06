import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { NOTE_MAX, setAnswerNote } from '../../src/lib/board-ops.js'
import { shortLabel } from '../../src/lib/board-json.js'
import { t } from '../../src/lib/i18n.js'
import { lampNights } from '../../src/lib/lamp-record.js'
import { periodLabel } from '../../src/lib/recurrence.js'
import { confirmDone } from '../lib/confirm.js'
import { DidButton, Field, KeyButton, Meta, Row } from './ui.jsx'
import { sectionLabel } from '../theme.js'
import { Reveal, pressFx, useLayoutState } from '../lib/motion.jsx'
import { publishSheet } from './SheetHost.jsx'
import { goHash } from '../navigation/hash.js'

// How many recent nights "Add a note" offers.
const PICKS = 7
const NOTES_SHOWN = 3

function statusWord(status) {
  if (status === 'late') return t('feed.status.late')
  if (status === 'skip') return t('feed.status.nope')
  return t('later.did')
}

function nightLine(lamp, answer) {
  const night = periodLabel(lamp, answer.periodKey)
  return night ? `${night} · ${statusWord(answer.status)}` : statusWord(answer.status)
}

/** One note box with Save and Never mind. */
function NoteEdit({ label, initial, colors, onSave, onCancel }) {
  const [draft, setDraft] = useState(initial || '')
  return (
    <View style={styles.edit}>
      <Field
        colors={colors}
        label={label}
        value={draft}
        onChangeText={setDraft}
        placeholder={t('note.ph')}
        maxLength={NOTE_MAX}
        autoFocus
        onSubmitEditing={() => onSave(draft)}
      />
      <View style={styles.keys}>
        <DidButton small colors={colors} label={t('hang.save')} onPress={() => onSave(draft)} />
        <KeyButton colors={colors} label={t('settings.neverMind')} onPress={onCancel} />
      </View>
    </View>
  )
}

/** This question's nights that have a note, plus "Add a note" for a recent answered night. */
export function NightNotes({ book, lamp, colors, onChange }) {
  const [open, setOpen] = useLayoutState('')
  const [picking, setPicking] = useLayoutState(false)
  const nights = useMemo(() => lampNights(book, lamp), [book, lamp])
  const noted = nights.filter((row) => row.answer.note)
  // The newest few, so a question with many notes stays short; the rest on ask.
  const [all, setAll] = useLayoutState(false)
  const shown = all ? noted : noted.slice(0, NOTES_SHOWN)
  const picks = nights.filter((row) => !row.answer.note).slice(0, PICKS)

  function save(key, draft) {
    onChange(setAnswerNote(book, lamp.id, key, draft))
    setOpen('')
    setPicking(false)
    confirmDone(t('note.saved'))
  }

  function edit(answer) {
    return (
      <NoteEdit
        key={answer.periodKey}
        label={nightLine(lamp, answer)}
        initial={answer.note}
        colors={colors}
        onSave={(draft) => save(answer.periodKey, draft)}
        onCancel={() => setOpen('')}
      />
    )
  }

  const openPick = picks.find((row) => row.answer.periodKey === open)

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.inkSoft }]}>{t('note.title')}</Text>
      {!nights.length ? <Meta colors={colors}>{t('note.empty')}</Meta> : null}
      {shown.map(({ answer }) => (
        <Reveal key={answer.periodKey}>
          {open === answer.periodKey ? (
            edit(answer)
          ) : (
          <Row
            colors={colors}
            label={nightLine(lamp, answer)}
            note={answer.note}
            onPress={() => {
              setPicking(false)
              setOpen(answer.periodKey)
            }}
          />
          )}
        </Reveal>
      ))}
      {noted.length > NOTES_SHOWN ? (
        <View style={styles.keys}>
          <KeyButton
            colors={colors}
            label={all ? t('note.fewer') : t('note.all', { n: noted.length })}
            onPress={() => setAll(!all)}
          />
        </View>
      ) : null}
      <Reveal key={openPick ? 'edit-' + open : picking ? 'pick' : 'add'}>
      {openPick ? (
        edit(openPick.answer)
      ) : picking ? (
        <View style={styles.edit}>
          <Meta colors={colors}>{t('note.pickNight')}</Meta>
          <View style={styles.keys}>
            {picks.map(({ answer }) => (
              <KeyButton
                key={answer.periodKey}
                colors={colors}
                label={nightLine(lamp, answer)}
                onPress={() => setOpen(answer.periodKey)}
              />
            ))}
            <KeyButton colors={colors} label={t('settings.neverMind')} onPress={() => setPicking(false)} />
          </View>
        </View>
      ) : picks.length ? (
        <View style={styles.keys}>
          <KeyButton
            colors={colors}
            label={t('note.add')}
            onPress={() => {
              // One night to choose from: straight to its note.
              if (picks.length === 1) {
                setPicking(false)
                setOpen(picks[0].answer.periodKey)
                return
              }
              setOpen('')
              setPicking(true)
            }}
          />
        </View>
      ) : null}
      </Reveal>
      {noted.length ? (
      <Pressable
        onPress={() => goHash('/notes')}
        accessibilityRole="link"
        hitSlop={8}
        style={({ pressed }) => [styles.seeAll, pressFx(pressed)]}
      >
        <Text style={[styles.quiet, { color: colors.inkSoft }]}>{t('notes.seeAll')} ›</Text>
      </Pressable>
      ) : null}
    </View>
  )
}

/**
 * "Add a note" on the done card: pick one of tonight's answered questions,
 * then write its note. `rows` are tonight's rows with an answer; `bookOf`
 * finds the folder each one lives in.
 */
// quiet: a small text link instead of a full button (the Home done card).
// The picker and the note box open in a sheet: it slides in, and a tap
// outside it (or phone back) closes it.
export function TonightNote({ rows, bookOf, colors, onChange, quiet = false }) {
  const answered = rows.filter((row) => row.answer && row.lamp)
  if (!answered.length) return null

  const close = () => publishSheet(null)
  const save = (row, draft) => {
    onChange(setAnswerNote(bookOf(row), row.lamp.id, row.answer.periodKey, draft))
    close()
    confirmDone(t('note.saved'))
  }
  // One card with a note already: say Edit note, not Add a note.
  const label = answered.length === 1 && answered[0].answer.note ? t('note.edit') : t('note.add')
  const openSheet = () =>
    publishSheet({
      title: label,
      colors,
      closeLabel: t('settings.neverMind'),
      onClose: close,
      // The note box has its own Never mind, so the sheet adds none.
      noClose: true,
      content: <NotePick answered={answered} colors={colors} onSave={save} onCancel={close} />,
    })

  if (quiet) {
    return (
      <Pressable onPress={openSheet} accessibilityRole="button" hitSlop={10} style={({ pressed }) => pressFx(pressed)}>
        <Text style={[styles.quiet, { color: colors.inkSoft }]}>{`✎ ${label}`}</Text>
      </Pressable>
    )
  }
  const note = answered.length === 1 ? answered[0].answer.note : ''
  return (
    <View style={styles.keys}>
      {note ? <Text style={[styles.quiet, styles.noteText, { color: colors.ink }]}>{note}</Text> : null}
      <KeyButton colors={colors} label={label} onPress={openSheet} />
    </View>
  )
}

// Inside the sheet: pick a question, then write its note in place.
function NotePick({ answered, colors, onSave, onCancel }) {
  // One question (a card picked on Home): straight to its note box.
  const only = answered.length === 1 ? answered[0] : null
  const [open, setOpen] = useState(only ? { lampId: only.lamp.id, periodKey: only.answer.periodKey } : null)
  const row = open && answered.find((item) => item.lamp.id === open.lampId && item.answer.periodKey === open.periodKey)
  if (row) {
    return (
      <Reveal key="edit">
        <NoteEdit
          label={shortLabel(row.lamp)}
          initial={row.answer.note}
          colors={colors}
          onSave={(draft) => onSave(row, draft)}
          onCancel={only ? onCancel : () => setOpen(null)}
        />
      </Reveal>
    )
  }
  return (
    <Reveal key="pick" style={styles.edit}>
      <Meta colors={colors}>{t('note.pickQuestion')}</Meta>
      {answered.map((item) => (
        <Row
          key={`${item.lamp.id}:${item.answer.periodKey}`}
          colors={colors}
          label={`${shortLabel(item.lamp)} · ${statusWord(item.answer.status)}`}
          note={item.answer.note || ''}
          onPress={() => setOpen({ lampId: item.lamp.id, periodKey: item.answer.periodKey })}
        />
      ))}
      <View style={styles.keys}>
        <KeyButton colors={colors} label={t('settings.neverMind')} onPress={onCancel} />
      </View>
    </Reveal>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 8 },
  label: { ...sectionLabel },
  // Full width, so in a row of buttons the open note drops to its own line.
  edit: { gap: 8, marginTop: 8, width: '100%' },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quiet: { fontSize: 14 },
  noteText: { width: '100%', fontStyle: 'italic' },
  seeAll: { alignSelf: 'flex-start', marginTop: 8 },
})
