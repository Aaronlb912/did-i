import { useState } from 'react'
import { BoardShell } from './BoardShell.jsx'
import { AccessoryChip, BuddyHang } from './Cosmetic.jsx'
import { buyAccessoryWithCoins } from './coin-shop.js'
import { ACCESSORY_SLOTS, accessoriesForSale, accessoryById } from './accessories.js'
import { NIGHT_COIN_CAP, normalizePurse, wearAccessory } from './purse.js'
import { BuyConfirm, ShopPurse, shopMiss } from './shop-bits.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

// Your buddy (or the ant) on a sample card, wearing what it has on plus `id`.
export function AccessoryPreview({ id, purse }) {
  const item = accessoryById(id)
  const worn = item ? { ...purse.worn, [item.slot]: id } : purse.worn
  return (
    <div className="di-buddy-preview">
      <div className="di-buddy-preview-card di-face di-swipe">
        <BuddyHang id={purse.buddyOn || 'ant'} worn={worn} />
        <p className="di-face-plate">{t('shop.buddyPreviewTag')}</p>
        <h2 className="di-question">{t('shop.buddyPreviewQ')}</h2>
      </div>
    </div>
  )
}

export function ShopAccessories({ book, onChange, now }) {
  usePrefs()
  const clock = now || new Date()
  const today = boardDate(clock, book.dayFoldHour)
  const purse = normalizePurse(book)
  const [peek, setPeek] = useState('')
  const [miss, setMiss] = useState({ id: '', text: '' })
  const [confirm, setConfirm] = useState(null)
  const buddy = purse.buddyOn || 'ant'
  const forSale = accessoriesForSale(today)
  const [slotPick, setSlotPick] = useState('')
  const [notOwned, setNotOwned] = useState(false)
  const count = (s) => forSale.filter((item) => item.slot === s).length
  const shown = forSale.filter(
    (item) => (!slotPick || item.slot === slotPick) && (!notOwned || !purse.accessories.includes(item.id)),
  )

  function take(next, id) {
    setMiss({ id, text: shopMiss(next) })
    setConfirm(null)
    if (!next.miss) onChange(next.book)
  }

  function act(item) {
    setPeek(item.id)
    if (purse.accessories.includes(item.id)) {
      take(wearAccessory(book, item.id), item.id)
      return
    }
    if (purse.coins < item.coins) {
      const short = item.coins - purse.coins
      setMiss({ id: item.id, text: t('shop.earnCoins', { coins: short, nights: Math.ceil(short / NIGHT_COIN_CAP) }) })
      return
    }
    setMiss({ id: '', text: '' })
    setConfirm({
      title: t(`accessory.${item.id}`),
      body: t('shop.buyAccessoryBody', { cost: t('shop.coins', { n: item.coins }) }),
      go: async () => take(await buyAccessoryWithCoins(book, item.id), item.id),
    })
  }

  function row(item) {
    const have = purse.accessories.includes(item.id)
    const on = purse.worn[item.slot] === item.id
    const name = t(`accessory.${item.id}`)
    return (
      <div className="di-shop-row" key={item.id}>
        <button
          className={peek === item.id ? 'di-preview is-on' : 'di-preview'}
          type="button"
          aria-label={t('shop.see', { name })}
          onClick={() => setPeek(item.id)}
        >
          <AccessoryChip id={item.id} buddyId={buddy} />
        </button>
        <span className="di-shop-copy">
          <strong>{name}</strong>
          <em>{have ? (on ? t('shop.on') : t('shop.owned')) : t('shop.coins', { n: item.coins })}</em>
          {miss.id === item.id && miss.text ? (
            <em className="di-shop-miss" role="alert">
              {miss.text}
            </em>
          ) : null}
        </span>
        <button className={on ? 'di-did di-did-small' : 'di-key'} type="button" onClick={() => act(item)}>
          {on ? t('shop.takeOff') : have ? t('shop.use') : t('shop.buy')}
        </button>
      </div>
    )
  }

  return (
    <BoardShell book={book} now={clock} title={t('shop.accessories')} date={formatBoardDate(today)}>
      <section className="di-page di-shop di-set">
        <h2 className="di-page-title">{t('shop.accessories')}</h2>
        <ShopPurse purse={purse} />
        <p className="di-set-note">{t('shop.accessoriesHint')}</p>

        {/* Sticks to the top while the list scrolls, so the outfit stays in view. */}
        <div className="di-acc-stick">
          <AccessoryPreview id={peek} purse={purse} />
          {/* The list grows every drop: pick one spot, or hide what you own. */}
          <div className="di-acc-filters" role="group" aria-label={t('shop.accessories')}>
            <button type="button" className={!slotPick ? 'di-acc-filter is-on' : 'di-acc-filter'} aria-pressed={!slotPick} onClick={() => setSlotPick('')}>
              {t('shop.accAll', { n: forSale.length })}
            </button>
            {ACCESSORY_SLOTS.filter((s) => count(s)).map((s) => (
              <button
                key={s}
                type="button"
                className={slotPick === s ? 'di-acc-filter is-on' : 'di-acc-filter'}
                aria-pressed={slotPick === s}
                onClick={() => setSlotPick(slotPick === s ? '' : s)}
              >
                {t(`shop.slot.${s}`)} {count(s)}
              </button>
            ))}
            {purse.accessories.length ? (
              <button type="button" className={notOwned ? 'di-acc-filter is-on' : 'di-acc-filter'} aria-pressed={notOwned} onClick={() => setNotOwned((v) => !v)}>
                {t('shop.accNotOwned')}
              </button>
            ) : null}
          </div>
        </div>

        {!shown.length ? <p className="di-set-note">{t('shop.accNoneLeft')}</p> : null}

        {(slotPick ? [slotPick] : ACCESSORY_SLOTS).map((slot) => {
          const list = shown.filter((item) => item.slot === slot)
          if (!list.length) return null
          return (
            <div key={slot}>
              <p className="di-set-cap">{t(`shop.slot.${slot}`)}</p>
              <div className="di-set-card di-shop-card">{list.map(row)}</div>
            </div>
          )
        })}
      </section>
      <BuyConfirm
        confirm={confirm}
        onClose={() => setConfirm(null)}
        onGo={() => {
          const go = confirm?.go
          setConfirm(null)
          if (typeof go === 'function') go()
        }}
      />
    </BoardShell>
  )
}
