import { useCallback, useEffect, useRef, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useBackDismiss } from '../site/nav.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { cloudSetUp } from './cloud.js'
import { t, tMiss } from './i18n.js'
import {
  blockPerson,
  doneTonight,
  friendLine,
  friendStreak,
  dropFriend,
  friendAskNote,
  friendAskTitle,
  listBlocks,
  listAutoAdds,
  listFriends,
  personName,
  sayNo,
  sayYes,
  setAutoAdd,
  unblockPerson,
  buyCheers,
  cheerFriend,
  readFriendCheers,
  FRIEND_NOTE_MAX,
  friendNotesAll,
  saveFriendNote,
} from './people.js'
import {
  FRIEND_CHEER_CAP,
  FRIEND_CHEER_GEMS,
  FRIEND_CHEERS_PER_GEM,
  fireCheer,
  friendCheerMissKey,
  normalizePurse,
} from './purse.js'
import { boardDate, formatBoardDate, isoDate } from './recurrence.js'
import { GemShort } from './shop-bits.jsx'
import { EmptyCard, PersonCard, SectionHead } from './PersonCard.jsx'
import { SendSheet } from './SendDidYou.jsx'
import { SetSwitch } from './set-bits.jsx'
import { useReduceMotion } from './useReduceMotion.js'
import { useOnline } from './useOnline.js'
import { checkOnsForMe, minuteClock, stopCheckOn } from './check-on.js'
import { sharedNotesOf } from './social-amounts.js'

