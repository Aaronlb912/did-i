import { useEffect, useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { hasLocaleKey, t } from '../../src/lib/i18n.js'
import { readPrefs } from '../../src/lib/prefs.js'
import { activeBuddy, activeLook } from '../../src/lib/active-look.js'
import { previewSample, readShelf } from '../../src/lib/board-shelf.js'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { bestShelfStreak, freezeState, shelfStreak } from '../../src/lib/hall-feel.js'
import { NIGHT_COIN_CAP, normalizePurse } from '../../src/lib/purse.js'
import { buyFrame } from '../../src/lib/coin-shop.js'
import { readGiftsSent, refreshGiftsSent } from '../../src/lib/people.js'
import {
  claimFrame,
  frameById,
  frameProgress,
  frameText,
  framesOwned,
  seasonNextText,
  seasonOpen,
  SHOWN_FRAMES,
  wearFrame,
  wornFrame,
} from '../../src/lib/frames.js'
import { confirmBuy, offerMoreGems, publishSheet } from '../components/SheetHost.jsx'
import { openCoinsHow } from '../components/NightSheets.jsx'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { CardFrame } from '../components/frames/CardFrame.jsx'
import { FramePreview } from '../components/frames/FramePreview.jsx'
import { CoinIcon, GemIcon } from '../components/PurseIcons.jsx'
import { BoardShell } from '../components/BoardShell.jsx'
import { FadeScroll } from '../components/FadeScroll.jsx'
import { Meta } from '../components/ui.jsx'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'
import { useLookColors } from '../hooks/useHallColors.js'
import { goHash } from '../navigation/hash.js'
import { pressFx } from '../lib/motion.jsx'
import { fonts } from '../theme.js'

// What frames you have earned, from the whole shelf: the streak tonight and
// whether a freeze ever saved it. Earned frames are stored once reached
// (keepEarnedFrames), so a streak that ends later does not take them back.
export function frameCtxFor(boards, now = new Date()) {
  const list = Array.isArray(boards) ? boards : []
  const today = boardDate(now, list[0]?.dayFoldHour)
  if (!list.length) return { bestStreak: 0, streak: 0, everFrozen: false, today, giftsSent: readGiftsSent() }
  return {
    giftsSent: readGiftsSent(),
    streak: shelfStreak(list, now),
    bestStreak: Math.max(shelfStreak(list, now), bestShelfStreak(list, now)),
    everFrozen: freezeState(list, now).frozen.size > 0,
    today,
  }
}

export function useFrameCtx(book) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => frameCtxFor(readShelf().boards), [book])
}

function monthDay(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number)
  if (!y || !m || !d) return iso
  try {
    return new Date(y, m - 1, d, 12).toLocaleDateString(readPrefs().locale || 'en', { month: 'short', day: 'numeric' })
  } catch {
    return formatBoardDate(iso)
  }
}

function frameMiss(next) {
  if (!next?.miss) return ''
  return next.missN != null ? t(next.miss, { n: next.missN }) : t(next.miss)
}

function frameName(id) {
  return id ? t(frameText(id, 'name')) : t('frames.none')
}

// Tiles are narrow: a frame with a short name (Tonight's moon) uses it there; the sheet keeps the full one.
function frameTileName(id) {
  return id && hasLocaleKey(frameText(id, 'short')) ? t(frameText(id, 'short')) : frameName(id)
}

// The line under a frame's name: what it costs, Owned, how to earn it, or when it is back.
export function frameStatus(frame, purse, ctx) {
  const owned = framesOwned(purse, ctx).has(frame.id)
  if (owned) return { text: t('shop.owned'), owned: true }
  if (frame.kind === 'coin') return { coins: frame.coins }
  if (frame.kind === 'gem') return { gems: frame.gems }
  if (frame.kind === 'earned') {
    const p = frameProgress(frame, ctx)
    if (frame.earn === 'refer') return { text: t('frames.earnRefer', { n: frame.need }) }
    return { text: frame.earn === 'freeze' ? t('frames.earnFreeze') : t('frames.progress', { n: p.n, of: p.of }) }
  }
  if (frame.kind === 'season') {
    return seasonOpen(frame, ctx.today)
      ? { text: t('frames.freeNow') }
      : { text: t('frames.back', { date: monthDay(seasonNextText(frame, ctx.today)) }) }
  }
  return { text: t('frames.free') }
}

