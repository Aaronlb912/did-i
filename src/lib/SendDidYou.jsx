import { useState } from 'react'
import { t, tMiss } from './i18n.js'
import { personName, sendDidI } from './people.js'
import { SetCard, SetField, SetSheet } from './set-bits.jsx'
import { Pick } from './DidWe.jsx'
import { boardDate } from './recurrence.js'
import { repeatFrom, senderLastDid } from './send-repeat.js'

/** About a week, 2 weeks, a month: the gap for an every so often ask. */
export function EveryPick({ value, onPick }) {
  return (
    <Pick
      label={t('hang.every')}
      value={value}
      onPick={onPick}
      items={[
        { id: 7, label: t('hang.everyWeek') },
        { id: 14, label: t('hang.every2Weeks') },
        { id: 30, label: t('hang.everyMonth') },
      ]}
    />
  )
}

/** Write a did you for a friend or someone in the family. */
export function SendSheet({ person, book = null, family = false, initialQuestion = '', still, onClose, onSent }) {
  const [question, setQuestion] = useState(initialQuestion)
  const [note, setNote] = useState('')
  const [miss, setMiss] = useState('')
  const [busy, setBusy] = useState(false)
  const [cadence, setCadence] = useState('once')
  const [days, setDays] = useState([])
  const [everyDays, setEveryDays] = useState(7)
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
    const last = cadence === 'every' ? senderLastDid(book, question, boardDate(new Date())) : ''
    const { miss: why } = await sendDidI(person.user_id, question, note, undefined, repeatFrom(cadence, days, everyDays), last)
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
          { id: 'every', label: t('hang.every') },
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
      {cadence === 'every' ? <EveryPick value={everyDays} onPick={setEveryDays} /> : null}
      {cadence === 'every' ? <p className="di-set-note">{t('people.sendEveryHint')}</p> : null}
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
