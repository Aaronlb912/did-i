import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { cloudSetUp } from './cloud.js'
import { t, tMiss } from './i18n.js'
import {
  askFriend,
  cleanCode,
  cleanPhone,
  joinFamily,
  makeFamily,
  personName,
} from './people.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { SetCap, SetCard, SetField, SetRow } from './set-bits.jsx'
import { useOnline } from './useOnline.js'

export function PeopleConnect({ book, now }) {
  const clock = now || new Date()
  const account = useAccount()
  const online = useOnline()

  const [addDraft, setAddDraft] = useState('')
  const [famDraft, setFamDraft] = useState('')
  const [codeDraft, setCodeDraft] = useState('')
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')

  function say(words) {
    setMiss('')
    setSaid(words)
  }

  async function ask() {
    const { miss: why, person } = await askFriend(addDraft)
    if (why === 'short') return setMiss(t('people.phoneShort'))
    if (why === 'nophone') return setMiss(t('people.nophone'))
    if (why === 'nobody') return setMiss(t('people.noOne', { phone: cleanPhone(addDraft) }))
    if (why) return setMiss(why)
    setAddDraft('')
    say(t('people.asked', { name: personName(person) }))
  }

  async function newFamily() {
    const { miss: why, id } = await makeFamily(famDraft || t('people.familyOne'))
    if (why) return setMiss(why)
    setFamDraft('')
    return goHash('/family', { id })
  }

  async function join() {
    const { miss: why, id } = await joinFamily(codeDraft)
    if (why === 'code') return setMiss(t('people.codeShort'))
    if (why === 'nofamily') return setMiss(t('people.noFamily'))
    if (why) return setMiss(why)
    setCodeDraft('')
    return goHash('/family', { id })
  }

  const shell = (children) => (
    <BoardShell
      book={book}
      now={clock}
      title={t('people.connect')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-set di-people">
        <p className="di-face-plate">{t('people.connect')}</p>
        {online ? null : <p className="di-set-note di-off-line">{t('people.offline')}</p>}
        {children}
      </section>
    </BoardShell>
  )

  if (!cloudSetUp() || !account.user) {
    return shell(
      <>
        <h2 className="di-page-title">{t('people.outTitle')}</h2>
        <p className="di-set-note">{t('people.outBody')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/account')}>
            {t('people.goAccount')}
          </button>
        </div>
      </>,
    )
  }

  return shell(
    <>
      <h2 className="di-page-title">{t('people.connect')}</h2>
      <p className="di-set-note">{t('people.connectBody')}</p>

      <SetCard>
        <SetRow
          label={t('people.refer')}
          sub={t('people.referSub')}
          chevron
          onClick={() => goHash('/people/refer')}
        />
      </SetCard>

      <SetCap>{t('people.addOne')}</SetCap>
      <SetCard>
        <SetField
          label={t('people.add')}
          value={addDraft}
          placeholder={t('people.addPh')}
          inputMode="tel"
          autoCapitalize="off"
          autoCorrect="off"
          onChange={(event) => setAddDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              ask()
            }
          }}
        />
        <SetRow label={t('people.askOne')} onClick={ask} />
      </SetCard>

      <SetCap>{t('people.startFamily')}</SetCap>
      <SetCard>
        <SetField
          label={t('people.newFamily')}
          value={famDraft}
          placeholder={t('people.newFamilyPh')}
          onChange={(event) => setFamDraft(event.target.value)}
        />
        <SetRow label={t('people.makeFamily')} onClick={newFamily} />
        <SetField
          label={t('people.joinCode')}
          value={codeDraft}
          placeholder="ABC234"
          autoCapitalize="characters"
          autoCorrect="off"
          onChange={(event) => setCodeDraft(cleanCode(event.target.value))}
        />
        <SetRow label={t('people.join')} onClick={join} />
      </SetCard>

      {miss ? (
        <p className="di-miss" role="alert">
          {tMiss(miss)}
        </p>
      ) : null}
      {said ? <p className="di-set-note">{said}</p> : null}

      <div className="di-hang-actions">
        <button className="di-key" type="button" onClick={() => goHash('/people')}>
          {t('people.back')}
        </button>
      </div>
    </>,
  )
}
