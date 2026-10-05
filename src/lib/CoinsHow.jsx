import { useEffect, useState } from 'react'
import { coinNightLine, coinNights, gemThisWeek, mergeCoinNights } from './coin-history.js'
import { readShelf } from './board-shelf.js'
import { t } from './i18n.js'
import { COIN_RULES } from './night-why.js'
import { formatBoardDate } from './recurrence.js'
import { accountSessionOn } from './session-id.js'
import { readCoinHistory } from './wallet.js'
import { goHash } from '../site/hash.js'

// "How coins work": the rules, then recent nights and this week's gem.
export function CoinsHow({ onClose }) {
  const [hist, setHist] = useState(() => {
    const shelf = readShelf()
    return { nights: coinNights(shelf), gemWeek: shelf?.gemWeek || '', fold: shelf?.boards?.[0]?.dayFoldHour ?? 0 }
  })

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Signed in, the server's record wins. Keep the local one if it fails.
  useEffect(() => {
    if (!accountSessionOn()) return undefined
    let live = true
    readCoinHistory()
      .then((next) => {
        if (live && next) setHist((was) => ({ ...was, nights: mergeCoinNights(coinNights(readShelf()), next.nights), gemWeek: next.gemWeek }))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  return (
    <div className="di-buy-veil" role="presentation" onClick={onClose}>
      <div className="di-buy-pop" role="dialog" aria-modal="true" aria-labelledby="di-coins-how" onClick={(event) => event.stopPropagation()}>
        <h2 id="di-coins-how" className="di-buy-title">{t('coins.howTitle')}</h2>
        {COIN_RULES.map((key) => (
          <p className="di-detail-meta" key={key}>{t(key)}</p>
        ))}
        <p className="di-detail-meta"><strong>{t('coins.recent')}</strong></p>
        {hist.nights.length ? (
          hist.nights.map((row) => (
            <p className="di-detail-meta" key={row.night}>{coinNightLine(row, formatBoardDate(row.night))}</p>
          ))
        ) : (
          <p className="di-detail-meta">{t('coins.none')}</p>
        )}
        <p className="di-detail-meta">{gemThisWeek(hist.gemWeek, new Date(), hist.fold) ? t('coins.gemYes') : t('coins.gemNot')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => { onClose(); goHash('/shop') }}>{t('shop.title')}</button>
          <button className="di-key" type="button" onClick={onClose}>{t('cal.close')}</button>
        </div>
      </div>
    </div>
  )
}
