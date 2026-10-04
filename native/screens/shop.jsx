import Constants from 'expo-constants'
import { FadeScroll } from '../components/FadeScroll.jsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Reanimated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated'
import { startGemPurchase } from '../../src/lib/gem-buy.js'
import { isReactNative } from '../../src/lib/env.js'
import { initGemIap, iapReady, storePrice } from '../../src/lib/gem-iap.js'
import { GEM_PACKS, packPriceLabel } from '../../src/lib/gem-packs.js'
import { activeLook } from '../../src/lib/active-look.js'
import { holdFor } from '../../src/lib/cheer-pops.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { feelTap } from '../../src/lib/native.js'
import {
  BUDDIES,
  BUDDY_GEMS,
  buyCheerStage,
  buyLook,
  CHEERS,
  OWNABLE_CHEERS,
  CHEER_GEMS,
  CHEER_STAGE_COIN,
  CHEER_STAGE_COINS,
  CHEER_STAGE_MAX,
  cheerPlayOf,
  cheerStageOf,
  cheerText,
  buddyText,
  LOOK_COIN_PRICE,
  LOOK_GEM_PRICE,
  LOOKS,
  lookText,
  fireCheer,
  nextCheerStage,
  normalizePurse,
  dropSlides,
  giftItems,
  shopTag,
  stampPurse,
  wearGift,
  wearBuddy,
  wearCheer,
  wearCheerStage,
  wearAccessory,
  NIGHT_COIN_CAP,
} from '../../src/lib/purse.js'
import { useTheme } from '../../src/lib/prefs.js'
import {
  AccessoryChip,
  BuddyChip,
  BuddyHang,
  CheerChip,
  LookChip,
} from '../components/Cosmetic.jsx'
import { BoardShell } from '../components/BoardShell.jsx'
import { AppTextInput, DidButton, KeyButton, Meta } from '../components/ui.jsx'
import { useAccount } from '../../src/lib/account.js'
import { listSentGifts, personName, readKnownPerson, reportGift, sendGift } from '../../src/lib/people.js'
import { giftTab, sentGiftDate, sentGiftStatus, sentGiftType } from '../../src/lib/gift-history.js'
import { doneGift, nextGift, onGift } from '../../src/lib/gift-inbox.js'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import {
  buyAccessoryWithCoins,
  buyCheerStageWithCoins,
  buyLookWithCoins,
  buyWithGems,
} from '../../src/lib/coin-shop.js'
import { goHash } from '../navigation/hash.js'
import { ACCESSORIES, ACCESSORY_SLOTS, accessoriesForSale, accessoryById } from '../../src/lib/accessories.js'
import { confirmBuy, offerMoreGems, publishSheet } from '../components/SheetHost.jsx'
import { CoinIcon, GemFaceMark, GemIcon, GemStack } from '../components/PurseIcons.jsx'
import { gemGlowHostStyle, gemPanelStyle } from '../lib/gem-look-tone.js'
import { KitSegment } from '../components/KitSegment.jsx'
import { fonts } from '../theme.js'
import { useLookColors } from '../hooks/useHallColors.js'
import { flyToKit, kitArtRef, kitCount } from '../lib/kit-flight.js'
import { launchFlight } from '../components/FlyHost.jsx'
import { RollNumber } from '../components/RollNumber.jsx'

const COIN_LOOKS = LOOKS.filter((item) => item.coins > 0)
const GEM_LOOKS = LOOKS.filter((item) => item.gems > 0)
const STAGES = [1, 2, 3, 4, 5]

// The three packs worth a tall card; the rest stay a compact list.
const FEATURED_GEM_IDS = ['gems_10', 'gems_25', 'gems_50']
const BEST_VALUE_GEM_ID = 'gems_25'
const FEATURED_GEM_PACKS = FEATURED_GEM_IDS.map((id) => GEM_PACKS.find((pack) => pack.id === id)).filter(Boolean)
const COMPACT_GEM_PACKS = GEM_PACKS.filter((pack) => !FEATURED_GEM_IDS.includes(pack.id))

function shellDate(book) {
  return formatBoardDate(boardDate(new Date(), book.dayFoldHour))
}

function shopMiss(next) {
  if (!next?.miss) return ''
  if (next.missN != null) return t(next.miss, { n: next.missN })
  return t(next.miss)
}

// A miss stays on the row that was tapped, not below the whole list.
const NO_MISS = { id: '', text: '' }

function shortOnGems(next, colors) {
  if (next?.miss !== 'shop.miss.needGems' && next?.miss !== 'gems') return false
  offerMoreGems(colors)
  return true
}

function wearLook(book, id) {
  return buyLook(book, id)
}

function useShopColors(book, peekLook = '') {
  return useLookColors(peekLook || activeLook(book), !peekLook)
}

// A press-in preview waits this long, so a touch that starts a scroll does
// not set it off.
const PRESS_IN_DELAY = 90
// Pressing in (or hovering) already played it, so the tap that follows does not.
const PRESS_DEDUPE_MS = 900

function PreviewButton({ onPress, pressIn = false, selected, colors, children }) {
  const fired = useRef(0)
  const early = () => {
    fired.current = Date.now()
    onPress?.()
  }
  return (
    <Pressable
      onPress={() => {
        if (pressIn && Date.now() - fired.current < PRESS_DEDUPE_MS) return
        onPress?.()
      }}
      onPressIn={pressIn ? early : undefined}
      onHoverIn={pressIn ? early : undefined}
      unstable_pressDelay={pressIn ? PRESS_IN_DELAY : undefined}
      accessibilityRole="button"
      style={[
        styles.previewBtn,
        {
          borderColor: selected ? colors.onDeep : colors.line,
          backgroundColor: colors.panel2,
        },
      ]}
    >
      {children}
    </Pressable>
  )
}