function StatusTag({ status, colors }) {
  if (status.coins || status.gems) {
    return (
      <View style={styles.tagRow}>
        {status.gems ? <GemIcon size={12} /> : <CoinIcon size={12} />}
        <Text style={[styles.tagText, { color: colors.ink }]}>{status.gems || status.coins}</Text>
      </View>
    )
  }
  return (
    <Text style={[styles.tagText, { color: colors.inkDim }]} numberOfLines={1}>
      {status.text}
    </Text>
  )
}

// Your own sample question, like the look sheets, so the frame sits around your card.
// roomy: more inner space for frames with art over the corners (Frost), so
// the crystals never touch the text.
function MiniCard({ colors, roomy }) {
  return (
    <View style={[...faceCardStyle(colors), styles.miniCard, roomy && styles.miniCardRoomy]}>
      <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{previewSample().tag}</Text>
      <Text style={[faceCardStyles.title, styles.miniTitle, { color: colors.ink }]} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.8}>
        {previewSample().question}
      </Text>
    </View>
  )
}

// Week stars shows the nights you have so far, so the art matches "3 of 7".
function weekFor(frame, owned, ctx) {
  if (frame?.id !== 'gems' || owned) return undefined
  const n = Math.min(7, frameProgress(frame, ctx).n)
  return [0, 1, 2, 3, 4, 5, 6].map((i) => i < n)
}

const CORNER_ART = new Set(['frost'])

// What is left after a buy, so spending the last gem is never a surprise.
export function leftAfter(purse, item) {
  if (item.gems) {
    const n = purse.gems - item.gems
    return n === 1 ? t('shop.leftGemOne') : t('shop.leftGems', { n })
  }
  const n = purse.coins - item.coins
  return n === 1 ? t('shop.leftCoinOne') : t('shop.leftCoins', { n })
}

function FrameSheetPreview({ id, colors, ctx, weekLit }) {
  return (
    <View style={[styles.sheetPreview, id === 'polaroid' && styles.sheetPreviewCaption]}>
      {/* Same label and centered card as the look sheets. */}
      <Text style={[styles.cap, styles.sheetCap, { color: colors.inkDim }]}>{t('shop.buddyPreview')}</Text>
      <CardFrame
        id={id}
        colors={colors}
        active
        streak={ctx.bestStreak}
        answered={3}
        total={3}
        weekLit={weekLit || [true, true, true, true, true, false, false]}
        date={ctx.today}
        buddy={activeBuddy(readShelf().boards?.[0])}
        style={styles.sheetFrame}
      >
        <MiniCard colors={colors} roomy={CORNER_ART.has(id)} />
      </CardFrame>
    </View>
  )
}

function FrameFacts({ frame, owned, colors }) {
  return (
    <View style={styles.facts}>
      {/* "Earn it" is a plain label: nothing to tap, the facts below say how. */}
      {frame.rarity === 'earned' && !owned ? (
        <View style={styles.howEarn}>
          <Text style={[styles.rarityText, { color: colors.inkSoft }]}>{t('frames.rarity.earnIt')}</Text>
          <Text style={[styles.desc, { color: colors.ink }]}>
            {frame.earn === 'freeze'
              ? t('frames.howFreeze')
              : frame.earn === 'refer'
                ? t('frames.howRefer', { n: frame.need })
                : frame.earn === 'gifts'
                  ? t('frames.howGifts', { n: frame.need })
                  : t('frames.howStreak', { n: frame.need })}
          </Text>
        </View>
      ) : (
        <View style={[styles.rarity, { borderColor: colors.on }]}>
          <Text style={[styles.rarityText, { color: colors.on }]}>{t(`frames.rarity.${frame.rarity}`)}</Text>
        </View>
      )}
      <Text style={[styles.desc, { color: colors.ink }]}>{t(frameText(frame.id, 'desc'))}</Text>
      {['f1', 'f2', 'f3'].map((key) => (
        <Text key={key} style={[styles.fact, { color: colors.inkSoft }]}>
          {`• ${t(frameText(frame.id, key))}`}
        </Text>
      ))}
    </View>
  )
}

