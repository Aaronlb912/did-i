import Constants from 'expo-constants'
import { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { startGemPurchase } from '../../src/lib/gem-buy.js'
import { isReactNative } from '../../src/lib/env.js'
import { initGemIap, iapReady, storePrice } from '../../src/lib/gem-iap.js'
import { formatUsd, GEM_PACKS, packPriceLabel } from '../../src/lib/gem-packs.js'
import { activeLook } from '../../src/lib/dit-board.js'
import { t } from '../../src/lib/i18n.js'
import {
  BUDDIES,
  buyBuddy,
  buyCheer,
  buyCheerStage,
  buyLook,
  CHEERS,
  CHEER_STAGE_GEMS,
  CHEER_STAGE_MAX,
  cheerPlayOf,
  cheerStageOf,
  cheerText,
  buddyText,
  LOOKS,
  lookText,
  fireCheer,
  isGemLook,
  nextCheerStage,
  normalizePurse,
  recentBuddies,
  recentCheers,
  recentLooks,
  wearBuddy,
  wearCheer,
  wearCheerStage,
} from '../../src/lib/purse.js'
import { useTheme } from '../../src/lib/prefs.js'
import { BuddyChip, BuddyHang, CheerChip, LookChip } from '../components/Cosmetic.jsx'
import { GemFaceAura } from '../components/GemFaceAura.jsx'
import { BoardShell } from '../components/BoardShell.jsx'
import { DidButton, KeyButton, Meta } from '../components/ui.jsx'
import { PageTitle } from '../components/SetBits.jsx'
import { PurseLine } from '../components/PurseLine.jsx'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { goHash } from '../navigation/hash.js'
import { GemIcon, GemPackMark, GemStack } from '../components/PurseIcons.jsx'
import { gemPanelStyle } from '../lib/gem-look-tone.js'
import { hallColors, fonts } from '../theme.js'

const COIN_LOOKS = LOOKS.filter((item) => item.coins > 0)
const GEM_LOOKS = LOOKS.filter((item) => item.gems > 0)
const STAGES = [1, 2, 3, 4, 5]

function shellDate(book) {
  return formatBoardDate(boardDate(new Date(), book.dayFoldHour))
}

function shopMiss(next) {
  if (!next?.miss) return ''
  if (next.missN != null) return t(next.miss, { n: next.missN })
  return t(next.miss)
}

function wearLook(book, id) {
  return buyLook(book, id)
}

function useShopColors(book, peekLook = '') {
  const theme = useTheme()
  const coat = peekLook || activeLook(book)
  return useMemo(() => hallColors(coat, theme), [coat, theme])
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
        <BuddyHang id={id} inline />
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
      <View
        style={[
          styles.buddyPreviewCard,
          { backgroundColor: colors.panel, borderColor: colors.line },
          gemCard,
        ]}
      >
        <GemFaceAura look={look} theme={theme} />
        <Text style={[styles.buddyPreviewTag, { color: colors.on }]}>{t('shop.buddyPreviewTag')}</Text>
        <Text style={[styles.buddyPreviewQ, { color: colors.ink }]}>{t('shop.buddyPreviewQ')}</Text>
      </View>
    </View>
  )
}

function ShopPromoShelf({ cap, allLabel, onAll, colors, children }) {
  return (
    <View style={styles.promoShelf}>
      <View style={styles.promoHead}>
        <Cap colors={colors}>{cap}</Cap>
        <Pressable onPress={onAll} hitSlop={8}>
          <Text style={[styles.promoAll, { color: colors.on }]}>{allLabel}</Text>
        </Pressable>
      </View>
      <View style={[styles.promoGrid, { borderColor: colors.line, backgroundColor: colors.panel }]}>{children}</View>
    </View>
  )
}

