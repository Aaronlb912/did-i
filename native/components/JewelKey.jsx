import { StyleSheet, Text, View } from 'react-native'
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

// What the dot on each question pill means. Shown once, on a night after the first.
export function JewelKey({ colors, onDone }) {
  const rows = [
    { color: colors.on, label: t('jewelKey.did'), check: true },
    { color: colors.late, label: t('jewelKey.late'), check: true },
    { color: colors.skip, label: t('jewelKey.nope') },
    { color: colors.open, label: t('jewelKey.open') },
    { color: colors.miss, label: t('jewelKey.due') },
  ]
  return (
    <View style={[styles.box, { backgroundColor: colors.panel2, borderColor: colors.line }]}>
      <Text style={[styles.title, { color: colors.ink }]}>{t('jewelKey.title')}</Text>
      <Text style={[styles.label, styles.tap, { color: colors.inkSoft }]}>{t('pill.openHint')}</Text>
      <View style={styles.grid}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            {row.check ? (
              <Text style={[styles.check, { color: row.color }]}>✓</Text>
            ) : (
              <View style={[styles.dot, { backgroundColor: row.color }]} />
            )}
            <Text style={[styles.label, { color: colors.inkSoft }]}>{row.label}</Text>
          </View>
        ))}
        <View style={styles.row}>
          <View style={[styles.dash, { borderColor: colors.inkSoft }]} />
          <Text style={[styles.label, { color: colors.inkSoft }]}>{t('jewelKey.wait')}</Text>
        </View>
      </View>
      <View style={styles.ok}>
        <DidButton
          label={t('jewelKey.ok')}
          colors={colors}
          small
          onPress={() => {
            markSeen()
            onDone()
          }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  title: { fontFamily: fonts.uiSemi, fontSize: 15, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '50%' },
  dot: { width: 9, height: 9, borderRadius: 5 },
  check: { fontSize: 13, lineHeight: 15, fontWeight: '700', width: 11, textAlign: 'center' },
  tap: { marginTop: -4, marginBottom: 10 },
  dash: { width: 16, height: 10, borderRadius: 5, borderWidth: 1, borderStyle: 'dashed' },
  label: { fontFamily: fonts.ui, fontSize: 13 },
  ok: { alignSelf: 'flex-start', marginTop: 12 },
})
