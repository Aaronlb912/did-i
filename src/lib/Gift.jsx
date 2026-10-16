import { useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useBackDismiss } from '../site/nav.js'
import { BoardShell } from './BoardShell.jsx'
import { LookChip } from './Cosmetic.jsx'
import { KitTabs } from './kit-bits.jsx'
import { ShopTile, tileChip, tileName } from './Shop.jsx'
import { GemShort, coinLine, gemLine } from './shop-bits.jsx'
import { activeLook } from './active-look.js'
import { useAccount } from './account.js'
import { doneGift, nextGift, onGift } from './gift-inbox.js'
import { t, tMiss } from './i18n.js'
import { listSentGifts, personName, readKnownPerson, reportGift, sendGift } from './people.js'
import { giftTab, sentGiftDate, sentGiftStatus, sentGiftType } from './gift-history.js'
import { usePrefs } from './prefs.js'
import { fireCheer, giftItems, normalizePurse, stampPurse, wearGift } from './purse.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { useReduceMotion } from './useReduceMotion.js'

const NOBODY_OWNS = { looks: [], cheers: [], buddies: [], accessories: [] }
const TYPE_OF = { looks: 'look', cheers: 'cheer', buddies: 'buddy', accessories: 'accessory' }

function giftMiss(why, name) {
  if (why === 'owned') return t('gift.owned', { name })
  if (why === 'giftCap') return t('gift.cap')
  if (why === 'notFriend') return t('gift.notFriend')
  if (why === 'coins') return t('gift.needCoins')
  if (why === 'gone') return t('gift.gone')
  return tMiss(why)
}

// The big picture in a gift pop-up: the look's chip, the buddy hanging, or
// the cheer's chip while the cheer itself plays.
function GiftArt({ type, id, coat }) {
  useEffect(() => {
    if (type !== 'cheer') return undefined
    fireCheer(id, 1, coat, undefined, true)
    return undefined
  }, [type, id, coat])
  return (
    <div className="di-gift-art" data-type={type}>
      {type === 'look' ? <LookChip id={id} /> : tileChip(type, id)}
    </div>
  )
}

