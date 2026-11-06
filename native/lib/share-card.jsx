import { createRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { passAlong } from '../../src/lib/native.js'
import { withAppLink } from '../../src/lib/qr-links.js'
import { publishSheet } from '../components/SheetHost.jsx'
import { confirmDone, confirmMiss } from './confirm.js'
import { fonts } from '../theme.js'

// Text to share with the link to get the app; says when it was copied or failed.
export async function passText(text, title) {
  const how = await passAlong(withAppLink(text), title)
  if (how === 'copied') confirmDone(t('recap.copied'))
  else if (!how) confirmMiss(t('confirm.shareMiss'))
}

/** The card's last line: the app and where to get it. */
export function CardMark({ colors, style }) {
  return <Text style={[styles.mark, { color: colors.inkDim }, style]}>Did I · did-i.app</Text>
}

// A streak as a picture. The card is shown in a sheet first, on screen, so
// the capture is never blank. text: what is shared when a picture cannot be.
export function openStreakCard({ colors, what = '', n, cap, day, text }) {
  const card = createRef()
  publishSheet({
    title: t('lamp.shareBtn'),
    content: (
      <View ref={card} collapsable={false} pointerEvents="none" style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.on }]}>
        {what ? <Text style={[styles.what, { color: colors.ink }]}>{what}</Text> : null}
        <Text style={[styles.num, { color: colors.on }]}>{n}</Text>
        <Text style={[styles.cap, { color: colors.inkDim }]}>{cap}</Text>
        <Text style={[styles.cap, { color: colors.inkDim }]}>{day}</Text>
        <CardMark colors={colors} />
      </View>
    ),
    goLabel: t('lamp.shareGo'),
    closeLabel: t('settings.neverMind'),
    colors,
    onClose: () => publishSheet(null),
    onGo: () => shareCard(card, text),
  })
}

// A picture first. Text only when the picture could not be made or this
// phone cannot share one; backing out of the share sheet is not a failure.
async function shareCard(card, text) {
  let uri = ''
  let Sharing = null
  try {
    const [{ captureRef }, sharing] = await Promise.all([import('react-native-view-shot'), import('expo-sharing')])
    Sharing = sharing
    if (!card.current || !(await Sharing.isAvailableAsync())) throw new Error('no image share')
    uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' })
  } catch {}
  publishSheet(null)
  if (uri) {
    try {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('lamp.shareBtn'), UTI: 'public.png' })
    } catch {
      confirmMiss(t('confirm.shareMiss'))
    }
    return
  }
  await passText(text, t('lamp.shareBtn'))
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 360, alignSelf: 'center', padding: 24, gap: 8, borderWidth: 2, borderRadius: 20 },
  what: { fontFamily: fonts.uiBold, fontSize: 22 },
  num: { fontFamily: fonts.uiBold, fontSize: 72 },
  cap: { fontFamily: fonts.uiSemi, fontSize: 16 },
  mark: { fontFamily: fonts.uiBold, fontSize: 14, textAlign: 'right', marginTop: 8 },
})
