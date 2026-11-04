import { Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'

// A full-width row on Today while the phone's reminders are off. Turn on
// asks again, or opens the phone's settings once it has said no.
export function RemindersRow({ colors, label, onAsk }) {
  if (!onAsk || (label !== 'pings.state.ask' && label !== 'pings.state.blocked')) return null
  return (
    <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.panel2 }]}>
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.ink }]}>{t('pings.rowOff')}</Text>
        {label === 'pings.state.blocked' ? <Text style={[styles.sub, { color: colors.inkSoft }]}>{t('pings.rowBlocked')}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('pings.rowOff')}, ${t('pings.turnOn')}`}
        onPress={onAsk}
        style={[styles.go, { borderColor: colors.on }]}
      >
        <Text style={[styles.goText, { color: colors.on }]}>{t('pings.turnOn')}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 16, paddingVertical: 8, paddingLeft: 14, paddingRight: 8, marginBottom: 8, gap: 8, minHeight: 52 },
  text: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.uiBold, fontSize: 15 },
  sub: { fontFamily: fonts.ui, fontSize: 13, marginTop: 2 },
  go: { minHeight: 44, paddingHorizontal: 16, borderWidth: 1.5, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  goText: { fontFamily: fonts.uiSemi, fontSize: 15 },
})
