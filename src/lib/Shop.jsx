import { useState } from 'react'
import { previewSample } from './board-shelf.js'
import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { AccessoryChip, BuddyChip, BuddyHang, CheerChip, LookChip } from './Cosmetic.jsx'
import { accessoriesForSale } from './accessories.js'
import { AccessoryPreview } from './ShopAccessories.jsx'
import { activeLook } from './active-look.js'
import { CoinIcon, GemIcon } from './PurseIcons.jsx'
import { LookPreviewCard, ShopDoor, ShopPurse } from './shop-bits.jsx'
import { t } from './i18n.js'
import { frameText } from './frames.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import {
  liveCheers,
  liveLooks,
  shopBuddies,
  buddyText,
  cheerText,
  dropSlides,
  fireCheer,
  isGemLook,
  lookText,
  normalizePurse,
  shopTag,
} from './purse.js'

// buddy: who models an accessory, your buddy if one is on.
export function tileChip(type, id, buddy = '') {
  if (type === 'accessory') return <AccessoryChip id={id} buddyId={buddy || 'ant'} />
  if (type === 'look') return <LookChip id={id} />
  if (type === 'cheer') return <CheerChip id={id} stage={1} />
  // The web has no frame art yet; a gifted frame shows by name.
  if (type === 'frame') return null
  return <BuddyChip id={id} />
}

export function tileName(type, id) {
  if (type === 'accessory') return t(`accessory.${id}`)
  if (type === 'look') return t(lookText(id, 'name'))
  if (type === 'cheer') return t(cheerText(id, 'name'))
  if (type === 'frame') return t(frameText(id, 'name'))
  return t(buddyText(id, 'name'))
}

function PriceTag({ tag }) {
  if (tag.owned) return <em className="di-shop-tag is-owned">{t('shop.owned')}</em>
  const n = tag.gems || tag.coins
  if (!n) return null
  return (
    <em className="di-shop-tag">
      {tag.gems ? <GemIcon /> : <CoinIcon />}
      {n}
    </em>
  )
}

export function ShopTile({ type, item, purse, onTile }) {
  const name = tileName(type, item.id)
  return (
    <button
      className="di-shop-tile"
      type="button"
      aria-label={t('shop.see', { name })}
      onClick={() => onTile(type, item)}
    >
      <span className="di-shop-tile-chip">{tileChip(type, item.id, purse.buddyOn)}</span>
      <strong>{name}</strong>
      <PriceTag tag={shopTag(purse, type, item)} />
    </button>
  )
}

function slideHead(slide) {
  if (slide.kind === 'coming') {
    return {
      kicker: slide.days <= 1 ? t('shop.tomorrow') : t('shop.inDays', { n: slide.days }),
      title: t('shop.coming', { date: formatBoardDate(slide.date) }),
    }
  }
  if (slide.kind === 'drop') return { kicker: '', title: t('shop.dropOn', { date: formatBoardDate(slide.date) }) }
  return { kicker: '', title: t('shop.freshTitle') }
}