// One sheet for every frame: a big live preview, what it is, and the one
// thing you can do with it (Buy, Wear, Take off, Claim) or why you cannot yet.
export function openFrameSheet({ id, book, colors, ctx, onChange }) {
  const frame = frameById(id)
  if (!frame) return
  const purse = normalizePurse(book)
  const owned = framesOwned(purse, ctx).has(id)
  const on = wornFrame(purse, ctx) === id
  const status = frameStatus(frame, purse, ctx)
  // The sheet line is a status; how to earn sits once under "How to earn".
  const priceLine = !owned && frame.earn === 'freeze'
    ? t('frames.notEarned')
    : status.coins
    ? t('shop.coins', { n: status.coins })
    : status.gems
      ? t('shop.gems', { n: status.gems })
      : status.text
  let action = null
  const reopen = (next) => openFrameSheet({ id, book: next, colors, ctx, onChange })
  if (owned) {
    action = {
      label: on ? t('shop.takeOff') : t('frames.wear'),
      go: () => {
        const next = wearFrame(book, id, ctx)
        if (next.miss) return confirmMiss(frameMiss(next))
        publishSheet(null)
        onChange(next.book)
        if (!on) confirmDone(t('confirm.wearing', { name: frameName(id) }))
      },
    }
  } else if (frame.kind === 'coin' || frame.kind === 'gem') {
    const short = frame.coins ? purse.coins < frame.coins : purse.gems < frame.gems
    if (!short || frame.gems) {
      action = {
        label: short ? t('gems.shortGo') : t('shop.buy'),
        go: () => {
          if (short) {
            publishSheet(null)
            offerMoreGems(colors)
            return
          }
          confirmBuy(colors, {
            title: frameName(id),
            body: `${t('frames.buyBody', { cost: frame.coins ? t('shop.coins', { n: frame.coins }) : t('shop.gems', { n: frame.gems }) })} ${leftAfter(purse, frame)}`,
            onGo: async () => {
              const next = await buyFrame(book, id)
              if (next.miss === 'shop.miss.needGems') return offerMoreGems(colors)
              if (next.miss) return confirmMiss(frameMiss(next))
              onChange(next.book)
              confirmDone(t('confirm.wearing', { name: frameName(id) }))
            },
          })
        },
      }
    }
  } else if (frame.kind === 'season' && seasonOpen(frame, ctx.today)) {
    action = {
      label: t('frames.claim'),
      go: () => {
        const next = claimFrame(book, id, ctx.today)
        if (next.miss) return confirmMiss(frameMiss(next))
        onChange(next.book)
        reopen(next.book)
        confirmDone(t('confirm.wearing', { name: frameName(id) }))
      },
    }
  }
  const shortCoins = !owned && frame.coins && purse.coins < frame.coins
  // Seasonal, not claimed yet: say it costs nothing and stays yours.
  const seasonLine = !owned && frame.kind === 'season' ? `\n${t('frames.seasonFree')}` : ''
  publishSheet({
    preview: <FrameSheetPreview id={id} colors={colors} ctx={ctx} weekLit={weekFor(frame, owned, ctx)} />,
    title: frameName(id),
    body: shortCoins
      ? `${priceLine}\n${t('shop.needMoreCoins', { n: frame.coins - purse.coins })} ${t('shop.earnCoins', { cap: NIGHT_COIN_CAP })}`
      : `${priceLine}${seasonLine}`,
    ...(shortCoins ? { footLabel: t('coins.howTitle'), onFoot: () => openCoinsHow(colors, () => reopen(book)) } : {}),
    // Gem frames point at Get gems, like coin frames point at How coins work.
    // When short, the main button already goes there.
    ...(!owned && frame.gems && purse.gems >= frame.gems
      ? { footLabel: t('gems.title'), onFoot: () => { publishSheet(null); goHash('/gems') } }
      : {}),
    content: <FrameFacts frame={frame} owned={owned} colors={colors} />,
    ...(action ? { goLabel: action.label, onGo: action.go } : {}),
    closeLabel: t('settings.close'),
    colors,
    onClose: () => publishSheet(null),
  })
}

export function openFramesHow(colors) {
  publishSheet({
    title: t('frames.howTitle'),
    body: t('frames.howBody'),
    closeLabel: t('settings.close'),
    colors,
    onClose: () => publishSheet(null),
  })
}

