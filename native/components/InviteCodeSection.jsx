import { StyleSheet, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { t, tMiss } from '../../src/lib/i18n.js'
import { inviteFromPaste } from '../../src/lib/invite-link.js'
import { INVITE_CODE_LEN, formatInvite } from '../../src/lib/people.js'
import { useReferralCode } from '../../src/lib/useReferralCode.js'
import { fonts } from '../theme.js'
import { InviteRewardBar } from './InviteRewardBar.jsx'
import { DidButton, Field, KeyButton } from './ui.jsx'

// start: a code to fill in (a scanned invite). hideDone: say nothing once a
// code is used (Connect shows the box only to those who can still use one).
export function InviteCodeSection({ colors, book, onChange, gemsPaid, joined, hideBar = false, start = '', hideDone = false, label, onUsed }) {
  const ref = useReferralCode({ book, onChange, start })
  const paid = gemsPaid ?? ref.gemsPaid
  const friends = joined ?? ref.joined
  const whole = ref.draft.length === INVITE_CODE_LEN
  const ready = whole && !ref.busy

  if (ref.locked === null && gemsPaid == null) return null
  if (hideDone && ref.locked && !ref.said) return null

  async function paste() {
    const text = await Clipboard.getStringAsync().catch(() => '')
    const code = inviteFromPaste(text)
    if (code) ref.setDraft(code)
  }

  async function go() {
    const words = await ref.redeem()
    if (words) onUsed?.(words)
  }

  return (
    <>
      {hideBar ? null : <InviteRewardBar colors={colors} gemsPaid={paid} joined={friends} />}
      {ref.locked && !hideDone ? <Text style={[styles.meta, { color: colors.inkSoft }]}>{t('people.inviteDone')}</Text> : null}
      {!ref.locked ? (
        <>
          <Field
            colors={colors}
            label={label ?? t('people.gotCode')}
            value={formatInvite(ref.draft)}
            placeholder={t('people.gotCodePh')}
            onChangeText={ref.setDraft}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={INVITE_CODE_LEN + 6}
            returnKeyType="go"
            onSubmitEditing={ready ? go : undefined}
          />
          {whole && ref.owner != null ? (
            <Text style={[styles.found, { color: colors.on }]} accessibilityLiveRegion="polite">
              {ref.owner ? t('invite.found', { name: ref.owner }) : t('invite.foundAny')}
            </Text>
          ) : null}
          <View style={styles.buttons}>
            <View style={styles.grow}>
              <DidButton colors={colors} label={t('people.useCode')} disabled={!ready} onPress={go} />
            </View>
            {whole ? null : <KeyButton colors={colors} label={t('invite.paste')} onPress={paste} />}
          </View>
        </>
      ) : null}
      {ref.miss ? <Text style={[styles.miss, { color: colors.miss }]}>{tMiss(ref.miss)}</Text> : null}
      {ref.said ? <Text style={[styles.meta, { color: colors.inkSoft }]}>{ref.said}</Text> : null}
    </>
  )
}

const styles = StyleSheet.create({
  meta: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  found: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    marginTop: -2,
    marginBottom: 10,
  },
  miss: {
    fontFamily: fonts.ui,
    fontSize: 13,
    marginBottom: 10,
  },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1 },
})
