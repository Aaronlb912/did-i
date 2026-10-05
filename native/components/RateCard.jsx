import { useEffect, useState } from 'react'
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { markRateAsked, noteClearedNight } from '../../src/lib/rate-ask.js'
import { APP_STORE_URL, PLAY_STORE_URL } from '../../src/lib/store-skus.js'
import { confirmMiss } from '../lib/confirm.js'
import { fonts } from '../theme.js'

// A small card on Home after the 7th cleared night: a link to the store page.
// Shown once. Marked asked as soon as it shows, so it never comes back.
export function RateCard({ colors, nightDone, dateIso }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!nightDone || !dateIso || show) return
    if (noteClearedNight(dateIso)) {
      markRateAsked()
      setShow(true)
    }
  }, [nightDone, dateIso, show])

  if (!show) return null
  const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL
  const open = () => {
    setShow(false)
    Linking.openURL(url).catch(() => confirmMiss(t('rate.miss')))
  }
  return (
    <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.panel2 }]}>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.ink }]}>{t('rate.title')}</Text>
        <Text style={[styles.body, { color: colors.inkSoft }]}>{t('rate.body')}</Text>
        <Pressable accessibilityRole="link" onPress={open} hitSlop={8} style={styles.go}>
          <Text style={[styles.goText, { color: colors.on }]}>
            {t(Platform.OS === 'ios' ? 'rate.goIos' : 'rate.goAndroid')}
          </Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('rate.hide')}
        onPress={() => setShow(false)}
        hitSlop={10}
        style={styles.x}
      >
        <Text style={[styles.xText, { color: colors.inkSoft }]}>×</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 8, gap: 8 },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontFamily: fonts.uiBold, fontSize: 15 },
  body: { fontFamily: fonts.ui, fontSize: 14 },
  go: { alignSelf: 'flex-start', paddingVertical: 4 },
  goText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  x: { paddingHorizontal: 4 },
  xText: { fontFamily: fonts.uiSemi, fontSize: 18 },
})
