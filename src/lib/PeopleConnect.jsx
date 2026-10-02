import { useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { cloudSetUp } from './cloud.js'
import { t, tMiss } from './i18n.js'
import {
  askByFriendId,
  cleanFriendId,
  formatFriendId,
  myFriendId,
  cleanCode,
  joinFamily,
  makeFamily,
  personName,
} from './people.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { SetCap, SetCard, SetField, SetRow } from './set-bits.jsx'
import { passAlong } from './native.js'
import { friendQrLink } from './qr-links.js'
import { useOnline } from './useOnline.js'

export function PeopleConnect({ book, now }) {
  const clock = now || new Date()
  const account = useAccount()
  const online = useOnline()

  const [famDraft, setFamDraft] = useState('')
  const [codeDraft, setCodeDraft] = useState('')
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  // Everyone has a friend ID; it is the main way to add someone.
  const [myId, setMyId] = useState('')
  const [idDraft, setIdDraft] = useState('')
  const [idMiss, setIdMiss] = useState('')

  useEffect(() => {
    if (!account.user) return undefined
    let alive = true
    myFriendId().then((out) => {
      if (alive) setMyId(out.id)
    })
    return () => {
      alive = false
    }
  }, [account.user])

  async function askById(event) {
    event?.preventDefault()
    setIdMiss('')
    const { miss: why, person } = await askByFriendId(idDraft)
    if (why === 'badId') return setIdMiss(t('friendId.bad'))
    if (why === 'nobody') return setIdMiss(t('friendId.nobody'))
    if (why === 'tooMany') return setIdMiss(t('friendId.tooMany'))
    if (why) return setIdMiss(tMiss(why))
    setIdDraft('')
    setSaid(t('people.asked', { name: personName(person) || t('people.someone') }))
  }

  async function shareId() {
    const how = await passAlong(t('friendId.shareText', { id: formatFriendId(myId), link: friendQrLink(myId) }), t('friendId.title'))
    if (how === 'copied') setSaid(t('friendId.copied'))
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
      <div className="di-friend-id">
        <p className="di-set-note">{t('friendId.yours')}</p>
        <p className="di-friend-id-num">{myId ? formatFriendId(myId) : t('family.loading')}</p>
        <button className="di-key" type="button" disabled={!myId} onClick={shareId}>
          {t('friendId.share')}
        </button>
      </div>
      <form onSubmit={askById}>
        <SetCard>
          <SetField
            label={t('friendId.add')}
            value={formatFriendId(idDraft)}
            inputMode="numeric"
            autoComplete="off"
            onChange={(event) => setIdDraft(cleanFriendId(event.target.value))}
          />
          <SetRow label={t('people.askOne')} onClick={askById} />
        </SetCard>
      </form>
      {idMiss ? (
        <p className="di-miss" role="alert">
          {idMiss}
        </p>
      ) : null}

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