function FrameTile({ frame, purse, ctx, colors, onPress, style }) {
  const name = frameTileName(frame.id)
  const owned = framesOwned(purse, ctx).has(frame.id)
  return (
    <Pressable
      onPress={() => onPress(frame.id)}
      accessibilityRole="button"
      accessibilityLabel={t('shop.see', { name })}
      style={({ pressed }) => [styles.tile, { borderColor: colors.line, backgroundColor: colors.panel2 }, style, pressFx(pressed)]}
    >
      <View style={styles.tileArt}>
        <FramePreview id={frame.id} colors={colors} size={92} weekLit={weekFor(frame, owned, ctx)} />
      </View>
      <View style={styles.tileLabel}>
        <Text style={[styles.tileName, { color: colors.ink }]} numberOfLines={2}>
          {name}
        </Text>
        <StatusTag status={frameStatus(frame, purse, ctx)} colors={colors} />
      </View>
    </Pressable>
  )
}

// Paid frames go up by price, then by name, in the Shop row and All frames.
const byPrice = (a, b) => (a.coins || a.gems || 0) - (b.coins || b.gems || 0) || frameName(a.id).localeCompare(frameName(b.id))
const SALE_RANK = { season: 0, coin: 1, gem: 2 }

// What you can buy or claim now. Owned frames are worn from the Collection.
function shopOrder(purse, ctx) {
  const owned = framesOwned(purse, ctx)
  const forSale = SHOWN_FRAMES
    .filter((f) => !owned.has(f.id) && (f.kind === 'coin' || f.kind === 'gem' || (f.kind === 'season' && seasonOpen(f, ctx.today))))
    .sort((a, b) => SALE_RANK[a.kind] - SALE_RANK[b.kind] || byPrice(a, b))
  return { forSale }
}

// The Frames row in the Shop hub, like Looks or Cheers.
export function FramesShopRow({ book, colors, onChange }) {
  const ctx = useFrameCtx(book)
  const purse = normalizePurse(book)
  const { forSale } = shopOrder(purse, ctx)
  const list = forSale
  const open = (id) => openFrameSheet({ id, book, colors, ctx, onChange })
  return (
    <View style={styles.promoShelf}>
      <View style={styles.promoHead}>
        <Text style={[styles.cap, { color: colors.inkDim }]}>{t('frames.title')}</Text>
        <Pressable accessibilityRole="button" onPress={() => goHash('/shop/frames')} hitSlop={8}>
          <Text style={[styles.promoAll, { color: colors.on }]}>{t('frames.all')}</Text>
        </Pressable>
      </View>
      {forSale.length ? null : <Meta colors={colors}>{t('frames.allOwned')}</Meta>}
      <FadeScroll fade={colors.bg} nestedScrollEnabled contentContainerStyle={styles.rowScroll}>
        {list.map((frame) => (
          <FrameTile key={frame.id} frame={frame} purse={purse} ctx={ctx} colors={colors} onPress={open} style={styles.rowTile} />
        ))}
      </FadeScroll>
    </View>
  )
}

// All frames lists only what you can still get: a season while it is on,
// gem and coin frames you do not own, and earned frames still locked. What
// you own is in the Collection; out-of-season frames are one line.
const SECTIONS = [
  { kind: 'season', key: 'frames.sec.season' },
  { kind: 'gem', key: 'frames.sec.gem' },
  { kind: 'coin', key: 'frames.sec.coin' },
  { kind: 'earned', key: 'frames.sec.earned' },
]

function allFramesLists(purse, ctx) {
  const owned = framesOwned(purse, ctx)
  const open = (f) => !owned.has(f.id) && (f.kind !== 'season' || seasonOpen(f, ctx.today))
  const sections = SECTIONS.map((sec) => {
    const list = SHOWN_FRAMES.filter((f) => f.kind === sec.kind && open(f))
    if (sec.kind === 'coin' || sec.kind === 'gem') list.sort(byPrice)
    return { ...sec, list }
  }).filter((sec) => sec.list.length)
  // The soonest season that is not on now, for the line under the list.
  const next = SHOWN_FRAMES.filter((f) => f.kind === 'season' && !seasonOpen(f, ctx.today))
    .map((f) => ({ f, on: seasonNextText(f, ctx.today) }))
    .sort((a, b) => a.on.localeCompare(b.on))[0]
  const mineCount = SHOWN_FRAMES.filter((f) => owned.has(f.id)).length
  return { sections, next, mineCount }
}

