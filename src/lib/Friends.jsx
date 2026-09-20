import { useCallback, useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useBackDismiss } from '../site/nav.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { cloudSetUp } from './cloud.js'
import { t, tMiss } from './i18n.js'
import {
  blockPerson,
  dropFriend,
  giftCheer,
  listBlocks,
  listFriends,
  personName,
  sendCheer,
  unblockPerson,
} from './people.js'
import {
  CHEER_GEMS,
  FRIEND_CHEER_GEMS,
  fireCheer,
  normalizePurse,
  spendGems,
} from './purse.js'
import { boardDate, formatBoardDate, isoDate } from './recurrence.js'
import { SetCap, SetCard } from './set-bits.jsx'
import { useOnline } from './useOnline.js'

function line(person) {
  if (!person?.share_streak) return t('people.quiet')
  if (person.done_on === isoDate(new Date())) return t('people.doneTonight')
  if (person.streak > 0) return t('people.streakN', { n: person.streak })
  return t('people.noStreak')
}

export function Friends({ book, onChange, now }) {
  const clock = now || new Date()
  const account = useAccount()
  const purse = normalizePurse(book)
  const [links, setLinks] = useState({ friends: [], asked: [], sent: [] })
  const [ready, setReady] = useState(false)
  const [miss, setMiss] = useState('')
  const [blocks, setBlocks] = useState([])
  const [confirm, setConfirm] = useState(null)
  const online = useOnline()

  useBackDismiss(Boolean(confirm), () => setConfirm(null))

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    const [friendRows, blockRows] = await Promise.all([listFriends(), listBlocks()])
    setLinks(friendRows)
    setBlocks(blockRows)
    setReady(true)
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])

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

  return shell(
    <>
      <h2 className="di-page-title">{t('friends.title', { n: links.friends.length })}</h2>

      {links.friends.length ? (
        <SetCard>
          {links.friends.map((row) => (
            <div className="di-people-row" key={row.id}>
              <span className="di-people-who">
                <strong>{personName(row.person) || t('people.someone')}</strong>
                <em>
                  {row.person?.handle ? `@${row.person.handle} · ` : ''}
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
                disabled={purse.gems < FRIEND_CHEER_GEMS}
                onClick={async () => {
                  const spent = spendGems(book, FRIEND_CHEER_GEMS)
                  if (spent.miss) return setMiss(t('friends.needGems', { n: FRIEND_CHEER_GEMS }))
                  const { miss: why } = await sendCheer(row.person.user_id, '', purse.cheerOn)
                  if (why) return setMiss(why)
                  if (onChange) onChange(spent.book)
                  fireCheer(purse.cheerOn, 1)
                  setMiss('')
                }}
              >
                {t('friends.cheer', { n: FRIEND_CHEER_GEMS })}
              </button>
              <button
                className="di-key"
                type="button"
                disabled={purse.gems < CHEER_GEMS || purse.cheers.length < 2}
                onClick={async () => {
                  const pick = purse.cheers.find((id) => id !== 'lime') || purse.cheerOn
                  const spent = spendGems(book, CHEER_GEMS)
                  if (spent.miss) return setMiss(t('friends.needGems', { n: CHEER_GEMS }))
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
                    {row.display_name || (row.handle ? `@${row.handle}` : t('people.someone'))}
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

      <div className="di-hang-actions">
        <button className="di-did di-did-small" type="button" onClick={() => goHash('/people')}>
          {t('friends.manage')}
        </button>
      </div>
    </>,
  )
}
