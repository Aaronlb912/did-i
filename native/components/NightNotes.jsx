import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { NOTE_MAX, setAnswerNote } from '../../src/lib/board-ops.js'
import { shortLabel } from '../../src/lib/board-json.js'
import { t } from '../../src/lib/i18n.js'
import { lampNights } from '../../src/lib/lamp-record.js'
import { nightOpen, periodLabel, periodNight } from '../../src/lib/recurrence.js'
import { confirmDone } from '../lib/confirm.js'
import { DidButton, Field, KeyButton, Meta, Row } from './ui.jsx'
import { sectionLabel } from '../theme.js'
import { Reveal, pressFx, useLayoutState } from '../lib/motion.jsx'
import { publishSheet } from './SheetHost.jsx'
import { goHash } from '../navigation/hash.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { UNDO_MS } from '../../src/lib/useTonightStack.js'
import { showToast } from '../lib/toast-queue.js'

// Clears a note, with Undo in the toast like other removals. Undo writes the
// note back onto the folder as it is then, so nothing done since is lost.
function removeNote(book, lampId, periodKey, note, onChange) {
  const was = (book?.answers || []).find((item) => item.lampId === lampId && item.periodKey === periodKey)
  const amount = typeof was?.amount === 'number' ? was.amount : ''
  onChange(setAnswerNote(book, lampId, periodKey, '', undefined, ''))
  const now = Date.now()
  showToast({
    id: 'undo:note',
    kind: 'undo',
    rev: now,
    label: t('note.removed'),
    hint: t('tonight.undoTap'),
    until: now + UNDO_MS,
    total: UNDO_MS,
    onPress: () => {
      const live = (readShelf().boards || []).find((item) => item.id === book.id) || book
      onChange(setAnswerNote(live, lampId, periodKey, note, undefined, amount))
    },
  })
}

// How many recent nights "Add a note" offers.
const PICKS = 7
const NOTES_SHOWN = 3

// A skip reads Not yet while its night is open, Nope after.
function statusWord(status, open = false) {
  if (status === 'late') return t('jewelKey.late')
  if (status === 'skip') return t(open ? 'jewelKey.notYet' : 'jewelKey.nope')
  return t('jewelKey.did')
}

function nightLine(lamp, answer) {
  const night = periodLabel(lamp, answer.periodKey)
  const word = statusWord(answer.status, nightOpen(periodNight(lamp, answer.periodKey)))
  return night ? `${night} · ${word}` : word
}

// The amount box only shows for a question that tracks one. undefined means
// "leave the amount alone" to setAnswerNote, so other questions never touch it.
function amountProps(lamp, answer) {
  if (!lamp?.trackAmount) return null
  return { initial: typeof answer?.amount === 'number' ? String(answer.amount) : '', unit: lamp.amountUnit || '' }
}

/** One note box (and, when the question tracks one, an amount box) with Save and Never mind. */
function NoteEdit({ label, initial, amount = null, colors, onSave, onCancel, onRemove }) {
  const [draft, setDraft] = useState(initial || '')
  const [count, setCount] = useState(amount?.initial || '')
  const save = () => onSave(draft, amount ? count : undefined)
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
        onSubmitEditing={save}
      />
      {amount ? (
        <Field
          colors={colors}
          label={amount.unit ? t('note.amountIn', { unit: amount.unit }) : t('note.amount')}
          value={count}
          onChangeText={(value) => setCount(value.replace(/[^\d.,]/g, '').slice(0, 9))}
          placeholder="0"
          keyboardType="decimal-pad"
          maxLength={9}
          onSubmitEditing={save}
        />
      ) : null}
      <View style={styles.keys}>
        <DidButton small colors={colors} label={t('hang.save')} onPress={save} />
        <KeyButton colors={colors} label={t('settings.neverMind')} onPress={onCancel} />
        {initial && onRemove ? <KeyButton danger colors={colors} label={t('note.remove')} onPress={onRemove} /> : null}
      </View>
    </View>
  )
}

