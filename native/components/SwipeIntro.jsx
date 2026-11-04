import { Pressable, StyleSheet, Text } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { readPrefs, writePrefs } from '../../src/lib/prefs.js'
import { fonts } from '../theme.js'

// Someone who already answered by swiping (before this hint existed) knows how.
export function swipeIntroSeen(prefs = readPrefs()) {
  return prefs.swipeIntroSeen === true || (prefs.swipesLearned || 0) >= 3
}

export function markSwipeIntroSeen() {
  writePrefs({ swipeIntroSeen: true })
}

// How to answer, once, the first time there is a card to swipe. There are no
// Did / Not yet buttons under the card (owner call, 2026-10-06), so this is
// the only lesson. One line, no popup: the first answer clears it (Tonight
// calls markSwipeIntroSeen), and a tap clears it too. Synced, so a new phone
// does not show it again.
export function SwipeIntro({ colors, onDone }) {
  const done = () => {
    markSwipeIntroSeen()
    onDone?.()
  }
  return (
    <Pressable onPress={done} accessibilityRole="button" accessibilityLabel={t('swipeIntro.line')} accessibilityHint={t('swipeIntro.ok')} hitSlop={6} style={styles.row}>
      <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.arrow, { color: colors.skip }]}>←</Text>
      <Text style={[styles.line, { color: colors.inkSoft }]}>{t('swipeIntro.line')}</Text>
      <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.arrow, { color: colors.on }]}>→</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 4 },
  arrow: { fontFamily: fonts.uiBold, fontSize: 20 },
  line: { fontFamily: fonts.uiSemi, fontSize: 15, textAlign: 'center', flexShrink: 1 },
})
