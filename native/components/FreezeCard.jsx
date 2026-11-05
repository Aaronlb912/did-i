import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { freezeCardNight, freezeCardSeen, markFreezeCardSeen } from '../../src/lib/freeze-card.js'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'
import { openFreezeHow } from './FreezeBits.jsx'

// The day after a streak ended: one calm card that points to freezes.
// Dismissible, once per night. Not shown in gentle mode (the caller decides).
export function FreezeCard({ colors, shelf, now, dateIso }) {
  const [seen, setSeen] = useState(freezeCardSeen)
  const night = useMemo(() => (shelf ? freezeCardNight(shelf, now, seen) : ''), [shelf, dateIso, seen])
  if (!night) return null
  const hide = () => {
    markFreezeCardSeen(night)
    setSeen(night)
  }
  return (
    <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.panel2 }]}>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.ink }]}>{t('freeze.cardTitle')}</Text>
        <Text style={[styles.body, { color: colors.inkSoft }]}>{t('freeze.cardBody')}</Text>
        <Pressable accessibilityRole="button" onPress={() => openFreezeHow(colors, shelf, now)} style={styles.go}>
          <Text style={[styles.goText, { color: colors.on }]}>{t('freeze.helpGo')}</Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('freeze.cardHide')} onPress={hide} style={styles.x}>
        <Text style={[styles.xText, { color: colors.inkSoft }]}>×</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 16, paddingLeft: 14, paddingVertical: 8, marginBottom: 12, gap: 4 },
  copy: { flex: 1, minWidth: 0, gap: 4, paddingVertical: 6 },
  title: { fontFamily: fonts.uiBold, fontSize: 15 },
  body: { fontFamily: fonts.ui, fontSize: 14 },
  go: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  goText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  x: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  xText: { fontFamily: fonts.uiSemi, fontSize: 20 },
})
