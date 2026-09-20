import Constants from 'expo-constants'
import { useEffect, useState } from 'react'
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
import { BuddyChip, CheerChip, LookChip } from '../components/Cosmetic.jsx'
import { DidButton, KeyButton, Kicker, Meta, Page, Row, Title } from '../components/ui.jsx'
import { goHash } from '../navigation/hash.js'
import { hallColors, fonts } from '../theme.js'

const COIN_LOOKS = LOOKS.filter((item) => !item.gems)
const GEM_LOOKS = LOOKS.filter((item) => item.gems > 0)
const STAGES = [1, 2, 3, 4, 5]

function shopMiss(next) {
  if (!next?.miss) return ''
  if (next.missN != null) return t(next.miss, { n: next.missN })
  return t(next.miss)
}

function wearLook(book, id) {
  return buyLook(book, id)
}

function useShopColors(book) {
  const theme = useTheme()
  return hallColors(activeLook(book), theme)
}

function PurseLine({ purse, colors }) {
  return (
    <Meta colors={colors}>
      {t('shop.coins', { n: purse.coins })} · {t('shop.gems', { n: purse.gems })}
    </Meta>
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

function ShopActionRow({ name, note, actionLabel, onAction, colors, primary, disabled, nested, preview }) {
  return (
    <View
      style={[
        nested ? styles.shopRowNested : styles.shopRow,
        !nested && { borderColor: colors.line, backgroundColor: colors.panel },
      ]}
    >
      {preview || null}
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
  const colors = useShopColors(book)
  const purse = normalizePurse(book)
  const lookCount = purse.looks.length
  const cheerCount = purse.cheers.length
  const buddyCount = purse.buddies.length

  return (
    <Page colors={colors}>
      <Kicker colors={colors}>{t('shop.title')}</Kicker>
      <Title colors={colors}>{t('shop.title')}</Title>
      <PurseLine purse={purse} colors={colors} />
      <Meta colors={colors}>{t('shop.hubHint')}</Meta>

      <Cap colors={colors}>{t('shop.promoLooks')}</Cap>
      {recentLooks(2).map((item) => (
        <Row
          key={item.id}
          colors={colors}
          label={t(lookText(item.id, 'name'))}
          note={t(lookText(item.id, 'line'))}
          onPress={() => goHash('/shop/looks')}
        />
      ))}

      <Cap colors={colors}>{t('shop.promoCheers')}</Cap>
      {recentCheers(2).map((item) => (
        <Row
          key={item.id}
          colors={colors}
          label={t(cheerText(item.id, 'name'))}
          note={t(cheerText(item.id, 'line'))}
          onPress={() => goHash('/shop/cheers')}
        />
      ))}

      <Cap colors={colors}>{t('shop.promoBuddies')}</Cap>
      {recentBuddies(2).map((item) => (
        <Row
          key={item.id}
          colors={colors}
          label={t(buddyText(item.id, 'name'))}
          note={t(buddyText(item.id, 'line'))}
          onPress={() => goHash('/shop/buddies')}
        />
      ))}

      <Cap colors={colors}>{t('shop.title')}</Cap>
      <Row
        colors={colors}
        label={t('shop.looks')}
        note={`${t('shop.looksDoor')} · ${t('shop.ownedN', { n: lookCount })}`}
        onPress={() => goHash('/shop/looks')}
      />
      <Row
        colors={colors}
        label={t('shop.cheers')}
        note={`${t('shop.cheersDoor')} · ${t('shop.ownedN', { n: cheerCount })}`}
        onPress={() => goHash('/shop/cheers')}
      />
      <Row
        colors={colors}
        label={t('shop.buddies')}
        note={`${t('shop.buddiesDoor')} · ${t('shop.ownedN', { n: buddyCount })}`}
        onPress={() => goHash('/shop/buddies')}
      />
      <Row colors={colors} label={t('gems.title')} note={t('shop.gemsDoor')} onPress={() => goHash('/gems')} />
      <Row colors={colors} label={t('shop.kit')} note={t('shop.kitDoor')} onPress={() => goHash('/kit')} />
    </Page>
  )
}

export function ShopLooksScreen({ book, onChange }) {
  const colors = useShopColors(book)
  const purse = normalizePurse(book)
  const [miss, setMiss] = useState('')
  const [confirm, setConfirm] = useState(null)

  function take(next) {
    setMiss(shopMiss(next))
    if (!next.miss) {
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
    <Page colors={colors}>
      <Kicker colors={colors}>{t('shop.title')}</Kicker>
      <Title colors={colors}>{t('shop.looks')}</Title>
      <PurseLine purse={purse} colors={colors} />
      <Meta colors={colors}>{t('shop.looksHint')}</Meta>

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
    </Page>
  )
}

export function ShopCheersScreen({ book, onChange }) {
  const colors = useShopColors(book)
  const purse = normalizePurse(book)
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
    <Page colors={colors}>
      <Kicker colors={colors}>{t('shop.title')}</Kicker>
      <Title colors={colors}>{t('shop.cheers')}</Title>
      <PurseLine purse={purse} colors={colors} />
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
            preview={<CheerChip id={item.id} stage={stage} colors={colors} />}
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
    </Page>
  )
}

export function ShopBuddiesScreen({ book, onChange }) {
  const colors = useShopColors(book)
  const purse = normalizePurse(book)
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
    <Page colors={colors}>
      <Kicker colors={colors}>{t('shop.title')}</Kicker>
      <Title colors={colors}>{t('shop.buddies')}</Title>
      <PurseLine purse={purse} colors={colors} />
      <Meta colors={colors}>{t('shop.buddiesHint')}</Meta>

      {BUDDIES.map((item) => {
        const have = purse.buddies.includes(item.id)
        const on = purse.buddyOn === item.id
        const label = on ? t('shop.on') : have ? t('shop.use') : t('shop.buy')
        return (
          <ShopActionRow
            key={item.id}
            colors={colors}
            preview={<BuddyChip id={item.id} />}
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
    </Page>
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
    <Page colors={colors}>
      <Kicker colors={colors}>{t('shop.title')}</Kicker>
      <Title colors={colors}>{t('gems.title')}</Title>
      <PurseLine purse={purse} colors={colors} />
      <Meta colors={colors}>{t('gems.balance', { gems: purse.gems })}</Meta>
      <Meta colors={colors}>{t('gems.hintNative')}</Meta>
      {storeNote ? <Meta colors={colors}>{storeNote}</Meta> : null}

      {GEM_PACKS.map((pack) => {
        const each = formatUsd(Math.round(pack.cents / pack.gems))
        const save = pack.save ? ` · ${t('gems.save', { n: pack.save })}` : ''
        const price = packPriceLabel(pack, storePrice(pack.id))
        return (
          <View key={pack.id} style={[styles.shopRow, { borderColor: colors.line, backgroundColor: colors.panel }]}>
            <View style={[styles.gemMark, { borderColor: colors.line, backgroundColor: colors.panel2 }]}>
              <Text style={[styles.gemMarkN, { color: colors.on }]}>{pack.gems}</Text>
            </View>
            <View style={styles.shopCopy}>
              <Text style={[styles.shopName, { color: colors.ink }]}>
                {pack.gems === 1 ? t('shop.gemOne') : t('shop.gems', { n: pack.gems })}
              </Text>
              <Text style={[styles.shopNote, { color: colors.inkDim }]}>
                {price}
                {save} · {t('gems.each', { price: each })}
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
    </Page>
  )
}

export function CollectionScreen({ book, onChange }) {
  const colors = useShopColors(book)
  const purse = normalizePurse(book)
  const looks = LOOKS.filter((item) => purse.looks.includes(item.id))
  const buddies = BUDDIES.filter((item) => purse.buddies.includes(item.id))
  const cheers = CHEERS.filter((item) => purse.cheers.includes(item.id))

  function pickCheer(id) {
    onChange(wearCheer(book, id).book)
  }

  function pickStage(id, n) {
    const next = wearCheerStage(book, id, n)
    if (!next.miss) onChange(next.book)
  }

  return (
    <Page colors={colors}>
      <Kicker colors={colors}>{t('shop.kit')}</Kicker>
      <Title colors={colors}>{t('kit.title')}</Title>
      <Meta colors={colors}>{t('kit.hint')}</Meta>

      <Cap colors={colors}>{t('shop.looks')}</Cap>
      {looks.map((item) => {
        const on = purse.lookOn === item.id
        return (
          <ShopActionRow
            key={item.id}
            colors={colors}
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
    </Page>
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
  shopNote: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  gemMark: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  gemMarkN: {
    fontFamily: fonts.mono,
    fontSize: 17,
    fontWeight: '700',
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
})
