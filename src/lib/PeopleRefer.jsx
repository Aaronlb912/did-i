import { useCallback, useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { cloudSetUp } from './cloud.js'
import { t } from './i18n.js'
import {
  INVITE_BUDDY_AT,
  INVITE_FRAME_AT,
  INVITE_GEMS_CAP,
  INVITE_LOOK_AT,
  invitePayoutNote,
  claimInvites,
  myInvite,
  readMine,
} from './people.js'
import { applyInvitePayout } from './purse.js'
import { InviteCodeSection } from './InviteCodeSection.jsx'
import { ReferLadder } from './ReferLadder.jsx'
import { passAlong } from './native.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { SetCap, SetCard, SetRow } from './set-bits.jsx'
import { useOnline } from './useOnline.js'
import { inviteLink } from './invite-link.js'

export function PeopleRefer({ book, onChange, now }) {
  const clock = now || new Date()
  const account = useAccount()
  const online = useOnline()

  const [invite, setInvite] = useState('')
  const [joined, setJoined] = useState(0)
  const [gemsPaid, setGemsPaid] = useState(0)
  const [said, setSaid] = useState('')

  const load = useCallback(async () => {
    if (!account.user) return
    const [code, who] = await Promise.all([myInvite(), readMine()])
    setInvite(code)
    setGemsPaid(Number(who?.invite_gems_paid) || 0)
  }, [account.user])

  const payOut = useCallback(async () => {
    if (!account.user) return
    const won = await claimInvites()
    setJoined(won.joined)
    const who = await readMine()
    setGemsPaid(Number(who?.invite_gems_paid) || 0)
    const next = applyInvitePayout(book, won)
    if (onChange && next !== book) onChange(next)
    if (!won.gems && !won.looks.length) return
    setSaid(invitePayoutNote(won))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.user])

  useEffect(() => {
    load()
    payOut()
  }, [load, payOut])

  function say(words) {
    setSaid(words)
  }

  const shell = (children) => (
    <BoardShell
      book={book}
      now={clock}
      title={t('people.refer')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-set di-people">
        <p className="di-face-plate">{t('people.refer')}</p>
        {online ? null : <p className="di-set-note di-off-line">{t('people.offline')}</p>}
        {children}
      </section>
    </BoardShell>
  )

  if (!cloudSetUp() || !account.user) {
    return shell(
      <>
        <h2 className="di-page-title">{t('people.outTitle')}</h2>
        <p className="di-set-note">{t('people.outBody')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/account')}>
            {t('people.goAccount')}
          </button>
        </div>
      </>,
    )
  }

  return shell(
    <>
      <h2 className="di-page-title">{t('people.refer')}</h2>
      <p className="di-set-note">{t('people.referBody')}</p>

      <ReferLadder joined={joined} book={book} />

      <SetCap>{t('people.yourCode')}</SetCap>
      <SetCard>
        <SetRow
          label={t('people.yourCode')}
          value={invite || '...'}
          sub={invite ? t('people.tapToSend') : ''}
          onClick={
            invite
              ? async () => {
                  const how = await passAlong(
                    t('people.inviteLine', { code: invite, link: inviteLink(invite) }),
                    t('people.invite'),
                  )
                  if (how) say(t(how === 'copied' ? 'people.copied' : 'people.shared'))
                }
              : undefined
          }
        />
      </SetCard>
      <p className="di-set-note">
        {t('people.inviteHint', { max: INVITE_GEMS_CAP, n: INVITE_LOOK_AT, buddy: INVITE_BUDDY_AT, frame: INVITE_FRAME_AT })}
      </p>

      <InviteCodeSection book={book} onChange={onChange} gemsPaid={gemsPaid} joined={joined} hideBar />

      {said ? <p className="di-set-note">{said}</p> : null}
    </>,
  )
}
