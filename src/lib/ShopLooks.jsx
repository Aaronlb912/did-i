import { useState } from 'react'
import { BoardShell } from './BoardShell.jsx'
import { LookChip } from './Cosmetic.jsx'
import { buyLookWithCoins } from './coin-shop.js'
import { LOOK_COIN_PRICE, LOOK_GEM_PRICE, LOOKS, buyLook, isGemLook, lookText, normalizePurse } from './purse.js'
import { goHash } from '../site/hash.js'
import { BuyConfirm, LookPreviewCard, NO_MISS, ShopPurse, coinLine, gemLine, isGemShort, shopMiss, shortGemConfirm } from './shop-bits.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

const COIN_LOOKS = LOOKS.filter((item) => item.coins > 0)
const GEM_LOOKS = LOOKS.filter((item) => item.gems > 0)

export function ShopLooks({ book, onChange, now }) {
  usePrefs()
  const clock = now || new Date()
  const purse = normalizePurse(book)
  const [miss, setMiss] = useState(NO_MISS)
  const [peekLook, setPeekLook] = useState('')
  const [confirm, setConfirm] = useState(null)

  function take(next, id) {
    if (isGemShort(next)) {
      setMiss(NO_MISS)
      setConfirm(shortGemConfirm())
      return
    }
    setMiss({ id, text: shopMiss(next) })
    if (!next.miss) {
      setPeekLook('')
      setConfirm(null)
      onChange(next.book)
    }
  }

  async function buyRow(item) {
    const next = item.gems > 0 ? buyLook(book, item.id) : await buyLookWithCoins(book, item.id)
    take(next, item.id)
  }

  function lookRow(item) {
    const have = purse.looks.includes(item.id)
    const on = purse.lookOn === item.id
    const cost = item.gems ? gemLine(item.gems) : coinLine(item.coins)
    return (
      <div className="di-shop-row" key={item.id}>
        <button
          className={peekLook === item.id ? 'di-preview is-on' : 'di-preview'}
          type="button"
          aria-label={t('shop.see', { name: t(lookText(item.id, 'name')) })}
          onClick={() => setPeekLook(peekLook === item.id ? '' : item.id)}
        >
          <LookChip id={item.id} />
        </button>
        <span className="di-shop-copy">
          <strong>{t(lookText(item.id, 'name'))}</strong>
          {miss.id === item.id && miss.text ? (
            <em className="di-shop-miss" role="alert">
              {miss.text}
            </em>
          ) : null}
        </span>
        <button
          className={on ? 'di-did di-did-small' : 'di-key'}
          type="button"
          disabled={on}
          onClick={() => {
            if (have) {
              take(buyLook(book, item.id), item.id)
              return
            }
            if (item.gems > 0 && purse.gems < item.gems) {
              setConfirm(shortGemConfirm())
              return
            }
            setMiss(NO_MISS)
            setConfirm({
              title: t(lookText(item.id, 'name')),
              body: t('shop.buyLookBody', { cost }),
              go: () => buyRow(item),
            })
          }}
        >
          {on ? t('shop.on') : have ? t('shop.use') : t('shop.buy')}
        </button>
      </div>
    )
  }

  return (
    <BoardShell
      book={book}
      now={clock}
      title={t('shop.looks')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
      look={peekLook || undefined}
    >
      <section className="di-page di-shop di-set">
        <h2 className="di-page-title">{t('shop.looks')}</h2>
        <ShopPurse purse={purse} />
        <p className="di-set-note">{t('shop.looksHint', { coins: LOOK_COIN_PRICE, gems: LOOK_GEM_PRICE })}</p>

        {peekLook && isGemLook(peekLook) ? <LookPreviewCard /> : null}

        <p className="di-set-cap">{t('shop.looksCoins')}</p>
        <div className="di-set-card di-shop-card">{COIN_LOOKS.map(lookRow)}</div>

        <p className="di-set-cap">{t('shop.looksGems')}</p>
        <div className="di-set-card di-shop-card">{GEM_LOOKS.map(lookRow)}</div>

      </section>
      <BuyConfirm
        confirm={confirm}
        onClose={() => setConfirm(null)}
        onGo={() => {
          if (confirm?.short) {
            setConfirm(null)
            goHash('/gems')
            return
          }
          const go = confirm?.go
          setConfirm(null)
          if (typeof go === 'function') go()
        }}
      />
    </BoardShell>
  )
}
