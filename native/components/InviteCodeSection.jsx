import { StyleSheet, Text } from 'react-native'
import { t, tMiss } from '../../src/lib/i18n.js'
import { useReferralCode } from '../../src/lib/useReferralCode.js'
import { fonts } from '../theme.js'
import { InviteRewardBar } from './InviteRewardBar.jsx'
import { DidButton, Field } from './ui.jsx'

export function InviteCodeSection({ colors, book, onChange, gemsPaid, joined, hideBar = false }) {
  const ref = useReferralCode({ book, onChange })
  const paid = gemsPaid ?? ref.gemsPaid
  const friends = joined ?? ref.joined

  if (ref.locked === null && gemsPaid == null) return null

  return (
    <>
      {hideBar ? null : <InviteRewardBar colors={colors} gemsPaid={paid} joined={friends} />}
      {ref.locked ? <Text style={[styles.meta, { color: colors.inkSoft }]}>{t('people.inviteDone')}</Text> : null}
      {!ref.locked ? (
        <>
          <Field
            colors={colors}
            label={t('people.gotCode')}
            value={ref.draft}
            onChangeText={ref.setDraft}
            autoCapitalize="characters"
          />
          <DidButton colors={colors} label={t('people.useCode')} onPress={ref.redeem} />
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
  miss: {
    fontFamily: fonts.ui,
    fontSize: 13,
    marginBottom: 10,
  },
})
