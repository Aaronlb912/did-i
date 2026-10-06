// The Refer page ladder (showroom referral-rewards.html): friends who joined,
// a bar to the next big reward, then a rung for every reward with its state.
// The buddy and frame rungs show a preview and open a sheet when tapped.
import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { t } from '../../src/lib/i18n.js'
import { referLadder, referLadderNote } from '../../src/lib/invite-reward.js'
import { buddyText, lookText, normalizePurse, wearBuddy } from '../../src/lib/purse.js'
import { frameText } from '../../src/lib/frames.js'
import { previewSample } from '../../src/lib/board-shelf.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { confirmDone } from '../lib/confirm.js'
import { faceCardStyle, faceCardStyles } from '../lib/face-card.js'
import { pressFx } from '../lib/motion.jsx'
import { fonts, radius } from '../theme.js'
import { openFrameSheet } from '../screens/frames.jsx'
import { BuddyArt } from './BuddyArt.jsx'
import { BuddyChip } from './Cosmetic.jsx'
import { FramePreview } from './frames/FramePreview.jsx'
import { publishSheet } from './SheetHost.jsx'

const SWAY_MS = 1800

/** A big buddy that sways; still under Less motion. */
function BigBuddy({ id, size = 96 }) {
  const reduce = useReduceMotion()
  const sway = useSharedValue(0.5)
  useEffect(() => {
    if (reduce) return undefined
    sway.value = 0
    sway.value = withRepeat(withTiming(1, { duration: SWAY_MS * 1.6, easing: Easing.inOut(Easing.sin) }), -1, true)
    return () => {
      cancelAnimation(sway)
      sway.value = 0.5
    }
  }, [reduce, sway])
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${(sway.value - 0.5) * 6}deg` }] }))
  return (
    <Animated.View style={reduce ? null : style}>
      <BuddyArt id={id} width={size} height={(size * 58) / 48} />
    </Animated.View>
  )
}

function BuddyPreview({ id, colors }) {
  const sample = previewSample()
  return (
    <View style={styles.previewRow}>
      <BigBuddy id={id} />
      <View style={[...faceCardStyle(colors), styles.miniCard]}>
        <Text style={[faceCardStyles.kicker, { color: colors.on }]}>{sample.tag}</Text>
        <Text style={[styles.miniTitle, { color: colors.ink }]} numberOfLines={3}>
          {sample.question}
        </Text>
        <View style={styles.miniBuddy}>
          <BuddyChip id={id} alive />
        </View>
      </View>
    </View>
  )
}

function openBuddySheet({ rung, book, colors, onChange }) {
  const purse = normalizePurse(book)
  const owned = purse.buddies.includes(rung.id)
  const on = purse.buddyOn === rung.id
  const name = t(buddyText(rung.id, 'name'))
  publishSheet({
    preview: <BuddyPreview id={rung.id} colors={colors} />,
    kicker: t('refer.buddyKicker'),
    title: name,
    body: `${t(buddyText(rung.id, 'line'))}\n${owned ? t('shop.owned') : t('refer.buddyHow', { n: rung.n })}`,
    ...(owned && !on && onChange
      ? {
          goLabel: t('shop.use'),
          onGo: () => {
            const next = wearBuddy(book, rung.id)
            publishSheet(null)
            if (next.miss) return
            onChange(next.book)
            confirmDone(t('confirm.wearing', { name }))
          },
        }
      : {}),
    closeLabel: t('settings.close'),
    colors,
    onClose: () => publishSheet(null),
  })
}

function rungTitle(rung) {
  if (rung.kind === 'gems') return rung.gems === 1 ? t('shop.gemOne') : t('shop.gems', { n: rung.gems })
  if (rung.kind === 'look') return t('refer.look', { name: t(lookText(rung.id, 'name')) })
  if (rung.kind === 'buddy') return t('refer.buddy', { name: t(buddyText(rung.id, 'name')) })
  return t('refer.frame', { name: t(frameText(rung.id, 'name')) })
}

function rungSub(rung) {
  if (rung.kind === 'look') return t(lookText(rung.id, 'line'))
  if (rung.kind === 'buddy') return t('refer.buddySub')
  if (rung.kind === 'frame') return t('refer.frameSub')
  return ''
}

function rungState(rung) {
  if (rung.state === 'got') return t('refer.got')
  if (rung.state === 'next') return rung.left === 1 ? t('refer.next') : t('refer.toGo', { n: rung.left })
  return t('refer.toGo', { n: rung.left })
}

function Rung({ rung, colors, frameColors, onOpen }) {
  const sub = rungSub(rung)
  const next = rung.state === 'next'
  const got = rung.state === 'got'
  const body = (
    <>
      <Text style={[styles.n, { color: colors.ink }]}>{rung.n}</Text>
      <View style={styles.what}>
        <Text style={[styles.whatTitle, { color: colors.ink }]}>{rungTitle(rung)}</Text>
        {sub ? <Text style={[styles.whatSub, { color: colors.inkSoft }]}>{sub}</Text> : null}
      </View>
      {rung.kind === 'buddy' ? <BuddyChip id={rung.id} alive /> : null}
      {rung.kind === 'frame' ? <FramePreview id={rung.id} colors={frameColors} size={30} /> : null}
      <Text style={[styles.state, { color: got ? colors.on : colors.inkDim }]}>{rungState(rung)}</Text>
    </>
  )
  const rowStyle = [styles.rung, { borderTopColor: colors.line }, next && [styles.rungNext, { backgroundColor: colors.open }]]
  if (!onOpen) return <View style={rowStyle}>{body}</View>
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${rungTitle(rung)}, ${rungState(rung)}`}
      style={({ pressed }) => [...rowStyle, pressFx(pressed)]}
    >
      {body}
    </Pressable>
  )
}

