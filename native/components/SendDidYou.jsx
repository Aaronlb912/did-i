import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { t, tMiss } from '../../src/lib/i18n.js'
import { personName, sendDidI } from '../../src/lib/people.js'
import { repeatFrom } from '../../src/lib/send-repeat.js'
import { makeDidYouLink, sharedDidYouLine } from '../../src/lib/did-you-links.js'
import { passAlong } from '../../src/lib/native.js'
import { Pill } from '../screens/questions.jsx'
import { fonts } from '../theme.js'
import { DidButton, Field, KeyButton, Meta } from './ui.jsx'
import { KeyboardLift } from './KeyboardLift.jsx'
import { goHash } from '../navigation/hash.js'

/** Write a did you for a friend or someone in the family. */
export function SendSheet({ person, family = false, colors, onClose, onSent }) {
  const [question, setQuestion] = useState('')
  const [note, setNote] = useState('')
  const [miss, setMiss] = useState('')
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')
  const [cadence, setCadence] = useState('once')
  const [days, setDays] = useState([])
  const name = personName(person) || t('people.someone')

  async function send() {
    if (!question.trim()) {
      setMiss(t('people.sendBlank'))
      return
    }
    if (cadence === 'weekly' && !days.length) {
      setMiss(t('we.missDays'))
      return
    }
    setBusy(true)
    const { miss: why } = await sendDidI(person.user_id, question, note, undefined, repeatFrom(cadence, days))
    setBusy(false)
    if (why === 'already') return setMiss(t('people.sendAlready'))
    if (why) return setMiss(tMiss(why))
    onSent(t('people.sentTo', { name }))
    onClose()
  }

  // The same question as a did-i.app/d/CODE link anyone can open.
  async function shareLink() {
    setSaid('')
    if (!question.trim()) {
      setMiss(t('people.sendBlank'))
      return
    }
    setMiss('')
    setBusy(true)
    const { code, miss: why } = await makeDidYouLink(question)
    setBusy(false)
    if (why === 'linkCap') return setMiss(t('didYouLink.cap'))
    if (why || !code) return setMiss(tMiss(why || 'people.reach'))
    const how = await passAlong(sharedDidYouLine(question, code), t('didYouLink.share'))
    if (how === 'copied') setSaid(t('didYouLink.copied'))
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
            <View style={styles.actions} accessibilityRole="radiogroup" accessibilityLabel={t('we.when')}>
              {[
                ['once', t('hang.once')],
                ['daily', t('we.daily')],
                ['weekly', t('we.someDays')],
              ].map(([id, label]) => (
                <Pill key={id} label={label} on={cadence === id} onPress={() => setCadence(id)} colors={colors} radio />
              ))}
            </View>
            {cadence === 'weekly' ? (
              <View style={styles.actions}>
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const on = days.includes(day)
                  return (
                    <Pill
                      key={day}
                      label={t(`we.day.${day}`)}
                      on={on}
                      onPress={() => setDays(on ? days.filter((d) => d !== day) : [...days, day].sort())}
                      colors={colors}
                    />
                  )
                })}
              </View>
            ) : null}
            <Field
              colors={colors}
              label={t('people.sendNote')}
              value={note}
              onChangeText={setNote}
              placeholder={t('people.sendNotePh')}
            />
            {miss ? <Text style={[styles.miss, { color: colors.miss }]}>{miss}</Text> : null}
            {said ? <Meta colors={colors}>{said}</Meta> : null}
            <View style={styles.actions}>
              <DidButton colors={colors} small label={t('people.send')} disabled={busy} onPress={send} />
              <KeyButton colors={colors} label={t('settings.neverMind')} onPress={onClose} />
            </View>
            <KeyButton colors={colors} label={t('didYouLink.share')} disabled={busy} onPress={shareLink} />
            {person?.user_id ? (
              <KeyButton
                colors={colors}
                label={t('we.startWith', { name })}
                onPress={() => {
                  onClose?.()
                  goHash('/we/new', { id: person.user_id })
                }}
              />
            ) : null}
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
