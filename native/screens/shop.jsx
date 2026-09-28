import Constants from 'expo-constants'
import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { startGemPurchase } from '../../src/lib/gem-buy.js'
import { isReactNative } from '../../src/lib/env.js'
import { initGemIap, iapReady, storePrice } from '../../src/lib/gem-iap.js'
import { GEM_PACKS, packPriceLabel } from '../../src/lib/gem-packs.js'
import { activeLook } from '../../src/lib/active-look.js'
import { t } from '../../src/lib/i18n.js'
import {
  BUDDIES,
  BUDDY_GEMS,
  buyBuddy,
  buyCheer,
  buyCheerStage,
  buyLook,
  CHEERS,
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
  isGemLook,
  nextCheerStage,
  normalizePurse,
  dropSlides,
  shopTag,
  wearBuddy,
  wearCheer,
  wearCheerStage,
} from '../../src/lib/purse.js'
import { useTheme } from '../../src/lib/prefs.js'
import {
  BuddyChip,
  BuddyHang,
  CheerChip,
  LookChip,
} from '../components/Cosmetic.jsx'
import { BoardShell } from '../components/BoardShell.jsx'
import { DidButton, KeyButton, Meta } from '../components/ui.jsx'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import {
  buyCheerStageWithCoins,
  buyLookWithCoins,
} from '../../src/lib/coin-shop.js'
import { goHash } from '../navigation/hash.js'
import { offerMoreGems, publishSheet } from '../components/SheetHost.jsx'
import { CoinIcon, GemFaceMark, GemIcon, GemStack } from '../components/PurseIcons.jsx'
import { gemGlowHostStyle, gemPanelStyle } from '../lib/gem-look-tone.js'
import { kitTabDefault } from '../../src/lib/kit-tab.js'
import { fonts } from '../theme.js'
import { useLookColors } from '../hooks/useHallColors.js'

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

function PreviewButton({ onPress, selected, colors, children }) {
  return (
    <Pressable
      onPress={onPress}
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
        <BuddyHang id={id} />
        <Text style={[styles.buddyPreviewTag, { color: colors.on }]}>{t('shop.buddyPreviewTag')}</Text>
        <Text style={[styles.buddyPreviewQ, { color: colors.ink }]}>{t('shop.buddyPreviewQ')}</Text>
      </View>
    </View>
  )
}

