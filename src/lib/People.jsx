import { useCallback, useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { cloudSetUp } from './cloud.js'
import { keptProfileName } from './cloud-sync.js'
import { t, tMiss } from './i18n.js'
import {
  askByFriendId,
  cleanFriendId,
  formatFriendId,
  cleanCode,
  joinFamily,
  doneTonight,
  friendAskNote,
  friendAskTitle,
  inboxCount,
  listFamilies,
  listFriends,
  personName,
  readMine,
  sayNo,
  sayYes,
  syncDisplayName,
} from './people.js'
import { Avatar, EmptyCard, PersonCard, SectionHead } from './PersonCard.jsx'
import { boardDate, formatBoardDate, isoDate } from './recurrence.js'
import { SendSheet } from './SendDidYou.jsx'
import { SetCap, SetCard, SetField, SetRow } from './set-bits.jsx'
import { useOnline } from './useOnline.js'
import { useReduceMotion } from './useReduceMotion.js'

function friendLine(person) {
  if (!person?.share_streak) return t('people.quiet')
  if (person.done_on === isoDate(new Date())) return t('people.doneTonight')
  if (person.streak > 0) return t('people.streakN', { n: person.streak })
  return t('people.noStreak')
}

// Join code right under the family list, so a second family is easy to join.
function JoinFamilyCard({ bare = false }) {
  const [code, setCode] = useState('')
  const [miss, setMiss] = useState('')
  const [busy, setBusy] = useState(false)
  async function join(event) {
    event.preventDefault()
    setBusy(true)
    const { miss: why, id } = await joinFamily(code)
    setBusy(false)
    if (why === 'code') return setMiss(t('people.codeShort'))
    if (why === 'nofamily') return setMiss(t('people.noFamily'))
    if (why) return setMiss(tMiss(why))
    setCode('')
    setMiss('')
    return goHash('/family', { id })
  }
  return (
    <form className={bare ? 'di-join-family' : 'di-person di-join-family'} onSubmit={join}>
      <SetField
        label={t('people.joinCode')}
        value={code}
        placeholder="ABC234"
        autoCapitalize="characters"
        autoCorrect="off"
        onChange={(event) => setCode(cleanCode(event.target.value))}
      />
      <button className="di-did di-did-small" type="submit" disabled={busy}>
        {t('people.join')}
      </button>
      {miss ? (
        <p className="di-miss" role="alert">
          {miss}
        </p>
      ) : null}
    </form>
  )
}

// A small popup for the plus next to a section title.
function AddPop({ kicker, onClose, children }) {
  return (
    <div className="di-buy-veil" role="presentation" onClick={onClose}>
      <div className="di-buy-pop" role="dialog" aria-modal="true" aria-label={kicker} onClick={(event) => event.stopPropagation()}>
        <p className="di-face-plate">{kicker}</p>
        {children}
        <div className="di-hang-actions">
          <button className="di-key" type="button" onClick={onClose}>
            {t('settings.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Add by friend ID. Phone lookup still lives on Connect.
function AddFriendPop({ onClose, onAsked }) {
  const [draft, setDraft] = useState('')
  const [miss, setMiss] = useState('')
  const [busy, setBusy] = useState(false)
  async function ask(event) {
    event.preventDefault()
    setBusy(true)
    const { miss: why, person } = await askByFriendId(draft)
    setBusy(false)
    if (why === 'badId') return setMiss(t('friendId.bad'))
    if (why === 'nobody') return setMiss(t('friendId.nobody'))
    if (why === 'tooMany') return setMiss(t('friendId.tooMany'))
    if (why) return setMiss(tMiss(why))
    onClose()
    return onAsked(t('people.asked', { name: personName(person) || t('people.someone') }))
  }
  return (
    <AddPop kicker={t('people.addOne')} onClose={onClose}>
      <form className="di-join-family" onSubmit={ask}>
        <SetField
          label={t('friendId.add')}
          value={formatFriendId(draft)}
          inputMode="numeric"
          autoComplete="off"
          onChange={(event) => setDraft(cleanFriendId(event.target.value))}
        />
        <button className="di-did di-did-small" type="submit" disabled={busy || draft.length !== 12}>
          {t('people.askOne')}
        </button>
        {miss ? (
          <p className="di-miss" role="alert">
            {miss}
          </p>
        ) : null}
      </form>
      <button className="di-key" type="button" onClick={() => goHash('/people/connect')}>
        {t('friendId.orPhone')}
      </button>
    </AddPop>
  )
}

export function People({ book, onChange, now }) {
  const clock = now || new Date()
  const account = useAccount()
  const still = useReduceMotion()
  const online = useOnline()

  const [mine, setMine] = useState(null)
  const [links, setLinks] = useState({ friends: [], asked: [], sent: [] })
  const [families, setFamilies] = useState([])
  const [waiting, setWaiting] = useState(0)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [sheet, setSheet] = useState(null)

  const load = useCallback(async () => {
    if (!account.user) return
    try {
      const [who, friendRows, famRows, count] = await Promise.all([
        readMine(),
        listFriends(),
        listFamilies(),
        inboxCount(),
      ])
      setMine(who)
      await syncDisplayName(book.keeperName)
      setLinks(friendRows)
      setFamilies(famRows)
      setWaiting(count)
      setMiss('')
    } catch {
      setMiss('people.reach')
    }
  }, [account.user, book.keeperName])

  useEffect(() => {
    load()
  }, [load])

  function say(words) {
    setMiss('')
    setSaid(words)
  }

  async function answerAsk(id, yes) {
    const { miss: why } = yes ? await sayYes(id) : await sayNo(id)
    if (why) return setMiss(why)
    return load()
  }

  const shell = (children) => (
    <BoardShell
      book={book}
      now={clock}
      title={t('people.kicker')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-set di-people">
        <p className="di-face-plate">{t('people.kicker')}</p>
        {online ? null : <p className="di-set-note di-off-line">{t('people.offline')}</p>}
        {children}
      </section>
    </BoardShell>
  )

  if (!cloudSetUp()) {
    return shell(
      <>
        <h2 className="di-page-title">{t('people.offTitle')}</h2>
        <p className="di-set-note">{t('people.offBody')}</p>
      </>,
    )
  }

  if (!account.user) {
    return shell(
      <>
        <h2 className="di-page-title">{t('people.outTitle')}</h2>
        <p className="di-set-note">{t('people.outBody')}</p>
        <div className="di-hang-actions">
          <button
            className="di-did di-did-small"
            type="button"
            onClick={() => goHash('/account')}
          >
            {t('people.goAccount')}
          </button>
        </div>
      </>,
    )
  }

  const today = isoDate(clock)
  const doneCount = links.friends.filter((row) => doneTonight(row.person, today)).length

  return shell(
    <>
      <h2 className="di-page-title">{t('people.title')}</h2>

      <div className="di-people-tiles">
        <button
          type="button"
          className={waiting ? 'di-people-tile is-lit' : 'di-people-tile'}
          onClick={() => goHash('/inbox')}
        >
          <span>{t('inbox.kicker')}</span>
          <strong>{waiting ? t('people.waiting', { n: waiting }) : t('people.inboxQuiet')}</strong>
          {waiting ? <em>{t('people.waitingSub')}</em> : null}
        </button>
        <button type="button" className="di-people-tile" onClick={() => goHash('/sent')}>
          <span>{t('sent.kicker')}</span>
          <strong>{t('sent.tileValue')}</strong>
          <em>{t('sent.rowSub')}</em>
        </button>
      </div>

      {links.asked.length ? (
        <>
          <SectionHead label={t('people.askBanner', { n: links.asked.length })} />
          {links.asked.map((row) => (
            <PersonCard
              key={row.id}
              highlight
              person={row.person}
              name={friendAskTitle(row.person) || t('people.someone')}
              line={friendAskNote(row.person)}
              actions={
                <>
                  <button className="di-did di-did-small" type="button" onClick={() => answerAsk(row.id, true)}>
                    {t('people.yes')}
                  </button>
                  <button className="di-key" type="button" onClick={() => answerAsk(row.id, false)}>
                    {t('people.no')}
                  </button>
                </>
              }
            />
          ))}
        </>
      ) : null}

      <SectionHead
        label={t('people.friends')}
        count={links.friends.length}
        link={t('people.seeAll')}
        onLink={() => goHash('/friends')}
        onAdd={links.friends.length ? () => setSheet({ kind: 'friend' }) : undefined}
        addLabel={t('people.addOne')}
      />
      {links.friends.length ? (
        <>
          <p className="di-set-note">
            {t('people.doneOf', { done: doneCount, n: links.friends.length })} {t('people.stripHint')}
          </p>
          <div className="di-people-strip">
            {links.friends.map((row) => {
              const done = doneTonight(row.person, today)
              const name = personName(row.person) || t('people.someone')
              return (
                <button
                  key={row.id}
                  type="button"
                  className="di-people-strip-one"
                  aria-label={`${name}, ${friendLine(row.person)}`}
                  onClick={() => setSheet({ kind: 'send', person: row.person })}
                >
                  <Avatar person={row.person} done={done} big />
                  <strong>{name}</strong>
                  <em className={done ? 'is-on' : ''}>{done ? t('people.doneTonightShort') : t('people.notYet')}</em>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <EmptyCard title={t('people.noFriendsTitle')} body={t('people.noFriendsBody')}>
          <div className="di-hang-actions">
            <button className="di-did di-did-small" type="button" onClick={() => goHash('/people/connect')}>
              {t('people.connect')}
            </button>
          </div>
        </EmptyCard>
      )}

      <SectionHead
        label={t('people.families')}
        count={families.length}
        onAdd={families.length ? () => setSheet({ kind: 'family' }) : undefined}
        addLabel={t('people.join')}
      />
      {families.length ? (
        families.map((fam) => (
          <button
            key={fam.id}
            type="button"
            className="di-person di-person-link"
            onClick={() => goHash('/family', { id: fam.id })}
          >
            <span className="di-person-top">
              <Avatar person={{ display_name: fam.name }} />
              <span className="di-person-who">
                <strong>{fam.name}</strong>
                <em>{fam.role === 'parent' ? t('people.parent') : t('people.kid')}</em>
              </span>
              <span className="di-person-chev" aria-hidden="true">
                ›
              </span>
            </span>
          </button>
        ))
      ) : (
        <EmptyCard title={t('people.noFamiliesTitle')} body={t('people.noFamiliesBody')}>
          <div className="di-hang-actions">
            <button className="di-did di-did-small" type="button" onClick={() => goHash('/people/connect')}>
              {t('people.startFamily')}
            </button>
          </div>
        </EmptyCard>
      )}
      {families.length ? null : <JoinFamilyCard />}

      <SetCap>{t('we.title')}</SetCap>
      <SetCard>
        <SetRow label={t('we.open')} sub={t('we.empty')} chevron onClick={() => goHash('/we')} />
      </SetCard>

      <SetCap>{t('people.you')}</SetCap>
      <SetCard>
        {mine?.display_name || book?.keeperName || keptProfileName() ? (
          <SetRow label={t('people.name')} value={mine?.display_name || book?.keeperName || keptProfileName()} sub={t('people.nameInAccount')} chevron onClick={() => goHash('/account')} />
        ) : (
          <SetRow label={t('people.name')} sub={t('people.nameInAccount')} chevron onClick={() => goHash('/account')} />
        )}
        <SetRow
          label={t('friendId.yours')}
          value={mine?.friend_id ? formatFriendId(mine.friend_id) : ''}
          sub={t('friendId.shareSub')}
          chevron
          onClick={() => goHash('/people/connect')}
        />
      </SetCard>
      <SetCard>
        <SetRow
          label={t('people.connect')}
          sub={t('people.connectSub')}
          chevron
          onClick={() => goHash('/people/connect')}
        />
      </SetCard>

      {links.sent.length ? (
        <p className="di-set-note">
          {t('people.outstanding', {
            names: links.sent.map((row) => personName(row.person)).filter(Boolean).join(', '),
          })}
        </p>
      ) : null}

      {miss ? (
        <p className="di-miss" role="alert">
          {tMiss(miss)}
        </p>
      ) : null}
      {said ? <p className="di-set-note">{said}</p> : null}

      {sheet?.kind === 'send' ? (
        <SendSheet person={sheet.person} still={still} onClose={() => setSheet(null)} onSent={say} />
      ) : null}
      {sheet?.kind === 'friend' ? (
        <AddFriendPop
          onClose={() => setSheet(null)}
          onAsked={(words) => {
            say(words)
            load()
          }}
        />
      ) : null}
      {sheet?.kind === 'family' ? (
        <AddPop kicker={t('people.join')} onClose={() => setSheet(null)}>
          <JoinFamilyCard bare />
        </AddPop>
      ) : null}
    </>,
  )
}
