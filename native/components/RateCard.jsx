import { useEffect, useState } from 'react'
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { markRateAsked, noteClearedNight, rateAskDue } from '../../src/lib/rate-ask.js'
import { APP_STORE_REVIEW_URL, PLAY_STORE_URL } from '../../src/lib/store-skus.js'
import { confirmMiss } from '../lib/confirm.js'
import { fonts } from '../theme.js'
import { DidButton } from './ui.jsx'

// A small card on Today after the 7th cleared day: opens the store's review page.
// It stays until the page opens or close is tapped, so a card seen for a blink comes back.
// ready: false keeps it hidden (the day-7 milestone is up, or the streak is under 7)
// while cleared days are still counted.
export function RateCard({ colors, nightDone, dateIso, ready = true }) {
  const [show, setShow] = useState(rateAskDue)

  useEffect(() => {
    if (!nightDone || !dateIso || show) return
    if (noteClearedNight(dateIso)) setShow(true)
  }, [nightDone, dateIso, show])

  // The review sheet may have been asked since (native/streak-review.js).
  if (!ready || !show || !rateAskDue()) return null
  const url = Platform.OS === 'ios' ? APP_STORE_REVIEW_URL : PLAY_STORE_URL
  const hide = () => {
    markRateAsked()
    setShow(false)
  }
  // The card is spent only once the store page opened.
  const open = async () => {
    try {
      await Linking.openURL(url)
      hide()
    } catch {
      confirmMiss(t('rate.miss'))
    }
  }
  return (
    <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.panel2 }]}>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.ink }]}>{t('rate.title')}</Text>
        <Text style={[styles.body, { color: colors.inkSoft }]}>{t('rate.body')}</Text>
        <View style={styles.go}>
          <DidButton small colors={colors} label={t(Platform.OS === 'ios' ? 'rate.goIos' : 'rate.goAndroid')} onPress={open} />
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('rate.hide')}
        onPress={hide}
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
  go: { alignSelf: 'flex-start', marginTop: 4 },
  x: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: -10, marginRight: -10 },
  xText: { fontFamily: fonts.uiSemi, fontSize: 18 },
})