export function ShopFramesScreen({ book, onChange }) {
  const colors = useLookColors(activeLook(book), true)
  const ctx = useFrameCtx(book)
  const purse = normalizePurse(book)
  const open = (id) => openFrameSheet({ id, book, colors, ctx, onChange })
  const lists = allFramesLists(purse, ctx)
  // Wrapped counts gifts you sent; ask the account once per visit.
  useEffect(() => {
    refreshGiftsSent().catch(() => {})
  }, [])
  return (
    <BoardShell book={book} title={t('frames.all')} date={formatBoardDate(ctx.today)} colors={colors} showPurse>
      <Meta colors={colors}>{t('frames.hint')}</Meta>
      {lists.mineCount ? (
        <Pressable accessibilityRole="button" onPress={() => goHash('/kit', { id: 'frames' })} hitSlop={6}>
          <Text style={[styles.mineLine, { color: colors.inkSoft }]}>
            {lists.mineCount === 1 ? t('frames.mineOne') : t('frames.mine', { n: lists.mineCount })}{' '}
            <Text style={{ color: colors.on }}>{t('frames.wearThem')} ›</Text>
          </Text>
        </Pressable>
      ) : null}
      {lists.sections.length ? null : <Meta colors={colors}>{t('frames.allOwned')}</Meta>}
      {lists.sections.map((sec) => (
        <View key={sec.kind}>
          <Text style={[styles.cap, { color: colors.inkDim }]}>{t(sec.key)}</Text>
          {sec.kind === 'season' ? <Meta colors={colors}>{t('frames.seasonNowHint')}</Meta> : null}
          {sec.kind === 'earned' ? <Meta colors={colors}>{t('frames.earnHint')}</Meta> : null}
          <View style={styles.grid}>
            {sec.list.map((frame) => (
              <FrameTile key={frame.id} frame={frame} purse={purse} ctx={ctx} colors={colors} onPress={open} style={styles.gridTile} />
            ))}
          </View>
        </View>
      ))}
      {lists.next ? (
        <Meta colors={colors}>
          {t('frames.nextSeason', { name: frameName(lists.next.f.id), date: formatBoardDate(lists.next.on) })}
        </Meta>
      ) : null}
    </BoardShell>
  )
}

function KitFrameTile({ id, label, caption, worn, locked, colors, onPress, weekLit }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(worn) }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.kitTile,
        { borderColor: colors.lineSoft },
        worn && [styles.kitTileWorn, { borderColor: colors.on, backgroundColor: colors.panel2 }],
        locked && styles.locked,
        pressFx(pressed),
      ]}
    >
      <View style={styles.kitChip}>
        {id ? <FramePreview id={id} colors={colors} size={44} weekLit={weekLit} /> : <View style={[styles.offChip, { borderColor: colors.line }]} />}
        {worn ? (
          <View style={[styles.wornBadge, { backgroundColor: colors.on, borderColor: colors.panel }]}>
            <Text style={[styles.wornBadgeText, { color: colors.bg }]}>✓</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.kitName, { color: worn ? colors.on : colors.ink }]} numberOfLines={2}>
        {label}
      </Text>
      {caption ? (
        <Text style={[styles.kitCaption, { color: colors.inkDim }]} numberOfLines={2}>
          {caption}
        </Text>
      ) : null}
    </Pressable>
  )
}

