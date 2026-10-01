import { useState } from 'react'
import { t, tMiss } from './i18n.js'
import { personName, sendDidI } from './people.js'
import { SetCard, SetField, SetSheet } from './set-bits.jsx'
import { Pick } from './DidWe.jsx'
import { repeatFrom } from './send-repeat.js'

/** Write a did you for a friend or someone in the family. */
export function SendSheet({ person, family = false, still, onClose, onSent }) {
  const [question, setQuestion] = useState('')
  const [note, setNote] = useState('')
  const [miss, setMiss] = useState('')
  const [busy, setBusy] = useState(false)
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
    if (why === 'already') {
      setMiss(t('people.sendAlready'))
      return
    }
    if (why) {
      setMiss(tMiss(why))
      return
    }
    onSent(t('people.sentTo', { name }))
    onClose()
  }

  return (
    <SetSheet title={t('people.sendTitle')} still={still} onClose={onClose}>
      <p className="di-set-note">
        {family ? t('people.sendHintFamily', { name }) : t('people.sendHint', { name })}
      </p>
      <SetCard>
        <SetField
          label={t('people.sendWhat')}
          value={question}
          placeholder={t('people.sendPh')}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <SetField
          label={t('people.sendNote')}
          value={note}
          placeholder={t('people.sendNotePh')}
          onChange={(event) => setNote(event.target.value)}
        />
      </SetCard>
      <Pick
        label={t('we.when')}
        value={cadence}
        onPick={setCadence}
        items={[
          { id: 'once', label: t('hang.once') },
          { id: 'daily', label: t('we.daily') },
          { id: 'weekly', label: t('we.someDays') },
        ]}
      />
      {cadence === 'weekly' ? (
        <Pick
          multi
          label={t('we.someDays')}
          value={days}
          onPick={(next) => setDays([...next].sort())}
          items={[0, 1, 2, 3, 4, 5, 6].map((day) => ({ id: day, label: t(`we.day.${day}`) }))}
        />
      ) : null}
      {miss ? (
        <p className="di-miss" role="alert">
          {miss}
        </p>
      ) : null}
      <div className="di-hang-actions">
        <button className="di-did di-did-small" type="button" disabled={busy} onClick={send}>
          {t('people.send')}
        </button>
        <button className="di-key" type="button" onClick={onClose}>
          {t('settings.neverMind')}
        </button>
      </div>
    </SetSheet>
  )
}