export function ReferLadder({ colors, frameColors, joined = 0, book, onChange }) {
  const ladder = referLadder(joined)
  const note = referLadderNote(ladder)
  const ctx = { today: '', joined: ladder.joined }
  const count = ladder.toFrame ? t('refer.count', { n: ladder.joined, of: ladder.goal }) : t('refer.countAll', { n: ladder.joined })
  const open = (rung) => {
    if (rung.kind === 'buddy') return () => openBuddySheet({ rung, book, colors, onChange })
    if (rung.kind === 'frame') return () => openFrameSheet({ id: rung.id, book, colors: frameColors, ctx, onChange })
    return null
  }
  return (
    <View style={[styles.wrap, { backgroundColor: colors.panel, borderColor: colors.line }]}>
      <Text style={[styles.kicker, { color: colors.on }]}>{t('refer.kicker')}</Text>
      <Text style={[styles.big, { color: colors.ink }]}>{count}</Text>
      <View
        style={[styles.track, { backgroundColor: colors.open }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: ladder.goal, now: Math.min(ladder.joined, ladder.goal) }}
        accessibilityLabel={count}
      >
        <View style={[styles.fill, { backgroundColor: colors.on, width: `${ladder.pct}%` }]} />
      </View>
      <Text style={[styles.note, { color: colors.inkSoft }]}>{t(note.key, note.vars)}</Text>
      {ladder.rungs.map((rung) => (
        <Rung key={`${rung.kind}${rung.n}`} rung={rung} colors={colors} frameColors={frameColors || colors} onOpen={open(rung)} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 24, padding: 18, gap: 10, marginBottom: 12 },
  kicker: { fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 1.9, textTransform: 'uppercase', fontWeight: '700' },
  big: { fontFamily: fonts.uiBold, fontSize: 22, lineHeight: 27, fontWeight: '700' },
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  note: { fontFamily: fonts.ui, fontSize: 13.5, lineHeight: 19 },
  rung: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, minHeight: 48 },
  rungNext: { borderRadius: 12, paddingHorizontal: 8, borderTopColor: 'transparent' },
  n: { width: 30, textAlign: 'center', fontFamily: fonts.mono, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  what: { flex: 1, gap: 1 },
  whatTitle: { fontFamily: fonts.uiSemi, fontSize: 15, fontWeight: '600' },
  whatSub: { fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 16 },
  state: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.9, fontWeight: '700', textTransform: 'uppercase' },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 8 },
  miniCard: { width: 150, minHeight: 96, padding: 12, paddingRight: 40 },
  miniTitle: { fontFamily: fonts.uiBold, fontSize: 13, lineHeight: 16, fontWeight: '700' },
  miniBuddy: { position: 'absolute', right: 6, top: 6 },
})