// Collection > Frames: No frame first, then what you own (tap to wear), then
// earned frames still locked with how far along you are.
export function FramesCollection({ book, colors, onChange }) {
  const ctx = useFrameCtx(book)
  const purse = normalizePurse(book)
  const owned = framesOwned(purse, ctx)
  const worn = wornFrame(purse, ctx)
  const mine = SHOWN_FRAMES.filter((f) => owned.has(f.id))
  const locked = SHOWN_FRAMES.filter((f) => f.kind === 'earned' && !owned.has(f.id))
  function wear(id) {
    const next = wearFrame(book, id === worn ? '' : id, ctx)
    if (next.miss) return confirmMiss(frameMiss(next))
    onChange(next.book)
    if (id && id !== worn) confirmDone(t('confirm.wearing', { name: frameName(id) }))
  }
  return (
    <>
      <View style={[styles.kitGrid, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <KitFrameTile id="" label={t('frames.none')} worn={!worn} colors={colors} onPress={() => wear('')} />
        {mine.map((frame) => (
          <KitFrameTile
            key={frame.id}
            id={frame.id}
            label={frameTileName(frame.id)}
            caption={frame.kind === 'season' ? t('kit.seasonal') : ''}
            worn={worn === frame.id}
            colors={colors}
            onPress={() => wear(frame.id)}
          />
        ))}
        {locked.map((frame) => (
          <KitFrameTile
            key={frame.id}
            id={frame.id}
            label={frameTileName(frame.id)}
            caption={frameStatus(frame, purse, ctx).text}
            weekLit={weekFor(frame, false, ctx)}
            locked
            colors={colors}
            onPress={() => openFrameSheet({ id: frame.id, book, colors, ctx, onChange })}
          />
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={() => goHash('/shop/frames')} hitSlop={8}>
        <Text style={[styles.promoAll, { color: colors.on }]}>{t('frames.all')}</Text>
      </Pressable>
    </>
  )
}

export function framesForSaleCount(book) {
  const purse = normalizePurse(book)
  return shopOrder(purse, frameCtxFor(readShelf().boards)).forSale.length
}

export function framesOwnedCount(book) {
  const purse = normalizePurse(book)
  const ctx = frameCtxFor(readShelf().boards)
  const owned = framesOwned(purse, ctx)
  return { n: SHOWN_FRAMES.filter((f) => owned.has(f.id)).length, of: SHOWN_FRAMES.length, worn: wornFrame(purse, ctx) }
}

const styles = StyleSheet.create({
  mineLine: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 4 },
  promoShelf: { gap: 8, marginTop: 4 },
  promoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promoAll: { fontFamily: fonts.uiSemi, fontSize: 13 },
  cap: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 8, marginBottom: 4 },
  whatLink: { alignSelf: 'flex-start' },
  whatText: { fontFamily: fonts.ui, fontSize: 13, textDecorationLine: 'underline' },
  rowScroll: { gap: 8, paddingRight: 4 },
  rowTile: { width: 104 },
  tile: { borderWidth: 1, borderRadius: 12, padding: 10, minHeight: 176, alignItems: 'center', justifyContent: 'space-between' },
  tileArt: { height: 112, width: '100%', alignItems: 'center', justifyContent: 'center' },
  tileLabel: { width: '100%', alignItems: 'center', gap: 4 },
  // Room for two lines on every tile, so a long name (Tonight's moon) keeps its price level with the row.
  tileName: { fontFamily: fonts.uiBold, fontSize: 13, lineHeight: 17, minHeight: 34, textAlign: 'center' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagText: { fontFamily: fonts.uiSemi, fontSize: 12, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridTile: { width: '31%', flexGrow: 0 },
  // Room for art that reaches past the card, then clipped so sparks stay in the sheet.
  sheetPreview: { width: '100%', alignItems: 'center', paddingHorizontal: 28, paddingBottom: 30, overflow: 'hidden' },
  // Bottom room so Polaroid's caption strip under the card is not cut off.
  sheetPreviewCaption: { paddingBottom: 50 },
  sheetCap: { alignSelf: 'stretch', marginHorizontal: -28, marginBottom: 32 },
  howEarn: { gap: 2 },
  sheetFrame: { width: '100%', maxWidth: 260 },
  // Extra inner padding keeps corner art (Frost's crystals) off the words.
  miniCard: { minHeight: 132, paddingHorizontal: 30, paddingVertical: 26, alignItems: 'center', justifyContent: 'center' },
  miniTitle: { fontSize: 22, lineHeight: 28, textAlign: 'center' },
  miniCardRoomy: { paddingHorizontal: 54, paddingVertical: 50 },
  facts: { gap: 6, paddingBottom: 4 },
  rarity: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  rarityText: { fontFamily: fonts.uiSemi, fontSize: 12 },
  desc: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  fact: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  kitGrid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginTop: 10, marginBottom: 8 },
  kitTile: {
    width: '33.333%',
    alignItems: 'center',
    gap: 6,
    minHeight: 104,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locked: { opacity: 0.55 },
  kitChip: { width: 56, height: 60, alignItems: 'center', justifyContent: 'center' },
  offChip: { width: 36, height: 44, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed' },
  kitName: { fontFamily: fonts.uiSemi, fontSize: 11, maxWidth: '100%', textAlign: 'center' },
  kitTileWorn: { borderWidth: 2, borderRadius: 12 },
  kitCaption: { fontFamily: fonts.ui, fontSize: 10, maxWidth: '100%' },
  wornBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wornBadgeText: { fontSize: 10, fontWeight: '700', lineHeight: 12 },
})
