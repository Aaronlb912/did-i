import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { INVITE_GEMS_CAP } from '../../src/lib/people.js'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { shareInvite } from '../lib/share-invite.js'
import { goHash } from '../navigation/hash.js'
import { fonts, radius, withAlpha } from '../theme.js'
import { DidButton, KeyButton } from './ui.jsx'

// Invite friends, one tap from People: Send invite opens the share sheet with
// the link, which carries the code on its own. The rest is on Refer.
export function InviteCard({ colors }) {
  const [busy, setBusy] = useState(false)
  async function send() {
    if (busy) return
    setBusy(true)
    const how = await shareInvite().catch(() => '')
    setBusy(false)
    if (how === 'copied') confirmDone(t('people.copied'))
    else if (!how) confirmMiss(t('confirm.shareMiss'))
  }
  return (
    <View style={[styles.card, { borderColor: colors.on, backgroundColor: withAlpha(colors.on, 0.1) }]}>
      <Text style={[styles.title, { color: colors.ink }]} accessibilityRole="header">{t('invite.cardTitle')}</Text>
      <Text style={[styles.body, { color: colors.inkSoft }]}>{t('invite.cardBody', { max: INVITE_GEMS_CAP })}</Text>
      <View style={styles.buttons}>
        <View style={styles.grow}>
          <DidButton colors={colors} label={t('invite.send')} disabled={busy} onPress={send} />
        </View>
        <KeyButton colors={colors} label={t('invite.more')} onPress={() => goHash('/people/refer')} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.r, padding: 16, gap: 6 },
  title: { fontFamily: fonts.uiBold, fontSize: 17 },
  body: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginBottom: 6 },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1 },
})
