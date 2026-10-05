import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { NOTE_MAX, setAnswerNote } from '../../src/lib/board-ops.js'
import { shortLabel } from '../../src/lib/board-json.js'
import { t } from '../../src/lib/i18n.js'
import { lampNights } from '../../src/lib/lamp-record.js'
import { periodLabel } from '../../src/lib/recurrence.js'
import { confirmDone } from '../lib/confirm.js'
import { Field, KeyButton, Meta, Row } from './ui.jsx'
import { sectionLabel } from '../theme.js'
import { Reveal, useLayoutState } from '../lib/motion.jsx'

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
        <KeyButton colors={colors} label={t('hang.save')} onPress={() => onSave(draft)} />
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
              setOpen('')
              setPicking(true)
            }}
          />
        </View>
      ) : null}
      </Reveal>
    </View>
  )
}

/**
 * "Add a note" on the done card: pick one of tonight's answered questions,
 * then write its note. `rows` are tonight's rows with an answer; `bookOf`
 * finds the folder each one lives in.
 */
// quiet: a small text link instead of a full button (the Home done card).
export function TonightNote({ rows, bookOf, colors, onChange, quiet = false }) {
  const [picking, setPicking] = useLayoutState(false)
  const [open, setOpen] = useLayoutState(null)
  // Phone back closes the note, then the picker, before leaving the screen.
  useEffect(() => {
    if (!picking && !open) return undefined
    function onBack(event) {
      if (open) setOpen(null)
      else setPicking(false)
      event?.preventDefault?.()
    }
    window.addEventListener('did-i-back', onBack)
    return () => window.removeEventListener('did-i-back', onBack)
  }, [picking, open])
  const answered = rows.filter((row) => row.answer && row.lamp)
  if (!answered.length) return null

  if (open) {
    const row = answered.find((item) => item.lamp.id === open.lampId && item.answer.periodKey === open.periodKey)
    if (row) {
      return (
        <NoteEdit
          label={shortLabel(row.lamp)}
          initial={row.answer.note}
          colors={colors}
          onSave={(draft) => {
            onChange(setAnswerNote(bookOf(row), row.lamp.id, row.answer.periodKey, draft))
            setOpen(null)
            setPicking(false)
            confirmDone(t('note.saved'))
          }}
          onCancel={() => setOpen(null)}
        />
      )
    }
  }

  if (!picking && quiet) {
    return (
      <Pressable onPress={() => setPicking(true)} accessibilityRole="button" hitSlop={10}>
        <Text style={[styles.quiet, { color: colors.inkSoft }]}>{`✎ ${t('note.add')}`}</Text>
      </Pressable>
    )
  }

  if (!picking) {
    return (
      <View style={styles.keys}>
        <KeyButton colors={colors} label={t('note.add')} onPress={() => setPicking(true)} />
      </View>
    )
  }

  return (
    <View style={styles.edit}>
      <Meta colors={colors}>{t('note.pickQuestion')}</Meta>
      {answered.map((row) => (
        <Row
          key={`${row.lamp.id}:${row.answer.periodKey}`}
          colors={colors}
          label={`${shortLabel(row.lamp)} · ${statusWord(row.answer.status)}`}
          note={row.answer.note || ''}
          onPress={() => setOpen({ lampId: row.lamp.id, periodKey: row.answer.periodKey })}
        />
      ))}
      <View style={styles.keys}>
        <KeyButton colors={colors} label={t('settings.neverMind')} onPress={() => setPicking(false)} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 8 },
  label: { ...sectionLabel },
  // Full width, so in a row of buttons the open note drops to its own line.
  edit: { gap: 8, marginTop: 8, width: '100%' },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quiet: { fontSize: 14 },
})
