import { inviteNextFriendGems, inviteRewardProgress } from './invite-reward.js'
import { t } from './i18n.js'

export function InviteRewardBar({ gemsPaid = 0, joined = 0 }) {
  const prog = inviteRewardProgress(gemsPaid)
  const next = inviteNextFriendGems(joined, gemsPaid)
  const note = prog.full
    ? t('people.inviteGemFull', { max: prog.cap })
    : next > 0
      ? t('people.inviteGemNext', { gems: next })
      : t('people.inviteGemWait')

  return (
    <div
      className="di-meter di-invite-meter"
      role="group"
      aria-label={t('people.inviteGemAria', { paid: prog.paid, max: prog.cap })}
    >
      <div className="di-meter-top">
        <span className="di-meter-count">{prog.paid}</span>
        <span className="di-meter-label">{t('people.inviteGemOf', { max: prog.cap })}</span>
      </div>
      <div
        className="di-meter-bar"
        role="progressbar"
        aria-valuenow={prog.paid}
        aria-valuemin={0}
        aria-valuemax={prog.cap}
      >
        <span className="di-meter-fill" style={{ width: `${prog.pct}%` }} />
      </div>
      <p className="di-set-note di-invite-meter-note">{note}</p>
    </div>
  )
}
