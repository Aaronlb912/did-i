import { useEffect } from 'react'
import { previewSample } from './board-shelf.js'
import { goHash } from '../site/hash.js'
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

// A miss stays on the row that was tapped, not below the whole list.
export const NO_MISS = { id: '', text: '' }

export function shopMiss(next) {
  if (!next?.miss) return ''
  if (next.missN != null) return t(next.miss, { n: next.missN })
  return t(next.miss)
}

export function isGemShort(next) {
  return next?.miss === 'shop.miss.needGems' || next?.miss === 'gems'
}

export function shortGemConfirm() {
  return {
    short: true,
    title: t('gems.shortTitle'),
    body: t('gems.shortBody'),
    goLabel: t('gems.shortGo'),
  }
}

export function GemShort({ open, onClose }) {
  return (
    <BuyConfirm
      confirm={open ? shortGemConfirm() : null}
      onClose={onClose}
      onGo={() => {
        onClose()
        goHash('/gems')
      }}
    />
  )
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
        {onAll ? (
          <button className="di-text di-shop-promo-all" type="button" onClick={onAll}>
            {allLabel}
          </button>
        ) : null}
      </div>
      <div className="di-set-card di-shop-promo-grid">{children}</div>
    </div>
  )
}

export function LookPreviewCard() {
  return (
    <div className="di-buddy-preview di-look-preview">
      <p className="di-set-cap">{t('shop.buddyPreview')}</p>
      <div className="di-buddy-preview-card di-face di-swipe">
        <p className="di-face-plate">{previewSample().tag}</p>
        <h2 className="di-question">{previewSample().question}</h2>
      </div>
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
        {confirm.short ? null : <p className="di-face-plate">{t('shop.buyKicker')}</p>}
        <h2 id="di-buy-title" className="di-buy-title">
          {confirm.title}
        </h2>
        <p className="di-detail-meta">{confirm.body}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={onGo}>
            {confirm.goLabel || t('shop.buy')}
          </button>
          <button className="di-key" type="button" onClick={onClose}>
            {t('settings.neverMind')}
          </button>
        </div>
      </div>
    </div>
  )
}