// The drop carousel: the Coming drop first, then recent drops. Scrolls sideways.
function DropCarousel({ slides, purse, onTile }) {
  const [at, setAt] = useState(0)
  if (!slides.length) return null
  // Slides sit a gap apart, so measure from each slide rather than the track width.
  function slideLeft(box, i) {
    return box.children[i].offsetLeft - box.children[0].offsetLeft
  }
  function onScroll(event) {
    const box = event.currentTarget
    let near = 0
    for (let i = 1; i < box.children.length; i += 1) {
      if (Math.abs(slideLeft(box, i) - box.scrollLeft) < Math.abs(slideLeft(box, near) - box.scrollLeft)) near = i
    }
    setAt(near)
  }
  function go(i) {
    const box = document.getElementById('di-drop-track')
    if (box) box.scrollTo({ left: slideLeft(box, i), behavior: 'smooth' })
  }
  return (
    <div className="di-drop-carousel">
      <div className="di-drop-track" id="di-drop-track" onScroll={onScroll}>
        {slides.map((slide, i) => {
          const head = slideHead(slide)
          return (
            <section
              key={`${slide.kind}-${slide.date}`}
              className={slide.kind === 'coming' ? 'di-drop-slide is-coming' : 'di-drop-slide'}
              aria-label={t('shop.slideN', { n: i + 1, total: slides.length })}
            >
              {head.kicker ? <p className="di-drop-kicker">{head.kicker}</p> : null}
              <h3 className="di-drop-title">{head.title}</h3>
              <div className="di-drop-grid">
                {slide.items.map(({ type, item }) => (
                  <ShopTile key={`${type}-${item.id}`} type={type} item={item} purse={purse} onTile={onTile} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
      {slides.length > 1 ? (
        <div className="di-drop-dots">
          {slides.map((slide, i) => (
            <button
              key={`dot-${slide.kind}-${slide.date}`}
              type="button"
              className={i === at ? 'di-drop-dot is-on' : 'di-drop-dot'}
              aria-label={t('shop.slideN', { n: i + 1, total: slides.length })}
              aria-current={i === at ? 'true' : undefined}
              onClick={() => go(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

// Every item of one kind, side-scrolling, not-owned first.
function KindRow({ type, list, cap, allLabel, onAll, purse, onTile }) {
  const sorted = [...list].sort(
    (a, b) => Number(shopTag(purse, type, a).owned) - Number(shopTag(purse, type, b).owned),
  )
  return (
    <div className="di-shop-row-kind">
      <div className="di-shop-promo-head">
        <p className="di-set-cap">{cap}</p>
        <button className="di-text di-shop-promo-all" type="button" onClick={onAll}>
          {allLabel}
        </button>
      </div>
      <div className="di-shop-rail">
        {sorted.map((item) => (
          <ShopTile key={item.id} type={type} item={item} purse={purse} onTile={onTile} />
        ))}
      </div>
    </div>
  )
}

export function Shop({ book, now }) {
  usePrefs()
  const clock = now || new Date()
  const purse = normalizePurse(book)
  const coat = activeLook(book)
  const [peekLook, setPeekLook] = useState('')
  const [peekBuddy, setPeekBuddy] = useState('')
  const [peekAcc, setPeekAcc] = useState('')
  const owned = purse.looks.length + purse.cheers.length + purse.buddies.length + purse.accessories.length
  const today = boardDate(clock, book.dayFoldHour)
  const previewLook = peekLook || coat

  function peekAt(type, item) {
    if (type !== 'accessory') setPeekAcc('')
    if (type === 'accessory') {
      setPeekLook('')
      setPeekBuddy('')
      setPeekAcc((prev) => (prev === item.id ? '' : item.id))
    } else if (type === 'look') {
      setPeekBuddy('')
      setPeekLook((prev) => (prev === item.id ? '' : item.id))
    } else if (type === 'cheer') {
      setPeekBuddy('')
      fireCheer(item.id, 1, previewLook, undefined, true)
    } else {
      setPeekLook('')
      setPeekBuddy((prev) => (prev === item.id ? '' : item.id))
    }
  }

  return (
    <BoardShell
      book={book}
      now={clock}
      title={t('shop.title')}
      date={formatBoardDate(today)}
      look={peekLook || undefined}
    >
      <section className="di-page di-shop di-set">
        <h2 className="di-page-title">{t('shop.title')}</h2>
        <ShopPurse purse={purse} />
        <p className="di-set-note">{t('shop.hubHint')}</p>

        <DropCarousel slides={dropSlides(today)} purse={purse} onTile={peekAt} />

        {peekLook && isGemLook(peekLook) ? <LookPreviewCard /> : null}

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

        <KindRow type="look" list={liveLooks()} cap={t('shop.looks')} allLabel={t('shop.allLooks')} onAll={() => goHash('/shop/looks')} purse={purse} onTile={peekAt} />
        <KindRow type="cheer" list={liveCheers().filter((item) => !item.free)} cap={t('shop.cheers')} allLabel={t('shop.allCheers')} onAll={() => goHash('/shop/cheers')} purse={purse} onTile={peekAt} />
        <KindRow type="buddy" list={shopBuddies().filter((item) => !item.free)} cap={t('shop.buddies')} allLabel={t('shop.allBuddies')} onAll={() => goHash('/shop/buddies')} purse={purse} onTile={peekAt} />
        {peekAcc ? <AccessoryPreview id={peekAcc} purse={purse} /> : null}
        <KindRow type="accessory" list={accessoriesForSale(today)} cap={t('shop.accessories')} allLabel={t('shop.allAccessories')} onAll={() => goHash('/shop/accessories')} purse={purse} onTile={peekAt} />

        <div className="di-set-card di-shop-doors">
          <ShopDoor
            preview={<GemIcon className="di-gem-icon di-gem-icon-door" />}
            title={t('gems.title')}
            note={t('shop.gemsDoor')}
            onClick={() => goHash('/gems')}
          />
          <ShopDoor
            preview={<LookChip id={purse.lookOn} />}
            title={t('shop.kit')}
            note={t('shop.kitDoor')}
            meta={t('shop.ownedN', { n: owned })}
            onClick={() => goHash('/kit')}
          />
        </div>
      </section>
    </BoardShell>
  )
}