export function Friends({ book, onChange, now, highlightAsk = '' }) {
  const clock = now || new Date()
  const account = useAccount()
  const purse = normalizePurse(book)
  const [links, setLinks] = useState({ friends: [], asked: [], sent: [] })
  const [ready, setReady] = useState(false)
  const [miss, setMiss] = useState('')
  const [dropId, setDropId] = useState('')
  const [blocks, setBlocks] = useState([])
  const [confirm, setConfirm] = useState(null)
  const [gemShort, setGemShort] = useState(false)
  const [stock, setStock] = useState(null)
  const [autoAdds, setAutoAdds] = useState(() => new Set())
  const [sheet, setSheet] = useState(null)
  const [said, setSaid] = useState('')
  // Notes friends chose to share lately, and what they asked you to check on.
  const [notes, setNotes] = useState(() => new Map())
  const [checkOns, setCheckOns] = useState(() => new Map())
  // Your own private note about each friend (friend_notes). Only you see it.
  const [myNotes, setMyNotes] = useState(() => new Map())
  const still = useReduceMotion()
  const pickRef = useRef(null)
  const online = useOnline()
  const cheersLeft = stock == null ? purse.friendCheers : stock

  useBackDismiss(Boolean(confirm), () => setConfirm(null))

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    const [friendRows, blockRows, serverCheers, autoRows] = await Promise.all([
      listFriends(),
      listBlocks(),
      readFriendCheers(),
      listAutoAdds(),
    ])
    setLinks(friendRows)
    const ids = friendRows.friends.map((row) => row.person.user_id)
    const [noteRows, askRows, mine] = await Promise.all([
      sharedNotesOf(ids).catch(() => new Map()),
      checkOnsForMe().catch(() => null),
      friendNotesAll().catch(() => null),
    ])
    setNotes(noteRows)
    if (mine) setMyNotes(mine)
    if (askRows) setCheckOns(askRows)
    else setMiss('people.reach')
    setBlocks(blockRows)
    setAutoAdds(autoRows)
    if (typeof serverCheers === 'number') setStock(serverCheers)
    setReady(true)
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!highlightAsk || !pickRef.current) return
    pickRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlightAsk, links.asked, ready])

  const shell = (children) => (
    <BoardShell
      book={book}
      now={clock}
      title={t('people.friends')}
      date={formatBoardDate(boardDate(clock))}
    >
      <section className="di-page di-set di-people">
        <p className="di-face-plate">{t('people.friends')}</p>
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

  if (!ready) return shell(<p className="di-set-note">{t('family.loading')}</p>)

  async function flipAuto(person) {
    const id = person.user_id
    const on = !autoAdds.has(id)
    // Show it at once; put it back if the save does not land.
    const flip = (want) =>
      setAutoAdds((live) => {
        const next = new Set(live)
        if (want) next.add(id)
        else next.delete(id)
        return next
      })
    flip(on)
    const { miss: why } = await setAutoAdd(id, on)
    if (!why) return
    flip(!on)
    setMiss(why === 'off' || why === 'out' ? why : t('friends.autoAddMiss'))
  }

  async function buyMore() {
    if (purse.gems < FRIEND_CHEER_GEMS) {
      setGemShort(true)
      return
    }
    const bought = await buyCheers(book)
    if (bought.miss === 'gems') {
      setGemShort(true)
      return
    }
    const known = friendCheerMissKey(bought.miss)
    if (known) return setMiss(t(known.key, known.vars))
    if (bought.miss) return setMiss(tMiss(bought.miss))
    setStock(normalizePurse(bought.book).friendCheers)
    if (onChange) onChange(bought.book)
    setMiss('')
  }

  async function cheer(person, about = '') {
    const sent = await cheerFriend(book, person.user_id, purse.cheerOn, about)
    const known = friendCheerMissKey(sent.miss)
    if (known) return setMiss(t(known.key, known.vars))
    if (sent.miss) return setMiss(tMiss(sent.miss))
    setStock(normalizePurse(sent.book).friendCheers)
    if (onChange) onChange(sent.book)
    fireCheer(purse.cheerOn, 1)
    setMiss('')
    setSaid(t('family.cheerSent', { name: personName(person) || t('people.someone') }))
  }

  function gift(person) {
    goHash('/gift', { id: person.user_id })
  }

  async function stopAsk(row) {
    const { miss: why } = await stopCheckOn(row.id)
    if (why) return setMiss(why)
    setCheckOns((live) => {
      const next = new Map(live)
      next.set(row.owner_id, (next.get(row.owner_id) || []).filter((item) => item.id !== row.id))
      return next
    })
    setMiss('')
    return setSaid(t('checkOn.stopped'))
  }

  async function answerAsk(id, yes) {
    const { miss: why } = yes ? await sayYes(id) : await sayNo(id)
    if (why) setMiss(why)
    load()
  }

  return shell(
    <>
      <h2 className="di-page-title">{t('friends.title', { n: links.friends.length })}</h2>
      {links.friends.length ? (
        <p className="di-set-note">
          {t(links.friends.length === 1 ? 'people.doneOfOne' : 'people.doneOf', {
            done: links.friends.filter((row) => doneTonight(row.person, isoDate(clock))).length,
            n: links.friends.length,
          })}
        </p>
      ) : null}

      <div className="di-person di-person-stock">
        <span className="di-person-who">
          <strong>{t('friends.cheerStock', { n: cheersLeft })}</strong>
          <em>{t('friends.cheerNote')}</em>
        </span>
        <button
          className="di-key"
          type="button"
          disabled={cheersLeft + FRIEND_CHEERS_PER_GEM > FRIEND_CHEER_CAP}
          onClick={buyMore}
        >
          {t('friends.cheerBuyShort')}
        </button>
      </div>

      {/* Sticks to the top while you scroll, so a miss on a long list stays in view. */}
      {said || miss ? (
        <div className="di-people-said">
          {said ? <p className="di-set-note" role="status">{said}</p> : null}
          {miss ? (
            <p className="di-miss" role="alert">
              {tMiss(miss)}
            </p>
          ) : null}
        </div>
      ) : null}

      {links.asked.length ? (
        <>
          <SectionHead label={t('people.askBanner', { n: links.asked.length })} />
          {links.asked.map((row) => (
            <PersonCard
              key={row.id}
              highlight={highlightAsk ? row.id === highlightAsk : true}
              cardRef={row.id === highlightAsk ? pickRef : null}
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

      <SectionHead label={t('people.friends')} count={links.friends.length} />
      {links.friends.length ? (
        links.friends.map((row) => {
          const done = doneTonight(row.person, isoDate(clock))
          const auto = autoAdds.has(row.person.user_id)
          const streak = friendStreak(row.person) ? t('people.streakN', { n: friendStreak(row.person) }) : ''
          return (
            <PersonCard
              key={row.id}
              person={row.person}
              done={done}
              name={personName(row.person) || t('people.someone')}
              line={[done ? streak : friendLine(row.person, isoDate(clock)), auto ? t('people.autoOnChip') : ''].filter(Boolean).join(' · ')}
              pill={done ? t('people.doneTonightShort') : ''}
              pillOn={done}
              extra={
                <>
                  <FriendExtras
                    name={personName(row.person) || t('people.someone')}
                    notes={notes.get(row.person.user_id) || []}
                    asks={checkOns.get(row.person.user_id) || []}
                    cheerOff={cheersLeft < 1}
                    onCheer={(about) => cheer(row.person, about)}
                    onAsk={(question) => setSheet({ person: row.person, question })}
                    onStop={stopAsk}
                  />
                  <FriendNoteBox
                    friendId={row.person.user_id}
                    name={personName(row.person) || t('people.someone')}
                    saved={myNotes.get(row.person.user_id) || ''}
                    onSaved={(note) =>
                      setMyNotes((was) => {
                        const next = new Map(was)
                        if (note) next.set(row.person.user_id, note)
                        else next.delete(row.person.user_id)
                        return next
                      })
                    }
                  />
                </>
              }
              actions={
                <>
                  <button className="di-did di-did-small" type="button" onClick={() => setSheet({ person: row.person })}>
                    {t('people.sendDidYou')}
                  </button>
                  <button className="di-key" type="button" disabled={cheersLeft < 1} onClick={() => cheer(row.person)}>
                    {t('friends.cheerUse')}
                  </button>
                </>
              }
              more={
                <>
                  <SetSwitch
                    label={t('friends.autoAdd')}
                    sub={auto ? t('friends.autoAddOn') : t('friends.autoAddOff')}
                    on={auto}
                    onClick={() => flipAuto(row.person)}
                  />
                  <div className="di-person-actions">
                    <button className="di-key" type="button" onClick={() => gift(row.person)}>
                      {t('gift.button')}
                    </button>
                    <button
                      className="di-key"
                      type="button"
                      title={t('people.dropBody')}
                      onClick={async () => {
                        // Two taps, like Report: the first asks.
                        if (dropId !== row.person.user_id) return setDropId(row.person.user_id)
                        setDropId('')
                        const { miss: why } = await dropFriend(row.person.user_id)
                        if (why) setMiss(why)
                        return load()
                      }}
                    >
                      {dropId === row.person.user_id ? t('people.dropSure') : t('people.drop')}
                    </button>
                    <button className="di-key" type="button" onClick={() => setConfirm(row.person)}>
                      {t('block.block')}
                    </button>
                  </div>
                </>
              }
            />
          )
        })
      ) : (
        <EmptyCard title={t('people.noFriendsTitle')} body={t('people.noFriendsBody')} />
      )}

      {links.sent.length ? (
        <>
          <SectionHead label={t('friends.waiting')} count={links.sent.length} />
          {links.sent.map((row) => (
            <PersonCard
              key={row.id}
              person={row.person}
              name={personName(row.person) || t('people.someone')}
              line={t('friends.notYet')}
            />
          ))}
        </>
      ) : null}

      {blocks.length ? (
        <>
          <SectionHead label={t('block.list')} count={blocks.length} />
          {blocks.map((row) => (
            <PersonCard
              key={row.user_id}
              person={row}
              name={row.display_name || t('people.someone')}
              line={t('block.cannotReach')}
              actions={
                <button
                  className="di-key"
                  type="button"
                  onClick={async () => {
                    const { miss: why } = await unblockPerson(row.user_id)
                    if (why) setMiss(why)
                    load()
                  }}
                >
                  {t('block.unblock')}
                </button>
              }
            />
          ))}
        </>
      ) : null}

      {sheet ? (
        <SendSheet
          person={sheet.person}
          book={book}
          initialQuestion={sheet.question || ''}
          still={still}
          onClose={() => setSheet(null)}
          onSent={(words) => {
            setMiss('')
            setSaid(words)
          }}
        />
      ) : null}

      {confirm ? (
        <div className="di-buy-veil" role="presentation" onClick={() => setConfirm(null)}>
          <div
            className="di-buy-pop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="di-block-pop"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="di-face-plate">{t('block.block')}</p>
            <h2 id="di-block-pop" className="di-buy-title">
              {t('block.title', { name: personName(confirm) || t('people.someone') })}
            </h2>
            <p className="di-detail-meta">{t('block.body')}</p>
            <div className="di-hang-actions">
              <button
                className="di-did di-did-small"
                type="button"
                onClick={async () => {
                  const who = confirm
                  setConfirm(null)
                  const { miss: why } = await blockPerson(who.user_id)
                  if (why) setMiss(why)
                  load()
                }}
              >
                {t('block.yes')}
              </button>
              <button
                className="di-key"
                type="button"
                onClick={async () => {
                  const who = confirm
                  setConfirm(null)
                  const { miss: why } = await blockPerson(who.user_id, 'reported from friends')
                  if (why) setMiss(why)
                  load()
                }}
              >
                {t('block.andReport')}
              </button>
              <button className="di-key" type="button" onClick={() => setConfirm(null)}>
                {t('settings.neverMind')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <GemShort open={gemShort} onClose={() => setGemShort(false)} />

      <div className="di-hang-actions">
        <button className="di-did di-did-small" type="button" onClick={() => goHash('/people/connect')}>
          {t('people.connect')}
        </button>
        <button className="di-key" type="button" onClick={() => goHash('/people')}>
          {t('people.back')}
        </button>
      </div>
    </>,
  )
}

// Your private note about a friend, the same as the phone's friend page:
// view, edit, remove. Empty Save removes it too. Only you ever see it.
function FriendNoteBox({ friendId, name, saved, onSaved }) {
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')

  async function save(text) {
    setBusy(true)
    setMiss('')
    const res = await saveFriendNote(friendId, text)
    setBusy(false)
    if (res.miss) return setMiss(tMiss(res.miss))
    onSaved(res.note)
    setDraft(null)
    setSaid(res.note ? t('friendNote.saved') : t('friendNote.cleared'))
  }

  if (draft != null) {
    return (
      <form
        className="di-note-box"
        onSubmit={(event) => {
          event.preventDefault()
          save(draft)
        }}
      >
        <label className="di-field">
          <span>{t('friendNote.label', { name })}</span>
          <textarea
            value={draft}
            maxLength={FRIEND_NOTE_MAX}
            placeholder={t('friendNote.ph')}
            rows={3}
            onChange={(event) => setDraft(event.target.value.slice(0, FRIEND_NOTE_MAX))}
          />
        </label>
        <p className="di-set-note">{t('friendNote.private', { name })}</p>
        {miss ? (
          <p className="di-miss" role="alert">
            {miss}
          </p>
        ) : null}
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="submit" disabled={busy}>
            {t('friendNote.save')}
          </button>
          {saved ? (
            <button className="di-key" type="button" disabled={busy} onClick={() => save('')}>
              {t('note.remove')}
            </button>
          ) : null}
          <button
            className="di-key"
            type="button"
            onClick={() => {
              setDraft(null)
              setMiss('')
            }}
          >
            {t('settings.neverMind')}
          </button>
        </div>
      </form>
    )
  }
  return (
    <div className="di-friend-note">
      <p className="di-set-note">{t('friendNote.title')}</p>
      {saved ? <p className="di-friend-note-text">{saved}</p> : null}
      {said ? (
        <p className="di-set-note" role="status">
          {said}
        </p>
      ) : null}
      <button className="di-key" type="button" onClick={() => { setSaid(''); setDraft(saved) }}>
        {saved ? t('friendNote.edit') : t('friendNote.add')}
      </button>
    </div>
  )
}

// Under a friend: notes they shared lately (with the normal friend cheer)
// and the questions they asked you to check on.
function FriendExtras({ name, notes, asks, cheerOff, onCheer, onAsk, onStop }) {
  if (!notes.length && !asks.length) return null
  return (
    <div className="di-shared-notes">
      {notes.length ? <p className="di-set-note">{t('sharedNote.fromFriend', { name })}</p> : null}
      {notes.map((row) => (
        <div className="di-shared-note" key={`${row.lamp_id}:${row.period_key}`}>
          <p>
            {row.question ? `${row.question}: ` : ''}
            {row.note}
          </p>
          <button className="di-key" type="button" disabled={cheerOff} onClick={() => onCheer(row.question || '')}>
            {t('sharedNote.cheer')}
          </button>
        </div>
      ))}
      {asks.length ? <p className="di-set-note">{t('checkOn.fromTitle', { name })}</p> : null}
      {asks.map((row) => (
        <div className="di-check-on" key={row.id}>
          <p className="di-check-on-share">
            {row.question}
            <br />
            <small>{t('checkOn.fromAt', { time: minuteClock(row.at_minute) })}</small>
          </p>
          <div className="di-hang-actions">
            <button className="di-key" type="button" onClick={() => onAsk(row.question)}>
              {t('friend.sendDidYou')}
            </button>
            <button className="di-key" type="button" onClick={() => onStop(row)}>
              {t('checkOn.stop')}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
