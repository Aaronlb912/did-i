import { holdFor } from '../../src/lib/cheer-pops.js'
import Constants from 'expo-constants'
import { FadeScroll } from '../components/FadeScroll.jsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Reanimated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated'
import { restoreGemPurchases, startGemPurchase } from '../../src/lib/gem-buy.js'
import { isReactNative } from '../../src/lib/env.js'
import { initGemIap, iapReady, storePrice } from '../../src/lib/gem-iap.js'
import { GEM_PACKS } from '../../src/lib/gem-packs.js'
import { activeLook } from '../../src/lib/active-look.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { feelTap } from '../../src/lib/native.js'
import {
  buddiesOnOrOwned,
  looksOnOrOwned,
  seasonNext,
  cheersOnOrOwned,
  freeLastDay,
  SPECIAL_CHEERS,
  shopBuddies,
  BUDDY_GEMS,
  buyCheerStage,
  buyLook,
  liveCheers,
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
  liveLooks,
  lookText,
  fireCheer,
  nextCheerStage,
  normalizePurse,
  dropSlides,
  isTeased,
  giftItems,
  shopTag,
  stampPurse,
  mergeGift,
  wearGift,
  wearBuddy,
  wearCheer,
  wearCheerStage,
  wearAccessory,
  NIGHT_COIN_CAP,
  isLive,
  isSeasonal,
  isWished,
  offSeason,
  ownedLast,
  shopRow,
  toggleWish,
  wishItem,
} from '../../src/lib/purse.js'
import { usePrefs, useTheme, writePrefs } from '../../src/lib/prefs.js'
import {
  AccessoryChip,
  BuddyChip,
  BuddyHang,
  CheerChip,
  LookChip,
} from '../components/Cosmetic.jsx'
import { BoardShell } from '../components/BoardShell.jsx'
import { AppTextInput, DidButton, KeyButton, LateMeta, Meta } from '../components/ui.jsx'
import { useAccount } from '../../src/lib/account.js'
import { KEEP, useKept } from '../hooks/useKept.js'
import { PersonAvatar } from '../components/PersonAvatar.jsx'
import { listSentGifts, newRequestId, personName, readKnownPerson, reportGift, sendGift, thankGift } from '../../src/lib/people.js'
import { giftTab, sentGiftDate, sentGiftStatus, sentGiftType } from '../../src/lib/gift-history.js'
import { doneGift, nextGift, onGift, takeGiftCheer } from '../../src/lib/gift-inbox.js'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import {
  buyAccessoryWithCoins,
  buyCheerStageWithCoins,
  buyLookWithCoins,
  buyWithGems,
  claimFree,
  SIGN_IN_MISS,
} from '../../src/lib/coin-shop.js'
import { goHash } from '../navigation/hash.js'
import { ACCESSORIES, ACCESSORY_SLOTS, accessoriesForSale, accessoryById, accessoryOnSale } from '../../src/lib/accessories.js'
import { askSignIn, confirmBuy, offerMoreGems, publishSheet } from '../components/SheetHost.jsx'
import { accountSessionOn } from '../../src/lib/session-id.js'
import { CoinIcon, GemFaceMark, GemIcon } from '../components/PurseIcons.jsx'
import { gemGlowHostStyle, gemPanelStyle } from '../lib/gem-look-tone.js'
import { dropToast, showToast } from '../lib/toast-queue.js'
import NetInfo from '@react-native-community/netinfo'
import { KitSegment } from '../components/KitSegment.jsx'
import { FramePreview } from '../components/frames/FramePreview.jsx'
import { CardFrame, useFrameActive } from '../components/frames/index.js'
import { useIsFocused } from '@react-navigation/native'
import { FramesCollection, FramesShopRow, frameCtxFor, frameStatus, framesForSaleCount, framesOwnedCount, leftAfter, liveBook, onLiveBook, openFrameSheet, FrameSheetPreview } from './frames.jsx'
import { frameText } from '../../src/lib/frames.js'
import { fonts } from '../theme.js'
import { useLookColors } from '../hooks/useHallColors.js'
import { flyToKit, kitArtRef, kitCount } from '../lib/kit-flight.js'
import { launchFlight } from '../components/FlyHost.jsx'
import { RollNumber } from '../components/RollNumber.jsx'
import { previewSample, readShelf } from '../../src/lib/board-shelf.js'
import { shelfStreak } from '../../src/lib/hall-feel.js'
import { motionOff, pressFx, Reveal } from '../lib/motion.jsx'

const coinLooks = () => liveLooks().filter((item) => item.coins > 0)
const gemLooks = () => liveLooks().filter((item) => item.gems > 0)
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
  if (next?.miss === SIGN_IN_MISS) {
    askSignIn(colors)
    return true
  }
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

function PreviewButton({ onPress, pressIn = false, selected, colors, children, label }) {
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
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(selected) }}
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

// A gift preview is someone else's card, so it never shows your own questions.
function sampleFor(cap) {
  return cap ? { question: t('shop.buddyPreviewQ'), tag: t('tags.general') } : previewSample()
}

// Collection draws the frame you wear around every preview, like your Home card.
function WornFrame({ frameId, colors, children }) {
  const active = useFrameActive(useIsFocused())
  // Your real streak, so Polaroid's caption matches Home.
  const streak = useMemo(() => shelfStreak(readShelf().boards, new Date()), [])
  if (!frameId) return children
  return (
    <CardFrame id={frameId} colors={colors} active={active} radius={16} streak={streak} answered={3} total={4} weekLit={SAMPLE_WEEK} date={new Date()}>
      {children}
    </CardFrame>
  )
}

