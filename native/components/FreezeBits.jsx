// Streak freezes: the how-it-works sheet, the small chip that shows how many
// are held, and the toasts when one is earned or used.
import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { FREEZE_MAX, freezeEarnedNow, freezeState } from '../../src/lib/hall-feel.js'
import { t } from '../../src/lib/i18n.js'
import { addDaysIso, boardDate } from '../../src/lib/recurrence.js'
import { goHash } from '../navigation/hash.js'
import { showToast } from '../lib/toast-queue.js'
import { pressFx } from '../lib/motion.jsx'
import { fonts, withAlpha } from '../theme.js'
import { publishSheet, sheetIsUp } from './SheetHost.jsx'
import { KeyButton } from './ui.jsx'

export const FREEZE_GLYPH = '❄'
export const FREEZE_RULES = [
  'freeze.rule1',
  'freeze.rule2',
  'freeze.rule3',
  'freeze.rule4',
  'freeze.rule6',
  'freeze.rule7',
  'freeze.rule8',
  'freeze.rule9',
]

// "1 of 2".
export function freezeLine(state) {
  return t('freeze.ofMax', { n: state.held, max: FREEZE_MAX })
}

function FreezeHow({ colors, state }) {
  const ink = { color: colors.inkSoft }
  const go = (path) => {
    publishSheet(null)
    goHash(path)
  }
  return (
    <View style={styles.how}>
      {FREEZE_RULES.slice(0, 4).map((key) => (
        <Text key={key} style={[styles.line, ink]}>{t(key)}</Text>
      ))}
      <View style={styles.dotRow}>
        <View style={[styles.dot, { borderWidth: 1.5, borderColor: colors.freeze }]} />
        <Text style={[styles.line, ink, styles.flex]}>{t('freeze.rule5')}</Text>
      </View>
      {FREEZE_RULES.slice(4).map((key) => (
        <Text key={key} style={[styles.line, ink]}>{t(key)}</Text>
      ))}
      {state ? (
          <Text style={[styles.head, { color: colors.ink }]}>{t('freeze.youHave', { n: state.held, max: FREEZE_MAX })}</Text>
      ) : null}
      <KeyButton colors={colors} label={t('freeze.goStreaks')} onPress={() => go('/streaks')} />
      <KeyButton colors={colors} label={t('away.cap')} onPress={() => go('/pings')} />
    </View>
  )
}

export function openFreezeHow(colors, boards, now = new Date()) {
  const close = () => publishSheet(null)
  const state = boards ? freezeState(boards, now) : null
  publishSheet({
    title: t('freeze.howTitle'),
    content: <FreezeHow colors={colors} state={state} />,
    closeLabel: t('cal.close'),
    colors,
    onClose: close,
  })
}

// A freeze just earned: the same pop-up a new frame gets. A toast while
// another sheet is up, so it never covers one.
function freezeEarned(colors, boards, now) {
  if (sheetIsUp()) {
    showToast({
      id: 'freeze-earned',
      kind: 'done',
      text: t('freeze.earned'),
      ms: 5200,
      onPress: () => openFreezeHow(colors, boards, now),
    })
    return
  }
  const close = () => publishSheet(null)
  publishSheet({
    preview: <Text style={[styles.art, { color: colors.freeze }]} accessibilityElementsHidden importantForAccessibility="no">{FREEZE_GLYPH}</Text>,
    title: t('freeze.earned'),
    body: t('freeze.earnedBody'),
    goLabel: t('freeze.earnedOk'),
    onGo: close,
    noClose: true,
    onClose: close,
    colors,
  })
}

// Snowflake and count. Shows nothing when none are held.
export function FreezeChip({ colors, held, onPress }) {
  // Shown at 0 too, faint, so people find out freezes exist.
  const faint = !held
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={t('freeze.chipAria', { n: held, max: FREEZE_MAX })}
      style={({ pressed }) => [
        styles.chip,
        faint ? { borderColor: colors.line, backgroundColor: 'transparent' } : { borderColor: colors.freeze, backgroundColor: withAlpha(colors.freeze, 0.14) },
        pressFx(pressed),
      ]}
    >
      <Text style={[styles.chipText, { color: faint ? colors.inkDim : colors.freeze }]}>{`${FREEZE_GLYPH} ${held}`}</Text>
    </Pressable>
  )
}

const SEEN_HELD = 'did-i-freeze-held'
const SEEN_USED = 'did-i-freeze-used'
const SEEN_FREE = 'did-i-freeze-free'
const SEEN_RUN = 'did-i-freeze-run'
function readKey(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function writeKey(key, value) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // Nothing to keep: the toast may show again.
  }
}

// One toast when a freeze is earned, one the morning after one is used, one
// when the free miss of the week kept a streak. Runs after the screen shows,
// once per change. Gentle mode shows nothing but still marks them seen, so
// turning it off later does not replay old pop-ups.
// The earned pop-up needs the run to cross a new multiple of 14: a used freeze
// coming back after a late Did raises what is held but earns nothing.
export function useFreezeToasts(colors, boards, now, gentle = false) {
  const state = boards ? freezeState(boards, now) : null
  const held = state?.held ?? -1
  const run = state?.run ?? 0
  let lastFrozen = ''
  let lastFree = ''
  if (state) for (const iso of state.frozen) if (iso > lastFrozen) lastFrozen = iso
  if (state) for (const iso of state.free) if (iso > lastFree) lastFree = iso
  useEffect(() => {
    if (!state || held < 0) return
    const seen = readKey(SEEN_HELD)
    const seenRun = readKey(SEEN_RUN)
    if (!gentle && freezeEarnedNow(seen, held, seenRun, run)) freezeEarned(colors, boards, now)
    writeKey(SEEN_HELD, held)
    writeKey(SEEN_RUN, run)
    const today = boardDate(now, boards?.[0]?.dayFoldHour ?? 0)
    if (lastFree && readKey(SEEN_FREE) !== lastFree) {
      if (!gentle && lastFree >= addDaysIso(today, -2)) {
        showToast({
          id: 'free-miss-used',
          kind: 'done',
          text: t('saves.usedToast'),
          ms: 5200,
          onPress: () => openFreezeHow(colors, boards, now),
        })
      }
      writeKey(SEEN_FREE, lastFree)
    }
    if (lastFrozen && readKey(SEEN_USED) !== lastFrozen) {
      // Only the night just gone, not old freezes found on a first look.
      if (!gentle && lastFrozen >= addDaysIso(today, -2)) {
        showToast({
          id: 'freeze-used',
          kind: 'done',
          text: t('freeze.usedToast'),
          ms: 5200,
          onPress: () => openFreezeHow(colors, boards, now),
        })
      }
      writeKey(SEEN_USED, lastFrozen)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [held, run, lastFrozen, lastFree])
}

const styles = StyleSheet.create({
  how: { gap: 6 },
  head: { fontFamily: fonts.uiSemi, fontSize: 14, marginTop: 6 },
  line: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  flex: { flex: 1 },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  art: { fontSize: 56, lineHeight: 68, textAlign: 'center' },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 13 },
})
