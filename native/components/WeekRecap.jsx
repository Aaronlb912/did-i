import { StyleSheet, Text, View } from 'react-native'
import { recapLine, recapShareText } from '../../src/lib/hall-pages.js'
import { t } from '../../src/lib/i18n.js'
import { passAlong } from '../../src/lib/native.js'
import { gentleOn, usePrefs } from '../../src/lib/prefs.js'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { KeyButton } from './ui.jsx'
import { fonts, sectionLabel } from '../theme.js'

/** Shares the week as text, with a visible copied or failed note. */
export async function shareRecap(recap) {
  const how = await passAlong(recapShareText(recap, gentleOn()), t('recap.kicker'))
  if (how === 'copied') confirmDone(t('recap.copied'))
  else if (!how) confirmMiss(t('confirm.shareMiss'))
}

/** The week in three lines, with a share. `recap` comes from weekRecap. */
export function WeekRecap({ recap, colors }) {
  const gentle = usePrefs().gentle === true
  if (!recap) return null

  const share = () => shareRecap(recap)

  return (
    <View style={[styles.wrap, { borderColor: colors.lineSoft || colors.line }]}>
      <Text style={[styles.kicker, { color: colors.inkSoft }]}>{t('recap.kicker')}</Text>
      <Text style={[styles.big, { color: colors.ink }]}>{t('recap.cleared', { cleared: recap.cleared, n: recap.nights })}</Text>
      <Text style={[styles.line, { color: colors.inkSoft }]}>
        {recapLine(recap, gentle)}
      </Text>
      <View style={styles.keys}>
        <KeyButton colors={colors} label={t('recap.shareBtn')} onPress={share} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 4, marginTop: 16, paddingTop: 12, borderTopWidth: 1, width: '100%' },
  kicker: { ...sectionLabel },
  big: { fontFamily: fonts.uiBold, fontSize: 16, lineHeight: 22 },
  line: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  keys: { flexDirection: 'row', marginTop: 6 },
})
