import { useEffect } from 'react'
import { useBackDismiss } from '../site/nav.js'
import { PurseBits } from './PurseIcons.jsx'
import { t } from './i18n.js'
import { useReduceMotion } from './useReduceMotion.js'

export function coinLine(n) {
  return n === 1 ? t('shop.coinOne') : t('shop.coins', { n })
}

export function gemLine(n) {
  return n === 1 ? t('shop.gemOne') : t('shop.gems', { n })
}

export function shopMiss(next) {
  if (!next?.miss) return ''
  if (next.missN != null) return t(next.miss, { n: next.missN })
  return t(next.miss)
}

export function ShopPurse({ purse }) {
  return (
    <p className="di-shop-purse">
      <PurseBits purse={purse} gemsLink />
    </p>
  )
}

export function ShopPromoTile({ chip, name, note, onClick, ariaLabel }) {
  return (
    <button className="di-shop-promo-tile" type="button" onClick={onClick} aria-label={ariaLabel}>
      <span className="di-shop-promo-chip">{chip}</span>
      <strong>{name}</strong>
      {note ? <em>{note}</em> : null}
    </button>
  )
}

export function ShopPromoShelf({ cap, allLabel, onAll, children }) {
  return (
    <div className="di-shop-promo-shelf">
      <div className="di-shop-promo-head">
        <p className="di-set-cap">{cap}</p>
        <button className="di-text di-shop-promo-all" type="button" onClick={onAll}>
          {allLabel}
        </button>
      </div>
      <div className="di-set-card di-shop-promo-grid">{children}</div>
    </div>
  )
}

export function ShopDoor({ preview, title, note, meta, onClick }) {
  return (
    <button className="di-shop-door" type="button" onClick={onClick}>
      <span className="di-shop-door-chip">{preview}</span>
      <span className="di-shop-copy">
        <strong>{title}</strong>
        {note ? <em>{note}</em> : null}
      </span>
      {meta ? <span className="di-shop-door-meta">{meta}</span> : null}
      <i className="di-set-chev" aria-hidden="true" />
    </button>
  )
}

export function BuyConfirm({ confirm, onClose, onGo }) {
  const still = useReduceMotion()
  useBackDismiss(Boolean(confirm), onClose)

  useEffect(() => {
    if (!confirm) return undefined
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirm, onClose])

  if (!confirm) return null

  return (
    <div className="di-buy-veil" role="presentation" onClick={onClose}>
      <div
        className={still ? 'di-buy-pop is-still' : 'di-buy-pop'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="di-buy-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="di-face-plate">{t('shop.buyKicker')}</p>
        <h2 id="di-buy-title" className="di-buy-title">
          {confirm.title}
        </h2>
        <p className="di-detail-meta">{confirm.body}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={onGo}>
            {t('shop.buy')}
          </button>
          <button className="di-key" type="button" onClick={onClose}>
            {t('settings.neverMind')}
          </button>
        </div>
      </div>
    </div>
  )
}
