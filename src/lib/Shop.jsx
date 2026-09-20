import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { CheerChip, LookChip } from './Cosmetic.jsx'
import { activeLook } from './dit-board.js'
import { GemIcon } from './PurseIcons.jsx'
import {
  ShopDoor,
  ShopPromoShelf,
  ShopPromoTile,
  ShopPurse,
  coinLine,
  gemLine,
} from './shop-bits.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { cheerText, fireCheer, lookText, normalizePurse, recentCheers, recentLooks } from './purse.js'

export function Shop({ book, now }) {
  usePrefs()
  const clock = now || new Date()
  const purse = normalizePurse(book)
  const coat = activeLook(book)
  const [peekLook, setPeekLook] = useState('')
  const lookCount = purse.looks.length
  const cheerCount = purse.cheers.length
  const promoLooks = recentLooks(2)
  const promoCheers = recentCheers(2)
  const previewLook = peekLook || coat

  return (
    <BoardShell
      book={book}
      now={clock}
      title={t('shop.title')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
      look={peekLook || undefined}
    >
      <section className="di-page di-shop di-set">
        <h2 className="di-page-title">{t('shop.title')}</h2>
        <ShopPurse purse={purse} />
        <p className="di-set-note">{t('shop.hubHint')}</p>

        <div className="di-shop-promo">
          <ShopPromoShelf
            cap={t('shop.promoLooks')}
            allLabel={t('shop.allLooks')}
            onAll={() => goHash('/shop/looks')}
          >
            {promoLooks.map((item) => {
              const have = purse.looks.includes(item.id)
              const cost = item.gems ? gemLine(item.gems) : coinLine(item.coins)
              return (
                <ShopPromoTile
                  key={item.id}
                  chip={<LookChip id={item.id} />}
                  name={t(lookText(item.id, 'name'))}
                  note={have ? t(lookText(item.id, 'line')) : cost}
                  ariaLabel={t('shop.see', { name: t(lookText(item.id, 'name')) })}
                  onClick={() => setPeekLook(item.id)}
                />
              )
            })}
          </ShopPromoShelf>

          <ShopPromoShelf
            cap={t('shop.promoCheers')}
            allLabel={t('shop.allCheers')}
            onAll={() => goHash('/shop/cheers')}
          >
            {promoCheers.map((item) => {
              const have = purse.cheers.includes(item.id)
              const cost = item.gems ? gemLine(item.gems) : t('shop.owned')
              return (
                <ShopPromoTile
                  key={item.id}
                  chip={<CheerChip id={item.id} stage={1} />}
                  name={t(cheerText(item.id, 'name'))}
                  note={have ? t(cheerText(item.id, 'line')) : cost}
                  ariaLabel={t('shop.see', { name: t(cheerText(item.id, 'name')) })}
                  onClick={() => fireCheer(item.id, 1, previewLook)}
                />
              )
            })}
          </ShopPromoShelf>
        </div>

        <div className="di-set-card di-shop-doors">
          <ShopDoor
            preview={<LookChip id={purse.lookOn} />}
            title={t('shop.looks')}
            note={t('shop.looksDoor')}
            meta={t('shop.ownedN', { n: lookCount })}
            onClick={() => goHash('/shop/looks')}
          />
          <ShopDoor
            preview={<CheerChip id={purse.cheerOn} stage={1} />}
            title={t('shop.cheers')}
            note={t('shop.cheersDoor')}
            meta={t('shop.ownedN', { n: cheerCount })}
            onClick={() => goHash('/shop/cheers')}
          />
          <ShopDoor
            preview={<GemIcon className="di-gem-icon di-gem-icon-door" />}
            title={t('gems.title')}
            note={t('shop.gemsDoor')}
            onClick={() => goHash('/gems')}
          />
          <ShopDoor
            preview={<LookChip id="ink" />}
            title={t('shop.kit')}
            note={t('shop.kitDoor')}
            onClick={() => goHash('/kit')}
          />
        </div>
      </section>
    </BoardShell>
  )
}
