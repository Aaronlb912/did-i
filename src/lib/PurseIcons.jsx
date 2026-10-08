import { goHash } from '../site/hash.js'
import { useState } from 'react'
import { t } from './i18n.js'
import { CoinsHow } from './CoinsHow.jsx'

export function CoinIcon({ className = 'di-coin-icon' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8.5" r="6.2" className="di-coin-shadow" />
      <circle cx="8" cy="7.8" r="6.2" className="di-coin-face" />
      <ellipse cx="8" cy="6.1" rx="3.8" ry="1.05" className="di-coin-shine" />
      <path
        d="M8 4.4c-1.6 0-2.9.55-2.9 1.25S6.4 6.9 8 6.9s2.9-.55 2.9-1.25S9.6 4.4 8 4.4zm0 5.1c-1.6 0-2.9.55-2.9 1.25S6.4 10.9 8 10.9s2.9-.55 2.9-1.25S9.6 9.5 8 9.5z"
        className="di-coin-rim"
      />
    </svg>
  )
}

export function GemIcon({ className = 'di-gem-icon' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.6 14.2 6.2 8 14.4 1.8 6.2 8 1.6z" className="di-gem-body" />
      <path d="M8 1.6 1.8 6.2 8 8.2 14.2 6.2 8 1.6z" className="di-gem-top" />
      <path d="M8 8.2 1.8 6.2 8 14.4 14.2 6.2 8 8.2z" className="di-gem-base" />
      <path d="M8 1.6v6.6M1.8 6.2h12.4" className="di-gem-cut" />
    </svg>
  )
}

export function PurseBits({ purse, gemsLink = false, className = '' }) {
  const coins = Math.max(0, Math.floor(Number(purse?.coins) || 0))
  const gems = Math.max(0, Math.floor(Number(purse?.gems) || 0))
  const root = className ? `di-purse-bits ${className}` : 'di-purse-bits'
  const [how, setHow] = useState(false)

  const gemBit = gemsLink ? (
    <a className="di-purse-bit di-purse-gem-link" href="#/gems" onClick={() => goHash('/gems')}>
      <GemIcon />
      <span className="di-purse-n">{gems}</span>
    </a>
  ) : (
    <span className="di-purse-bit">
      <GemIcon />
      <span className="di-purse-n">{gems}</span>
    </span>
  )

  return (
    <span className={root} aria-label={t('purse.aria', { coins, gems })}>
      {gemsLink ? (
        <button className="di-purse-bit di-purse-coin-link" type="button" aria-label={t('coins.tapAria')} onClick={() => setHow(true)}>
          <CoinIcon />
          <span className="di-purse-n">{coins}</span>
        </button>
      ) : (
        <span className="di-purse-bit">
          <CoinIcon />
          <span className="di-purse-n">{coins}</span>
        </span>
      )}
      {how ? <CoinsHow onClose={() => setHow(false)} /> : null}
      <span className="di-purse-sep" aria-hidden="true">
        ·
      </span>
      {gemBit}
    </span>
  )
}