// The one way to write a note: a sheet with the box, Save, Never mind and,
// when there is a note, Remove note. Home and the question page both use it.
function openNoteSheet({ title, label, initial, amount = null, colors, onSave, onRemove }) {
  const close = () => publishSheet(null)
  publishSheet({
    title,
    colors,
    closeLabel: t('settings.neverMind'),
    onClose: close,
    noClose: true,
    content: (
      <NoteEdit
        label={label}
        initial={initial}
        amount={amount}
        colors={colors}
        onSave={(draft, count) => {
          close()
          onSave(draft, count)
        }}
        onCancel={close}
        onRemove={
          onRemove
            ? () => {
                close()
                onRemove()
              }
            : null
        }
      />
    ),
  })
}

/**
 * The note for one answer, straight from the toast after a Did. Reads the
 * folder as it is now, since the answer was saved a moment ago.
 */
export function openAnswerNote({ boardId, lampId, periodKey, colors, onChange }) {
  const live = () => (readShelf().boards || []).find((item) => item.id === boardId)
  const book = live()
  const lamp = (book?.lamps || []).find((item) => item.id === lampId)
  const answer = (book?.answers || []).find((item) => item.lampId === lampId && item.periodKey === periodKey)
  if (!book || !lamp || !answer) return
  openNoteSheet({
    title: answer.note ? t('note.edit') : t('note.add'),
    label: shortLabel(lamp),
    initial: answer.note,
    amount: amountProps(lamp, answer),
    colors,
    onSave: (draft, count) => {
      onChange(setAnswerNote(live() || book, lampId, periodKey, draft, undefined, count))
      confirmDone(t('note.saved'))
    },
    onRemove: () => removeNote(live() || book, lampId, periodKey, answer.note, onChange),
  })
}

/** This question's nights that have a note, plus "Add a note" for a recent answered night. */
export function NightNotes({ book, lamp, colors, onChange }) {
  const [picking, setPicking] = useLayoutState(false)
  const nights = useMemo(() => lampNights(book, lamp), [book, lamp])
  const noted = nights.filter((row) => row.answer.note)
  // The newest few, so a question with many notes stays short; the rest on ask.
  const [all, setAll] = useLayoutState(false)
  const shown = all ? noted : noted.slice(0, NOTES_SHOWN)
  const picks = nights.filter((row) => !row.answer.note).slice(0, PICKS)

  function edit(answer) {
    setPicking(false)
    openNoteSheet({
      title: answer.note ? t('note.edit') : t('note.add'),
      label: nightLine(lamp, answer),
      initial: answer.note,
      amount: amountProps(lamp, answer),
      colors,
      onSave: (draft, count) => {
        onChange(setAnswerNote(book, lamp.id, answer.periodKey, draft, undefined, count))
        confirmDone(t('note.saved'))
      },
      onRemove: () => removeNote(book, lamp.id, answer.periodKey, answer.note, onChange),
    })
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.inkSoft }]}>{t('note.title')}</Text>
      {!nights.length ? <Meta colors={colors}>{t('note.empty')}</Meta> : null}
      {shown.map(({ answer }) => (
        <Reveal key={answer.periodKey}>
          <Row colors={colors} label={nightLine(lamp, answer)} note={answer.note} onPress={() => edit(answer)} />
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
      <Reveal key={picking ? 'pick' : 'add'}>
      {picking ? (
        <View style={styles.edit}>
          <Meta colors={colors}>{t('note.pickNight')}</Meta>
          <View style={styles.keys}>
            {picks.map(({ answer }) => (
              <KeyButton
                key={answer.periodKey}
                colors={colors}
                label={nightLine(lamp, answer)}
                onPress={() => edit(answer)}
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
                edit(picks[0].answer)
                return
              }
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
  const save = (row, draft, count) => {
    onChange(setAnswerNote(bookOf(row), row.lamp.id, row.answer.periodKey, draft, undefined, count))
    close()
    confirmDone(t('note.saved'))
  }
  const remove = (row) => {
    close()
    removeNote(bookOf(row), row.lamp.id, row.answer.periodKey, row.answer.note, onChange)
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
      content: <NotePick answered={answered} colors={colors} onSave={save} onRemove={remove} onCancel={close} />,
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
function NotePick({ answered, colors, onSave, onRemove, onCancel }) {
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
          amount={amountProps(row.lamp, row.answer)}
          colors={colors}
          onSave={(draft, count) => onSave(row, draft, count)}
          onRemove={() => onRemove(row)}
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
          label={`${shortLabel(item.lamp)} · ${statusWord(item.answer.status, true)}`}
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
