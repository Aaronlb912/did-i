import { t, tMiss } from './i18n.js'
import { InviteRewardBar } from './InviteRewardBar.jsx'
import { useReferralCode } from './useReferralCode.js'
import { SetCard, SetField, SetRow } from './set-bits.jsx'

export function InviteCodeSection({ book, onChange, gemsPaid, joined, hideBar = false }) {
  const ref = useReferralCode({ book, onChange })
  const paid = gemsPaid ?? ref.gemsPaid
  const friends = joined ?? ref.joined

  if (ref.locked === null && gemsPaid == null) return null

  return (
    <>
      {hideBar ? null : <InviteRewardBar gemsPaid={paid} joined={friends} />}
      {ref.locked ? <p className="di-set-note">{t('people.inviteDone')}</p> : null}
      {!ref.locked ? (
      <SetCard>
        <SetField
          label={t('people.gotCode')}
          value={ref.draft}
          placeholder="D93AQ5LBS4"
          autoCapitalize="characters"
          autoCorrect="off"
          onChange={(event) => ref.setDraft(event.target.value)}
        />
        <SetRow label={t('people.useCode')} onClick={ref.redeem} />
      </SetCard>
      ) : null}
      {ref.miss ? (
        <p className="di-miss" role="alert">
          {tMiss(ref.miss)}
        </p>
      ) : null}
      {ref.said ? <p className="di-set-note">{ref.said}</p> : null}
    </>
  )
}
