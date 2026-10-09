import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { readPrefs } from '../../src/lib/prefs.js'
import { boardDate } from '../../src/lib/recurrence.js'
import { putWeNote, weNotes, weNotesView } from '../../src/lib/social-amounts.js'
import { confirmDone } from '../lib/confirm.js'
import { SetSwitch } from './SetBits.jsx'
import { publishSheet } from './SheetHost.jsx'
import { DidButton, Field, KeyButton, Meta } from './ui.jsx'
import { sectionLabel } from '../theme.js'

function nightWord(night) {
  if (night === boardDate()) return t('weNote.tonight')
  return new Date(`${night}T12:00:00`).toLocaleDateString(readPrefs().locale, { weekday: 'long', month: 'short', day: 'numeric' })
}

// The note box: Share with the group starts off unless this note is shared.
function WeNoteEdit({ initial, colors, onSave, onCancel }) {
  const [draft, setDraft] = useState(initial?.note || '')
  const [on, setOn] = useState(Boolean(initial?.shared))
  return (
    <View style={styles.edit}>
      <Field colors={colors} label={t('note.title')} value={draft} onChangeText={setDraft} placeholder={t('note.ph')} maxLength={500} autoFocus />
      <SetSwitch colors={colors} label={t('weNote.toggle')} sub={t('weNote.who')} last on={on} onPress={() => setOn((was) => !was)} />
      <View style={styles.keys}>
        <DidButton small colors={colors} label={t('hang.save')} onPress={() => onSave(draft, on)} />
        <KeyButton colors={colors} label={t('settings.neverMind')} onPress={onCancel} />
        {initial?.note ? <KeyButton danger colors={colors} label={t('note.remove')} onPress={() => onSave('', false)} /> : null}
      </View>
    </View>
  )
}

/**
 * Notes on a Did we card: yours for tonight after a Did, and the notes
 * others on the card shared, each with a cheer. One read per page.
 */
export function WeNotes({ card, mine, colors, cheer }) {
  const [view, setView] = useState({ mine: new Map(), shared: [] })
  // Past nights you said Did, inside the note window, so a note can go on them too.
  const [didNights, setDidNights] = useState([])
  const [miss, setMiss] = useState('')
  const night = boardDate()
  const people = (card.people || []).filter((p) => p.state === 'in')

  async function load() {
    const out = await weNotes(card.id, night)
    if (out.miss && out.miss !== 'off') setMiss(t('weNote.failed'))
    setView(weNotesView(out.rows, out.me, people))
    setDidNights(out.did || [])
  }

  useEffect(() => {
    load()
  }, [card.id, night])

  const own = view.mine.get(night) || null
  const canWrite = card.due && mine?.status === 'did'

  function open(on = night) {
    const close = () => publishSheet(null)
    const was = view.mine.get(on) || null
    publishSheet({
      title: `${was ? t('note.edit') : t('note.add')} · ${nightWord(on)}`,
      colors,
      closeLabel: t('settings.neverMind'),
      onClose: close,
      noClose: true,
      content: (
        <WeNoteEdit
          initial={was}
          colors={colors}
          onCancel={close}
          onSave={async (draft, shared) => {
            close()
            const out = await putWeNote({ cardId: card.id, night: on, note: draft, shared })
            if (out.miss) return setMiss(out.miss)
            setMiss('')
            confirmDone(t(draft.trim() ? 'note.saved' : 'note.removed'))
            load()
          }}
        />
      ),
    })
  }

  if (!canWrite && !view.shared.length && !own && !didNights.length) return null
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.inkSoft }]}>{t('weNote.title')}</Text>
      {own ? <Meta colors={colors}>{`${t('we.you')}: ${own.note}${own.shared ? '' : ` · ${t('weNote.justYou')}`}`}</Meta> : null}
      {canWrite ? (
        <View style={styles.keys}>
          <KeyButton colors={colors} label={own ? t('note.edit') : t('note.add')} onPress={() => open(night)} />
        </View>
      ) : null}
      {didNights.length ? <Meta colors={colors}>{t('weNote.earlier')}</Meta> : null}
      {didNights.map((on) => {
        const was = view.mine.get(on) || null
        return (
          <View key={`did:${on}`} style={styles.row}>
            <Meta colors={colors}>
              {was ? `${nightWord(on)}: ${was.note}${was.shared ? '' : ` · ${t('weNote.justYou')}`}` : nightWord(on)}
            </Meta>
            <View style={styles.keys}>
              <KeyButton colors={colors} label={was ? t('note.edit') : t('note.add')} onPress={() => open(on)} />
            </View>
          </View>
        )
      })}
      {view.shared.map((row) => (
        <View key={`${row.id}:${row.night}`} style={styles.row}>
          <Meta colors={colors}>{`${row.name} · ${nightWord(row.night)}`}</Meta>
          <Text style={[styles.note, { color: colors.ink }]}>{row.note}</Text>
          {cheer?.can ? (
            <View style={styles.keys}>
              <KeyButton
                colors={colors}
                label={t('we.cheerName', { name: row.name })}
                disabled={Boolean(cheer.busy)}
                onPress={() => cheer.cheer({ id: row.id, name: row.name })}
              />
            </View>
          ) : null}
        </View>
      ))}
      {miss ? <Text style={[styles.note, { color: colors.miss }]}>{miss}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 8 },
  label: { ...sectionLabel },
  edit: { gap: 8, marginTop: 8, width: '100%' },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { gap: 4 },
  note: { fontSize: 15 },
})
