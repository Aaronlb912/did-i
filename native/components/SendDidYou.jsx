import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { t, tMiss } from '../../src/lib/i18n.js'
import { personName, sendDidI } from '../../src/lib/people.js'
import { fonts } from '../theme.js'
import { DidButton, Field, KeyButton, Meta } from './ui.jsx'
import { KeyboardLift } from './KeyboardLift.jsx'

/** Write a did you for a friend or someone in the family. */
export function SendSheet({ person, family = false, colors, onClose, onSent }) {
  const [question, setQuestion] = useState('')
  const [note, setNote] = useState('')
  const [miss, setMiss] = useState('')
  const [busy, setBusy] = useState(false)
  const name = personName(person) || t('people.someone')

  async function send() {
    if (!question.trim()) {
      setMiss(t('people.sendBlank'))
      return
    }
    setBusy(true)
    const { miss: why } = await sendDidI(person.user_id, question, note)
    setBusy(false)
    if (why === 'already') return setMiss(t('people.sendAlready'))
    if (why) return setMiss(tMiss(why))
    onSent(t('people.sentTo', { name }))
    onClose()
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardLift>
        <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
          <Pressable
            accessible={false}
            style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={[styles.popKicker, { color: colors.on }]}>{t('people.sendTitle')}</Text>
            <Meta colors={colors}>
              {family ? t('people.sendHintFamily', { name }) : t('people.sendHint', { name })}
            </Meta>
            <Field
              colors={colors}
              label={t('people.sendWhat')}
              value={question}
              onChangeText={setQuestion}
              placeholder={t('people.sendPh')}
            />
            <Field
              colors={colors}
              label={t('people.sendNote')}
              value={note}
              onChangeText={setNote}
              placeholder={t('people.sendNotePh')}
            />
            {miss ? <Text style={[styles.miss, { color: colors.miss }]}>{miss}</Text> : null}
            <View style={styles.actions}>
              <DidButton colors={colors} small label={t('people.send')} disabled={busy} onPress={send} />
              <KeyButton colors={colors} label={t('settings.neverMind')} onPress={onClose} />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardLift>
    </Modal>
  )
}

const styles = StyleSheet.create({
  veil: { flex: 1, justifyContent: 'center', padding: 20 },
  pop: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
  popKicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  miss: { fontFamily: fonts.ui, fontSize: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
