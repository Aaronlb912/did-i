import { t, tMiss } from './i18n.js'
import { INVITE_CODE_LEN, formatInvite } from './people.js'
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
          value={formatInvite(ref.draft)}
          placeholder={t('people.gotCodePh')}
          autoCapitalize="characters"
          autoCorrect="off"
          onChange={(event) => ref.setDraft(event.target.value)}
        />
        {ref.draft.length === INVITE_CODE_LEN && ref.owner != null ? (
          <p className="di-set-note" aria-live="polite">
            {ref.owner ? t('invite.found', { name: ref.owner }) : t('invite.foundAny')}
          </p>
        ) : null}
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
