import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { BuddyChip, BuddyHang, CheerChip, LookChip } from './Cosmetic.jsx'
import { activeLook } from './dit-board.js'
import { GemIcon } from './PurseIcons.jsx'
import { ShopDoor, ShopPromoShelf, ShopPromoTile, ShopPurse } from './shop-bits.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import {
  BUDDIES,
  buddyText,
  cheerText,
  fireCheer,
  lookText,
  normalizePurse,
  recentBuddies,
  recentCheers,
  recentLooks,
} from './purse.js'

export function Shop({ book, now }) {
  usePrefs()
  const clock = now || new Date()
  const purse = normalizePurse(book)
  const coat = activeLook(book)
  const [peekLook, setPeekLook] = useState('')
  const [peekBuddy, setPeekBuddy] = useState('')
  const lookCount = purse.looks.length
  const cheerCount = purse.cheers.length
  const buddyCount = purse.buddies.length
  const promoLooks = recentLooks(2)
  const promoCheers = recentCheers(2)
  const promoBuddies = recentBuddies(2)
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
            {promoLooks.map((item) => (
              <ShopPromoTile
                key={item.id}
                chip={<LookChip id={item.id} />}
                name={t(lookText(item.id, 'name'))}
                ariaLabel={t('shop.see', { name: t(lookText(item.id, 'name')) })}
                onClick={() => {
                  setPeekBuddy('')
                  setPeekLook((prev) => (prev === item.id ? '' : item.id))
                }}
              />
            ))}
          </ShopPromoShelf>

          <ShopPromoShelf
            cap={t('shop.promoCheers')}
            allLabel={t('shop.allCheers')}
            onAll={() => goHash('/shop/cheers')}
          >
            {promoCheers.map((item) => (
              <ShopPromoTile
                key={item.id}
                chip={<CheerChip id={item.id} stage={1} />}
                name={t(cheerText(item.id, 'name'))}
                ariaLabel={t('shop.see', { name: t(cheerText(item.id, 'name')) })}
                onClick={() => {
                  setPeekBuddy('')
                  fireCheer(item.id, 1, previewLook)
                }}
              />
            ))}
          </ShopPromoShelf>

          <ShopPromoShelf
            cap={t('shop.promoBuddies')}
            allLabel={t('shop.allBuddies')}
            onAll={() => goHash('/shop/buddies')}
          >
            {promoBuddies.map((item) => (
              <ShopPromoTile
                key={item.id}
                chip={<BuddyChip id={item.id} />}
                name={t(buddyText(item.id, 'name'))}
                ariaLabel={t('shop.see', { name: t(buddyText(item.id, 'name')) })}
                onClick={() => {
                  setPeekLook('')
                  setPeekBuddy(item.id)
                }}
              />
            ))}
          </ShopPromoShelf>
        </div>

        {peekBuddy ? (
          <div className="di-buddy-preview">
            <p className="di-set-cap">{t('shop.buddyPreview')}</p>
            <div className="di-buddy-preview-card di-face di-swipe">
              <BuddyHang id={peekBuddy} />
              <p className="di-face-plate">{t('shop.buddyPreviewTag')}</p>
              <h2 className="di-question">{t('shop.buddyPreviewQ')}</h2>
            </div>
          </div>
        ) : null}

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
            preview={<BuddyChip id={purse.buddyOn || BUDDIES[0].id} />}
            title={t('shop.buddies')}
            note={t('shop.buddiesDoor')}
            meta={t('shop.ownedN', { n: buddyCount })}
            onClick={() => goHash('/shop/buddies')}
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
