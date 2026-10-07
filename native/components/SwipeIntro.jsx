import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { DidButton } from './ui.jsx'
import { t } from '../../src/lib/i18n.js'
import { readPrefs, writePrefs } from '../../src/lib/prefs.js'
import { fonts } from '../theme.js'

// Someone who already answered by swiping (before this popup existed) knows how.
export function swipeIntroSeen(prefs = readPrefs()) {
  return prefs.swipeIntroSeen === true || (prefs.swipesLearned || 0) >= 3
}

// How to answer, once, the first time there is a card to swipe. There are no
// Did / Not yet buttons under the card (owner call, 2026-10-06), so this is
// the only lesson. Synced, so a new phone does not ask again.
export function SwipeIntro({ colors, onDone }) {
  const done = () => {
    writePrefs({ swipeIntroSeen: true })
    onDone?.()
  }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={done}>
      <View style={[styles.veil, { backgroundColor: colors.veil }]}>
        <View style={[styles.box, { backgroundColor: colors.panel2, borderColor: colors.line }]}>
          <Text style={[styles.title, { color: colors.ink }]} accessibilityRole="header">
            {t('swipeIntro.title')}
          </Text>
          <View style={styles.row}>
            <Text style={[styles.arrow, { color: colors.on }]}>→</Text>
            <Text style={[styles.line, { color: colors.ink }]}>{t('swipeIntro.did')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.arrow, { color: colors.skip }]}>←</Text>
            <Text style={[styles.line, { color: colors.ink }]}>{t('swipeIntro.notYet')}</Text>
          </View>
          <Text style={[styles.small, { color: colors.inkSoft }]}>{t('swipeIntro.change')}</Text>
          <Text style={[styles.small, { color: colors.inkSoft }]}>{t('swipeIntro.pills')}</Text>
          <Pressable accessible={false} style={styles.ok}>
            <DidButton label={t('swipeIntro.ok')} colors={colors} small onPress={done} />
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  veil: { flex: 1, justifyContent: 'center', padding: 20 },
  box: { borderWidth: 1, borderRadius: 16, padding: 20, width: '100%', maxWidth: 420, alignSelf: 'center', gap: 12 },
  title: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  arrow: { fontFamily: fonts.uiBold, fontSize: 26, width: 30, textAlign: 'center' },
  line: { fontFamily: fonts.uiSemi, fontSize: 17, flex: 1 },
  small: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  ok: { alignSelf: 'flex-start', marginTop: 4 },
})