function BuddyPreviewCard({ id, colors }) {
  return (
    <View style={styles.buddyPreview}>
      <Cap colors={colors}>{t('shop.buddyPreview')}</Cap>
      <View style={[styles.buddyPreviewCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <BuddyHang id={id} alive />
        <Text style={[styles.buddyPreviewTag, { color: colors.on }]}>{t('shop.buddyPreviewTag')}</Text>
        <Text style={[styles.buddyPreviewQ, { color: colors.ink }]}>{t('shop.buddyPreviewQ')}</Text>
      </View>
    </View>
  )
}

// A look shown in its own colours, not the page's ambient ones, so it reads
// true whether the page is peeking a coin look or a gem look.
function LookPreviewCard({ id }) {
  const theme = useTheme()
  const colors = useLookColors(id)
  const gemCard = gemPanelStyle(id, theme)
  return (
    <View style={styles.buddyPreview}>
      <Cap colors={colors}>{t('shop.buddyPreview')}</Cap>
      <View style={[styles.buddyPreviewGlow, gemGlowHostStyle(id, theme)]}>
        <View
          style={[
            styles.buddyPreviewCard,
            styles.buddyPreviewCardGem,
            { backgroundColor: colors.panel, borderColor: gemCard ? 'transparent' : colors.line },
            gemCard,
          ]}
        >
          <Text style={[styles.buddyPreviewTag, { color: colors.on }]}>{t('shop.buddyPreviewTag')}</Text>
          <Text style={[styles.buddyPreviewQ, { color: colors.ink }]}>{t('shop.buddyPreviewQ')}</Text>
        </View>
      </View>
    </View>
  )
}

// The look being tried, or the one worn, as its own Tonight card. A new look
// fades in over the last one in place, so the card never jumps.
const LOOK_FADE_MS = 240

function LookStage({ id }) {
  const reduce = useReduceMotion()
  const [layers, setLayers] = useState({ now: id, was: '' })
  const fade = useSharedValue(1)

  useEffect(() => {
    if (id === layers.now) return undefined
    if (reduce) {
      setLayers({ now: id, was: '' })
      return undefined
    }
    fade.value = 0
    setLayers({ now: id, was: layers.now })
    fade.value = withTiming(1, { duration: LOOK_FADE_MS })
    const timer = setTimeout(() => setLayers((prev) => (prev.now === id ? { now: id, was: '' } : prev)), LOOK_FADE_MS + 40)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, reduce])

  const fadeIn = useAnimatedStyle(() => ({ opacity: fade.value }))
  return (
    <View style={styles.lookStage}>
      {layers.was ? (
        <View style={styles.lookStageWas} pointerEvents="none">
          <LookPreviewCard id={layers.was} />
        </View>
      ) : null}
      <Reanimated.View style={layers.was ? fadeIn : null}>
        <LookPreviewCard id={layers.now} />
      </Reanimated.View>
    </View>
  )
}

// A look reads as the same chip as the Looks page, a cheer sits still, a
// buddy blinks and sways.
// buddy: who models an accessory, your buddy if one is on.
function TileArt({ type, id, colors, buddy = '' }) {
  if (type === 'accessory') return <AccessoryChip id={id} buddyId={buddy || 'ant'} tone={colors.on} />
  if (type === 'look') return <LookChip id={id} colors={colors} />
  if (type === 'cheer') return <CheerChip id={id} stage={1} colors={colors} />
  return <BuddyChip id={id} alive />
}

function tileName(type, id) {
  if (type === 'accessory') return t(`accessory.${id}`)
  if (type === 'look') return t(lookText(id, 'name'))
  if (type === 'cheer') return t(cheerText(id, 'name'))
  return t(buddyText(id, 'name'))
}

function PriceTag({ tag, colors }) {
  if (tag.owned) {
    return <Text style={[styles.tagText, { color: colors.inkDim }]}>{t('shop.owned')}</Text>
  }
  const n = tag.gems || tag.coins
  if (!n) return null
  return (
    <View style={styles.tagRow}>
      {tag.gems ? <GemIcon size={12} /> : <CoinIcon size={12} />}
      <Text style={[styles.tagText, { color: colors.ink }]}>{n}</Text>
    </View>
  )
}

// The label always sits on the tile's bottom edge: the art area above it is a
// fixed height, so a short chip (Spark) and a tall one line up the same way.
function ShopTile({ type, item, purse, colors, onTile, style }) {
  const name = tileName(type, item.id)
  const tag = shopTag(purse, type, item)
  return (
    <Pressable
      onPress={() => onTile(type, item)}
      accessibilityRole="button"
      accessibilityLabel={t('shop.see', { name })}
      style={[styles.tile, { borderColor: colors.line, backgroundColor: colors.panel2 }, style]}
    >
      <View style={styles.tileArt}>
        <TileArt type={type} id={item.id} colors={colors} buddy={purse.buddyOn} />
      </View>
      <View style={styles.tileLabel}>
        <Text style={[styles.tileName, { color: colors.ink }]} numberOfLines={1}>
          {name}
        </Text>
        <PriceTag tag={tag} colors={colors} />
      </View>
    </Pressable>
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

// The drop carousel: the Coming drop first, then recent drops. Swipe sideways.
function DropCarousel({ slides, purse, colors, onTile }) {
  const [width, setWidth] = useState(0)
  const [at, setAt] = useState(0)
  if (!slides.length) return null
  return (
    <View style={styles.carousel} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width ? (
        <ScrollView
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setAt(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {slides.map((slide, i) => {
            const head = slideHead(slide)
            const coming = slide.kind === 'coming'
            return (
              <View
                key={`${slide.kind}-${slide.date}`}
                accessibilityLabel={t('shop.slideN', { n: i + 1, total: slides.length })}
                style={[
                  styles.slide,
                  { width, borderColor: coming ? colors.on : colors.line, backgroundColor: colors.panel },
                ]}
              >
                {head.kicker ? <Text style={[styles.slideKicker, { color: colors.on }]}>{head.kicker}</Text> : null}
                <Text style={[styles.slideTitle, { color: colors.ink }]}>{head.title}</Text>
                <View style={styles.slideGrid}>
                  {slide.items.map(({ type, item }) => (
                    <ShopTile
                      key={`${type}-${item.id}`}
                      type={type}
                      item={item}
                      purse={purse}
                      colors={colors}
                      onTile={onTile}
                      style={styles.slideTile}
                    />
                  ))}
                </View>
              </View>
            )
          })}
        </ScrollView>
      ) : null}
      {slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((slide, i) => (
            <View
              key={`dot-${slide.kind}-${slide.date}`}
              style={[styles.dot, { backgroundColor: i === at ? colors.on : colors.line }]}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}

// Every item of one kind, side-scrolling, not-owned first.
function KindRow({ type, list, cap, allLabel, onAll, purse, colors, onTile }) {
  const sorted = [...list].sort(
    (a, b) => Number(shopTag(purse, type, a).owned) - Number(shopTag(purse, type, b).owned),
  )
  return (
    <View style={styles.promoShelf}>
      <View style={styles.promoHead}>
        <Cap colors={colors}>{cap}</Cap>
        <Pressable onPress={onAll} hitSlop={8}>
          <Text style={[styles.promoAll, { color: colors.on }]}>{allLabel}</Text>
        </Pressable>
      </View>
      <FadeScroll fade={colors.bg} nestedScrollEnabled contentContainerStyle={styles.rowScroll}>
        {sorted.map((item) => (
          <ShopTile key={item.id} type={type} item={item} purse={purse} colors={colors} onTile={onTile} style={styles.rowTile} />
        ))}
      </FadeScroll>
    </View>
  )
}

function GemDoorChip({ colors }) {
  return (
    <View style={[styles.gemMark, { borderColor: colors.line, backgroundColor: colors.panel2 }]}>
      <GemIcon size={20} />
    </View>
  )
}

function ShopDoor({ preview, title, note, meta, onPress, colors }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.shopDoor, { borderBottomColor: colors.line, backgroundColor: colors.panel }]}
    >
      <View style={styles.shopDoorChip}>{preview}</View>
      <View style={styles.shopCopy}>
        <Text style={[styles.shopName, { color: colors.ink }]}>{title}</Text>
        {note ? <Text style={[styles.shopNote, { color: colors.inkDim }]}>{note}</Text> : null}
      </View>
      {meta ? <Text style={[styles.shopDoorMeta, { color: colors.inkDim }]}>{meta}</Text> : null}
      <Text style={[styles.shopDoorChev, { color: colors.inkDim }]}>›</Text>
    </Pressable>
  )
}

function Cap({ children, colors }) {
  return <Text style={[styles.cap, { color: colors.inkDim }]}>{children}</Text>
}

function coinLine(n) {
  return n === 1 ? t('shop.coinOne') : t('shop.coins', { n })
}

function gemLine(n) {
  return n === 1 ? t('shop.gemOne') : t('shop.gems', { n })
}

const BUY_BODY = {
  look: 'shop.buyLookBody',
  buddy: 'shop.buyBuddyBody',
  accessory: 'shop.buyAccessoryBody',
  cheer: 'shop.buyCheerBody',
}

// Coins and gems do not come back, so a tap never spends on its own.
function BuyConfirm({ confirm, onClose, onGo, colors }) {
  const closeRef = useRef(onClose)
  const goRef = useRef(onGo)
  closeRef.current = onClose
  goRef.current = onGo

  useEffect(() => {
    if (!confirm) {
      publishSheet(null)
      return undefined
    }
    publishSheet({
      kicker: t('shop.buyKicker'),
      title: confirm.title,
      body: confirm.body,
      goLabel: t('shop.buy'),
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => closeRef.current?.(),
      onGo: () => goRef.current?.(),
    })
    return () => publishSheet(null)
  }, [confirm, colors])

  return null
}

// A row with `info` keeps its note out of the row and shows it in a sheet.
function openInfo(name, info, colors) {
  publishSheet({
    title: name,
    body: info,
    closeLabel: t('settings.close'),
    colors,
    onClose: () => publishSheet(null),
  })
}

function ShopActionRow({ name, note, info, miss, actionLabel, onAction, colors, primary, disabled, nested, preview, onPreview, previewOn, previewPressIn, artKey }) {
  const artRef = useMemo(() => (artKey ? kitArtRef(artKey) : undefined), [artKey])
  const art = preview
    ? onPreview
      ? (
        <PreviewButton onPress={onPreview} pressIn={previewPressIn} selected={previewOn} colors={colors}>
          {preview}
        </PreviewButton>
      )
      : preview
    : null
  // A bought item flies to the Collection from here.
  const previewNode = art && artRef ? <View ref={artRef} collapsable={false}>{art}</View> : art
  return (
    <View
      style={[
        nested ? styles.shopRowNested : styles.shopRow,
        !nested && { borderColor: colors.line, backgroundColor: colors.panel },
      ]}
    >
      {previewNode}
      <View style={styles.shopCopy}>
        {info ? (
          <Pressable
            onPress={() => openInfo(name, info, colors)}
            accessibilityRole="button"
            accessibilityLabel={t('shop.moreAbout', { name })}
            hitSlop={8}
            style={styles.shopNameRow}
          >
            <Text style={[styles.shopName, { color: colors.ink }]}>{name}</Text>
            <View style={[styles.infoDot, { borderColor: colors.line }]}>
              <Text style={[styles.infoDotText, { color: colors.inkDim }]}>i</Text>
            </View>
          </Pressable>
        ) : (
          <Text style={[styles.shopName, { color: colors.ink }]}>{name}</Text>
        )}
        {note ? <Text style={[styles.shopNote, { color: colors.inkDim }]}>{note}</Text> : null}
        {miss ? (
          <Text style={[styles.shopNote, { color: colors.miss }]} accessibilityRole="alert">
            {miss}
          </Text>
        ) : null}
      </View>
      {primary ? (
        <DidButton small label={actionLabel} onPress={onAction} colors={colors} disabled={disabled} />
      ) : disabled ? (
        <View style={[styles.keyOff, { borderColor: colors.line, backgroundColor: colors.panel2 }]}>
          <Text style={[styles.keyOffText, { color: colors.inkDim }]}>{actionLabel}</Text>
        </View>
      ) : (
        <KeyButton label={actionLabel} onPress={onAction} colors={colors} />
      )}
    </View>
  )
}

function StagePicks({ owned, play, on, onPick, colors }) {
  return (
    <View style={styles.stages}>
      {STAGES.map((n) => {
        const have = n <= owned
        const using = on && play === n
        return (
          <Pressable
            key={n}
            disabled={!have}
            onPress={() => onPick(n)}
            style={[
              styles.stageChip,
              {
                borderColor: using ? colors.onDeep : colors.line,
                opacity: have ? 1 : 0.35,
              },
            ]}
          >
            <Text style={{ color: using ? colors.on : colors.ink }}>{n}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function gemMiss(code) {
  if (code === 'signin') return t('gems.needSignIn')
  if (code === 'app') return t('gems.appOnly')
  if (code === 'store') return t('gems.storeError')
  if (code === 'setup') return t('gems.setup')
  return t('gems.setup')
}

function gemPackTitle(pack) {
  return pack.gems === 1 ? t('shop.gemOne') : t('shop.gems', { n: pack.gems })
}

function FeaturedGemCard({ pack, price, bonusNote, best, onBuy, colors, artRef }) {
  const title = gemPackTitle(pack)
  return (
    <Pressable
      onPress={onBuy || undefined}
      disabled={!onBuy}
      accessibilityRole={onBuy ? 'button' : 'text'}
      accessibilityLabel={`${title}, ${price}`}
      style={[styles.gemFeatured, { borderColor: best ? colors.onDeep : colors.line, backgroundColor: colors.panel }]}
    >
      {best ? (
        <View style={[styles.gemBestBadge, { backgroundColor: colors.on }]}>
          <Text style={[styles.gemBestBadgeText, { color: colors.bg }]}>{t('gems.bestValue')}</Text>
        </View>
      ) : null}
      <View ref={artRef} collapsable={false} style={styles.gemFeaturedArt}>
        <GemFaceMark count={pack.gems} big colors={colors} />
      </View>
      <Text style={[styles.gemFeaturedTitle, { color: colors.ink }]}>{title}</Text>
      {bonusNote ? <Text style={[styles.gemFeaturedNote, { color: colors.inkDim }]}>{bonusNote}</Text> : null}
      {onBuy ? (
        <View style={[styles.gemFeaturedButton, { backgroundColor: colors.on }]}>
          <Text style={[styles.gemFeaturedButtonText, { color: colors.bg }]}>{price}</Text>
        </View>
      ) : (
        <Text style={[styles.gemFeaturedTitle, { color: colors.inkDim }]}>{price}</Text>
      )}
    </Pressable>
  )
}

function CompactGemRow({ pack, price, bonusNote, onBuy, colors, artRef }) {
  const title = gemPackTitle(pack)
  return (
    <View style={[styles.shopRow, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <View ref={artRef} collapsable={false}>
        <GemFaceMark count={pack.gems} colors={colors} accessibilityLabel={title} />
      </View>
      <View style={styles.shopCopy}>
        <Text style={[styles.shopName, { color: colors.ink }]}>{title}</Text>
        <Text style={[styles.shopNote, { color: colors.inkDim }]}>
          {bonusNote}
          {bonusNote ? ' · ' : ''}
          {price}
        </Text>
      </View>
      {onBuy ? <DidButton small label={t('gems.buy')} onPress={onBuy} colors={colors} /> : null}
    </View>
  )
}

// coinsFor(): up to two paid taps of up to two coins each.
const COINS_PER_NIGHT_CAP = NIGHT_COIN_CAP

function previewBody(type, item, purse) {
  const tag = shopTag(purse, type, item)
  if (tag.owned) return t('shop.owned')
  const base = tag.gems ? gemLine(tag.gems) : coinLine(tag.coins)
  if (tag.coins && purse.coins < tag.coins) {
    const short = tag.coins - purse.coins
    const nights = Math.ceil(short / COINS_PER_NIGHT_CAP)
    return `${base}\n${t('shop.needMoreCoins', { n: short })}\n${t('shop.earnCoins', { coins: short, nights })}`
  }
  if (tag.gems && purse.gems < tag.gems) return `${base}\n${t('shop.needMoreGems', { n: tag.gems - purse.gems })}`
  return base
}

function CheerLoop({ id, coat }) {
  useEffect(() => {
    const play = () => fireCheer(id, 1, coat, undefined, true)
    play()
    const timer = setInterval(play, holdFor(id, 1) + 260)
    return () => clearInterval(timer)
  }, [id, coat])
  return null
}

// Tapping any item opens the real thing at full size: the look's own card,
// the buddy in its hang, or the cheer playing on a loop while the sheet is
// open, plus its price and, when short on coins, how to earn the rest.
// `action` is the item's own Buy or Use, so the preview is never a dead end.
function openTilePreview(type, item, purse, colors, coat, action, miss = '') {
  const name = tileName(type, item.id)
  // Short on coins: keep the price and the earn line, not just the miss.
  const tag = shopTag(purse, type, item)
  const short = !tag.owned && tag.coins > 0 && purse.coins < tag.coins
  const body = short ? previewBody(type, item, purse) : miss || previewBody(type, item, purse)
  let preview = null
  if (type === 'cheer') preview = <CheerLoop id={item.id} coat={coat} />
  else if (type === 'look') preview = <LookPreviewCard id={item.id} />
  else if (type === 'buddy') preview = <BuddyPreviewCard id={item.id} colors={colors} />
  else if (type === 'accessory') preview = <AccessoryPreviewCard id={item.id} purse={purse} colors={colors} />
  publishSheet({
    preview,
    title: name,
    body,
    ...(action ? { goLabel: action.label, onGo: action.go } : {}),
    closeLabel: t('settings.close'),
    colors,
    onClose: () => publishSheet(null),
  })
}

export function ShopScreen({ book, onChange }) {
  const colors = useShopColors(book)
  const purse = normalizePurse(book)
  const coat = activeLook(book)
  const lookCount = purse.looks.length
  const cheerCount = purse.cheers.length
  const buddyCount = purse.buddies.length

  // The preview already shows the price, so its Buy is the confirm step.
  function done(type, item, next, bought) {
    if (shortOnGems(next, colors)) return
    if (next.miss) {
      openTilePreview(type, item, purse, colors, coat, tileAction(type, item), shopMiss(next))
      return
    }
    publishSheet(null)
    if (bought) {
      flyToKit({
        key: `${type}:${item.id}`,
        art: <TileArt type={type} id={item.id} colors={colors} buddy={purse.buddyOn} />,
        name: tileName(type, item.id),
        count: kitCount(normalizePurse(next.book)),
      })
    }
    onChange(next.book)
  }

  function tileAction(type, item) {
    const tag = shopTag(purse, type, item)
    const needGems = () => {
      if (tag.gems > 0 && purse.gems < tag.gems) {
        publishSheet(null)
        offerMoreGems(colors)
        return true
      }
      return false
    }
    // The preview's Buy asks "Buy this?" with the price before anything is spent.
    // Can't afford it: no bright Buy. Coins show how to earn (no button);
    // gems point to the gem packs.
    const buy = (spend) => {
      if (tag.coins > 0 && purse.coins < tag.coins) return null
      if (tag.gems > 0 && purse.gems < tag.gems) {
        return {
          label: t('gems.shortGo'),
          go: () => {
            publishSheet(null)
            goHash('/gems')
          },
        }
      }
      return buyNow(spend)
    }
    const buyNow = (spend) => ({
      label: t('shop.buy'),
      go: async () => {
        if (needGems()) return
        // Short on coins: the buy turns itself down and the preview says why.
        if (tag.coins > 0 && purse.coins < tag.coins) return done(type, item, await spend(), true)
        confirmBuy(colors, {
          title: tileName(type, item.id),
          body: t(BUY_BODY[type], { cost: tag.gems ? gemLine(tag.gems) : coinLine(tag.coins) }),
          onGo: async () => done(type, item, await spend(), true),
        })
      },
    })
    if (type === 'look') {
      if (purse.lookOn === item.id) return null
      if (tag.owned) return { label: t('shop.use'), go: () => done(type, item, wearLook(book, item.id), false) }
      return buy(() => buyLookWithCoins(book, item.id))
    }
    if (type === 'buddy') {
      if (purse.buddyOn === item.id) return null
      if (tag.owned) return { label: t('shop.use'), go: () => done(type, item, wearBuddy(book, item.id), false) }
      return buy(() => buyWithGems(book, 'buddy', item.id))
    }
    if (type === 'accessory') {
      if (tag.owned) {
        const on = purse.worn[item.slot] === item.id
        return { label: on ? t('shop.takeOff') : t('shop.use'), go: () => done(type, item, wearAccessory(book, item.id), false) }
      }
      return buy(() => buyAccessoryWithCoins(book, item.id))
    }
    // Cheers bought with coins come in stages, which only the cheers page shows.
    if (tag.owned || !(item.gems > 0)) {
      return {
        label: t('shop.allCheers'),
        go: () => {
          publishSheet(null)
          goHash('/shop/cheers')
        },
      }
    }
    return buy(() => buyWithGems(book, 'cheer', item.id))
  }

  function onTile(type, item) {
    openTilePreview(type, item, purse, colors, coat, tileAction(type, item))
  }

  return (
    <BoardShell book={book} title={t('shop.title')} date={shellDate(book)} colors={colors} showPurse>
      <Meta colors={colors}>{t('shop.hubHint')}</Meta>
      {purse.coins < 15 && purse.gems < 2 ? (
        <Meta colors={colors}>{t('shop.howEarn', { cap: NIGHT_COIN_CAP })}</Meta>
      ) : null}

      <DropCarousel slides={dropSlides()} purse={purse} colors={colors} onTile={onTile} />

      <KindRow type="look" list={LOOKS} cap={t('shop.looks')} allLabel={t('shop.allLooks')} onAll={() => goHash('/shop/looks')} purse={purse} colors={colors} onTile={onTile} />
      <KindRow type="cheer" list={CHEERS} cap={t('shop.cheers')} allLabel={t('shop.allCheers')} onAll={() => goHash('/shop/cheers')} purse={purse} colors={colors} onTile={onTile} />
      <KindRow type="buddy" list={BUDDIES} cap={t('shop.buddies')} allLabel={t('shop.allBuddies')} onAll={() => goHash('/shop/buddies')} purse={purse} colors={colors} onTile={onTile} />
      <KindRow type="accessory" list={accessoriesForSale(boardDate(new Date()))} cap={t('shop.accessories')} allLabel={t('shop.allAccessories')} onAll={() => goHash('/shop/accessories')} purse={purse} colors={colors} onTile={onTile} />

      <View style={[styles.doorCard, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <ShopDoor
          colors={colors}
          preview={<GemDoorChip colors={colors} />}
          title={t('gems.title')}
          note={t('shop.gemsDoor')}
          onPress={() => goHash('/gems')}
        />
        <ShopDoor
          colors={colors}
          preview={<LookChip id={purse.lookOn} colors={colors} />}
          title={t('shop.kit')}
          note={t('shop.kitDoor')}
          meta={t('shop.ownedN', { n: lookCount + cheerCount + buddyCount + purse.accessories.length })}
          onPress={() => goHash('/kit')}
        />
      </View>
    </BoardShell>
  )
}

export function ShopLooksScreen({ book, onChange }) {
  const [peekLook, setPeekLook] = useState('')
  const colors = useShopColors(book, peekLook)
  const purse = normalizePurse(book)
  const [miss, setMiss] = useState(NO_MISS)
  const [confirm, setConfirm] = useState(null)

  function take(next, id, bought = false) {
    if (shortOnGems(next, colors)) {
      setMiss(NO_MISS)
      setConfirm(null)
      return
    }
    setMiss({ id, text: shopMiss(next) })
    if (!next.miss) {
      setPeekLook('')
      setConfirm(null)
      if (bought) {
        flyToKit({
          key: `look:${id}`,
          art: <LookChip id={id} colors={colors} />,
          name: t(lookText(id, 'name')),
          count: kitCount(normalizePurse(next.book)),
        })
      }
      onChange(next.book)
    }
  }

  function lookRow(item) {
    const have = purse.looks.includes(item.id)
    const on = purse.lookOn === item.id
    const label = on ? t('shop.on') : have ? t('shop.use') : t('shop.buy')
    const cost = item.gems ? gemLine(item.gems) : coinLine(item.coins)
    return (
      <ShopActionRow
        key={item.id}
        colors={colors}
        preview={<LookChip id={item.id} colors={colors} />}
        artKey={`look:${item.id}`}
        previewOn={peekLook === item.id}
        onPreview={() => setPeekLook((prev) => (prev === item.id ? '' : item.id))}
        name={t(lookText(item.id, 'name'))}
        note={t(lookText(item.id, 'line'))}
        miss={miss.id === item.id ? miss.text : ''}
        actionLabel={label}
        primary={on}
        disabled={on}
        onAction={() => {
          if (have) {
            take(buyLook(book, item.id), item.id)
            return
          }
          if (item.gems > 0 && purse.gems < item.gems) {
            offerMoreGems(colors)
            return
          }
          setMiss(NO_MISS)
          setConfirm({
            title: t(lookText(item.id, 'name')),
            body: t('shop.buyLookBody', { cost }),
            go: async () => {
              const next = await buyLookWithCoins(book, item.id)
              take(next, item.id, true)
            },
          })
        }}
      />
    )
  }

  return (
    <BoardShell
      book={book}
      title={t('shop.looks')}
      date={shellDate(book)}
      colors={colors}
      look={peekLook || undefined}
      showPurse
    >
      <Meta colors={colors}>{t('shop.looksHint', { coins: LOOK_COIN_PRICE, gems: LOOK_GEM_PRICE })}</Meta>

      <LookStage id={peekLook || purse.lookOn} />

      <Cap colors={colors}>{t('shop.looksCoins')}</Cap>
      {COIN_LOOKS.map(lookRow)}

      <Cap colors={colors}>{t('shop.looksGems')}</Cap>
      {GEM_LOOKS.map(lookRow)}

      <BuyConfirm
        confirm={confirm}
        colors={colors}
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

export function ShopCheersScreen({ book, onChange }) {
  const colors = useShopColors(book)
  const purse = normalizePurse(book)
  const coat = activeLook(book)
  const [miss, setMiss] = useState(NO_MISS)
  const [confirm, setConfirm] = useState(null)

  function take(next, id, bought = false) {
    if (shortOnGems(next, colors)) {
      setMiss(NO_MISS)
      setConfirm(null)
      return
    }
    setMiss({ id, text: shopMiss(next) })
    if (!next.miss) {
      setConfirm(null)
      if (bought) {
        flyToKit({
          key: `cheer:${id}`,
          art: <CheerChip id={id} stage={1} colors={colors} />,
          name: t(cheerText(id, 'name')),
          count: kitCount(normalizePurse(next.book)),
        })
      }
      onChange(next.book)
    }
  }

  return (
    <BoardShell book={book} title={t('shop.cheers')} date={shellDate(book)} colors={colors} showPurse>
      <Meta colors={colors}>{t('shop.cheerHint', { cheer: CHEER_GEMS, stage: CHEER_STAGE_COIN })}</Meta>

      {CHEERS.map((item) => {
        const have = purse.cheers.includes(item.id)
        const stage = cheerStageOf(book, item.id)
        const next = have ? nextCheerStage(stage) : 0
        let actionLabel = t('shop.buy')
        let onAction = () => {
          if (purse.gems < item.gems) {
            offerMoreGems(colors)
            return
          }
          setMiss(NO_MISS)
          setConfirm({
            title: t(cheerText(item.id, 'name')),
            body: t('shop.buyCheerBody', { cost: gemLine(item.gems) }),
            go: async () => take(await buyWithGems(book, 'cheer', item.id), item.id, true),
          })
        }
        let disabled = false
        let primary = false

        if (have) {
          if (next) {
            actionLabel = t('shop.nextStage')
            onAction = () => {
              setMiss(NO_MISS)
              setConfirm({
                title: t(cheerText(item.id, 'name')),
                body: t('shop.buyStageBody', { n: next, cost: coinLine(CHEER_STAGE_COINS[next]) }),
                go: async () => {
                  const out = await buyCheerStageWithCoins(book, item.id)
                  take(out, item.id)
                  // A stage has no fly-in, so say it landed.
                  if (!out.miss) confirmDone(t('confirm.stageBought', { name: t(cheerText(item.id, 'name')), n: next }))
                },
              })
            }
          } else {
            actionLabel = t('shop.owned')
            disabled = true
          }
        }

        return (
          <ShopActionRow
            key={item.id}
            colors={colors}
            preview={<CheerChip id={item.id} stage={have ? stage : 1} colors={colors} />}
            artKey={`cheer:${item.id}`}
            onPreview={() => fireCheer(item.id, 1, coat, undefined, true)}
            previewPressIn
            name={t(cheerText(item.id, 'name'))}
            info={t(cheerText(item.id, 'line'))}
            miss={miss.id === item.id ? miss.text : ''}
            actionLabel={actionLabel}
            primary={primary}
            disabled={disabled}
            onAction={onAction}
          />
        )
      })}

      <BuyConfirm
        confirm={confirm}
        colors={colors}
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

export function ShopBuddiesScreen({ book, onChange }) {
  const [peekBuddy, setPeekBuddy] = useState('')
  const colors = useShopColors(book)
  const purse = normalizePurse(book)
  const [miss, setMiss] = useState(NO_MISS)
  const [confirm, setConfirm] = useState(null)

  function take(next, id, bought = false) {
    if (shortOnGems(next, colors)) {
      setMiss(NO_MISS)
      setConfirm(null)
      return
    }
    setMiss({ id, text: shopMiss(next) })
    if (!next.miss) {
      setPeekBuddy('')
      setConfirm(null)
      if (bought) {
        flyToKit({
          key: `buddy:${id}`,
          art: <BuddyChip id={id} />,
          name: t(buddyText(id, 'name')),
          count: kitCount(normalizePurse(next.book)),
        })
      }
      onChange(next.book)
    }
  }

  return (
    <BoardShell book={book} title={t('shop.buddies')} date={shellDate(book)} colors={colors} showPurse>
      <Meta colors={colors}>{t('shop.buddiesHint', { n: BUDDY_GEMS })}</Meta>

      {peekBuddy ? <BuddyPreviewCard id={peekBuddy} colors={colors} /> : null}

      {BUDDIES.map((item) => {
        const have = purse.buddies.includes(item.id)
        const on = purse.buddyOn === item.id
        const label = on ? t('shop.on') : have ? t('shop.use') : t('shop.buy')
        return (
          <ShopActionRow
            key={item.id}
            colors={colors}
            preview={<BuddyChip id={item.id} alive />}
            artKey={`buddy:${item.id}`}
            previewOn={peekBuddy === item.id}
            onPreview={() => setPeekBuddy(item.id)}
            name={t(buddyText(item.id, 'name'))}
            note={t(buddyText(item.id, 'line'))}
            miss={miss.id === item.id ? miss.text : ''}
            actionLabel={label}
            primary={on}
            disabled={on}
            onAction={() => {
              if (have) {
                take(wearBuddy(book, item.id), item.id)
                return
              }
              if (purse.gems < item.gems) {
                offerMoreGems(colors)
                return
              }
              setMiss(NO_MISS)
              setConfirm({
                title: t(buddyText(item.id, 'name')),
                body: t('shop.buyBuddyBody', { cost: gemLine(item.gems) }),
                go: async () => take(await buyWithGems(book, 'buddy', item.id), item.id, true),
              })
            }}
          />
        )
      })}

      <BuyConfirm
        confirm={confirm}
        colors={colors}
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

// Your buddy (or the ant, if none is on) with what it has on, plus the item
// being looked at, so you see the whole outfit before buying.
function AccessoryPreviewCard({ id, purse, colors }) {
  const item = accessoryById(id)
  const worn = item ? { ...purse.worn, [item.slot]: id } : purse.worn
  return (
    <View style={styles.buddyPreview}>
      <View style={[styles.buddyPreviewCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <BuddyHang id={purse.buddyOn || 'ant'} alive worn={worn} tone={colors.on} />
        <Text style={[styles.buddyPreviewTag, { color: colors.on }]}>{t('shop.buddyPreviewTag')}</Text>
        <Text style={[styles.buddyPreviewQ, { color: colors.ink }]}>{t('shop.buddyPreviewQ')}</Text>
      </View>
    </View>
  )
}

function FilterChip({ label, on, onPress, colors }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      hitSlop={4}
      style={[
        styles.filterChip,
        { borderColor: on ? colors.onDeep : colors.line, backgroundColor: on ? colors.panel3 : colors.panel2 },
      ]}
    >
      <Text style={[styles.filterChipText, { color: on ? colors.on : colors.inkSoft }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

// A spot on the buddy to look at (with how many are for sale there), and a
// switch that hides what you already own.
function AccessoryFilters({ forSale, slot, onSlot, notOwned, onNotOwned, purse, colors }) {
  const count = (s) => forSale.filter((item) => item.slot === s).length
  return (
    <FadeScroll fade={colors.bg} contentContainerStyle={styles.filterRow}>
      <FilterChip label={t('shop.accAll', { n: forSale.length })} on={!slot} onPress={() => onSlot('')} colors={colors} />
      {ACCESSORY_SLOTS.filter((s) => count(s)).map((s) => (
        <FilterChip
          key={s}
          label={`${t(`shop.slot.${s}`)} ${count(s)}`}
          on={slot === s}
          onPress={() => onSlot(slot === s ? '' : s)}
          colors={colors}
        />
      ))}
      {purse.accessories.length ? (
        <FilterChip label={t('shop.accNotOwned')} on={notOwned} onPress={onNotOwned} colors={colors} />
      ) : null}
    </FadeScroll>
  )
}

export function ShopAccessoriesScreen({ book, onChange }) {
  const [peek, setPeek] = useState('')
  const colors = useShopColors(book)
  const purse = normalizePurse(book)
  const [miss, setMiss] = useState(NO_MISS)
  const [confirm, setConfirm] = useState(null)
  const buddy = purse.buddyOn || 'ant'
  const forSale = accessoriesForSale(boardDate(new Date()))
  // The list grows every drop: pick one spot, or hide what you own.
  const [slotPick, setSlotPick] = useState('')
  const [notOwned, setNotOwned] = useState(false)
  const shown = forSale.filter(
    (item) => (!slotPick || item.slot === slotPick) && (!notOwned || !purse.accessories.includes(item.id)),
  )

  function take(next, id, bought = false) {
    setMiss({ id, text: shopMiss(next) })
    if (next.miss) {
      setConfirm(null)
      return
    }
    setConfirm(null)
    if (bought) {
      flyToKit({
        key: `accessory:${id}`,
        art: <AccessoryChip id={id} buddyId={buddy} tone={colors.on} />,
        name: t(`accessory.${id}`),
        count: kitCount(normalizePurse(next.book)),
      })
    }
    onChange(next.book)
  }

  return (
    <BoardShell book={book} title={t('shop.accessories')} date={shellDate(book)} colors={colors} showPurse>
      <Meta colors={colors}>{t('shop.accessoriesHint')}</Meta>

      <AccessoryPreviewCard id="" purse={purse} colors={colors} />

      <AccessoryFilters
        forSale={forSale}
        slot={slotPick}
        onSlot={setSlotPick}
        notOwned={notOwned}
        onNotOwned={() => setNotOwned((v) => !v)}
        purse={purse}
        colors={colors}
      />

      {!shown.length ? <Meta colors={colors}>{t('shop.accNoneLeft')}</Meta> : null}

      {(slotPick ? [slotPick] : ACCESSORY_SLOTS).map((slot) => shown.some((item) => item.slot === slot) ? (
        <View key={slot}>
          <Cap colors={colors}>{t(`shop.slot.${slot}`)}</Cap>
          {shown.filter((item) => item.slot === slot).map((item) => {
            const have = purse.accessories.includes(item.id)
            const on = purse.worn[slot] === item.id
            const label = on ? t('shop.takeOff') : have ? t('shop.use') : t('shop.buy')
            const act = () => {
              if (have) {
                take(wearAccessory(book, item.id), item.id)
                return
              }
              if (purse.coins < item.coins) {
                const short = item.coins - purse.coins
                setMiss({ id: item.id, text: t('shop.earnCoins', { coins: short, nights: Math.ceil(short / NIGHT_COIN_CAP) }) })
                return
              }
              setMiss(NO_MISS)
              setConfirm({
                title: t(`accessory.${item.id}`),
                body: t('shop.buyAccessoryBody', { cost: coinLine(item.coins) }),
                go: async () => take(await buyAccessoryWithCoins(book, item.id), item.id, true),
              })
            }
            return (
              <ShopActionRow
                key={item.id}
                colors={colors}
                preview={<AccessoryChip id={item.id} buddyId={buddy} tone={colors.on} />}
                artKey={`accessory:${item.id}`}
                previewOn={peek === item.id}
                onPreview={() => {
                  // The list is long, so the outfit shows in a sheet where you are.
                  setPeek(item.id)
                  publishSheet({
                    preview: <AccessoryPreviewCard id={item.id} purse={purse} colors={colors} />,
                    title: t(`accessory.${item.id}`),
                    body: have ? t('shop.owned') : coinLine(item.coins),
                    goLabel: label,
                    onGo: () => {
                      publishSheet(null)
                      act()
                    },
                    closeLabel: t('settings.close'),
                    colors,
                    onClose: () => {
                      setPeek('')
                      publishSheet(null)
                    },
                  })
                }}
                name={t(`accessory.${item.id}`)}
                note={have ? (on ? t('shop.on') : t('shop.owned')) : coinLine(item.coins)}
                miss={miss.id === item.id ? miss.text : ''}
                actionLabel={label}
                primary={on}
                onAction={act}
              />
            )
          })}
        </View>
      ) : null)}

      <BuyConfirm
        confirm={confirm}
        colors={colors}
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

// Bought gems stream from their pack into the balance, a few at a time.
const GEM_STREAM_MAX = 8
const GEM_STREAM_GAP = 70
const GEM_FLY_MS = 560
const GEM_SIZE = 18
// A credit this long after the tap still counts as that pack's.
const GEM_BUY_WINDOW_MS = 10 * 60 * 1000
const BALANCE_POP = { damping: 10, stiffness: 300, mass: 1 }

/**
 * The balance shown on the gem page. When gems arrive after a pack was bought
 * here, they fly from that pack into the balance, which counts up as each
 * lands, and a success haptic plays with the last. Under Less motion and the
 * phone's Reduce Motion the count just changes; the haptic still plays.
 */
function useGemStream(gems, balanceRef) {
  const reduce = useReduceMotion()
  const [shown, setShown] = useState(gems)
  const seen = useRef(gems)
  const bought = useRef(null)
  const packArts = useRef(new Map())
  const pop = useSharedValue(1)

  useEffect(() => {
    const was = seen.current
    seen.current = gems
    const buy = bought.current
    const fresh = buy && Date.now() - buy.at < GEM_BUY_WINDOW_MS
    if (gems <= was || !fresh) {
      setShown(gems)
      return
    }
    bought.current = null
    confirmDone(t('confirm.gemsAdded', { n: gems - was }))
    const source = packArts.current.get(buy.packId)
    const target = balanceRef.current
    if (reduce || !source?.measureInWindow || !target?.measureInWindow) {
      setShown(gems)
      feelTap('did')
      return
    }
    const n = Math.min(gems - was, GEM_STREAM_MAX)
    source.measureInWindow((sx, sy, sw, sh) => {
      target.measureInWindow((tx, ty, tw, th) => {
        for (let i = 0; i < n; i += 1) {
          const spread = ((i % 3) - 1) * 10
          launchFlight({
            from: { x: sx + sw / 2 - GEM_SIZE / 2 + spread, y: sy + sh / 2 - GEM_SIZE / 2, w: GEM_SIZE, h: GEM_SIZE },
            to: { x: tx + tw / 2, y: ty + th / 2 },
            art: <GemIcon size={GEM_SIZE} />,
            size: GEM_SIZE * 0.7,
            delay: i * GEM_STREAM_GAP,
            ms: GEM_FLY_MS,
            hop: 40 + (i % 3) * 16,
            onLand: () => {
              setShown(was + Math.round(((gems - was) * (i + 1)) / n))
              pop.value = withSequence(withTiming(1.08, { duration: 70 }), withSpring(1, BALANCE_POP))
              if (i === n - 1) feelTap('did')
            },
          })
        }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gems])

  const popping = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }))
  return {
    shown,
    popping,
    noteBuy: (packId) => {
      bought.current = { packId, at: Date.now() }
    },
    packRef: (packId) => (node) => {
      if (node) packArts.current.set(packId, node)
      else packArts.current.delete(packId)
    },
  }
}

export function GemShopScreen({ book }) {
  const colors = useShopColors(book)
  const purse = normalizePurse(book)
  const reduce = useReduceMotion()
  const balanceRef = useRef(null)
  const stream = useGemStream(purse.gems, balanceRef)
  const [banner, setBanner] = useState('')
  const account = useAccount()
  // The packs and Buy buttons show at once with list prices. The store
  // connection (usually already warm from app start) fills in local prices;
  // a tap before it finishes just waits for it inside the purchase.
  const [storeReady, setStoreReady] = useState(() => iapReady())
  const [storeChecked, setStoreChecked] = useState(() => iapReady())
  const [, setPriced] = useState(0)

  useEffect(() => {
    if (!isReactNative()) return undefined
    let alive = true
    initGemIap()
      .catch(() => {})
      .finally(() => {
        if (!alive) return
        setStoreReady(iapReady())
        setStoreChecked(true)
        setPriced((n) => n + 1)
      })
    return () => {
      alive = false
    }
  }, [])

  function gemNotice(body) {
    publishSheet({
      title: t('gems.title'),
      body,
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
    })
  }

  const buying = useRef(false)

  // One store sheet at a time: a second tap while the first is open does nothing.
  async function buy(packId) {
    if (buying.current) return
    buying.current = true
    try {
      await buyPack(packId)
    } finally {
      buying.current = false
    }
  }

  async function buyPack(packId) {
    stream.noteBuy(packId)
    setBanner(t('gems.loadingStore'))
    let out
    try {
      out = await startGemPurchase(packId)
    } catch {
      setBanner('')
      gemNotice(t('gems.storeError'))
      return
    }
    if (out.miss === 'signin') {
      setBanner('')
      publishSheet(null)
      goHash('/account')
      return
    }
    if (out.miss) {
      setBanner('')
      // The store's own code, so one failed buy can be told from another.
      gemNotice(out.code ? `${gemMiss(out.miss)} (${out.code})` : gemMiss(out.miss))
      return
    }
    setBanner(out.pending ? t('gems.pending') : '')
  }

  const signedIn = Boolean(account.email)
  const expoGo = Constants.appOwnership === 'expo'
  const storeNote = expoGo ? t('gems.appOnly') : storeChecked && !storeReady ? t('gems.setup') : ''

  return (
    <BoardShell book={book} title={t('gems.title')} date={shellDate(book)} colors={colors}>
      <Reanimated.View
        ref={balanceRef}
        collapsable={false}
        accessible
        accessibilityLabel={t('gems.balance', { gems: purse.gems })}
        style={[styles.gemBalance, { borderColor: colors.line, backgroundColor: colors.panel2 }, stream.popping]}
      >
        <GemStack count={stream.shown} max={10} />
        <RollNumber value={stream.shown} reduce={reduce} style={[styles.gemBalanceN, { color: colors.ink }]} />
      </Reanimated.View>
      <Meta colors={colors}>{t('gems.hintNative')}</Meta>
      {signedIn ? null : <DidButton small label={t('gems.signIn')} onPress={() => goHash('/account')} colors={colors} />}
      {storeNote ? <Meta colors={colors}>{storeNote}</Meta> : null}
      {banner ? (
        <View style={[styles.gemSheet, { borderColor: colors.on, backgroundColor: colors.panel }]}>
          <Text style={[styles.gemSheetText, { color: colors.ink }]}>{banner}</Text>
        </View>
      ) : null}

      {COMPACT_GEM_PACKS.map((pack) => (
        <CompactGemRow
          key={pack.id}
          pack={pack}
          price={packPriceLabel(pack, storePrice(pack.id))}
          bonusNote={pack.bonus ? t('gems.bonus', { base: pack.base, bonus: pack.bonus }) : ''}
          onBuy={signedIn ? () => buy(pack.id) : null}
          colors={colors}
          artRef={stream.packRef(pack.id)}
        />
      ))}

      <View style={styles.gemFeaturedRow}>
        {FEATURED_GEM_PACKS.map((pack) => (
          <FeaturedGemCard
            key={pack.id}
            pack={pack}
            price={packPriceLabel(pack, storePrice(pack.id))}
            bonusNote={pack.bonus ? t('gems.bonus', { base: pack.base, bonus: pack.bonus }) : ''}
            best={pack.id === BEST_VALUE_GEM_ID}
            onBuy={signedIn ? () => buy(pack.id) : null}
            colors={colors}
            artRef={stream.packRef(pack.id)}
          />
        ))}
      </View>

      {!signedIn ? <DidButton label={t('gems.signInBuy')} onPress={() => goHash('/account')} colors={colors} /> : null}

      <Meta colors={colors}>{t('gems.earn')}</Meta>
      <Meta colors={colors}>
        {t('legal.gemLead')}{' '}
        <Text style={{ color: colors.on }} onPress={() => goHash('/terms')}>
          {t('legal.termsShort')}
        </Text>
        {t('legal.linksAnd')}
        <Text style={{ color: colors.on }} onPress={() => goHash('/privacy')}>
          {t('legal.privacyShort')}
        </Text>
        .
      </Meta>
      <KeyButton label={t('gems.backShop')} onPress={() => goHash('/shop')} colors={colors} />
    </BoardShell>
  )
}

const KIT_TABS = [
  { id: 'looks', key: 'shop.looks' },
  { id: 'cheers', key: 'shop.cheers' },
  { id: 'buddies', key: 'shop.buddies' },
  { id: 'accessories', key: 'shop.accessories' },
]

function WornBadge({ colors }) {
  return (
    <View style={[styles.wornBadge, { backgroundColor: colors.on, borderColor: colors.panel }]}>
      <Text style={[styles.wornBadgeText, { color: colors.bg }]}>✓</Text>
    </View>
  )
}

// One grid: the worn item carries a check badge instead of living twice, once
// as a big card and again as a tile. A tap wears it.
function KitTile({ label, worn, onPress, colors, children }) {
  return (
    <Pressable onPress={onPress} style={[styles.kitTile, { borderColor: colors.lineSoft }]}>
      <View style={styles.kitTileChip}>
        {children}
        {worn ? <WornBadge colors={colors} /> : null}
      </View>
      <Text style={[styles.kitTileName, { color: colors.ink }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

export function CollectionScreen({ book, onChange, startTab }) {
  const [tab, setTab] = useState(KIT_TABS.some((item) => item.id === startTab) ? startTab : 'looks')
  const colors = useShopColors(book)
  const coat = activeLook(book)
  const purse = normalizePurse(book)
  const looks = LOOKS.filter((item) => purse.looks.includes(item.id))
  const buddies = BUDDIES.filter((item) => purse.buddies.includes(item.id))
  const cheers = OWNABLE_CHEERS.filter((item) => purse.cheers.includes(item.id))
  const wornCheer = cheers.find((item) => item.id === purse.cheerOn)
  const accessories = ACCESSORIES.filter((item) => purse.accessories.includes(item.id))

  function wearOn(next, name) {
    onChange(next.book)
    if (name && !next.miss) confirmDone(t('confirm.wearing', { name }))
  }

  function wearCheerId(id) {
    wearOn(wearCheer(book, id), id ? t(cheerText(id, 'name')) : '')
  }

  function pickStage(id, n) {
    const next = wearCheerStage(book, id, n)
    if (!next.miss) {
      fireCheer(id, n, coat, undefined, true)
      onChange(next.book)
    }
  }

  const segItems = KIT_TABS.map((item) => ({ id: item.id, label: t(item.key) }))

  return (
    <BoardShell book={book} title={t('kit.title')} date={shellDate(book)} colors={colors}>
      <Meta colors={colors}>{t('kit.hint')}</Meta>

      <KitSegment items={segItems} selected={tab} onSelect={setTab} colors={colors} />

      {tab === 'looks' ? (
        <View style={[styles.kitGrid, { borderColor: colors.line, backgroundColor: colors.panel }]}>
          {looks.map((item) => (
            <KitTile
              key={item.id}
              label={t(lookText(item.id, 'name'))}
              worn={purse.lookOn === item.id}
              colors={colors}
              onPress={() => wearOn(buyLook(book, item.id), purse.lookOn === item.id ? '' : t(lookText(item.id, 'name')))}
            >
              <LookChip id={item.id} colors={colors} />
            </KitTile>
          ))}
        </View>
      ) : null}

      {tab === 'buddies' ? (
        <View style={[styles.kitGrid, { borderColor: colors.line, backgroundColor: colors.panel }]}>
          {!buddies.length ? (
            <View style={styles.kitEmpty}>
              <Meta colors={colors}>{t('kit.noBuddies')}</Meta>
            </View>
          ) : null}
          {buddies.map((item) => (
            <KitTile
              key={item.id}
              label={t(buddyText(item.id, 'name'))}
              worn={purse.buddyOn === item.id}
              colors={colors}
              onPress={() => wearOn(wearBuddy(book, item.id), t(buddyText(item.id, 'name')))}
            >
              <BuddyChip id={item.id} alive />
            </KitTile>
          ))}
          <KitTile
            label={t('kit.buddyOff')}
            worn={!purse.buddyOn}
            colors={colors}
            onPress={() => onChange(wearBuddy(book, '').book)}
          >
            <View style={[styles.kitOffChip, { borderColor: colors.line }]} />
          </KitTile>
        </View>
      ) : null}

      {tab === 'accessories' ? (
        <>
          <AccessoryPreviewCard id="" purse={purse} colors={colors} />
          {purse.buddyOn ? null : <Meta colors={colors}>{t('kit.accOnAnt')}</Meta>}
          {!accessories.length ? (
            <View style={[styles.kitGrid, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <View style={styles.kitEmpty}>
                <Meta colors={colors}>{t('kit.noAccessories')}</Meta>
                <Pressable onPress={() => goHash('/shop/accessories')} hitSlop={8}>
                  <Text style={[styles.promoAll, { color: colors.on }]}>{t('shop.allAccessories')}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          {/* One shelf per spot on the buddy, in the shop's order. */}
          {ACCESSORY_SLOTS.map((slot) => {
            const list = accessories.filter((item) => item.slot === slot)
            if (!list.length) return null
            return (
              <View key={slot}>
                <Cap colors={colors}>{t(`shop.slot.${slot}`)}</Cap>
                <View style={[styles.kitGrid, { borderColor: colors.line, backgroundColor: colors.panel }]}>
                  {list.map((item) => (
                    <KitTile
                      key={item.id}
                      label={t(`accessory.${item.id}`)}
                      worn={purse.worn[item.slot] === item.id}
                      colors={colors}
                      onPress={() =>
                        wearOn(wearAccessory(book, item.id), purse.worn[item.slot] === item.id ? '' : t(`accessory.${item.id}`))
                      }
                    >
                      <AccessoryChip id={item.id} buddyId={purse.buddyOn || 'ant'} tone={colors.on} />
                    </KitTile>
                  ))}
                </View>
              </View>
            )
          })}
        </>
      ) : null}

      {tab === 'cheers' ? (
        <>
          <View style={[styles.kitGrid, { borderColor: colors.line, backgroundColor: colors.panel }]}>
            {cheers.map((item) => {
              const play = cheerPlayOf(book, item.id)
              return (
                <KitTile
                  key={item.id}
                  label={t(cheerText(item.id, 'name'))}
                  worn={purse.cheerOn === item.id}
                  colors={colors}
                  onPress={() => {
                    wearCheerId(item.id)
                    fireCheer(item.id, play, coat, undefined, true)
                  }}
                >
                  <CheerChip id={item.id} stage={play} colors={colors} />
                </KitTile>
              )
            })}
            <KitTile
              label={t('kit.cheerOff')}
              worn={!purse.cheerOn}
              colors={colors}
              onPress={() => wearCheerId('')}
            >
              <View style={[styles.kitOffChip, { borderColor: colors.line }]} />
            </KitTile>
          </View>

          {wornCheer ? (
            <View style={[styles.cheerPick, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.shopName, { color: colors.ink }]}>
                {t('shop.cheerStageLine', {
                  n: cheerPlayOf(book, wornCheer.id),
                  max: CHEER_STAGE_MAX,
                  line: t(cheerText(wornCheer.id, 'line')),
                })}
              </Text>
              <StagePicks
                owned={cheerStageOf(book, wornCheer.id)}
                play={cheerPlayOf(book, wornCheer.id)}
                on
                onPick={(n) => pickStage(wornCheer.id, n)}
                colors={colors}
              />
            </View>
          ) : null}
        </>
      ) : null}

      <KeyButton label={t('shop.title')} onPress={() => goHash('/shop')} colors={colors} />
    </BoardShell>
  )
}

const styles = StyleSheet.create({
  cap: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  shopRowNested: { gap: 10 },
  veil: { flex: 1, justifyContent: 'center', padding: 20 },
  pop: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
  popKicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  popTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700' },
  popRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  shopCopy: { gap: 4, flex: 1 },
  shopName: { fontFamily: fonts.uiSemi, fontSize: 15 },
  shopNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  infoDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  infoDotText: { fontFamily: fonts.uiBold, fontSize: 11, lineHeight: 13 },
  shopNote: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  gemSheet: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
  gemSheetText: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  gemBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 4,
    gap: 8,
  },
  gemBalanceN: { fontFamily: fonts.mono, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  gemMark: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gemFeaturedRow: { gap: 10, marginBottom: 4 },
  gemFeatured: {
    borderWidth: 1.5,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  gemBestBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  gemBestBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  gemFeaturedArt: { marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  gemFeaturedTitle: { fontFamily: fonts.display, fontSize: 20, fontWeight: '800' },
  gemFeaturedNote: { fontFamily: fonts.ui, fontSize: 13 },
  gemFeaturedButton: {
    marginTop: 4,
    minWidth: 120,
    borderRadius: 999,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  gemFeaturedButtonText: { fontFamily: fonts.uiBold, fontSize: 15 },
  keyOff: {
    borderRadius: 999,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  keyOffText: { fontFamily: fonts.ui, fontSize: 14, fontWeight: '500' },
  cheerPick: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  stages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stageChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 36,
    alignItems: 'center',
  },
  previewBtn: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 4,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 46,
    minHeight: 46,
  },
  buddyPreview: { gap: 8, marginTop: 4 },
  filterRow: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  filterChip: { borderWidth: 1, borderRadius: 999, minHeight: 36, paddingHorizontal: 14, justifyContent: 'center' },
  filterChipText: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  buddyPreviewGlow: {
    position: 'relative',
    overflow: 'visible',
  },
  buddyPreviewCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    paddingTop: 28,
    gap: 8,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative',
  },
  buddyPreviewCardGem: {
    overflow: 'visible',
    zIndex: 1,
  },
  buddyPreviewTag: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  buddyPreviewQ: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  promoShelf: { gap: 8, marginTop: 4 },
  carousel: { gap: 8, marginTop: 4 },
  slide: { borderWidth: 1.5, borderRadius: 16, padding: 14, gap: 4 },
  slideKicker: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  slideTitle: { fontFamily: fonts.uiBold, fontSize: 20, marginBottom: 6 },
  slideGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slideTile: { width: '31%', flexGrow: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  rowScroll: { gap: 8, paddingRight: 4 },
  rowTile: { width: 104 },
  tile: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileArt: { height: 56, width: '100%', alignItems: 'center', justifyContent: 'center' },
  tileLabel: { width: '100%', alignItems: 'center', gap: 4 },
  tileName: { fontFamily: fonts.uiBold, fontSize: 13, textAlign: 'center' },
  lookStage: { position: 'relative' },
  lookStageWas: { position: 'absolute', left: 0, right: 0, top: 0 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagText: { fontFamily: fonts.uiSemi, fontSize: 12 },
  promoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promoAll: { fontFamily: fonts.uiSemi, fontSize: 13 },


  doorCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  shopDoor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shopDoorChip: { width: 36, alignItems: 'center' },
  shopDoorMeta: { fontFamily: fonts.ui, fontSize: 12 },
  shopDoorChev: { fontFamily: fonts.ui, fontSize: 22, lineHeight: 24 },
  kitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 8,
  },
  kitTile: {
    width: '33.333%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    minHeight: 88,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  kitTileChip: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  wornBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wornBadgeText: { fontSize: 10, fontWeight: '700', lineHeight: 12 },
  kitTileName: { fontFamily: fonts.uiSemi, fontSize: 11, maxWidth: '100%' },
  kitOffChip: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed' },
  kitEmpty: { width: '100%', padding: 14 },
})

// Gifts ------------------------------------------------------------------

const NOBODY_OWNS = { looks: [], cheers: [], buddies: [], accessories: [] }
const GIFT_TABS = [
  { id: 'looks', type: 'look', key: 'shop.looks' },
  { id: 'cheers', type: 'cheer', key: 'shop.cheers' },
  { id: 'buddies', type: 'buddy', key: 'shop.buddies' },
  { id: 'accessories', type: 'accessory', key: 'shop.accessories' },
]

// Nobody's outfit: a gift's accessory shows on the ant, alone.
const BARE = { worn: {}, buddyOn: '' }

function giftArt(type, id, colors, coat, purse = BARE) {
  if (type === 'accessory') return <AccessoryPreviewCard id={id} purse={purse} colors={colors} />
  if (type === 'cheer') return <CheerLoop id={id} coat={coat} />
  if (type === 'look') return <LookPreviewCard id={id} />
  return <BuddyPreviewCard id={id} colors={colors} />
}

function giftMiss(why) {
  if (why === 'giftCap') return t('gift.cap')
  if (why === 'notFriend') return t('gift.notFriend')
  if (why === 'coins') return t('gift.needCoins')
  if (why === 'gone') return t('gift.gone')
  return tMiss(why)
}

// Send a look, cheer or buddy to a friend or family member (/gift?id=...).
// The server takes the gems or coins; they get it next time they open the app.
export function GiftScreen({ book, onChange, toId }) {
  const account = useAccount()
  const colors = useShopColors(book)
  const coat = activeLook(book)
  const purse = normalizePurse(book)
  const [tab, setTab] = useState('looks')
  const [note, setNote] = useState('')
  const [person, setPerson] = useState(undefined)
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState(false)
  const items = giftItems()
  const kind = GIFT_TABS.find((item) => item.id === tab)
  const list = items[tab] || []

  useEffect(() => {
    let alive = true
    readKnownPerson(toId).then((row) => alive && setPerson(row))
    return () => {
      alive = false
    }
  }, [toId])

  const name = person ? personName(person) || t('people.someone') : ''

  async function send(type, item) {
    if (busy) return
    if (item.gems > 0 && purse.gems < item.gems) {
      publishSheet(null)
      offerMoreGems(colors)
      return
    }
    if (item.coins > 0 && purse.coins < item.coins) {
      openPick(type, item, t('gift.needCoins'))
      return
    }
    setBusy(true)
    let out
    try {
      out = await sendGift(toId, type, item.id, note)
    } catch {
      setBusy(false)
      publishSheet(null)
      confirmMiss(t('confirm.miss'))
      return
    }
    setBusy(false)
    if (out.miss === 'gems') {
      publishSheet(null)
      offerMoreGems(colors)
      return
    }
    if (out.miss) {
      openPick(type, item, giftMiss(out.miss))
      return
    }
    publishSheet(null)
    onChange(stampPurse(book, { ...purse, gems: out.gems, coins: out.coins }))
    setNote('')
    setSent(t('gift.sent', { item: tileName(type, item.id), name }))
  }

  function openPick(type, item, miss = '') {
    const cost = item.gems ? gemLine(item.gems) : coinLine(item.coins)
    publishSheet({
      preview: giftArt(type, item.id, colors, coat),
      kicker: t('gift.kicker', { name }),
      title: tileName(type, item.id),
      body: miss || `${cost}\n${t('gift.howItWorks')}`,
      quote: note.trim(),
      goLabel: t('gift.send'),
      onGo: () => send(type, item),
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
    })
  }

  if (account.ready && !account.user) {
    return (
      <BoardShell book={book} title={t('gift.title')} date={shellDate(book)} colors={colors}>
        <Meta colors={colors}>{t('gift.needAccount')}</Meta>
        <DidButton colors={colors} label={t('we.signIn')} onPress={() => goHash('/account')} />
      </BoardShell>
    )
  }
  if (person === null) {
    return (
      <BoardShell book={book} title={t('gift.title')} date={shellDate(book)} colors={colors}>
        <Meta colors={colors}>{t('gift.nobody')}</Meta>
        <DidButton colors={colors} label={t('people.friends')} onPress={() => goHash('/friends')} />
      </BoardShell>
    )
  }

  return (
    <BoardShell book={book} title={t('gift.title')} date={shellDate(book)} colors={colors}>
      <Meta colors={colors}>{person ? t('gift.to', { name }) : t('family.loading')}</Meta>
      <View style={giftStyles.note}>
        <AppTextInput
          colors={colors}
          value={note}
          onChangeText={(text) => setNote(text.slice(0, 60))}
          maxLength={60}
          placeholder={t('gift.notePlaceholder')}
          accessibilityLabel={t('gift.noteLabel')}
          returnKeyType="done"
        />
        <Text style={[giftStyles.count, { color: colors.inkDim }]}>{note.length}/60</Text>
      </View>
      {sent ? <Text style={[giftStyles.sent, { color: colors.on }]}>{sent}</Text> : null}
      <KitSegment
        items={GIFT_TABS.map((item) => ({ id: item.id, label: t(item.key) }))}
        selected={tab}
        onSelect={setTab}
        colors={colors}
      />
      <View style={giftStyles.grid}>
        {list.map((item) => (
          <ShopTile
            key={item.id}
            type={kind.type}
            item={item}
            purse={NOBODY_OWNS}
            colors={colors}
            onTile={(type, row) => person && openPick(type, row)}
            style={giftStyles.tile}
          />
        ))}
      </View>
      <Meta colors={colors}>{t('gift.howItWorks')}</Meta>
      <KeyButton colors={colors} label={t('gifts.title')} onPress={() => goHash('/gifts')} />
    </BoardShell>
  )
}

// The pop-up for a gift that just arrived. Tapping outside closes it; the
// gift is already in the collection either way.
function showGift(gift, getBook, onChange, colors) {
  const type = sentGiftType(gift)
  const name = gift.from_name || t('people.someone')
  const tab = giftTab(type)
  const done = () => {
    publishSheet(null)
    doneGift(gift.id)
  }
  publishSheet({
    preview: giftArt(type, gift.item_id, colors, activeLook(getBook()), normalizePurse(getBook())),
    kicker: t('gift.gotKicker', { name }),
    title: tileName(type, gift.item_id),
    body: t('gift.gotBody'),
    quote: gift.note || '',
    goLabel: t('gift.equip'),
    onGo: () => {
      onChange(wearGift(getBook(), type, gift.item_id))
      done()
    },
    moreLabel: t('gift.viewKit'),
    onMore: () => {
      done()
      goHash(`/kit?id=${tab}`)
    },
    ...(gift.note
      ? {
          footLabel: t('gift.report'),
          onFoot: () => {
            publishSheet({
              title: t('gift.reportTitle'),
              body: t('gift.reportBody', { name }),
              goLabel: t('gift.reportGo'),
              closeLabel: t('settings.neverMind'),
              colors,
              onGo: () => {
                reportGift(gift.id).catch(() => {})
                done()
                confirmDone(t('confirm.reported'))
              },
              onClose: () => showGift(gift, getBook, onChange, colors),
            })
          },
        }
      : {}),
    // No Close button: tapping outside closes it.
    noClose: true,
    center: true,
    closeLabel: t('settings.close'),
    colors,
    onClose: done,
  })
}

// Mounted once in the app shell. Shows waiting gifts one at a time.
export function GiftHost({ book, onChange }) {
  const colors = useShopColors(book)
  const bookRef = useRef(book)
  bookRef.current = book
  const changeRef = useRef(onChange)
  changeRef.current = onChange
  const colorsRef = useRef(colors)
  colorsRef.current = colors
  const [gift, setGift] = useState(() => nextGift())
  const giftId = gift?.id || ''

  useEffect(() => onGift((next) => setGift(next)), [])

  useEffect(() => {
    if (!gift) return undefined
    const timer = setTimeout(() => {
      showGift(gift, () => bookRef.current, (next) => changeRef.current(next), colorsRef.current)
    }, 600)
    return () => clearTimeout(timer)
  }, [giftId]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

const giftStyles = StyleSheet.create({
  note: { gap: 4 },
  count: { fontFamily: fonts.ui, fontSize: 12, alignSelf: 'flex-end' },
  sent: { fontFamily: fonts.uiBold, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31%', flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 10 },
  rowArt: { width: 56, alignItems: 'center' },
  rowCopy: { flex: 1, gap: 2 },
  rowName: { fontFamily: fonts.uiBold, fontSize: 15 },
  rowMeta: { fontFamily: fonts.ui, fontSize: 13 },
})

// /gifts: what you have sent, and whether it was opened or sent back.
export function GiftsSentScreen({ book }) {
  const colors = useShopColors(book)
  const [list, setList] = useState(null)
  const [miss, setMiss] = useState('')

  useEffect(() => {
    let alive = true
    listSentGifts().then((out) => {
      if (!alive) return
      setList(out.rows)
      if (out.miss === 'out') setMiss(t('gift.needAccount'))
      else if (out.miss) setMiss(tMiss(out.miss))
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <BoardShell book={book} title={t('gifts.title')} date={shellDate(book)} colors={colors}>
      {miss ? <Meta colors={colors}>{miss}</Meta> : null}
      {list === null ? <Meta colors={colors}>{t('family.loading')}</Meta> : null}
      {list && !list.length && !miss ? (
        <>
          <Meta colors={colors}>{t('gifts.none')}</Meta>
          <DidButton colors={colors} small label={t('people.friends')} onPress={() => goHash('/friends')} />
        </>
      ) : null}
      {(list || []).map((row) => {
        const type = sentGiftType(row)
        const name = personName(row.person) || t('people.someone')
        return (
          <Pressable
            key={row.id}
            onPress={() => goHash('/gift', { id: row.to_id })}
            accessibilityRole="button"
            accessibilityLabel={t('gifts.rowLabel', { item: tileName(type, row.cheer_id), name })}
            style={[giftStyles.row, { borderColor: colors.line, backgroundColor: colors.panel }]}
          >
            <View style={giftStyles.rowArt}>
              <TileArt type={type} id={row.cheer_id} colors={colors} />
            </View>
            <View style={giftStyles.rowCopy}>
              <Text style={[giftStyles.rowName, { color: colors.ink }]} numberOfLines={1}>
                {t('gifts.to', { item: tileName(type, row.cheer_id), name })}
              </Text>
              <Text style={[giftStyles.rowMeta, { color: colors.inkDim }]} numberOfLines={1}>
                {sentGiftDate(row)} · {sentGiftStatus(row)}
              </Text>
              {row.note ? (
                <Text style={[giftStyles.rowMeta, { color: colors.inkSoft }]} numberOfLines={2}>
                  {row.note}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )
      })}
    </BoardShell>
  )
}
