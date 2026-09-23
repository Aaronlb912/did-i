import { useCallback, useEffect, useRef, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useBackDismiss } from '../site/nav.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { cloudSetUp } from './cloud.js'
import { t, tMiss } from './i18n.js'
import {
  blockPerson,
  dropFriend,
  friendAskNote,
  friendAskTitle,
  giftCheer,
  listBlocks,
  listFriends,
  formatPhone,
  personName,
  sayNo,
  sayYes,
  unblockPerson,
  buyCheers,
  cheerFriend,
  readFriendCheers,
} from './people.js'
import {
  CHEER_GEMS,
  FRIEND_CHEER_CAP,
  FRIEND_CHEER_GEMS,
  FRIEND_CHEERS_PER_GEM,
  fireCheer,
  friendCheerMissKey,
  normalizePurse,
  spendGems,
} from './purse.js'
import { boardDate, formatBoardDate, isoDate } from './recurrence.js'
import { GemShort } from './shop-bits.jsx'
import { SetCap, SetCard } from './set-bits.jsx'
import { useOnline } from './useOnline.js'

function line(person) {
  if (!person?.share_streak) return t('people.quiet')
  if (person.done_on === isoDate(new Date())) return t('people.doneTonight')
  if (person.streak > 0) return t('people.streakN', { n: person.streak })
  return t('people.noStreak')
}

export function Friends({ book, onChange, now, highlightAsk = '' }) {
  const clock = now || new Date()
  const account = useAccount()
  const purse = normalizePurse(book)
  const [links, setLinks] = useState({ friends: [], asked: [], sent: [] })
  const [ready, setReady] = useState(false)
  const [miss, setMiss] = useState('')
  const [blocks, setBlocks] = useState([])
  const [confirm, setConfirm] = useState(null)
  const [gemShort, setGemShort] = useState(false)
  const [stock, setStock] = useState(null)
  const pickRef = useRef(null)
  const online = useOnline()
  const cheersLeft = stock == null ? purse.friendCheers : stock

  useBackDismiss(Boolean(confirm), () => setConfirm(null))

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    const [friendRows, blockRows, serverCheers] = await Promise.all([
      listFriends(),
      listBlocks(),
      readFriendCheers(),
    ])
    setLinks(friendRows)
    setBlocks(blockRows)
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

  async function answerAsk(id, yes) {
    const { miss: why } = yes ? await sayYes(id) : await sayNo(id)
    if (why) setMiss(why)
    load()
  }

  return shell(
    <>
      <h2 className="di-page-title">{t('friends.title', { n: links.friends.length })}</h2>
      <p className="di-set-note">{t('friends.cheerNote')}</p>
      <p className="di-set-note">{t('friends.cheerStock', { n: cheersLeft })}</p>
      <button
        className="di-key"
        type="button"
        disabled={cheersLeft + FRIEND_CHEERS_PER_GEM > FRIEND_CHEER_CAP}
        onClick={async () => {
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
        }}
      >
        {t('friends.cheerBuy')}
      </button>

      {links.asked.length ? (
        <div className="di-people-asks">
          <SetCap>{t('people.askBanner', { n: links.asked.length })}</SetCap>
          <SetCard>
            {links.asked.map((row) => (
              <div
                className={row.id === highlightAsk ? 'di-people-row is-pick' : 'di-people-row'}
                key={row.id}
                ref={row.id === highlightAsk ? pickRef : null}
              >
                <span className="di-people-who">
                  <strong>{friendAskTitle(row.person) || t('people.someone')}</strong>
                  <em>{friendAskNote(row.person)}</em>
                </span>
                <button
                  className="di-did di-did-small"
                  type="button"
                  onClick={() => answerAsk(row.id, true)}
                >
                  {t('people.yes')}
                </button>
                <button className="di-key" type="button" onClick={() => answerAsk(row.id, false)}>
                  {t('people.no')}
                </button>
              </div>
            ))}
          </SetCard>
        </div>
      ) : null}

      {links.friends.length ? (
        <SetCard>
          {links.friends.map((row) => (
            <div className="di-people-row" key={row.id}>
              <span className="di-people-who">
                <strong>{personName(row.person) || t('people.someone')}</strong>
                <em>
                  {row.person?.phone ? `${formatPhone(row.person.phone)} · ` : ''}
                  {line(row.person)}
                </em>
              </span>
              <button
                className="di-key"
                type="button"
                onClick={async () => {
                  const { miss: why } = await dropFriend(row.person.user_id)
                  if (why) setMiss(why)
                  load()
                }}
              >
                {t('people.drop')}
              </button>
              <button
                className="di-key"
                type="button"
                disabled={cheersLeft < 1}
                onClick={async () => {
                  const sent = await cheerFriend(book, row.person.user_id, purse.cheerOn)
                  const known = friendCheerMissKey(sent.miss)
                  if (known) return setMiss(t(known.key, known.vars))
                  if (sent.miss) return setMiss(tMiss(sent.miss))
                  setStock(normalizePurse(sent.book).friendCheers)
                  if (onChange) onChange(sent.book)
                  fireCheer(purse.cheerOn, 1)
                  setMiss('')
                }}
              >
                {t('friends.cheerUse')}
              </button>
              <button
                className="di-key"
                type="button"
                disabled={purse.cheers.length < 2}
                onClick={async () => {
                  if (purse.gems < CHEER_GEMS) {
                    setGemShort(true)
                    return
                  }
                  const pick = purse.cheers.find((id) => id !== 'lime') || purse.cheerOn
                  const spent = spendGems(book, CHEER_GEMS)
                  if (spent.miss) {
                    setGemShort(true)
                    return
                  }
                  const { miss: why } = await giftCheer(row.person.user_id, pick)
                  if (why === 'giftCap') return setMiss(t('friends.giftCap'))
                  if (why) return setMiss(why)
                  if (onChange) onChange(spent.book)
                  setMiss(t('friends.giftSent', { name: personName(row.person) || t('people.someone') }))
                }}
              >
                {t('friends.gift', { n: CHEER_GEMS })}
              </button>
              <button
                className="di-key"
                type="button"
                onClick={() => setConfirm(row.person)}
              >
                {t('block.block')}
              </button>
            </div>
          ))}
        </SetCard>
      ) : (
        <p className="di-set-note">{t('people.noFriends')}</p>
      )}

      {links.sent.length ? (
        <>
          <SetCap>{t('friends.waiting')}</SetCap>
          <SetCard>
            {links.sent.map((row) => (
              <div className="di-people-row" key={row.id}>
                <span className="di-people-who">
                  <strong>{personName(row.person) || t('people.someone')}</strong>
                  <em>{t('friends.notYet')}</em>
                </span>
              </div>
            ))}
          </SetCard>
        </>
      ) : null}

      {blocks.length ? (
        <>
          <SetCap>{t('block.list')}</SetCap>
          <SetCard>
            {blocks.map((row) => (
              <div className="di-people-row" key={row.user_id}>
                <span className="di-people-who">
                  <strong>
                    {row.display_name || formatPhone(row.phone) || t('people.someone')}
                  </strong>
                  <em>{t('block.cannotReach')}</em>
                </span>
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
              </div>
            ))}
          </SetCard>
        </>
      ) : null}

      {miss ? (
        <p className="di-miss" role="alert">
          {tMiss(miss)}
        </p>
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