function ShopPromoTile({ chip, name, onPress, colors }) {
  return (
    <Pressable onPress={onPress} style={[styles.promoTile, { borderColor: colors.line }]}>
      <View style={styles.promoChip}>{chip}</View>
      <Text style={[styles.promoName, { color: colors.ink }]} numberOfLines={2}>{name}</Text>
    </Pressable>
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
  return (
    <Modal visible={Boolean(confirm)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
        <Pressable
          style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.popKicker, { color: colors.on }]}>{t('shop.buyKicker')}</Text>
          <Text style={[styles.popTitle, { color: colors.ink }]}>{confirm?.title}</Text>
          <Text style={[styles.shopNote, { color: colors.inkSoft }]}>{confirm?.body}</Text>
          <View style={styles.popRow}>
            <DidButton small label={t('shop.buy')} onPress={onGo} colors={colors} />
            <KeyButton label={t('settings.neverMind')} onPress={onClose} colors={colors} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function ShopActionRow({ name, note, actionLabel, onAction, colors, primary, disabled, nested, preview, onPreview, previewOn }) {
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
        <Text style={[styles.shopName, { color: colors.ink }]}>{name}</Text>
        {note ? <Text style={[styles.shopNote, { color: colors.inkDim }]}>{note}</Text> : null}
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

  return (
    <BoardShell book={book} title={t('shop.title')} date={shellDate(book)} colors={colors} look={peekLook || undefined}>
      <PageTitle colors={colors}>{t('shop.title')}</PageTitle>
      <View style={styles.purseRow}>
        <PurseLine purse={purse} colors={colors} gemsLink />
      </View>
      <Meta colors={colors}>{t('shop.hubHint')}</Meta>

      <ShopPromoShelf
        cap={t('shop.promoLooks')}
        allLabel={t('shop.allLooks')}
        onAll={() => goHash('/shop/looks')}
        colors={colors}
      >
        {recentLooks(2).map((item) => (
          <ShopPromoTile
            key={item.id}
            colors={colors}
            chip={<LookChip id={item.id} colors={colors} />}
            name={t(lookText(item.id, 'name'))}
            onPress={() => {
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
        colors={colors}
      >
        {recentCheers(2).map((item) => (
          <ShopPromoTile
            key={item.id}
            colors={colors}
            chip={<CheerChip id={item.id} stage={1} colors={colors} />}
            name={t(cheerText(item.id, 'name'))}
            onPress={() => {
              setPeekBuddy('')
              fireCheer(item.id, 1, previewLook, undefined, true)
            }}
          />
        ))}
      </ShopPromoShelf>

      <ShopPromoShelf
        cap={t('shop.promoBuddies')}
        allLabel={t('shop.allBuddies')}
        onAll={() => goHash('/shop/buddies')}
        colors={colors}
      >
        {recentBuddies(2).map((item) => (
          <ShopPromoTile
            key={item.id}
            colors={colors}
            chip={<BuddyChip id={item.id} />}
            name={t(buddyText(item.id, 'name'))}
            onPress={() => {
              setPeekLook('')
              setPeekBuddy(item.id)
            }}
          />
        ))}
      </ShopPromoShelf>

      {peekLook && isGemLook(peekLook) ? <LookPreviewCard look={peekLook} colors={colors} theme={theme} /> : null}
      {peekBuddy ? <BuddyPreviewCard id={peekBuddy} colors={colors} /> : null}

      <View style={[styles.doorCard, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <ShopDoor
          colors={colors}
          preview={<LookChip id={purse.lookOn} colors={colors} />}
          title={t('shop.looks')}
          note={t('shop.looksDoor')}
          meta={t('shop.ownedN', { n: lookCount })}
          onPress={() => goHash('/shop/looks')}
        />
        <ShopDoor
          colors={colors}
          preview={<CheerChip id={purse.cheerOn} stage={1} colors={colors} />}
          title={t('shop.cheers')}
          note={t('shop.cheersDoor')}
          meta={t('shop.ownedN', { n: cheerCount })}
          onPress={() => goHash('/shop/cheers')}
        />
        <ShopDoor
          colors={colors}
          preview={<BuddyChip id={purse.buddyOn || BUDDIES[0].id} />}
          title={t('shop.buddies')}
          note={t('shop.buddiesDoor')}
          meta={t('shop.ownedN', { n: buddyCount })}
          onPress={() => goHash('/shop/buddies')}
        />
        <ShopDoor
          colors={colors}
          preview={<GemDoorChip colors={colors} />}
          title={t('gems.title')}
          note={t('shop.gemsDoor')}
          onPress={() => goHash('/gems')}
        />
        <ShopDoor
          colors={colors}
          preview={<LookChip id="ink" colors={colors} />}
          title={t('shop.kit')}
          note={t('shop.kitDoor')}
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
  const [miss, setMiss] = useState('')
  const [confirm, setConfirm] = useState(null)

  function take(next) {
    setMiss(shopMiss(next))
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
        actionLabel={label}
        primary={on}
        disabled={on}
        onAction={() => {
          if (have) {
            take(buyLook(book, item.id))
            return
          }
          setMiss('')
          setConfirm({
            title: t(lookText(item.id, 'name')),
            body: t('shop.buyLookBody', { cost }),
            go: () => take(buyLook(book, item.id)),
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
    >
      <Meta colors={colors}>{t('shop.looksHint')}</Meta>

      {peekLook && isGemLook(peekLook) ? <LookPreviewCard look={peekLook} colors={colors} theme={theme} /> : null}

      <Cap colors={colors}>{t('shop.looksCoins')}</Cap>
      {COIN_LOOKS.map(lookRow)}

      <Cap colors={colors}>{t('shop.looksGems')}</Cap>
      {GEM_LOOKS.map(lookRow)}

      {miss ? <Meta colors={colors}>{miss}</Meta> : null}
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
  const [miss, setMiss] = useState('')
  const [confirm, setConfirm] = useState(null)

  function take(next) {
    setMiss(shopMiss(next))
    if (!next.miss) {
      setConfirm(null)
      onChange(next.book)
    }
  }

  return (
    <BoardShell book={book} title={t('shop.cheers')} date={shellDate(book)} colors={colors}>
      <Meta colors={colors}>{t('shop.cheerHint')}</Meta>

      {CHEERS.map((item) => {
        const have = purse.cheers.includes(item.id)
        const stage = cheerStageOf(book, item.id)
        const next = have ? nextCheerStage(stage) : 0
        let actionLabel = t('shop.buy')
        let onAction = () => {
          setMiss('')
          setConfirm({
            title: t(cheerText(item.id, 'name')),
            body: t('shop.buyCheerBody', { cost: gemLine(item.gems) }),
            go: () => take(buyCheer(book, item.id)),
          })
        }
        let disabled = false
        let primary = false

        if (have) {
          if (next) {
            actionLabel = t('shop.nextStage')
            onAction = () => {
              setMiss('')
              setConfirm({
                title: t(cheerText(item.id, 'name')),
                body: t('shop.buyStageBody', { n: next, cost: gemLine(CHEER_STAGE_GEMS[next]) }),
                go: () => take(buyCheerStage(book, item.id)),
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
            onPreview={() => fireCheer(item.id, have ? cheerPlayOf(book, item.id) : 1, coat, undefined, true)}
            name={t(cheerText(item.id, 'name'))}
            note={t(cheerText(item.id, 'line'))}
            actionLabel={actionLabel}
            primary={primary}
            disabled={disabled}
            onAction={onAction}
          />
        )
      })}

      {miss ? <Meta colors={colors}>{miss}</Meta> : null}
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
  const [miss, setMiss] = useState('')
  const [confirm, setConfirm] = useState(null)

  function take(next) {
    setMiss(shopMiss(next))
    if (!next.miss) {
      setPeekBuddy('')
      setConfirm(null)
      onChange(next.book)
    }
  }

  return (
    <BoardShell book={book} title={t('shop.buddies')} date={shellDate(book)} colors={colors}>
      <Meta colors={colors}>{t('shop.buddiesHint')}</Meta>

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
            actionLabel={label}
            primary={on}
            disabled={on}
            onAction={() => {
              if (have) {
                take(wearBuddy(book, item.id))
                return
              }
              setMiss('')
              setConfirm({
                title: t(buddyText(item.id, 'name')),
                body: t('shop.buyBuddyBody', { cost: gemLine(item.gems) }),
                go: () => take(buyBuddy(book, item.id)),
              })
            }}
          />
        )
      })}

      {miss ? <Meta colors={colors}>{miss}</Meta> : null}
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
  const [miss, setMiss] = useState('')
  const [note, setNote] = useState('')
  const [storeReady, setStoreReady] = useState(false)
  const [storeLoading, setStoreLoading] = useState(isReactNative())

  useEffect(() => {
    if (!isReactNative()) return undefined
    initGemIap().then(() => {
      setStoreReady(iapReady())
      setStoreLoading(false)
    })
    return undefined
  }, [])

  async function buy(packId) {
    setMiss('')
    setNote('')
    const out = await startGemPurchase(packId)
    if (out.miss === 'signin') {
      goHash('/account')
      return
    }
    if (out.miss) {
      setMiss(gemMiss(out.miss))
      return
    }
    setNote(out.pending ? t('gems.pending') : t('gems.return'))
  }

  const expoGo = Constants.appOwnership === 'expo'
  const storeNote = expoGo
    ? t('gems.appOnly')
    : storeLoading
      ? t('gems.loadingStore')
      : !storeReady
        ? t('gems.setup')
        : ''

  return (
    <BoardShell book={book} title={t('gems.title')} date={shellDate(book)} colors={colors}>
      <View style={[styles.gemBalance, { borderColor: colors.line, backgroundColor: colors.panel2 }]}>
        <GemStack count={purse.gems} max={10} accessibilityLabel={t('gems.balance', { gems: purse.gems })} />
      </View>
      <Meta colors={colors}>{t('gems.hintNative')}</Meta>
      {storeNote ? <Meta colors={colors}>{storeNote}</Meta> : null}

      {GEM_PACKS.map((pack) => {
        const each = formatUsd(Math.round(pack.cents / pack.gems))
        const saveNote = pack.save ? t('gems.save', { n: pack.save }) : ''
        const price = packPriceLabel(pack, storePrice(pack.id))
        return (
          <View key={pack.id} style={[styles.shopRow, { borderColor: colors.line, backgroundColor: colors.panel }]}>
            <GemPackMark
              count={pack.gems}
              colors={colors}
              accessibilityLabel={pack.gems === 1 ? t('shop.gemOne') : t('shop.gems', { n: pack.gems })}
            />
            <View style={styles.shopCopy}>
              <Text style={[styles.shopName, { color: colors.ink }]}>{price}</Text>
              <Text style={[styles.shopNote, { color: colors.inkDim }]}>
                {saveNote}
                {saveNote ? ' · ' : ''}
                {t('gems.each', { price: each })}
              </Text>
            </View>
            <DidButton
              small
              label={t('gems.buy')}
              onPress={() => buy(pack.id)}
              colors={colors}
              disabled={!storeReady}
            />
          </View>
        )
      })}

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
      {note ? <Meta colors={colors}>{note}</Meta> : null}
      {miss ? <Meta colors={colors}>{miss}</Meta> : null}
      <KeyButton label={t('gems.backShop')} onPress={() => goHash('/shop')} colors={colors} />
    </BoardShell>
  )
}

export function CollectionScreen({ book, onChange }) {
  const theme = useTheme()
  const [peekLook, setPeekLook] = useState('')
  const colors = useShopColors(book, peekLook)
  const coat = activeLook(book)
  const purse = normalizePurse(book)
  const looks = LOOKS.filter((item) => purse.looks.includes(item.id))
  const buddies = BUDDIES.filter((item) => purse.buddies.includes(item.id))
  const cheers = CHEERS.filter((item) => purse.cheers.includes(item.id))

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

      <Cap colors={colors}>{t('shop.looks')}</Cap>
      {looks.map((item) => {
        const on = purse.lookOn === item.id
        return (
          <ShopActionRow
            key={item.id}
            colors={colors}
            preview={<LookChip id={item.id} colors={colors} />}
            previewOn={peekLook === item.id}
            onPreview={() => setPeekLook((prev) => (prev === item.id ? '' : item.id))}
            name={t(lookText(item.id, 'name'))}
            note={t(lookText(item.id, 'line'))}
            actionLabel={on ? t('shop.on') : t('shop.use')}
            primary={on}
            disabled={on}
            onAction={() => onChange(wearLook(book, item.id).book)}
          />
        )
      })}

      <Cap colors={colors}>{t('shop.buddies')}</Cap>
      {buddies.map((item) => {
        const on = purse.buddyOn === item.id
        return (
          <ShopActionRow
            key={item.id}
            colors={colors}
            name={t(buddyText(item.id, 'name'))}
            note={t(buddyText(item.id, 'line'))}
            actionLabel={on ? t('shop.on') : t('shop.use')}
            primary={on}
            disabled={on}
            onAction={() => onChange(wearBuddy(book, item.id).book)}
          />
        )
      })}
      <ShopActionRow
        colors={colors}
        name={t('kit.buddyOff')}
        note={t('kit.buddyOffLine')}
        actionLabel={!purse.buddyOn ? t('shop.on') : t('shop.use')}
        primary={!purse.buddyOn}
        disabled={!purse.buddyOn}
        onAction={() => onChange(wearBuddy(book, '').book)}
      />

      <Cap colors={colors}>{t('shop.cheers')}</Cap>
      {cheers.map((item) => {
        const on = purse.cheerOn === item.id
        const owned = cheerStageOf(book, item.id)
        const play = cheerPlayOf(book, item.id)
        return (
          <View key={item.id} style={[styles.cheerPick, { borderColor: colors.line, backgroundColor: colors.panel }]}>
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
      })}
      <ShopActionRow
        colors={colors}
        name={t('kit.cheerOff')}
        note={t('kit.cheerOffLine')}
        actionLabel={!purse.cheerOn ? t('shop.on') : t('shop.use')}
        primary={!purse.cheerOn}
        disabled={!purse.cheerOn}
        onAction={() => pickCheer('')}
      />

      <KeyButton label={t('shop.title')} onPress={() => goHash('/shop')} colors={colors} />
    </BoardShell>
  )
}

const styles = StyleSheet.create({
  purseRow: { marginBottom: 4 },
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
  shopNote: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
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
  buddyPreviewCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 8,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
    overflow: 'hidden',
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
  promoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promoAll: { fontFamily: fonts.ui, fontSize: 13, fontWeight: '600' },
  promoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  promoTile: {
    width: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    minWidth: 120,
  },
  promoChip: { alignSelf: 'flex-start' },
  promoName: { fontFamily: fonts.ui, fontSize: 14, fontWeight: '600' },
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
})