function GiftPop({ open, onClose, children, label }) {
  const still = useReduceMotion()
  useBackDismiss(open, onClose)
  useEffect(() => {
    if (!open) return undefined
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="di-buy-veil" role="presentation" onClick={onClose}>
      <div
        className={still ? 'di-buy-pop di-gift-pop is-still' : 'di-buy-pop di-gift-pop'}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

// /gift?id=...: pick a look, cheer or buddy for a friend or family member.
export function Gift({ book, onChange, toId, now }) {
  usePrefs()
  const account = useAccount()
  const clock = now || new Date()
  const purse = normalizePurse(book)
  const coat = activeLook(book)
  const [tab, setTab] = useState('looks')
  const [note, setNote] = useState('')
  const [person, setPerson] = useState(undefined)
  // The person read failed (not "nobody"): say so and offer a retry.
  const [lost, setLost] = useState(false)
  const [tries, setTries] = useState(0)
  const [pick, setPick] = useState(null)
  const [miss, setMiss] = useState('')
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState(false)
  const [gemShort, setGemShort] = useState(false)
  const items = giftItems()

  useEffect(() => {
    let alive = true
    setLost(false)
    readKnownPerson(toId).then((row) => {
      if (!alive) return
      setPerson(row)
      setLost(row === undefined)
    })
    return () => {
      alive = false
    }
  }, [toId, tries])

  const name = person ? personName(person) || t('people.someone') : ''

  async function send() {
    if (!pick || busy) return
    const { type, item } = pick
    if (item.gems > 0 && purse.gems < item.gems) {
      setPick(null)
      setGemShort(true)
      return
    }
    if (item.coins > 0 && purse.coins < item.coins) return setMiss(t('gift.needCoins'))
    setBusy(true)
    const out = await sendGift(toId, type, item.id, note)
    setBusy(false)
    if (out.miss === 'gems') {
      setPick(null)
      setGemShort(true)
      return
    }
    if (out.miss) return setMiss(giftMiss(out.miss, name))
    setPick(null)
    onChange(stampPurse(book, { ...purse, gems: out.gems, coins: out.coins }))
    setNote('')
    setSent(t('gift.sent', { item: tileName(type, item.id), name }))
  }

  const shell = (children) => (
    <BoardShell book={book} now={clock} title={t('gift.title')} date={formatBoardDate(boardDate(clock, book.dayFoldHour))}>
      <section className="di-page di-set di-gift">
        <h2 className="di-page-title">{t('gift.title')}</h2>
        {children}
      </section>
    </BoardShell>
  )

  if (account.ready && !account.user) {
    return shell(
      <>
        <p className="di-set-note">{t('gift.needAccount')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/account')}>
            {t('we.signIn')}
          </button>
        </div>
      </>,
    )
  }
  if (lost) {
    return shell(
      <>
        <p className="di-miss" role="alert">
          {t('people.reach')}
        </p>
        <div className="di-hang-actions">
          <button className="di-key" type="button" onClick={() => setTries((n) => n + 1)}>
            {t('gift.retry')}
          </button>
        </div>
      </>,
    )
  }
  if (person === null) {
    return shell(
      <>
        <p className="di-set-note">{t('gift.nobody')}</p>
        <div className="di-hang-actions">
          <button className="di-key" type="button" onClick={() => goHash('/friends')}>
            {t('people.friends')}
          </button>
        </div>
      </>,
    )
  }

  return shell(
    <>
      <p className="di-set-note">{person ? t('gift.to', { name }) : t('family.loading')}</p>
      <label className="di-field">
        <span>{t('gift.noteLabel')}</span>
        <input
          value={note}
          maxLength={60}
          placeholder={t('gift.notePlaceholder')}
          onChange={(event) => setNote(event.target.value.slice(0, 60))}
        />
      </label>
      <p className="di-set-note di-gift-count">{note.length}/60</p>
      {sent ? (
        <p className="di-gift-sent" role="status">
          {sent}
        </p>
      ) : null}
      <KitTabs tab={tab} onTab={setTab} counts={{ looks: items.looks.length, cheers: items.cheers.length, buddies: items.buddies.length, accessories: items.accessories.length }} />
      <div className="di-drop-grid">
        {items[tab].map((item) => (
          <ShopTile
            key={item.id}
            type={TYPE_OF[tab]}
            item={item}
            purse={NOBODY_OWNS}
            onTile={(type, row) => {
              if (!person) return
              setMiss('')
              setPick({ type, item: row })
            }}
          />
        ))}
      </div>
      <p className="di-set-note">{t('gift.howItWorks')}</p>
      <div className="di-hang-actions">
        <button className="di-key" type="button" onClick={() => goHash('/gifts')}>
          {t('gifts.title')}
        </button>
      </div>

      <GiftPop open={Boolean(pick)} onClose={() => setPick(null)} label={pick ? tileName(pick.type, pick.item.id) : ''}>
        {pick ? (
          <>
            <GiftArt type={pick.type} id={pick.item.id} coat={coat} />
            <p className="di-face-plate">{t('gift.kicker', { name })}</p>
            <h2 className="di-buy-title">{tileName(pick.type, pick.item.id)}</h2>
            <p className="di-detail-meta">
              {miss || (pick.item.gems ? gemLine(pick.item.gems) : coinLine(pick.item.coins))}
            </p>
            {note.trim() ? <blockquote className="di-gift-quote">{note.trim()}</blockquote> : null}
            <div className="di-hang-actions">
              <button className="di-did di-did-small" type="button" disabled={busy} onClick={send}>
                {t('gift.send')}
              </button>
              <button className="di-key" type="button" onClick={() => setPick(null)}>
                {t('settings.neverMind')}
              </button>
            </div>
          </>
        ) : null}
      </GiftPop>
      <GemShort open={gemShort} onClose={() => setGemShort(false)} />
    </>,
  )
}

// Shows each gift that arrived, one at a time. Click outside to close; the
// gift is already in the collection either way.
export function GiftArrived({ book, onChange }) {
  usePrefs()
  const [gift, setGift] = useState(() => nextGift())
  const [reporting, setReporting] = useState(false)
  useEffect(() => onGift((next) => setGift(next)), [])
  if (!gift || !book) return null

  const type = sentGiftType(gift)
  const name = gift.from_name || t('people.someone')
  const tab = giftTab(type)
  const done = () => {
    setReporting(false)
    doneGift(gift.id)
  }

  return (
    <GiftPop open onClose={done} label={tileName(type, gift.item_id)}>
      {reporting ? (
        <>
          <h2 className="di-buy-title">{t('gift.reportTitle')}</h2>
          <p className="di-detail-meta">{t('gift.reportBody', { name })}</p>
          <div className="di-hang-actions">
            <button
              className="di-did di-did-small"
              type="button"
              onClick={() => {
                reportGift(gift.id).catch(() => {})
                done()
              }}
            >
              {t('gift.reportGo')}
            </button>
            <button className="di-key" type="button" onClick={() => setReporting(false)}>
              {t('settings.neverMind')}
            </button>
          </div>
        </>
      ) : (
        <>
          <GiftArt type={type} id={gift.item_id} coat={activeLook(book)} />
          <p className="di-face-plate">{t('gift.gotKicker', { name })}</p>
          <h2 className="di-buy-title">{tileName(type, gift.item_id)}</h2>
          <p className="di-detail-meta">{t('gift.gotBody')}</p>
          {gift.note ? <blockquote className="di-gift-quote">{gift.note}</blockquote> : null}
          <div className="di-hang-actions">
            <button
              className="di-did di-did-small"
              type="button"
              onClick={() => {
                onChange(wearGift(book, type, gift.item_id))
                done()
              }}
            >
              {t('gift.equip')}
            </button>
            <button
              className="di-key"
              type="button"
              onClick={() => {
                done()
                goHash('/kit', { id: tab })
              }}
            >
              {t('gift.viewKit')}
            </button>
          </div>
          {gift.note ? (
            <button className="di-gift-report" type="button" onClick={() => setReporting(true)}>
              {t('gift.report')}
            </button>
          ) : null}
        </>
      )}
    </GiftPop>
  )
}

// /gifts: what you have sent, and whether it was opened or sent back.
export function GiftsSent({ book, now }) {
  usePrefs()
  const clock = now || new Date()
  const [list, setList] = useState(null)
  const [miss, setMiss] = useState('')

  useEffect(() => {
    let alive = true
    listSentGifts().then((out) => {
      if (!alive) return
      setList(out.rows)
      if (out.miss === 'out') setMiss(t('gift.needAccount'))
      else if (out.miss) setMiss(tMiss(out.miss))
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <BoardShell book={book} now={clock} title={t('gifts.title')} date={formatBoardDate(boardDate(clock, book.dayFoldHour))}>
      <section className="di-page di-set di-gift">
        <h2 className="di-page-title">{t('gifts.title')}</h2>
        {miss ? <p className="di-set-note">{miss}</p> : null}
        {list === null ? <p className="di-set-note">{t('family.loading')}</p> : null}
        {list && !list.length && !miss ? (
          <>
            <p className="di-set-note">{t('gifts.none')}</p>
            <div className="di-hang-actions">
              <button className="di-did di-did-small" type="button" onClick={() => goHash('/friends')}>
                {t('people.friends')}
              </button>
            </div>
          </>
        ) : null}
        <ul className="di-gift-list">
          {(list || []).map((row) => {
            const type = sentGiftType(row)
            const name = personName(row.person) || t('people.someone')
            return (
              <li key={row.id}>
                <button type="button" className="di-gift-row" onClick={() => goHash('/gift', { id: row.to_id })}>
                  <span className="di-gift-row-art">{tileChip(type, row.cheer_id)}</span>
                  <span className="di-gift-row-copy">
                    <strong>{t('gifts.to', { item: tileName(type, row.cheer_id), name })}</strong>
                    <em>
                      {sentGiftDate(row)} · {sentGiftStatus(row)}
                    </em>
                    {row.note ? <span>{row.note}</span> : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </BoardShell>
  )
}
