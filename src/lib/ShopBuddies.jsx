import { useState } from 'react'
import { previewSample } from './board-shelf.js'
import { BoardShell } from './BoardShell.jsx'
import { BuddyChip, BuddyHang } from './Cosmetic.jsx'
import { buyWithGems } from './coin-shop.js'
import { BUDDIES, BUDDY_GEMS, buddyText, buyBuddy, normalizePurse } from './purse.js'
import { goHash } from '../site/hash.js'
import { BuyConfirm, ShopPurse, gemLine, isGemShort, shopMiss, shortGemConfirm } from './shop-bits.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function ShopBuddies({ book, onChange, now }) {
  usePrefs()
  const clock = now || new Date()
  const purse = normalizePurse(book)
  const [miss, setMiss] = useState('')
  const [peekBuddy, setPeekBuddy] = useState('')
  const [confirm, setConfirm] = useState(null)

  function take(next) {
    if (isGemShort(next)) {
      setMiss('')
      setConfirm(shortGemConfirm())
      return
    }
    setMiss(shopMiss(next))
    if (!next.miss) {
      setPeekBuddy('')
      setConfirm(null)
      onChange(next.book)
    }
  }

  function buddyRow(item) {
    const have = purse.buddies.includes(item.id)
    const on = purse.buddyOn === item.id
    const cost = gemLine(item.gems)
    return (
      <div className="di-shop-row" key={item.id}>
        <button
          className={peekBuddy === item.id ? 'di-preview is-on' : 'di-preview'}
          type="button"
          aria-label={t('shop.see', { name: t(buddyText(item.id, 'name')) })}
          onClick={() => setPeekBuddy(item.id)}
        >
          <BuddyChip id={item.id} />
        </button>
        <span className="di-shop-copy">
          <strong>{t(buddyText(item.id, 'name'))}</strong>
        </span>
        <button
          className={on ? 'di-did di-did-small' : 'di-key'}
          type="button"
          disabled={on}
          onClick={() => {
            if (have) {
              take(buyBuddy(book, item.id))
              return
            }
            if (purse.gems < item.gems) {
              setConfirm(shortGemConfirm())
              return
            }
            setMiss('')
            setConfirm({
              title: t(buddyText(item.id, 'name')),
              body: t('shop.buyBuddyBody', { cost }),
              go: async () => take(await buyWithGems(book, 'buddy', item.id)),
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
      title={t('shop.buddies')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-shop di-set">
        <h2 className="di-page-title">{t('shop.buddies')}</h2>
        <ShopPurse purse={purse} />
        <p className="di-set-note">{t('shop.buddiesHint', { n: BUDDY_GEMS })}</p>

        {peekBuddy ? (
          <div className="di-buddy-preview">
            <p className="di-set-cap">{t('shop.buddyPreview')}</p>
            <div className="di-buddy-preview-card di-face di-swipe">
              <BuddyHang id={peekBuddy} />
              <p className="di-face-plate">{previewSample().tag}</p>
              <h2 className="di-question">{previewSample().question}</h2>
            </div>
          </div>
        ) : null}

        <div className="di-set-card di-shop-card">{BUDDIES.map(buddyRow)}</div>

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
