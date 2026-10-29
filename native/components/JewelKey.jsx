import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { DidButton } from './ui.jsx'
import { t } from '../../src/lib/i18n.js'
import { readPrefs, writePrefs } from '../../src/lib/prefs.js'
import { fonts } from '../theme.js'

const SEEN = 'did-i-jewel-key'
// The night of the first answer. The legend waits for a later night, so the
// first night's payoff is not crowded by a lesson.
const FIRST_NIGHT = 'did-i-jewel-key-first'

// The phone flag alone was lost on a reinstall, so seen also lives in the
// synced prefs. A phone that saw it before this keeps it and passes it on.
export function jewelKeySeen(prefs = readPrefs()) {
  if (prefs.jewelKeySeen) return true
  try {
    if (!localStorage.getItem(SEEN)) return false
  } catch {
    return true
  }
  writePrefs({ jewelKeySeen: true })
  return true
}

/** True from the night after the first answer on. */
export function jewelKeyNight(dateIso, answeredTonight) {
  try {
    const first = localStorage.getItem(FIRST_NIGHT)
    if (first) return first < dateIso
    if (answeredTonight && dateIso) localStorage.setItem(FIRST_NIGHT, dateIso)
  } catch {
    // No storage, no legend. The dots still read on their own.
  }
  return false
}

function markSeen() {
  try {
    localStorage.setItem(SEEN, '1')
  } catch {
    // The synced pref below still holds it.
  }
  writePrefs({ jewelKeySeen: true })
}

// What the dot on each question pill means. Shown once, on a night after the first,
// as a popup over Home so it never pushes the card around.
export function JewelKey({ colors, onDone }) {
  const rows = [
    { color: colors.on, label: t('jewelKey.did') },
    { color: colors.late, label: t('jewelKey.late') },
    { color: colors.skip, label: t('jewelKey.notYet') },
    { color: colors.open, label: t('jewelKey.open') },
    { color: colors.miss, label: t('jewelKey.due') },
  ]
  const done = () => {
    markSeen()
    onDone()
  }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={done}>
    <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={done}>
    <Pressable accessible={false} onPress={(e) => e.stopPropagation()} style={[styles.box, { backgroundColor: colors.panel2, borderColor: colors.line }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{t('jewelKey.title')}</Text>
      <Text style={[styles.label, styles.tap, { color: colors.inkSoft }]}>{t('pill.openHint')}</Text>
      <View style={styles.grid}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: row.color }]} />
            <Text style={[styles.label, { color: colors.inkSoft }]}>{row.label}</Text>
          </View>
        ))}
        <View style={styles.row}>
          <View style={[styles.dash, { borderColor: colors.inkSoft }]} />
          <Text style={[styles.label, { color: colors.inkSoft }]}>{t('jewelKey.wait')}</Text>
        </View>
      </View>
      <Text style={[styles.label, styles.why, { color: colors.inkDim }]}>{t('jewelKey.lateWhy')}</Text>
      <View style={styles.ok}>
        <DidButton
          label={t('jewelKey.ok')}
          colors={colors}
          small
          onPress={done}
        />
      </View>
    </Pressable>
    </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  veil: { flex: 1, justifyContent: 'center', padding: 20 },
  box: { borderWidth: 1, borderRadius: 16, padding: 18, width: '100%', maxWidth: 420, alignSelf: 'center' },
  title: { fontFamily: fonts.uiSemi, fontSize: 15, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '50%' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  tap: { marginTop: -4, marginBottom: 10 },
  dash: { width: 16, height: 10, borderRadius: 5, borderWidth: 1, borderStyle: 'dashed' },
  label: { fontFamily: fonts.ui, fontSize: 13 },
  why: { marginTop: 10 },
  ok: { alignSelf: 'flex-start', marginTop: 12 },
})