function LookPreviewCard({ look, colors, theme }) {
  const gemCard = gemPanelStyle(look, theme)
  return (
    <View style={styles.buddyPreview}>
      <Cap colors={colors}>{t('shop.buddyPreview')}</Cap>
      <View style={[styles.buddyPreviewGlow, gemGlowHostStyle(look, theme)]}>
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

function tileChip(type, id, colors) {
  if (type === 'look') return <LookChip id={id} colors={colors} />
  if (type === 'cheer') return <CheerChip id={id} stage={1} colors={colors} />
  return <BuddyChip id={id} />
}

function tileName(type, id) {
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
      <View style={styles.tileChip}>{tileChip(type, item.id, colors)}</View>
      <Text style={[styles.tileName, { color: colors.ink }]} numberOfLines={1}>
        {name}
      </Text>
      <PriceTag tag={tag} colors={colors} />
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
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
        {sorted.map((item) => (
          <ShopTile key={item.id} type={type} item={item} purse={purse} colors={colors} onTile={onTile} style={styles.rowTile} />
        ))}
      </ScrollView>
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

function ShopActionRow({ name, note, info, miss, actionLabel, onAction, colors, primary, disabled, nested, preview, onPreview, previewOn }) {
  const previewNode = preview
    ? onPreview
      ? (
        <PreviewButton onPress={onPreview} selected={previewOn} colors={colors}>
          {preview}
        </PreviewButton>
      )
      : preview
    : null
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

function FeaturedGemCard({ pack, price, bonusNote, best, onBuy, colors }) {
  const title = gemPackTitle(pack)
  return (
    <Pressable
      onPress={onBuy}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${price}`}
      style={[styles.gemFeatured, { borderColor: best ? colors.onDeep : colors.line, backgroundColor: colors.panel }]}
    >
      {best ? (
        <View style={[styles.gemBestBadge, { backgroundColor: colors.on }]}>
          <Text style={[styles.gemBestBadgeText, { color: colors.bg }]}>{t('gems.bestValue')}</Text>
        </View>
      ) : null}
      <View style={styles.gemFeaturedArt}>
        <GemFaceMark count={pack.gems} big colors={colors} />
      </View>
      <Text style={[styles.gemFeaturedTitle, { color: colors.ink }]}>{title}</Text>
      {bonusNote ? <Text style={[styles.gemFeaturedNote, { color: colors.inkDim }]}>{bonusNote}</Text> : null}
      <View style={[styles.gemFeaturedButton, { backgroundColor: colors.on }]}>
        <Text style={[styles.gemFeaturedButtonText, { color: colors.bg }]}>{price}</Text>
      </View>
    </Pressable>
  )
}

function CompactGemRow({ pack, price, bonusNote, onBuy, colors }) {
  const title = gemPackTitle(pack)
  return (
    <View style={[styles.shopRow, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <GemFaceMark count={pack.gems} colors={colors} accessibilityLabel={title} />
      <View style={styles.shopCopy}>
        <Text style={[styles.shopName, { color: colors.ink }]}>{title}</Text>
        <Text style={[styles.shopNote, { color: colors.inkDim }]}>
          {bonusNote}
          {bonusNote ? ' · ' : ''}
          {price}
        </Text>
      </View>
      <DidButton small label={t('gems.buy')} onPress={onBuy} colors={colors} />
    </View>
  )
}

export function ShopScreen({ book, onChange }) {
  const theme = useTheme()
  const [peekLook, setPeekLook] = useState('')
  const [peekBuddy, setPeekBuddy] = useState('')
  const colors = useShopColors(book, peekLook)
  const purse = normalizePurse(book)
  const coat = activeLook(book)
  const previewLook = peekLook || coat
  const lookCount = purse.looks.length
  const cheerCount = purse.cheers.length
  const buddyCount = purse.buddies.length

  function peekAt(type, item) {
    if (type === 'look') {
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
    <BoardShell book={book} title={t('shop.title')} date={shellDate(book)} colors={colors} look={peekLook || undefined} showPurse>
      <Meta colors={colors}>{t('shop.hubHint')}</Meta>

      <DropCarousel slides={dropSlides()} purse={purse} colors={colors} onTile={peekAt} />

      {peekLook && isGemLook(peekLook) ? <LookPreviewCard look={peekLook} colors={colors} theme={theme} /> : null}
      {peekBuddy ? <BuddyPreviewCard id={peekBuddy} colors={colors} /> : null}

      <KindRow type="look" list={LOOKS} cap={t('shop.looks')} allLabel={t('shop.allLooks')} onAll={() => goHash('/shop/looks')} purse={purse} colors={colors} onTile={peekAt} />
      <KindRow type="cheer" list={CHEERS} cap={t('shop.cheers')} allLabel={t('shop.allCheers')} onAll={() => goHash('/shop/cheers')} purse={purse} colors={colors} onTile={peekAt} />
      <KindRow type="buddy" list={BUDDIES} cap={t('shop.buddies')} allLabel={t('shop.allBuddies')} onAll={() => goHash('/shop/buddies')} purse={purse} colors={colors} onTile={peekAt} />

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
          meta={t('shop.ownedN', { n: lookCount + cheerCount + buddyCount })}
          onPress={() => goHash('/kit')}
        />
      </View>
    </BoardShell>
  )
}

export function ShopLooksScreen({ book, onChange }) {
  const theme = useTheme()
  const [peekLook, setPeekLook] = useState('')
  const colors = useShopColors(book, peekLook)
  const purse = normalizePurse(book)
  const [miss, setMiss] = useState(NO_MISS)
  const [confirm, setConfirm] = useState(null)

  function take(next, id) {
    if (shortOnGems(next, colors)) {
      setMiss(NO_MISS)
      setConfirm(null)
      return
    }
    setMiss({ id, text: shopMiss(next) })
    if (!next.miss) {
      setPeekLook('')
      setConfirm(null)
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
              const next = item.gems > 0 ? buyLook(book, item.id) : await buyLookWithCoins(book, item.id)
              take(next, item.id)
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

      {peekLook && isGemLook(peekLook) ? <LookPreviewCard look={peekLook} colors={colors} theme={theme} /> : null}

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

  function take(next, id) {
    if (shortOnGems(next, colors)) {
      setMiss(NO_MISS)
      setConfirm(null)
      return
    }
    setMiss({ id, text: shopMiss(next) })
    if (!next.miss) {
      setConfirm(null)
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
            go: () => take(buyCheer(book, item.id), item.id),
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
                go: async () => take(await buyCheerStageWithCoins(book, item.id), item.id),
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
            onPreview={() => fireCheer(item.id, 1, coat, undefined, true)}
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

  function take(next, id) {
    if (shortOnGems(next, colors)) {
      setMiss(NO_MISS)
      setConfirm(null)
      return
    }
    setMiss({ id, text: shopMiss(next) })
    if (!next.miss) {
      setPeekBuddy('')
      setConfirm(null)
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
            preview={<BuddyChip id={item.id} />}
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
                go: () => take(buyBuddy(book, item.id), item.id),
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

export function GemShopScreen({ book }) {
  const colors = useShopColors(book)
  const purse = normalizePurse(book)
  const [banner, setBanner] = useState('')
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

  async function buy(packId) {
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
      gemNotice(gemMiss(out.miss))
      return
    }
    setBanner(out.pending ? t('gems.pending') : '')
  }

  const expoGo = Constants.appOwnership === 'expo'
  const storeNote = expoGo ? t('gems.appOnly') : storeChecked && !storeReady ? t('gems.setup') : ''

  return (
    <BoardShell book={book} title={t('gems.title')} date={shellDate(book)} colors={colors}>
      <View style={[styles.gemBalance, { borderColor: colors.line, backgroundColor: colors.panel2 }]}>
        <GemStack count={purse.gems} max={10} accessibilityLabel={t('gems.balance', { gems: purse.gems })} />
      </View>
      <Meta colors={colors}>{t('gems.hintNative')}</Meta>
      {storeNote ? <Meta colors={colors}>{storeNote}</Meta> : null}
      {banner ? (
        <View style={[styles.gemSheet, { borderColor: colors.on, backgroundColor: colors.panel }]}>
          <Text style={[styles.gemSheetText, { color: colors.ink }]}>{banner}</Text>
        </View>
      ) : null}

      <View style={styles.gemFeaturedRow}>
        {FEATURED_GEM_PACKS.map((pack) => (
          <FeaturedGemCard
            key={pack.id}
            pack={pack}
            price={packPriceLabel(pack, storePrice(pack.id))}
            bonusNote={pack.bonus ? t('gems.bonus', { base: pack.base, bonus: pack.bonus }) : ''}
            best={pack.id === BEST_VALUE_GEM_ID}
            onBuy={() => buy(pack.id)}
            colors={colors}
          />
        ))}
      </View>

      {COMPACT_GEM_PACKS.map((pack) => (
        <CompactGemRow
          key={pack.id}
          pack={pack}
          price={packPriceLabel(pack, storePrice(pack.id))}
          bonusNote={pack.bonus ? t('gems.bonus', { base: pack.base, bonus: pack.bonus }) : ''}
          onBuy={() => buy(pack.id)}
          colors={colors}
        />
      ))}

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

function KitTabs({ tab, onTab, counts, colors }) {
  const tabs = [
    { id: 'looks', key: 'shop.looks' },
    { id: 'cheers', key: 'shop.cheers' },
    { id: 'buddies', key: 'shop.buddies' },
  ]
  return (
    <View style={styles.kitTabs}>
      {tabs.map((item) => {
        const on = tab === item.id
        return (
          <Pressable
            key={item.id}
            onPress={() => onTab(item.id)}
            style={[
              styles.kitTab,
              {
                borderColor: on ? colors.onDeep : colors.line,
                backgroundColor: on ? colors.panel : colors.panel2,
              },
            ]}
          >
            <Text
              style={[styles.kitTabText, { color: on ? colors.on : colors.inkSoft }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.4}
            >
              {t(item.key)}
            </Text>
            <Text style={[styles.kitTabN, { color: on ? colors.on : colors.inkDim }]} maxFontSizeMultiplier={1.4}>
              {counts[item.id]}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function KitTile({ label, on, worn, onPress, colors, children }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.kitTile,
        { borderColor: colors.lineSoft },
        on && { backgroundColor: colors.panel2, borderColor: colors.onDeep },
      ]}
    >
      <View style={styles.kitTileChip}>
        {children}
        {worn && !on ? <View style={[styles.kitTileDot, { backgroundColor: colors.on }]} /> : null}
      </View>
      <Text style={[styles.kitTileName, { color: colors.ink }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

export function CollectionScreen({ book, onChange }) {
  const theme = useTheme()
  const [tab, setTab] = useState('looks')
  const [pick, setPick] = useState('')
  const [peekLook, setPeekLook] = useState('')
  const colors = useShopColors(book, peekLook)
  const coat = activeLook(book)
  const purse = normalizePurse(book)
  const looks = LOOKS.filter((item) => purse.looks.includes(item.id))
  const buddies = BUDDIES.filter((item) => purse.buddies.includes(item.id))
  const cheers = CHEERS.filter((item) => purse.cheers.includes(item.id))
  const focusId = pick || kitTabDefault(tab, purse)

  useEffect(() => {
    setPick('')
    setPeekLook('')
  }, [tab])

  function pickCheer(id) {
    onChange(wearCheer(book, id).book)
  }

  function pickStage(id, n) {
    const next = wearCheerStage(book, id, n)
    if (!next.miss) {
      fireCheer(id, n, coat, undefined, true)
      onChange(next.book)
    }
  }

  function focusPanel() {
    if (tab === 'looks') {
      const item = looks.find((row) => row.id === focusId)
      if (!item) return null
      const on = purse.lookOn === item.id
      return (
        <ShopActionRow
          colors={colors}
          preview={<LookChip id={item.id} colors={colors} />}
          previewOn={peekLook === item.id}
          onPreview={() => setPeekLook((prev) => (prev === item.id ? '' : item.id))}
          name={t(lookText(item.id, 'name'))}
          note={t(lookText(item.id, 'line'))}
          actionLabel={on ? t('shop.on') : t('shop.use')}
          primary={on}
          disabled={on}
          onAction={() => onChange(buyLook(book, item.id).book)}
        />
      )
    }
    if (tab === 'buddies') {
      if (focusId === 'off') {
        const on = !purse.buddyOn
        return (
          <ShopActionRow
            colors={colors}
            name={t('kit.buddyOff')}
            note={t('kit.buddyOffLine')}
            actionLabel={on ? t('shop.on') : t('shop.use')}
            primary={on}
            disabled={on}
            onAction={() => onChange(wearBuddy(book, '').book)}
          />
        )
      }
      const item = buddies.find((row) => row.id === focusId)
      if (!item) return null
      const on = purse.buddyOn === item.id
      return (
        <ShopActionRow
          colors={colors}
          name={t(buddyText(item.id, 'name'))}
          note={t(buddyText(item.id, 'line'))}
          actionLabel={on ? t('shop.on') : t('shop.use')}
          primary={on}
          disabled={on}
          onAction={() => onChange(wearBuddy(book, item.id).book)}
        />
      )
    }
    if (focusId === 'off') {
      const on = !purse.cheerOn
      return (
        <ShopActionRow
          colors={colors}
          name={t('kit.cheerOff')}
          note={t('kit.cheerOffLine')}
          actionLabel={on ? t('shop.on') : t('shop.use')}
          primary={on}
          disabled={on}
          onAction={() => pickCheer('')}
        />
      )
    }
    const item = cheers.find((row) => row.id === focusId)
    if (!item) return null
    const on = purse.cheerOn === item.id
    const owned = cheerStageOf(book, item.id)
    const play = cheerPlayOf(book, item.id)
    return (
      <View style={[styles.cheerPick, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <ShopActionRow
          nested
          colors={colors}
          preview={<CheerChip id={item.id} stage={play} colors={colors} />}
          onPreview={() => fireCheer(item.id, play, coat, undefined, true)}
          name={t(cheerText(item.id, 'name'))}
          note={t('shop.cheerStageLine', {
            n: play,
            max: CHEER_STAGE_MAX,
            line: t(cheerText(item.id, 'line')),
          })}
          actionLabel={on ? t('shop.on') : t('shop.use')}
          primary={on}
          disabled={on}
          onAction={() => pickCheer(item.id)}
        />
        <StagePicks owned={owned} play={play} on={on} onPick={(n) => pickStage(item.id, n)} colors={colors} />
      </View>
    )
  }

  return (
    <BoardShell
      book={book}
      title={t('kit.title')}
      date={shellDate(book)}
      colors={colors}
      look={peekLook || undefined}
    >
      <Meta colors={colors}>{t('kit.hint')}</Meta>

      {peekLook && isGemLook(peekLook) ? <LookPreviewCard look={peekLook} colors={colors} theme={theme} /> : null}

      <KitTabs
        tab={tab}
        onTab={setTab}
        counts={{ looks: looks.length, cheers: cheers.length, buddies: buddies.length }}
        colors={colors}
      />

      <View style={[styles.kitFocus, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        {focusPanel()}
      </View>

      {tab === 'looks' ? (
        <View style={[styles.kitGrid, { borderColor: colors.line, backgroundColor: colors.panel }]}>
          {looks.map((item) => (
            <KitTile
              key={item.id}
              label={t(lookText(item.id, 'name'))}
              on={focusId === item.id}
              worn={purse.lookOn === item.id}
              colors={colors}
              onPress={() => {
                setPick(item.id)
                setPeekLook(item.id)
              }}
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
              on={focusId === item.id}
              worn={purse.buddyOn === item.id}
              colors={colors}
              onPress={() => setPick(item.id)}
            >
              <BuddyChip id={item.id} colors={colors} />
            </KitTile>
          ))}
          <KitTile
            label={t('kit.buddyOff')}
            on={focusId === 'off'}
            worn={!purse.buddyOn}
            colors={colors}
            onPress={() => setPick('off')}
          >
            <View style={[styles.kitOffChip, { borderColor: colors.line }]} />
          </KitTile>
        </View>
      ) : null}

      {tab === 'cheers' ? (
        <View style={[styles.kitGrid, { borderColor: colors.line, backgroundColor: colors.panel }]}>
          {cheers.map((item) => {
            const play = cheerPlayOf(book, item.id)
            return (
              <KitTile
                key={item.id}
                label={t(cheerText(item.id, 'name'))}
                on={focusId === item.id}
                worn={purse.cheerOn === item.id}
                colors={colors}
                onPress={() => {
                  setPick(item.id)
                  fireCheer(item.id, play, coat, undefined, true)
                }}
              >
                <CheerChip id={item.id} stage={play} colors={colors} />
              </KitTile>
            )
          })}
          <KitTile
            label={t('kit.cheerOff')}
            on={focusId === 'off'}
            worn={!purse.cheerOn}
            colors={colors}
            onPress={() => setPick('off')}
          >
            <View style={[styles.kitOffChip, { borderColor: colors.line }]} />
          </KitTile>
        </View>
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
  shopName: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '600' },
  shopNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  infoDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  infoDotText: { fontFamily: fonts.ui, fontSize: 11, fontWeight: '700', lineHeight: 13 },
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
  },
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
  gemFeaturedButtonText: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '700' },
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
  slideKicker: { fontFamily: fonts.ui, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  slideTitle: { fontFamily: fonts.ui, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  slideGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slideTile: { width: '31%', flexGrow: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  rowScroll: { gap: 8, paddingRight: 4 },
  rowTile: { width: 104 },
  tile: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 6, alignItems: 'center' },
  tileChip: { alignSelf: 'center' },
  tileName: { fontFamily: fonts.ui, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagText: { fontFamily: fonts.ui, fontSize: 12, fontWeight: '600' },
  promoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promoAll: { fontFamily: fonts.ui, fontSize: 13, fontWeight: '600' },


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
  kitTabs: { flexDirection: 'row', gap: 6, marginTop: 4, marginBottom: 10 },
  kitTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
  },
  kitTabText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  kitTabN: { fontFamily: fonts.mono, fontSize: 10 },
  kitFocus: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  kitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
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
  kitTileDot: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  kitTileName: { fontFamily: fonts.ui, fontSize: 11, fontWeight: '600', maxWidth: '100%' },
  kitOffChip: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed' },
  kitEmpty: { width: '100%', padding: 14 },
})
