import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { noteAsked } from './did-we.js'
import { Pick, Shell, usePeople } from './DidWe.jsx'
import { t, tMiss } from './i18n.js'
import { LeadSwitch } from './LeadSwitch.jsx'
import { sendDidI } from './people.js'
import { repeatFrom } from './send-repeat.js'
import { SetCap } from './set-bits.jsx'

const DAYS = [0, 1, 2, 3, 4, 5, 6]

// Did you on the web: ask a friend or someone in your family if they did
// something, once or on a repeat. Same choices as the phone's Add screen.
export function DidYou({ book, start = '', withId = '' }) {
  const account = useAccount()
  if (account.ready && !account.user) {
    return (
      <Shell book={book} title={t('lead.youTitle')} plate={t('lead.you')}>
        <LeadSwitch mode="you" question={start ? `${t('lead.you')} ${start}` : ''} />
        <p className="di-set-note">{t('lead.youNeedAccount')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/account')}>
            {t('we.signIn')}
          </button>
        </div>
      </Shell>
    )
  }
  return <DidYouForm book={book} start={start} withId={withId} />
}

function DidYouForm({ book, start, withId }) {
  const people = usePeople()
  const lead = t('lead.you')
  const [question, setQuestion] = useState(start ? `${lead} ${start}` : '')
  const [to, setTo] = useState(withId)
  const [cadence, setCadence] = useState('once')
  const [days, setDays] = useState([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')
  const repeat = repeatFrom(cadence, days)

  async function send() {
    if (cadence === 'weekly' && !days.length) return setMiss(t('we.missDays'))
    setBusy(true)
    const { miss: why } = await sendDidI(to, question, note, undefined, repeat)
    setBusy(false)
    if (why) return setMiss(why === 'already' ? t('people.sendAlready') : tMiss(why))
    noteAsked(to)
    goHash('/sent')
  }

  return (
    <Shell book={book} title={t('lead.youTitle')} plate={lead}>
      <LeadSwitch mode="you" question={question} />
      <label className="di-field">
        <span>{t('we.question')}</span>
        <input
          value={question}
          maxLength={200}
          placeholder={`${lead} ${t('lead.youHint')}`}
          onChange={(event) => setQuestion(event.target.value)}
        />
      </label>
      <SetCap>{t('we.who')}</SetCap>
      {people === null ? (
        <p className="di-set-note">{t('we.loadingPeople')}</p>
      ) : people.length ? (
        <Pick label={t('we.who')} value={to} onPick={setTo} items={people.map((p) => ({ id: p.id, label: p.name }))} />
      ) : (
        <>
          <p className="di-set-note">{t('we.noPeople')}</p>
          <div className="di-hang-actions">
            <button className="di-key" type="button" onClick={() => goHash('/people')}>
              {t('we.findPeople')}
            </button>
          </div>
        </>
      )}
      <SetCap>{t('we.when')}</SetCap>
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
          items={DAYS.map((day) => ({ id: day, label: t(`we.day.${day}`) }))}
        />
      ) : null}
      <p className="di-set-note">{cadence === 'once' ? t('lead.youOnceHint') : t('lead.youRepeatHint')}</p>
      <label className="di-field">
        <span>{t('people.sendNote')}</span>
        <textarea
          value={note}
          maxLength={200}
          placeholder={t('people.sendNotePh')}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      {miss ? (
        <p className="di-miss" role="alert">
          {miss}
        </p>
      ) : null}
      <div className="di-hang-actions">
        <button
          className="di-did di-did-small"
          type="button"
          disabled={busy || !question.trim() || question.trim() === lead || !to}
          onClick={send}
        >
          {t('we.sendShort')}
        </button>
      </div>
    </Shell>
  )
}
