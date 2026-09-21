import { useState } from 'react'
import { BoardShell } from './BoardShell.jsx'
import { LookChip } from './Cosmetic.jsx'
import { LOOKS, buyLook, lookText, normalizePurse } from './purse.js'
import { BuyConfirm, ShopPurse, coinLine, gemLine, shopMiss } from './shop-bits.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

const COIN_LOOKS = LOOKS.filter((item) => item.coins > 0)
const GEM_LOOKS = LOOKS.filter((item) => item.gems > 0)

export function ShopLooks({ book, onChange, now }) {
  usePrefs()
  const clock = now || new Date()
  const purse = normalizePurse(book)
  const [miss, setMiss] = useState('')
  const [peekLook, setPeekLook] = useState('')
  const [confirm, setConfirm] = useState(null)

  function take(next) {
    setMiss(shopMiss(next))
    if (!next.miss) {
      setPeekLook('')
      setConfirm(null)
      onChange(next.book)
    }
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
        </span>
        <button
          className={on ? 'di-did di-did-small' : 'di-key'}
          type="button"
          disabled={on}
          onClick={() => {
            if (have) {
              take(buyLook(book, item.id))
              return
            }
            setMiss('')
            setConfirm({
              title: t(lookText(item.id, 'name')),
              body: t('shop.buyLookBody', { cost }),
              go: () => take(buyLook(book, item.id)),
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
        <p className="di-set-note">{t('shop.looksHint')}</p>

        <p className="di-set-cap">{t('shop.looksCoins')}</p>
        <div className="di-set-card di-shop-card">{COIN_LOOKS.map(lookRow)}</div>

        <p className="di-set-cap">{t('shop.looksGems')}</p>
        <div className="di-set-card di-shop-card">{GEM_LOOKS.map(lookRow)}</div>

        {miss ? (
          <p className="di-miss" role="alert">
            {miss}
          </p>
        ) : null}
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