// cap: the label over the card ("On their card" for a gift).
// room: Collection's padded box, so every tab's preview is the same size.
function BuddyPreviewCard({ id, colors, cap, room, frameId }) {
  const sample = sampleFor(cap)
  return (
    <View style={styles.buddyPreview}>
      <Cap colors={colors}>{cap || t('shop.buddyPreview')}</Cap>
      <View style={room ? styles.kitPreviewRoom : null}>
        <WornFrame frameId={frameId} colors={colors}>
        <View style={[styles.buddyPreviewCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <BuddyHang id={id} alive />
          <Text style={[styles.buddyPreviewTag, { color: colors.on }]}>{sample.tag}</Text>
          <Text style={[styles.buddyPreviewQ, { color: colors.ink }]}>{sample.question}</Text>
        </View>
        </WornFrame>
      </View>
    </View>
  )
}

// A look shown in its own colours, not the page's ambient ones, so it reads
// true whether the page is peeking a coin look or a gem look.
// buddyId: Collection shows your buddy on every tab, like your Home card.
function LookPreviewCard({ id, cap, room, frameId, buddyId }) {
  const sample = sampleFor(cap)
  const theme = useTheme()
  const colors = useLookColors(id)
  const gemCard = gemPanelStyle(id, theme)
  return (
    <View style={styles.buddyPreview}>
      <Cap colors={colors}>{cap || t('shop.buddyPreview')}</Cap>
      <View style={room ? styles.kitPreviewRoom : null}>
      <WornFrame frameId={frameId} colors={colors}>
      <View style={[styles.buddyPreviewGlow, gemGlowHostStyle(id, theme)]}>
        <View
          style={[
            styles.buddyPreviewCard,
            styles.buddyPreviewCardGem,
            { backgroundColor: colors.panel, borderColor: gemCard ? 'transparent' : colors.line },
            gemCard,
          ]}
        >
          {buddyId ? <BuddyHang id={buddyId} alive /> : null}
          <Text style={[styles.buddyPreviewTag, { color: colors.on }]}>{sample.tag}</Text>
          <Text style={[styles.buddyPreviewQ, { color: colors.ink }]}>{sample.question}</Text>
        </View>
      </View>
      </WornFrame>
      </View>
    </View>
  )
}

// Your card in your look, wearing the frame you have on, like the other
// Collection previews. It moves while this screen is in front.
const SAMPLE_WEEK = [true, true, true, true, false, true, true]

// The same card as the Looks and Cheers tabs, so the frame art (First
// light's moon) and the buddy sit exactly as they do there.
function FramePreviewCard({ lookId, frameId, buddyId }) {
  return <LookPreviewCard id={lookId} room frameId={frameId} buddyId={buddyId} />
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

// A look reads as the same chip as the Looks page; a cheer and a buddy sit
// still. A swaying buddy in every tile redrew its SVG each frame and held the
// Shop at ~5 fps on Android, so only the open sheet animates.
// buddy: who models an accessory, your buddy if one is on.
function TileArt({ type, id, colors, buddy = '' }) {
  if (type === 'accessory') return <AccessoryChip id={id} buddyId={buddy || 'ant'} tone={colors.on} />
  if (type === 'look') return <LookChip id={id} colors={colors} />
  if (type === 'cheer') return <CheerChip id={id} stage={1} colors={colors} />
  if (type === 'frame') return <FramePreview id={id} colors={colors} size={40} />
  return <BuddyChip id={id} />
}

function tileName(type, id) {
  if (type === 'accessory') return t(`accessory.${id}`)
  if (type === 'look') return t(lookText(id, 'name'))
  if (type === 'cheer') return t(cheerText(id, 'name'))
  if (type === 'frame') return t(frameText(id, 'name'))
  return t(buddyText(id, 'name'))
}

function PriceTag({ tag, colors, coming }) {
  if (coming) return <Text style={[styles.tagText, { color: colors.inkDim }]}>{coming}</Text>
  if (tag.owned) {
    return <Text style={[styles.tagText, { color: colors.inkDim }]}>{t('shop.owned')}</Text>
  }
  const n = tag.gems || tag.coins
  if (!n) return tag.free ? <Text style={[styles.tagText, { color: colors.ink }]}>{t('shop.free')}</Text> : null
  return (
    <View style={styles.tagRow}>
      {tag.gems ? <GemIcon size={12} /> : <CoinIcon size={12} />}
      <Text style={[styles.tagText, { color: colors.ink }]}>{n}</Text>
    </View>
  )
}

// The label always sits on the tile's bottom edge: the art area above it is a
// fixed height, so a short chip (Spark) and a tall one line up the same way.
// dim: can't afford it yet. Still tappable, so the sheet can say how many more.
function ShopTile({ type, item, purse, colors, onTile, style, dim, note = '' }) {
  const name = tileName(type, item.id)
  const tag = shopTag(purse, type, item)
  const worn = (type === 'look' && purse.lookOn === item.id) || (type === 'buddy' && purse.buddyOn === item.id) || (type === 'cheer' && purse.cheerOn === item.id)
  const coming = type === 'accessory' && !tag.owned && !accessoryOnSale(item, boardDate(new Date())) ? t('shop.coming', { date: formatBoardDate(seasonNext(item)) }) : ''
  if (note === coming) note = ''
  const price = coming || tag.owned ? coming || t(worn ? 'shop.on' : 'shop.owned') : tag.gems ? gemLine(tag.gems) : tag.coins ? coinLine(tag.coins) : tag.free ? t('shop.free') : ''
  return (
    <Pressable
      onPress={() => onTile(type, item)}
      unstable_pressDelay={100}
      accessibilityRole="button"
      accessibilityLabel={[t('shop.see', { name }), price, note].filter(Boolean).join(', ')}
      style={({ pressed }) => [styles.tile, { borderColor: colors.line, backgroundColor: colors.panel2 }, style, dim && styles.tileDim, pressFx(pressed)]}
    >
      <View style={styles.tileArt}>
        <TileArt type={type} id={item.id} colors={colors} buddy={purse.buddyOn} />
      </View>
      <View style={styles.tileLabel}>
        <Text style={[styles.tileName, { color: colors.ink }]} numberOfLines={1}>
          {name}
        </Text>
        <PriceTag tag={tag} colors={colors} coming={coming} />
        {note ? (
          <Text style={[styles.tileNote, { color: colors.inkDim }]} numberOfLines={1}>
            {note}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

// A wishlist tile's second line: can you buy it now, or how many more.
function wishNeed(type, item, purse) {
  // A seasonal frame is free: say when it is back, or that it is out now.
  if (type === 'frame' && item.kind === 'season') return frameStatus(item, purse, frameCtxFor(readShelf().boards)).text
  // A seasonal accessory off sale: say when it is back, not "Can buy".
  if (type === 'accessory' && !accessoryOnSale(item, boardDate(new Date()))) return t('shop.coming', { date: formatBoardDate(seasonNext(item)) })
  const tag = shopTag(purse, type, item)
  const short = tag.gems ? tag.gems - purse.gems : tag.coins - purse.coins
  if (short <= 0) return t('shop.canBuy')
  return t(tag.gems ? 'shop.moreGems' : 'shop.moreCoins', { n: short })
}

function wishRows(purse) {
  return purse.wish.map((key) => ({ type: key.split(':')[0], item: wishItem(key) })).filter((row) => row.item)
}

function slideHead(slide) {
  if (slide.kind === 'coming') {
    return {
      kicker: slide.days <= 1 ? t('shop.tomorrow') : t('shop.inDays', { n: slide.days }),
      title: t('shop.coming', { date: formatBoardDate(slide.date) }),
    }
  }
  if (slide.kind === 'drop') return { kicker: t('shop.outNow'), title: t('shop.dropOn', { date: formatBoardDate(slide.date) }) }
  return { kicker: t('shop.outNow'), title: t('shop.freshTitle') }
}

// The drop carousel: the Coming drop first, then recent drops. Swipe sideways.
function DropCarousel({ slides, purse, colors, onTile, foot }) {
  // A first guess at the width, so the banner draws on the first frame and
  // the page below does not jump when the real width comes in.
  const [width, setWidth] = useState(() => Math.max(0, Dimensions.get('window').width - 32))
  const [at, setAt] = useState(0)
  const pager = useRef(null)
  const dragFrom = useRef(0)
  // Pass 6 wrapped this pager in a gesture-handler pan (minVelocityX 500).
  // That pan began on every touch down and, once it saw sideways movement,
  // claimed the touch for the gesture-handler root, which cancels the native
  // horizontal ScrollView under it. Its own page math then only fired past
  // 500 px/s, so slow left drags did nothing and fast ones were eaten too.
  // Plain native paging owns the touch now, in both directions.
  if (!slides.length) return null
  // A FlatList pager with plain pagingEnabled. The old ScrollView set the page
  // on every scroll event, so the first drag re-rendered every slide and
  // changed the height under the banner mid-gesture (the hidden push link),
  // and snapToInterval + disableIntervalMomentum on top of paging made a
  // short fast fling snap back. Now the page only changes when it settles.
  const settle = (e) => {
    const n = Math.round(e.nativeEvent.contentOffset.x / width)
    if (n !== at) setAt(n)
  }
  // Native snapping (pagingEnabled, snapToInterval, snapToOffsets) nested in
  // the page scroll on Android only paged forward: a swipe back from page 2
  // settled at 379.05 of 379.43 and snapped to page 2 again. The page is
  // picked here instead, from where the drag began and which way it went.
  const release = (e) => {
    const x = e.nativeEvent.contentOffset.x
    const vx = e.nativeEvent.velocity?.x ?? 0
    const from = Math.round(dragFrom.current / width)
    const dx = x - dragFrom.current
    let n = from
    if (dx > width * 0.15 || (dx > 4 && vx < -0.2)) n = from + 1
    else if (dx < -width * 0.15 || (dx < -4 && vx > 0.2)) n = from - 1
    n = Math.max(0, Math.min(slides.length - 1, n))
    pager.current?.scrollToOffset({ offset: n * width, animated: !motionOff() })
    if (n !== at) setAt(n)
  }
  return (
    <View
      style={styles.carousel}
      onLayout={(e) => {
        const next = e.nativeEvent.layout.width
        if (Math.abs(next - width) > 1) setWidth(next)
      }}
    >
      {width ? (
        <FlatList
          ref={pager}
          data={slides}
          horizontal
          decelerationRate="fast"
          onScrollBeginDrag={(e) => { dragFrom.current = e.nativeEvent.contentOffset.x }}
          onScrollEndDrag={release}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(slide) => `${slide.kind}-${slide.date}`}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          initialNumToRender={slides.length}
          onMomentumScrollEnd={settle}
          renderItem={({ item: slide, index: i }) => {
            const head = slideHead(slide)
            const coming = slide.kind === 'coming'
            return (
              <View
                accessibilityLabel={t('shop.slideN', { n: i + 1, total: slides.length })}
                style={[
                  styles.slide,
                  { width, borderColor: coming ? colors.on : colors.line, backgroundColor: colors.panel },
                ]}
              >
                <Text style={[styles.slideKicker, { color: colors.on }]}>{head.kicker}</Text>
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
                      // A free or earned frame has no price: say how you get it.
                      note={type === 'frame' && !item.coins && !item.gems ? frameStatus(item, purse, frameCtxFor(readShelf().boards)).text : ''}
                    />
                  ))}
                </View>
                {foot ? foot(slide) : null}
              </View>
            )
          }}
        />
      ) : null}
      {slides.length > 1 ? (
        <View style={styles.dots}>
          {/* A dot is a tap target too, so every page is reachable without a swipe. */}
          {slides.map((slide, i) => (
            <Pressable
              key={`dot-${slide.kind}-${slide.date}`}
              accessibilityRole="button"
              accessibilityLabel={t('shop.slideN', { n: i + 1, total: slides.length })}
              accessibilityState={{ selected: i === at }}
              style={styles.dotHit}
              onPress={() => {
                setAt(i)
                pager.current?.scrollToOffset({ offset: i * width, animated: !motionOff() })
              }}
            >
              <View style={[styles.dot, { backgroundColor: i === at ? colors.on : colors.line }]} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

// One kind, side-scrolling: what you can buy first, then what you own (marked
// Owned), so the row always shows what the shop has.
function KindRow({ type, list, cap, allLabel, onAll, purse, colors, onTile }) {
  const buy = shopRow(type, list, purse)
  const today = boardDate(new Date())
  const onSale = (item) => (type === 'accessory' ? accessoryOnSale(item, today) : isLive(item, today))
  const sorted = [...buy, ...ownedLast(type, list.filter((item) => onSale(item) && !buy.includes(item)), purse)]
  return (
    <View style={styles.promoShelf}>
      <View style={styles.promoHead}>
        <Cap colors={colors}>{cap}</Cap>
        <Pressable accessibilityRole="button" onPress={onAll} style={styles.promoAllHit}>
          <Text style={[styles.promoAll, { color: colors.on }]}>{allLabel}</Text>
        </Pressable>
      </View>
      {sorted.length ? (
        <FadeScroll fade={colors.bg} nestedScrollEnabled contentContainerStyle={styles.rowScroll}>
          {sorted.map((item) => (
            <ShopTile key={item.id} type={type} item={item} purse={purse} colors={colors} onTile={onTile} style={styles.rowTile} />
          ))}
        </FadeScroll>
      ) : (
        <Meta colors={colors}>{t(`shop.allOwned.${type}`)}</Meta>
      )}
    </View>
  )
}

// Hearted items, right under the drop, so a goal is one tap away.
function SavedRow({ purse, colors, onTile }) {
  const saved = wishRows(purse)
  if (!saved.length) return null
  return (
    <View style={styles.promoShelf}>
      <View style={styles.promoHead}>
        <Cap colors={colors}>{t('shop.wishTitle')}</Cap>
        <Pressable accessibilityRole="button" onPress={() => goHash('/kit', { id: 'wish' })} style={styles.promoAllHit}>
          <Text style={[styles.promoAll, { color: colors.on }]}>{t('shop.wishTab')}</Text>
        </Pressable>
      </View>
      <FadeScroll fade={colors.bg} nestedScrollEnabled contentContainerStyle={styles.rowScroll}>
        {saved.map(({ type, item }) => (
          <ShopTile key={`${type}-${item.id}`} type={type} item={item} purse={purse} colors={colors} onTile={onTile} style={styles.rowTile} note={wishNeed(type, item, purse)} />
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
      accessibilityRole="button"
      accessibilityLabel={typeof title === 'string' ? title : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.shopDoor, { borderBottomColor: colors.line, backgroundColor: colors.panel }, pressFx(pressed)]}
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
      preview: confirm.preview,
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

function ShopActionRow({ name, note, info, miss, actionLabel, onAction, colors, primary, disabled, nested, preview, onPreview, previewOn, previewPressIn, artKey, extra }) {
  const artRef = useMemo(() => (artKey ? kitArtRef(artKey) : undefined), [artKey])
  const art = preview
    ? onPreview
      ? (
        <PreviewButton onPress={onPreview} pressIn={previewPressIn} selected={previewOn} colors={colors} label={typeof name === 'string' ? t('a11y.preview', { name }) : undefined}>
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
        {extra || null}
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
            accessibilityRole="button"
            accessibilityLabel={t('shop.stage', { n })}
            accessibilityHint={have ? undefined : n > owned + 1 ? t('shop.stageBuyFirst', { n: owned + 1 }) : t('shop.stageCost', { cost: coinLine(CHEER_STAGE_COINS[n]) })}
            accessibilityState={{ disabled: !have, selected: using }}
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
            <Text style={{ color: using ? colors.on : colors.ink, fontFamily: fonts.uiSemi, fontSize: 13 }}>{n}</Text>
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
      style={({ pressed }) => [styles.gemFeatured, { borderColor: best ? colors.onDeep : colors.line, backgroundColor: colors.panel }, pressFx(pressed)]}
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
          <Text style={[styles.gemFeaturedButtonText, { color: colors.bg }]}>{price ? t('gems.buyPrice', { price }) : t('gems.loadingStore')}</Text>
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
        {bonusNote ? <Text style={[styles.shopNote, { color: colors.inkDim }]}>{bonusNote}</Text> : null}
        {onBuy ? null : <Text style={[styles.shopNote, { color: colors.inkDim }]}>{price}</Text>}
      </View>
      {onBuy ? <DidButton small label={price ? t('gems.buyPrice', { price }) : t('gems.loadingStore')} onPress={onBuy} colors={colors} /> : null}
    </View>
  )
}

// A Coming item: when it goes on sale and what it will cost.
function teasedBody(item) {
  if (item.free) return t('shop.teasedFree', { date: formatBoardDate(item.from), until: formatBoardDate(freeLastDay(item)) })
  const cost = item.gems ? gemLine(item.gems) : item.coins ? coinLine(item.coins) : ''
  return [t('shop.teasedBody', { date: formatBoardDate(item.from) }), cost].filter(Boolean).join('\n')
}

// "Free until Sat, Oct 31" for an event item you do not own yet.
function freeLine(item) {
  return t('shop.freeUntil', { date: formatBoardDate(freeLastDay(item)) })
}

// coinsFor(): up to two paid taps of up to two coins each.

function previewBody(type, item, purse) {
  const tag = shopTag(purse, type, item)
  if (tag.owned) return t('shop.owned')
  if (tag.free) return freeLine(item)
  const base = tag.gems ? gemLine(tag.gems) : coinLine(tag.coins)
  if (tag.coins && purse.coins < tag.coins) {
    const short = tag.coins - purse.coins
    return `${base}\n${t('shop.needMoreCoins', { n: short })} ${t('shop.howEarn', { cap: NIGHT_COIN_CAP })}`
  }
  if (tag.gems && purse.gems < tag.gems) return `${base}\n${t('shop.needMoreGems', { n: tag.gems - purse.gems })}`
  return base
}

// Play shows a cheer once, owned or not. With less motion on it shows a
// still frame and a line about what the cheer does instead of the burst.
function CheerPlay({ id, coat, colors, stage = 1 }) {
  const [still, setStill] = useState(false)
  function play() {
    if (motionOff()) {
      setStill((on) => !on)
      return
    }
    fireCheer(id, stage, coat, undefined, true)
  }
  return (
    <View style={styles.cheerPlayWrap}>
      <Pressable
        onPress={play}
        accessibilityRole="button"
        accessibilityLabel={t('shop.cheerPlayA11y', { name: t(cheerText(id, 'name')) })}
        style={({ pressed }) => [styles.cheerPlay, { borderColor: colors.line, backgroundColor: colors.panel2 }, pressFx(pressed)]}
      >
        <Text style={[styles.cheerPlayText, { color: colors.ink }]}>{t('shop.cheerPlay')}</Text>
      </Pressable>
      {still ? (
        <Reveal style={styles.cheerStill}>
          <CheerChip id={id} stage={stage} colors={colors} />
          <Text style={[styles.shopNote, styles.cheerStillText, { color: colors.inkDim }]}>{t('shop.cheerStill')}</Text>
        </Reveal>
      ) : null}
    </View>
  )
}

function CheerSheetPreview({ id, coat, colors }) {
  // The cheer plays on a loop while the sheet is open (owner call), as it
  // used to; Play still runs it at once.
  useEffect(() => {
    if (motionOff()) return undefined
    const play = () => fireCheer(id, 1, coat, undefined, true)
    play()
    const timer = setInterval(play, holdFor(id, 1) + 260)
    return () => clearInterval(timer)
  }, [id, coat])
  // No Play button: the loop is the preview (owner call). With less motion
  // there is no loop, so the still chip shows instead.
  if (!motionOff()) return null
  return (
    <View style={styles.cheerSheetPreview}>
      <View style={styles.cheerStill}>
        <CheerChip id={id} stage={1} colors={colors} />
        <Text style={[styles.shopNote, styles.cheerStillText, { color: colors.inkDim }]}>{t('shop.cheerStill')}</Text>
      </View>
    </View>
  )
}

// Tapping any item opens the real thing at full size: the look's own card,
// the buddy in its hang, or the cheer playing on a loop while the sheet is
// open, plus its price and, when short on coins, how to earn the rest.
// `action` is the item's own Buy or Use, so the preview is never a dead end.
// `wish`: { on, toggle } shows a heart for an item not owned yet.
function openTilePreview(type, item, purse, colors, coat, action, miss = '', wish = null) {
  const name = tileName(type, item.id)
  // Short on coins: keep the price and the earn line, not just the miss.
  const tag = shopTag(purse, type, item)
  const short = !tag.owned && tag.coins > 0 && purse.coins < tag.coins
  const body = miss && !action ? miss : short ? previewBody(type, item, purse) : miss || previewBody(type, item, purse)
  let preview = null
  if (type === 'cheer') preview = <CheerSheetPreview id={item.id} coat={coat} colors={colors} />
  else if (type === 'look') preview = <LookPreviewCard id={item.id} />
  else if (type === 'buddy') preview = <BuddyPreviewCard id={item.id} colors={colors} />
  else if (type === 'accessory') preview = <AccessoryPreviewCard id={item.id} purse={purse} colors={colors} />
  // A Coming frame opens here, not its own sheet, so it needs the same live card.
  else if (type === 'frame') preview = <FrameSheetPreview id={item.id} colors={colors} ctx={frameCtxFor(readShelf().boards)} />
  publishSheet({
    preview,
    title: name,
    body,
    ...(wish && !tag.owned ? { moreLabel: wish.on ? `♥ ${t('shop.wishOn')}` : `♡ ${t('shop.wishAdd')}`, moreSizeLabels: [`♥ ${t('shop.wishOn')}`, `♡ ${t('shop.wishAdd')}`], onMore: wish.toggle } : {}),
    ...(action ? { goLabel: action.label, onGo: action.go } : short ? { goLabel: t('tonight.backToStack'), onGo: () => { publishSheet(null); goHash('/tonight') } } : {}),
    closeLabel: t('settings.close'),
    colors,
    onClose: () => publishSheet(null),
  })
}

// A shop tile's tap: its sheet with Buy or Use and the wishlist heart. The
// shop and Collection's wishlist share it.
function useTileTap(book, onChange, colors, coat, purse) {
  // The preview already shows the price, so its Buy is the confirm step.
  function done(type, item, out, bought) {
    const next = onLiveBook(out)
    if (shortOnGems(next, colors)) return
    if (next.miss) {
      openTilePreview(type, item, purse, colors, coat, tileAction(type, item), shopMiss(next), wishFor(type, item))
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
    } else if (type === 'look' || type === 'buddy' || type === 'frame') {
      // Put on: the sheet closes, so say it took.
      confirmDone(t('confirm.wearing', { name: tileName(type, item.id) }))
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
        if (tag.gems > 0 && !accountSessionOn()) {
          publishSheet(null)
          askSignIn(colors)
          return
        }
        if (needGems()) return
        // Short on coins: the buy turns itself down and the preview says why.
        if (tag.coins > 0 && purse.coins < tag.coins) return done(type, item, await spend(), true)
        confirmBuy(colors, {
          title: tileName(type, item.id),
          body: `${t(BUY_BODY[type], { cost: tag.gems ? gemLine(tag.gems) : coinLine(tag.coins) })} ${leftAfter(purse, tag)}`,
          onGo: () => goOnce(async () => done(type, item, await spend(), true)),
        })
      },
    })
    // A free event item: no price, so no confirm step. A miss shows in the sheet.
    const claimNow = () => ({
      label: t('shop.claimFree'),
      go: async () => done(type, item, await claimFree(liveBook(book), type, item.id), true),
    })
    if (type === 'look') {
      if (purse.lookOn === item.id) return null
      if (tag.owned) return { label: t('shop.use'), go: () => done(type, item, wearLook(liveBook(book), item.id), false) }
      return buy(() => buyLookWithCoins(liveBook(book), item.id))
    }
    if (type === 'buddy') {
      if (purse.buddyOn === item.id) return null
      if (tag.owned) return { label: t('shop.use'), go: () => done(type, item, wearBuddy(book, item.id), false) }
      if (tag.free) return claimNow()
      return buy(() => buyWithGems(liveBook(book), 'buddy', item.id))
    }
    if (type === 'accessory') {
      if (tag.owned) {
        const on = purse.worn[item.slot] === item.id
        return { label: on ? t('shop.takeOff') : t('shop.use'), go: () => done(type, item, wearAccessory(liveBook(book), item.id), false) }
      }
      return buy(() => buyAccessoryWithCoins(liveBook(book), item.id))
    }
    if (tag.free) return claimNow()
    // Cheers bought with coins come in stages, which only the cheers page shows.
    if (tag.owned || !(item.gems > 0)) {
      return {
        label: t('shop.buyOnCheers'),
        go: () => {
          publishSheet(null)
          goHash('/shop/cheers')
        },
      }
    }
    return buy(() => buyWithGems(liveBook(book), 'cheer', item.id))
  }

  // The heart flips in place: save the book, then reopen the same sheet with it.
  function wishFor(type, item, from = book) {
    const on = isWished(normalizePurse(from), type, item.id)
    return {
      on,
      toggle: () => {
        const next = onLiveBook(toggleWish(liveBook(from), type, item.id))
        if (next.miss) {
          confirmMiss(shopMiss(next))
          return
        }
        const nextPurse = normalizePurse(next.book)
        const teased = isTeased(item)
        // Flip the label first; the save re-renders the whole shop, so it
        // waits a frame and the sheet answers the tap at once.
        openTilePreview(
          type,
          item,
          nextPurse,
          colors,
          coat,
          teased ? null : tileAction(type, item),
          teased ? teasedBody(item) : '',
          wishFor(type, item, next.book),
        )
        requestAnimationFrame(() => setTimeout(() => onChange(next.book), 0))
      },
    }
  }

  function onTile(type, item) {
    // A Coming item is a look only: say when it goes on sale, no Buy.
    if (isTeased(item)) {
      openTilePreview(type, item, purse, colors, coat, null, teasedBody(item), wishFor(type, item))
      return
    }
    openTilePreview(type, item, purse, colors, coat, tileAction(type, item), '', wishFor(type, item))
  }

  return onTile
}

export function ShopScreen({ book, onChange }) {
  const colors = useShopColors(book)
  const prefs = usePrefs()
  const purse = normalizePurse(book)
  const coat = activeLook(book)
  const slides = dropSlides(undefined, { frames: true })
  const accessoryList = accessoriesForSale(boardDate(new Date()))
  const rows = [
    { type: 'look', list: liveLooks(), cap: t('shop.looks'), allLabel: t('shop.allLooks'), path: '/shop/looks' },
    { type: 'cheer', list: liveCheers(), cap: t('shop.cheers'), allLabel: t('shop.allCheers'), path: '/shop/cheers' },
    { type: 'buddy', list: shopBuddies(), cap: t('shop.buddies'), allLabel: t('shop.allBuddies'), path: '/shop/buddies' },
    { type: 'accessory', list: accessoryList, cap: t('shop.accessories'), allLabel: t('shop.allAccessories'), path: '/shop/accessories' },
  ]
  // Nothing left to buy anywhere: one line, not four empty rows.
  const ownAll = rows.every((row) => !shopRow(row.type, row.list, purse).length) && !framesForSaleCount(book)
  const lookCount = purse.looks.length
  const cheerCount = purse.cheers.length
  const buddyCount = purse.buddies.length

  const onTile = useTileTap(book, onChange, colors, coat, purse)

  return (
    <BoardShell book={book} title={t('shop.title')} date={shellDate(book)} colors={colors} showPurse>
      <DropCarousel
        slides={slides}
        purse={purse}
        colors={colors}
        // A frame opens its own sheet, which claims a holiday frame for free and
        // shows how an earned one is earned. A Coming one is only a look.
        onTile={(type, item) =>
          type === 'frame' && !isTeased(item)
            ? openFrameSheet({ id: item.id, book, colors, ctx: frameCtxFor(readShelf().boards), onChange })
            : onTile(type, item)
        }
        // The link sits inside the coming page only. Pages share one height,
        // so nothing below jumps on a swipe and other pages keep no blank strip.
        foot={(slide) => {
          if (prefs.dropPings || slide?.kind !== 'coming') return null
          return (
            <KeyButton colors={colors} label={t('shop.dropPingLink')} onPress={() => goHash('/pings')} />
          )
        }}
      />

      <Reveal layout={false} style={styles.shopBelow}>
      <SavedRow purse={purse} colors={colors} onTile={onTile} />

      {ownAll ? <Meta colors={colors}>{t('shop.ownAll')}</Meta> : null}
      <FramesShopRow book={book} colors={colors} onChange={onChange} />
      {rows.map((row) => (
        <KindRow key={row.type} type={row.type} list={row.list} cap={row.cap} allLabel={row.allLabel} onAll={() => goHash(row.path)} purse={purse} colors={colors} onTile={onTile} />
      ))}

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
          meta={t('shop.ownedN', { n: lookCount + cheerCount + buddyCount + purse.accessories.length + framesOwnedCount(book).n })}
          onPress={() => goHash('/kit')}
        />
      </View>
      </Reveal>
    </BoardShell>
  )
}

// One shop buy at a time: a second confirm while the first is still on the
// network would send a second buy.
let shopBuying = false
async function goOnce(go) {
  if (typeof go !== 'function') return
  if (shopBuying) {
    showToast({ id: 'shop-buying', kind: 'error', text: t('shop.stillBuying'), ms: 2500 })
    return
  }
  shopBuying = true
  let offline = false
  try {
    const net = await NetInfo.fetch().catch(() => null)
    offline = Boolean(net && (!net.isConnected || net.isInternetReachable === false))
    if (offline) return
    showToast({ id: 'shop-buying', kind: 'done', text: t('shop.buying'), ms: 60000 })
    await go()
  } finally {
    shopBuying = false
    if (offline) showToast({ id: 'shop-buying', kind: 'error', text: t('shop.offline'), ms: 3000 })
    else dropToast('shop-buying')
  }
}

export function ShopLooksScreen({ book, onChange }) {
  const [peekLook, setPeekLook] = useState('')
  const colors = useShopColors(book, peekLook)
  const purse = normalizePurse(book)
  const [miss, setMiss] = useState(NO_MISS)
  const [confirm, setConfirm] = useState(null)

  function take(out, id, bought = false) {
    const next = onLiveBook(out)
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
        extra={
          miss.id === item.id && !have && !item.gems && !isWished(purse, 'look', item.id) ? (
            <Pressable accessibilityRole="button" onPress={() => onChange(onLiveBook(toggleWish(liveBook(book), 'look', item.id)).book)} style={[styles.wishBtn, { borderColor: colors.line }]}>
              <Text style={[styles.wishText, { color: colors.on }]}>{`♡ ${t('shop.wishAdd')}`}</Text>
            </Pressable>
          ) : null
        }
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
          if (!item.gems && purse.coins < item.coins) {
            const short = item.coins - purse.coins
            setMiss({ id: item.id, text: `${t('shop.needMoreCoins', { n: short })} ${t('shop.earnCoins', { cap: NIGHT_COIN_CAP })}` })
            return
          }
          setMiss(NO_MISS)
          setConfirm({
            title: t(lookText(item.id, 'name')),
            body: `${t('shop.buyLookBody', { cost })} ${leftAfter(purse, item)}`,
            go: async () => {
              const next = await buyLookWithCoins(liveBook(book), item.id)
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
      {ownedLast('look', coinLooks(), purse).map(lookRow)}

      <Cap colors={colors}>{t('shop.looksGems')}</Cap>
      {ownedLast('look', gemLooks(), purse).map(lookRow)}

      <BuyConfirm
        confirm={confirm}
        colors={colors}
        onClose={() => setConfirm(null)}
        onGo={() => {
          const go = confirm?.go
          setConfirm(null)
          goOnce(go)
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

  function take(out, id, bought = false) {
    const next = onLiveBook(out)
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

      {ownedLast('cheer', liveCheers(), purse).map((item) => {
        const have = purse.cheers.includes(item.id)
        const stage = cheerStageOf(book, item.id)
        const next = have ? nextCheerStage(stage) : 0
        const free = item.free && !have
        let actionLabel = free ? t('shop.claimFree') : t('shop.buy')
        let onAction = () => {
          if (free) {
            setMiss(NO_MISS)
            claimFree(liveBook(book), 'cheer', item.id).then((out) => take(out, item.id, true))
            return
          }
          if (purse.gems < item.gems) {
            offerMoreGems(colors)
            return
          }
          setMiss(NO_MISS)
          setConfirm({
            title: t(cheerText(item.id, 'name')),
            body: `${t('shop.buyCheerBody', { cost: gemLine(item.gems) })} ${leftAfter(purse, item)}`,
            go: async () => take(await buyWithGems(liveBook(book), 'cheer', item.id), item.id, true),
          })
        }
        let disabled = false
        let primary = false

        if (have) {
          if (next) {
            actionLabel = t('shop.nextStage')
            onAction = () => {
              if (purse.coins < CHEER_STAGE_COINS[next]) {
                const short = CHEER_STAGE_COINS[next] - purse.coins
                setMiss({ id: item.id, text: `${t('shop.needMoreCoins', { n: short })} ${t('shop.earnCoins', { cap: NIGHT_COIN_CAP })}` })
                return
              }
              setMiss(NO_MISS)
              setConfirm({
                title: t(cheerText(item.id, 'name')),
                body: `${t('shop.buyStageBody', { n: next, cost: coinLine(CHEER_STAGE_COINS[next]) })} ${leftAfter(purse, { coins: CHEER_STAGE_COINS[next] })}`,
                preview: (
                  <View style={styles.stagePreview}>
                    <CheerChip id={item.id} stage={next} colors={colors} />
                    <CheerPlay id={item.id} coat={coat} colors={colors} stage={next} />
                  </View>
                ),
                go: async () => {
                  const out = await buyCheerStageWithCoins(liveBook(book), item.id)
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
            onPreview={() => {
              if (!motionOff()) fireCheer(item.id, 1, coat, undefined, true)
            }}
            previewPressIn
            extra={<CheerPlay id={item.id} coat={coat} colors={colors} />}
            name={t(cheerText(item.id, 'name'))}
            info={t(cheerText(item.id, 'line'))}
            note={free ? freeLine(item) : undefined}
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
          goOnce(go)
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

  function take(out, id, bought = false) {
    const next = onLiveBook(out)
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

      {ownedLast('buddy', shopBuddies(), purse).map((item) => {
        const have = purse.buddies.includes(item.id)
        const on = purse.buddyOn === item.id
        const free = item.free && !have
        const label = on ? t('shop.takeOff') : have ? t('shop.use') : free ? t('shop.claimFree') : t('shop.buy')
        return (
          <ShopActionRow
            key={item.id}
            colors={colors}
            preview={<BuddyChip id={item.id} alive={peekBuddy === item.id} />}
            artKey={`buddy:${item.id}`}
            previewOn={peekBuddy === item.id}
            onPreview={() => setPeekBuddy(item.id)}
            name={t(buddyText(item.id, 'name'))}
            note={free ? `${t(buddyText(item.id, 'line'))}\n${freeLine(item)}` : t(buddyText(item.id, 'line'))}
            miss={miss.id === item.id ? miss.text : ''}
            actionLabel={label}
            primary={on}
            onAction={() => {
              if (on) {
                take(wearBuddy(book, ''), item.id)
                return
              }
              if (have) {
                take(wearBuddy(book, item.id), item.id)
                return
              }
              if (free) {
                setMiss(NO_MISS)
                claimFree(liveBook(book), 'buddy', item.id).then((out) => take(out, item.id, true))
                return
              }
              if (purse.gems < item.gems) {
                offerMoreGems(colors)
                return
              }
              setMiss(NO_MISS)
              setConfirm({
                title: t(buddyText(item.id, 'name')),
                body: `${t('shop.buyBuddyBody', { cost: gemLine(item.gems) })} ${leftAfter(purse, item)}`,
                go: async () => take(await buyWithGems(liveBook(book), 'buddy', item.id), item.id, true),
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
          goOnce(go)
        }}
      />
    </BoardShell>
  )
}

// Your buddy (or the ant, if none is on) with what it has on, plus the item
// being looked at, so you see the whole outfit before buying.
function AccessoryPreviewCard({ id, purse, colors, cap, room, frameId }) {
  const sample = sampleFor(cap)
  const item = accessoryById(id)
  const worn = item ? { ...purse.worn, [item.slot]: id } : purse.worn
  return (
    <View style={styles.buddyPreview}>
      {cap || room ? <Cap colors={colors}>{cap || t('shop.buddyPreview')}</Cap> : null}
      <View style={room ? styles.kitPreviewRoom : null}>
        <WornFrame frameId={frameId} colors={colors}>
        <View style={[styles.buddyPreviewCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <BuddyHang id={purse.buddyOn || 'ant'} alive worn={worn} tone={colors.on} />
          <Text style={[styles.buddyPreviewTag, { color: colors.on }]}>{sample.tag}</Text>
          <Text style={[styles.buddyPreviewQ, { color: colors.ink }]}>{sample.question}</Text>
        </View>
        </WornFrame>
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
  const allSeason = offSeason(purse)
  const inSlot = (row) => !slotPick || row.item.slot === slotPick
  const season = {
    owned: notOwned ? [] : allSeason.owned.filter(inSlot),
    coming: allSeason.coming.filter(inSlot),
  }
  const shown = forSale.filter(
    (item) => (!slotPick || item.slot === slotPick) && (!notOwned || !purse.accessories.includes(item.id)),
  )

  function take(out, id, bought = false) {
    const next = onLiveBook(out)
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
          {ownedLast('accessory', shown.filter((item) => item.slot === slot), purse).map((item) => {
            const have = purse.accessories.includes(item.id)
            const on = purse.worn[slot] === item.id
            const label = on ? t('shop.takeOff') : have ? t('shop.use') : t('shop.buy')
            const act = () => {
              if (have) {
                take(onLiveBook(wearAccessory(liveBook(book), item.id)), item.id)
                return
              }
              if (purse.coins < item.coins) {
                const short = item.coins - purse.coins
                setMiss({ id: item.id, text: `${t('shop.needMoreCoins', { n: short })} ${t('shop.earnCoins', { cap: NIGHT_COIN_CAP })}` })
                return
              }
              setMiss(NO_MISS)
              setConfirm({
                title: t(`accessory.${item.id}`),
                body: t('shop.buyAccessoryBody', { cost: coinLine(item.coins) }),
                go: async () => take(await buyAccessoryWithCoins(liveBook(book), item.id), item.id, true),
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
                extra={
                  miss.id === item.id && !have && !isWished(purse, 'accessory', item.id) ? (
                    <Pressable accessibilityRole="button" onPress={() => onChange(onLiveBook(toggleWish(liveBook(book), 'accessory', item.id)).book)} style={[styles.wishBtn, { borderColor: colors.line }]}>
                      <Text style={[styles.wishText, { color: colors.on }]}>{`♡ ${t('shop.wishAdd')}`}</Text>
                    </Pressable>
                  ) : null
                }
                actionLabel={label}
                primary={on}
                onAction={act}
              />
            )
          })}
        </View>
      ) : null)}

      {/* Seasonal items come back each year. Owned ones still go on. */}
      {season.owned.length ? (
        <View>
          <Cap colors={colors}>{t('shop.outOfSeason')}</Cap>
          {season.owned.map(({ item, date }) => {
            const on = purse.worn[item.slot] === item.id
            return (
              <ShopActionRow
                key={item.id}
                colors={colors}
                preview={<AccessoryChip id={item.id} buddyId={buddy} tone={colors.on} />}
                artKey={`accessory:${item.id}`}
                name={t(`accessory.${item.id}`)}
                note={`${on ? t('shop.on') : t('shop.owned')} · ${t('shop.seasonBack', { date: formatBoardDate(date) })}`}
                miss={miss.id === item.id ? miss.text : ''}
                actionLabel={on ? t('shop.takeOff') : t('shop.use')}
                primary={on}
                onAction={() => take(onLiveBook(wearAccessory(liveBook(book), item.id)), item.id)}
              />
            )
          })}
        </View>
      ) : null}
      {season.coming.length ? (
        <View>
          <Cap colors={colors}>{t('shop.seasonComingCap')}</Cap>
          {season.coming.map(({ item, date }) => (
            <ShopActionRow
              key={item.id}
              colors={colors}
              preview={<AccessoryChip id={item.id} buddyId={buddy} tone={colors.on} />}
              artKey={`accessory:${item.id}`}
              name={t(`accessory.${item.id}`)}
              note={`${coinLine(item.coins)} · ${t('shop.seasonComing', { date: formatBoardDate(date) })}`}
              actionLabel={t('shop.buy')}
              disabled
            />
          ))}
        </View>
      ) : null}

      <BuyConfirm
        confirm={confirm}
        colors={colors}
        onClose={() => setConfirm(null)}
        onGo={() => {
          const go = confirm?.go
          setConfirm(null)
          goOnce(go)
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
    dropBuy: () => {
      bought.current = null
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
  const [restoring, setRestoring] = useState(false)

  // Restore asks the store for paid packs not yet credited, then the server.
  async function restore() {
    if (restoring) return
    if (account.ready && !account.user) {
      goHash('/account')
      return
    }
    setRestoring(true)
    try {
      const out = await restoreGemPurchases()
      if (out.miss === 'signin') confirmMiss(t('gems.restoreSignIn'))
      else if (out.miss === 'setup' || out.miss === 'app') confirmMiss(t('gems.restoreSetup'))
      else if (out.miss === 'pending') confirmDone(t('gems.pending'))
      else if (out.miss) confirmMiss(t('gems.restoreMiss'))
      else if (out.gems > 0) confirmDone(t('gems.restored', { n: out.gems }))
      else confirmDone(t('gems.restoreNone'))
    } catch {
      confirmMiss(t('gems.restoreMiss'))
    } finally {
      setRestoring(false)
    }
  }

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

  // A store failure offers Try again; setup and sign-in misses do not.
  function gemNotice(body, retry) {
    publishSheet({
      title: t('gems.title'),
      body,
      ...(retry ? { goLabel: t('boot.retry'), onGo: () => { publishSheet(null); retry() } } : {}),
      closeLabel: t('settings.close'),
      colors,
      onClose: () => publishSheet(null),
    })
  }

  const buying = useRef(false)

  // Gems landed: the waiting banner is done.
  const lastGems = useRef(purse.gems)
  useEffect(() => {
    if (purse.gems > lastGems.current) setBanner('')
    lastGems.current = purse.gems
  }, [purse.gems])

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
      stream.dropBuy()
      setBanner('')
      gemNotice(t('gems.storeError'), () => buy(packId))
      return
    }
    if (out.miss === 'signin') {
      stream.dropBuy()
      setBanner('')
      askSignIn(colors)
      return
    }
    if (out.miss) {
      stream.dropBuy()
      setBanner('')
      // The store's own code goes to the log, not on screen.
      if (out.code) console.warn('gem buy', out.code)
      gemNotice(gemMiss(out.miss), out.miss === 'store' ? () => buy(packId) : null)
      return
    }
    // Cancelled or failed: no gems are coming, so a later rise is not this buy.
    if (!out.pending) stream.dropBuy()
    setBanner(out.pending ? t('gems.pending') : '')
  }

  const signedIn = Boolean(account.email)
  const expoGo = Constants.appOwnership === 'expo'
  const buyHandler = (id) => (!signedIn ? () => askSignIn(colors) : storeReady ? () => buy(id) : null)
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
        <GemIcon size={16} />
        <RollNumber value={stream.shown} reduce={reduce} style={[styles.gemBalanceN, { color: colors.ink }]} />
      </Reanimated.View>
      <Meta colors={colors}>
        {signedIn ? t('gems.hintAppIn') : t('gems.hintApp')} {Platform.OS === 'ios' ? t('gems.priceApple') : t('gems.priceGoogle')}
      </Meta>
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
          price={storePrice(pack.id) || ''}
          bonusNote={pack.bonus ? t('gems.bonus', { base: pack.base, bonus: pack.bonus }) : ''}
          onBuy={buyHandler(pack.id)}
          colors={colors}
          artRef={stream.packRef(pack.id)}
        />
      ))}

      <View style={styles.gemFeaturedRow}>
        {FEATURED_GEM_PACKS.map((pack) => (
          <FeaturedGemCard
            key={pack.id}
            pack={pack}
            price={storePrice(pack.id) || ''}
            bonusNote={pack.bonus ? t('gems.bonus', { base: pack.base, bonus: pack.bonus }) : ''}
            best={pack.id === BEST_VALUE_GEM_ID}
            onBuy={buyHandler(pack.id)}
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
      {isReactNative() ? (
        <KeyButton
          colors={colors}
          disabled={restoring}
          label={restoring ? t('gems.restoring') : t('gems.restore')}
          onPress={restore}
        />
      ) : null}
    </BoardShell>
  )
}

const KIT_TABS = [
  { id: 'looks', key: 'shop.looks' },
  { id: 'frames', key: 'frames.title' },
  { id: 'cheers', key: 'shop.cheers' },
  { id: 'buddies', key: 'shop.buddies' },
  { id: 'accessories', key: 'shop.accessories' },
  { id: 'wish', key: 'shop.wishTab' },
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
function KitTile({ label, worn, onPress, colors, children, big = false, caption = '' }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(worn) }}
      onPress={onPress}
      style={({ pressed }) => [styles.kitTile, { borderColor: colors.lineSoft }, worn && [styles.kitTileWorn, { borderColor: colors.on, backgroundColor: colors.panel2 }], pressFx(pressed)]}>
      <View style={[styles.kitTileChip, big && styles.kitTileChipBig]}>
        {children}
        {worn ? <WornBadge colors={colors} /> : null}
      </View>
      <Text style={[styles.kitTileName, { color: worn ? colors.on : colors.ink }]} numberOfLines={1}>
        {label}
      </Text>
      {caption ? (
        <Text style={[styles.kitTileCaption, { color: colors.inkDim }]} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </Pressable>
  )
}

export function CollectionScreen({ book, onChange, startTab }) {
  const [tab, setTab] = useState(KIT_TABS.some((item) => item.id === startTab) ? startTab : 'looks')
  const frameInfo = framesOwnedCount(book)
  const colors = useShopColors(book)
  const coat = activeLook(book)
  const purse = normalizePurse(book)
  // Shop order, always: a tile never moves under your finger when you wear it.
  const looks = looksOnOrOwned(purse).filter((item) => purse.looks.includes(item.id))
  const buddyPool = buddiesOnOrOwned(purse)
  const cheerPool = cheersOnOrOwned(purse)
  const buddies = buddyPool.filter((item) => purse.buddies.includes(item.id))
  const cheers = [...cheerPool, ...SPECIAL_CHEERS].filter((item) => purse.cheers.includes(item.id))
  const wornCheer = cheers.find((item) => item.id === purse.cheerOn)
  const accessories = ACCESSORIES.filter((item) => purse.accessories.includes(item.id))
  const wished = wishRows(purse)
  const onWishTile = useTileTap(book, onChange, colors, coat, purse)
  // Frames open their own sheet, the same one the Frames pages use.
  const onWish = (type, item) =>
    type === 'frame' ? openFrameSheet({ id: item.id, book, colors, ctx: frameCtxFor(readShelf().boards), onChange }) : onWishTile(type, item)

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
      if (!motionOff()) fireCheer(id, n, coat, undefined, true)
      onChange(next.book)
    }
  }

  const wornNames = ACCESSORY_SLOTS.map((slot) => purse.worn[slot]).filter(Boolean).map((id) => t(`accessory.${id}`))
  const none = t('kit.nothingOn')
  const wearingLine =
    tab === 'looks'
      ? t('kit.wearing', { names: t(lookText(purse.lookOn, 'name')) })
      : tab === 'cheers'
        ? t('kit.using', { name: purse.cheerOn ? t(cheerText(purse.cheerOn, 'name')) : none })
        : tab === 'buddies'
          ? t('kit.wearing', { names: purse.buddyOn ? t(buddyText(purse.buddyOn, 'name')) : none })
          : tab === 'frames'
            ? t('kit.wearing', { names: frameInfo.worn ? t(frameText(frameInfo.worn, 'name')) : none })
            : tab === 'wish'
              ? t('shop.wishTitle')
              : t('kit.wearing', { names: wornNames.length ? wornNames.join(', ') : none })

  // One tile per kind: what you wear in it and how many you own. A tap
  // shows that kind below, so nothing is hidden behind a scrolling row.
  const firstWorn = ACCESSORY_SLOTS.map((slot) => purse.worn[slot]).find(Boolean)
  const offChip = <View style={[styles.kitOffChip, { borderColor: colors.line }]} />
  const kinds = {
    looks: { art: <LookChip id={purse.lookOn} colors={colors} plain={tab !== 'looks'} />, n: looks.length, of: liveLooks().length },
    frames: { art: frameInfo.worn ? <FramePreview id={frameInfo.worn} colors={colors} size={32} /> : offChip, n: frameInfo.n, of: frameInfo.of },
    cheers: { art: purse.cheerOn ? <CheerChip id={purse.cheerOn} stage={1} colors={colors} /> : offChip, n: cheers.length, of: Math.max(cheers.length, cheerPool.length) },
    buddies: { art: purse.buddyOn ? <BuddyChip id={purse.buddyOn} /> : offChip, n: buddies.length, of: buddyPool.length },
    accessories: { art: firstWorn ? <AccessoryChip id={firstWorn} buddyId={purse.buddyOn || 'ant'} tone={colors.on} /> : offChip, n: accessories.length, of: ACCESSORIES.length },
    wish: { art: <Text style={[styles.kindHeart, { color: colors.on }]}>♥</Text>, count: t('kit.wishN', { n: wished.length }) },
  }

  return (
    <BoardShell book={book} title={t('kit.title')} date={shellDate(book)} colors={colors} showPurse>
      <Meta colors={colors}>{t('kit.hint')}</Meta>

      <View style={styles.kindGrid}>
        {KIT_TABS.map((item) => {
          const kind = kinds[item.id]
          const on = tab === item.id
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${t(item.key)}, ${kind.count || t('kit.ownedOf', { n: kind.n, of: kind.of })}`}
              onPress={() => setTab(item.id)}
              style={({ pressed }) => [
                styles.kindTile,
                on ? [styles.kindTileOn, { borderColor: colors.on, backgroundColor: colors.panel2 }] : { borderColor: colors.line, backgroundColor: colors.panel },
                pressFx(pressed),
              ]}
            >
              <View style={styles.kindArt}>{kind.art}</View>
              <View style={styles.kindCopy}>
                <Text style={[styles.kindName, { color: on ? colors.on : colors.ink }]} numberOfLines={1}>{t(item.key)}</Text>
                <Text style={[styles.kindCount, { color: colors.inkDim }]} numberOfLines={1}>
                  {kind.count || t('kit.ownedOf', { n: kind.n, of: kind.of })}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>
      <Reveal key={tab}>
      <Text style={[styles.kitWearing, { color: colors.ink }]}>{wearingLine}</Text>

      {tab === 'wish' ? (
        wished.length ? (
          <View style={styles.wishGrid}>
            {wished.map(({ type, item }) => (
              <ShopTile key={`${type}-${item.id}`} type={type} item={item} purse={purse} colors={colors} onTile={onWish} style={styles.wishTile} note={wishNeed(type, item, purse)} />
            ))}
          </View>
        ) : (
          <View style={[styles.kitGrid, { borderColor: colors.line, backgroundColor: colors.panel }]}>
            <View style={styles.kitEmpty}>
              <Meta colors={colors}>{t('kit.wishEmpty')}</Meta>
              <KeyButton colors={colors} label={t('help.shopGo')} onPress={() => goHash('/shop')} />
            </View>
          </View>
        )
      ) : null}

      {tab === 'frames' ? <FramePreviewCard lookId={purse.lookOn} frameId={frameInfo.worn} buddyId={purse.buddyOn} /> : null}
      {tab === 'frames' ? <FramesCollection book={book} colors={colors} onChange={onChange} /> : null}

      {tab === 'looks' ? (
        <>
        <LookPreviewCard id={purse.lookOn} room frameId={frameInfo.worn} buddyId={purse.buddyOn} />
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
        </>
      ) : null}

      {tab === 'buddies' ? (
        <>
        <BuddyPreviewCard id={purse.buddyOn} colors={colors} room frameId={frameInfo.worn} />
        <View style={[styles.kitGrid, { borderColor: colors.line, backgroundColor: colors.panel }]}>
          {!buddies.length ? (
            <View style={styles.kitEmpty}>
              <Meta colors={colors}>{t('kit.noBuddies')}</Meta>
              <KeyButton colors={colors} label={t('shop.allBuddies')} onPress={() => goHash('/shop/buddies')} />
            </View>
          ) : null}
          {buddies.map((item) => (
            <KitTile
              key={item.id}
              label={t(buddyText(item.id, 'name'))}
              worn={purse.buddyOn === item.id}
              colors={colors}
              onPress={() => wearOn(onLiveBook(wearBuddy(liveBook(book), item.id)), purse.buddyOn === item.id ? '' : t(buddyText(item.id, 'name')))}
            >
              <BuddyChip id={item.id} alive={purse.buddyOn === item.id} />
            </KitTile>
          ))}
          <KitTile
            label={t('kit.buddyOff')}
            worn={!purse.buddyOn}
            colors={colors}
            onPress={() => wearOn(onLiveBook(wearBuddy(liveBook(book), '')), '')}
          >
            <View style={[styles.kitOffChip, { borderColor: colors.line }]} />
          </KitTile>
        </View>
        </>
      ) : null}

      {tab === 'accessories' ? (
        <>
          <AccessoryPreviewCard id="" purse={purse} colors={colors} room frameId={frameInfo.worn} />
          {purse.buddyOn ? null : <Meta colors={colors}>{t('kit.accOnAnt')}</Meta>}
          {!accessories.length ? (
            <View style={[styles.kitGrid, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <View style={styles.kitEmpty}>
                <Meta colors={colors}>{t('kit.noAccessories')}</Meta>
                <KeyButton colors={colors} label={t('shop.allAccessories')} onPress={() => goHash('/shop/accessories')} />
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
                      big
                      caption={isSeasonal(item) ? t('kit.seasonal') : ''}
                      onPress={() =>
                        wearOn(onLiveBook(wearAccessory(liveBook(book), item.id)), purse.worn[item.slot] === item.id ? '' : t(`accessory.${item.id}`))
                      }
                    >
                      <AccessoryChip id={item.id} buddyId={purse.buddyOn || 'ant'} tone={colors.on} big />
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
          <LookPreviewCard id={purse.lookOn} room frameId={frameInfo.worn} buddyId={purse.buddyOn} />
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
      </Reveal>

    </BoardShell>
  )
}

const styles = StyleSheet.create({
  kindGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 4 },
  kindTile: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 60,
  },
  // Selected: a thicker accent border, so a glowing look chip never reads as picked.
  kindTileOn: { borderWidth: 2, paddingHorizontal: 9, paddingVertical: 7 },
  kindArt: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  kindCopy: { flex: 1, minWidth: 0 },
  kindName: { fontFamily: fonts.uiBold, fontSize: 14 },
  kindCount: { fontFamily: fonts.ui, fontSize: 12 },
  kitTileCaption: { fontFamily: fonts.ui, fontSize: 11, maxWidth: '100%' },
  kitWearing: { fontFamily: fonts.uiSemi, fontSize: 14 },
  wishBtn: { alignSelf: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginTop: 8 },
  wishText: { fontFamily: fonts.uiSemi, fontSize: 14 },
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
  cheerPlayWrap: { gap: 8, alignSelf: 'stretch' },
  cheerPlay: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, minHeight: 44, justifyContent: 'center' },
  stagePreview: { alignItems: 'center', gap: 10 },
  cheerPlayText: { fontFamily: fonts.uiSemi, fontSize: 13 },
  cheerStill: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cheerStillText: { flex: 1 },
  cheerSheetPreview: { alignItems: 'center', paddingVertical: 8 },
  // Rows that wait for the slide: the page gap does not reach inside the wrapper.
  shopBelow: { gap: 12 },
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
    minHeight: 44,
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
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Full sheet width, so a gift's card is the same size as the shop's.
  buddyPreview: { gap: 8, marginTop: 4, alignSelf: 'stretch' },
  // Frame art reaches past the card edge; leave it room so nothing is cut.
  // Every Collection tab uses this box, so the preview never changes size.
  kitPreviewRoom: { paddingHorizontal: 14, paddingVertical: 22, minHeight: 216, justifyContent: 'center' },
  filterRow: { gap: 8, paddingVertical: 4, paddingRight: 8 },
  filterChip: { borderWidth: 1, borderRadius: 999, minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' },
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
  dropLink: { alignSelf: 'flex-start', marginTop: 6 },
  ownAllLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 6 },
  promoShelf: { gap: 8, marginTop: 4 },
  carousel: { gap: 8, marginTop: 4 },
  slide: { borderWidth: 1.5, borderRadius: 16, padding: 14, gap: 4 },
  slideKicker: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  slideTitle: { fontFamily: fonts.uiBold, fontSize: 20, marginBottom: 6 },
  // Top-aligned, so every page's tiles start at the same height.
  slideGrid: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', gap: 8 },
  slideTile: { width: '31%', flexGrow: 1 },
  // Each dot owns a 44pt box of its own (not hitSlop, which reached into the tiles above).
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  dotHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  rowScroll: { gap: 8, paddingRight: 4 },
  rowTile: { width: 104 },
  tileDim: { opacity: 0.5 },
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
  tileNote: { fontFamily: fonts.ui, fontSize: 11, textAlign: 'center' },
  wishGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  wishTile: { width: '31%' },
  kindHeart: { fontSize: 22 },
  promoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promoAllHit: { minHeight: 44, justifyContent: 'center' },
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
  // The worn tile gets a ring in place, so a look that glows on its own is not mistaken for it.
  kitTileWorn: { borderWidth: 2, borderRadius: 12 },
  kitTileChip: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  kitTileChipBig: { width: 72, height: 72 },
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
  wornBadgeText: { fontSize: 11, fontWeight: '700', lineHeight: 12 },
  kitTileName: { fontFamily: fonts.uiSemi, fontSize: 11, maxWidth: '100%' },
  kitOffChip: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed' },
  kitEmpty: { width: '100%', padding: 14 },
})

// Gifts ------------------------------------------------------------------

const NOBODY_OWNS = { looks: [], cheers: [], buddies: [], accessories: [], frames: [] }
const GIFT_TABS = [
  { id: 'looks', type: 'look', key: 'shop.looks' },
  { id: 'cheers', type: 'cheer', key: 'shop.cheers' },
  { id: 'buddies', type: 'buddy', key: 'shop.buddies' },
  { id: 'accessories', type: 'accessory', key: 'shop.accessories' },
  { id: 'frames', type: 'frame', key: 'frames.title' },
]

// Nobody's outfit: a gift's accessory shows on the ant, alone.
const BARE = { worn: {}, buddyOn: '' }

// cap: "On their card" when sending, so the label says whose card it is.
function giftArt(type, id, colors, coat, purse = BARE, cap) {
  if (type === 'accessory') return <AccessoryPreviewCard id={id} purse={purse} colors={colors} cap={cap} />
  if (type === 'cheer') return <CheerSheetPreview id={id} coat={coat} colors={colors} />
  if (type === 'look') return <LookPreviewCard id={id} cap={cap} />
  if (type === 'frame') return <FramePreview id={id} colors={colors} size={120} />
  return <BuddyPreviewCard id={id} colors={colors} cap={cap} />
}

function canAfford(item, purse) {
  return item.gems > 0 ? purse.gems >= item.gems : purse.coins >= (item.coins || 0)
}

function giftMiss(why, name) {
  if (why === 'owned') return t('gift.owned', { name })
  if (why === 'giftCap') return t('gift.cap')
  if (why === 'notFriend') return t('gift.notFriend')
  if (why === 'coins') return t('gift.needCoins')
  if (why === 'gone') return t('gift.gone')
  return tMiss(why)
}

// Send a look, cheer, buddy, accessory or gem frame to a friend or family member (/gift?id=...).
// The server takes the gems or coins; they get it next time they open the app.
export function GiftScreen({ book, onChange, toId }) {
  const account = useAccount()
  const colors = useShopColors(book)
  const coat = activeLook(book)
  const purse = normalizePurse(book)
  const [tab, setTab] = useState('looks')
  const [note, setNote] = useState('')
  // Kept: the person shows at once on a second gift, and refreshes quietly.
  const [person, setPerson] = useKept(`gift.person:${account.user?.id}:${toId}`, undefined, KEEP)
  const [lost, setLost] = useState(false)
  const [tries, setTries] = useState(0)
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState(false)
  // The sheet keeps the send from when it opened, so a second tap sees busy as false.
  const sending = useRef(false)
  const attempt = useRef({ key: '', id: '' })
  const items = giftItems()
  const kind = GIFT_TABS.find((item) => item.id === tab)
  const list = items[tab] || []

  useEffect(() => {
    let alive = true
    setLost(false)
    readKnownPerson(toId).then((row) => {
      if (!alive) return
      // undefined = the lookup failed, null = not someone you know.
      if (row === undefined) setLost(true)
      else setPerson(row)
    })
    return () => {
      alive = false
    }
  }, [toId, tries])

  const name = person ? personName(person) || t('people.someone') : ''

  async function send(type, item) {
    if (busy || sending.current) return
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
    sending.current = true
    openPick(type, item, '', true)
    let out
    try {
      const key = `${toId}|${type}|${item.id}|${note}`
      if (attempt.current.key !== key) attempt.current = { key, id: newRequestId() }
      out = await sendGift(toId, type, item.id, note, attempt.current.id)
    } catch {
      sending.current = false
      setBusy(false)
      publishSheet(null)
      confirmMiss(t('confirm.miss'))
      return
    }
    sending.current = false
    setBusy(false)
    // Keep the id only when the answer may have been lost.
    if (!out.miss || ['gems', 'coins', 'giftCap', 'notFriend', 'gone', 'owned', 'setup'].includes(out.miss)) {
      attempt.current = { key: '', id: '' }
    }
    if (out.miss === 'gems') {
      publishSheet(null)
      offerMoreGems(colors)
      return
    }
    if (out.miss) {
      openPick(type, item, giftMiss(out.miss, name))
      return
    }
    publishSheet(null)
    // The gift went; a folder removed meanwhile is not written back.
    const live = readShelf().boards.find((row) => row.id === book.id)
    if (live) onChange(stampPurse(live, { ...normalizePurse(live), gems: out.gems, coins: out.coins }))
    setNote('')
    setSent(t('gift.sent', { item: tileName(type, item.id), name }))
    confirmDone(t('gift.sent', { item: tileName(type, item.id), name }))
  }

  // Short on coins or gems: the same need-more line as the Shop sheet, and
  // Send stays off. The server checks the cost again either way.
  // `sendingNow` dims Send while the gift is on its way, so the tap reads as taken.
  function openPick(type, item, miss = '', sendingNow = false) {
    // The last "Sent" line belongs to the last item, not this one.
    setSent('')
    const cost = item.gems ? gemLine(item.gems) : coinLine(item.coins)
    const short = !canAfford(item, purse)
    const need = item.gems
      ? t('shop.needMoreGems', { n: item.gems - purse.gems })
      : `${t('shop.needMoreCoins', { n: (item.coins || 0) - purse.coins })} ${t('shop.earnCoins', { cap: NIGHT_COIN_CAP })}`
    publishSheet({
      preview: giftArt(type, item.id, colors, coat, BARE, t('gift.preview')),
      kicker: t('gift.kicker', { name }),
      title: tileName(type, item.id),
      body: short ? `${cost}\n${need}` : miss || `${cost}\n${leftAfter(purse, item)} ${t('gift.howItWorks')}`,
      quote: note.trim(),
      goLabel: t('gift.send'),
      goDisabled: short || sendingNow,
      onGo: () => send(type, item),
      ...(short && item.gems
        ? {
            moreLabel: t('gems.shortGo'),
            onMore: () => {
              publishSheet(null)
              goHash('/gems')
            },
          }
        : {}),
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
  if (lost) {
    return (
      <BoardShell book={book} title={t('gift.title')} date={shellDate(book)} colors={colors}>
        <Meta colors={colors}>{t('people.reach')}</Meta>
        <DidButton colors={colors} label={t('gift.retry')} onPress={() => setTries((n) => n + 1)} />
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
    <BoardShell book={book} title={t('gift.title')} date={shellDate(book)} colors={colors} showPurse>
      {person ? (
        <View style={giftStyles.to}>
          <PersonAvatar person={person} colors={colors} size={36} />
          <Text style={[giftStyles.toText, { color: colors.inkSoft }]} numberOfLines={1}>{t('gift.to', { name })}</Text>
        </View>
      ) : (
        <LateMeta colors={colors}>{t('family.loading')}</LateMeta>
      )}
      <View style={giftStyles.note}>
        <AppTextInput
          colors={colors}
          value={note}
          onChangeText={(text) => setNote(text.slice(0, 60))}
          maxLength={60}
          placeholder={t('gift.notePlaceholder')}
          accessibilityLabel={t('gift.noteLabel')}
          style={[giftStyles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.panel2 }]}
          returnKeyType="done"
          blurOnSubmit
        />
        <Text style={[giftStyles.count, { color: colors.inkDim }]}>{note.length}/60</Text>
      </View>
      {sent ? <Text style={[giftStyles.sent, { color: colors.on }]} accessibilityLiveRegion="polite">{sent}</Text> : null}
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
            dim={!canAfford(item, purse)}
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
    content: <GiftThanks id={gift.id} colors={colors} />,
    goLabel: t(type === 'cheer' ? 'gift.useIt' : type === 'buddy' ? 'gift.equip' : 'gift.wearIt'),
    onGo: () => {
      onChange(wearGift(mergeGift(getBook(), gift).book, type, gift.item_id))
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
              onGo: async () => {
                const { miss } = await reportGift(gift.id).catch(() => ({ miss: 'people.reach' }))
                if (miss) return confirmMiss(tMiss(miss))
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

// Say thanks to the giver, once. The server refuses a second one, so a
// thanks already sent also shows as Thanked.
// Gifts thanked while the app is open, so a reopened pop-up starts at Thanked.
const thankedGifts = new Set()

function GiftThanks({ id, colors }) {
  const [state, setState] = useState(() => (thankedGifts.has(id) ? 'done' : ''))
  const say = async () => {
    setState('busy')
    const out = await thankGift(id).catch(() => ({ miss: 'people.reach' }))
    if (out.miss) {
      setState('')
      confirmMiss(tMiss(out.miss))
      return
    }
    thankedGifts.add(id)
    setState('done')
  }
  return (
    <KeyButton
      colors={colors}
      label={state === 'done' ? t('gift.thanked') : t('gift.sayThanks')}
      disabled={Boolean(state)}
      onPress={say}
    />
  )
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
      // A gift that just came in gets a cheer, once on this phone: its own if it is a cheer.
      if (takeGiftCheer(gift.id)) {
        feelTap('did')
        const cheer = sentGiftType(gift) === 'cheer' ? gift.item_id : normalizePurse(bookRef.current).cheerOn
        if (cheer) fireCheer(cheer, 3)
      }
      showGift(gift, () => bookRef.current, (next) => changeRef.current(next), colorsRef.current)
    }, 600)
    return () => clearTimeout(timer)
  }, [giftId]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

const giftStyles = StyleSheet.create({
  note: { gap: 4 },
  // The same box as Field, so it reads as a place to type.
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, fontFamily: fonts.ui },
  to: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  toText: { fontFamily: fonts.ui, fontSize: 15, flexShrink: 1 },
  count: { fontFamily: fonts.ui, fontSize: 12, alignSelf: 'flex-end' },
  sent: { fontFamily: fonts.uiBold, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 10 },
  rowArt: { width: 56, alignItems: 'center' },
  rowCopy: { flex: 1, gap: 2 },
  rowName: { fontFamily: fonts.uiBold, fontSize: 15 },
  rowMeta: { fontFamily: fonts.ui, fontSize: 13 },
})

// /gifts: what you have sent, and whether it was opened or sent back.
export function GiftsSentScreen({ book }) {
  const colors = useShopColors(book)
  const account = useAccount()
  const [list, setList] = useKept(`gifts.sent:${account.user?.id}`, null, KEEP)
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
      {list === null ? <LateMeta colors={colors}>{t('family.loading')}</LateMeta> : null}
      {list && !list.length && !miss ? (
        <Reveal>
          <Meta colors={colors}>{t('gifts.none')}</Meta>
          <DidButton colors={colors} small label={t('people.friends')} onPress={() => goHash('/friends')} />
        </Reveal>
      ) : null}
      {(list || []).map((row) => {
        const type = sentGiftType(row)
        const name = personName(row.person) || t('people.someone')
        return (
          <Reveal key={row.id}>
          <Pressable
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
          </Reveal>
        )
      })}
    </BoardShell>
  )
}
