import { useCallback, useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { cloudSetUp } from './cloud.js'
import { t, tMiss } from './i18n.js'
import {
  INVITE_COINS,
  INVITE_LOOK_AT,
  askFriend,
  claimInvites,
  cleanCode,
  cleanPhone,
  cleanInvite,
  joinFamily,
  makeFamily,
  myInvite,
  personName,
  readMine,
  useInvite,
} from './people.js'
import { giveCoins } from './purse.js'
import { passAlong } from './native.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { SetCap, SetCard, SetField, SetRow } from './set-bits.jsx'
import { useOnline } from './useOnline.js'

export function PeopleConnect({ book, onChange, now }) {
  const clock = now || new Date()
  const account = useAccount()
  const online = useOnline()

  const [mine, setMine] = useState(null)
  const [invite, setInvite] = useState('')
  const [joined, setJoined] = useState(0)
  const [inviteDraft, setInviteDraft] = useState('')
  const [addDraft, setAddDraft] = useState('')
  const [famDraft, setFamDraft] = useState('')
  const [codeDraft, setCodeDraft] = useState('')
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')

  const load = useCallback(async () => {
    if (!account.user) return
    const [who, code] = await Promise.all([readMine(), myInvite()])
    setMine(who)
    setInvite(code)
  }, [account.user])

  const payOut = useCallback(async () => {
    if (!account.user) return
    const won = await claimInvites()
    setJoined(won.joined)
    if (!won.coins && !won.looks.length) return
    if (onChange) onChange(giveCoins(book, won.coins, won.looks))
    setSaid(
      won.looks.length
        ? t('people.wonLook', { coins: won.coins })
        : t('people.wonCoins', { coins: won.coins }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.user])

  useEffect(() => {
    load()
    payOut()
  }, [load, payOut])

  function say(words) {
    setMiss('')
    setSaid(words)
  }

  async function redeem() {
    const { miss: why } = await useInvite(inviteDraft)
    if (why === 'code') return setMiss(t('people.inviteShort'))
    if (why === 'nobody') return setMiss(t('people.noInvite'))
    if (why === 'self') return setMiss(t('people.ownInvite'))
    if (why === 'used') return setMiss(t('people.inviteUsed'))
    if (why) return setMiss(why)
    setInviteDraft('')
    await payOut()
    return load()
  }

  async function ask() {
    const { miss: why, person } = await askFriend(addDraft)
    if (why === 'short') return setMiss(t('people.phoneShort'))
    if (why === 'nophone') return setMiss(t('people.nophone'))
    if (why === 'nobody') return setMiss(t('people.noOne', { phone: cleanPhone(addDraft) }))
    if (why) return setMiss(why)
    setAddDraft('')
    say(t('people.asked', { name: personName(person) }))
    return load()
  }

  async function newFamily() {
    const { miss: why, id } = await makeFamily(famDraft || t('people.familyOne'))
    if (why) return setMiss(why)
    setFamDraft('')
    return goHash('/family', { id })
  }

  async function join() {
    const { miss: why, id } = await joinFamily(codeDraft)
    if (why === 'code') return setMiss(t('people.codeShort'))
    if (why === 'nofamily') return setMiss(t('people.noFamily'))
    if (why) return setMiss(why)
    setCodeDraft('')
    return goHash('/family', { id })
  }

  const shell = (children) => (
    <BoardShell
      book={book}
      now={clock}
      title={t('people.connect')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-set di-people">
        <p className="di-face-plate">{t('people.connect')}</p>
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
      <h2 className="di-page-title">{t('people.connect')}</h2>
      <p className="di-set-note">{t('people.connectBody')}</p>

      <SetCap>{t('people.invite')}</SetCap>
      <SetCard>
        <SetRow
          label={t('people.yourCode')}
          value={invite || '...'}
          sub={invite ? t('people.tapToSend') : ''}
          onClick={
            invite
              ? async () => {
                  const how = await passAlong(
                    t('people.inviteLine', { code: invite }),
                    t('people.invite'),
                  )
                  if (how) say(t(how === 'copied' ? 'people.copied' : 'people.shared'))
                }
              : undefined
          }
        />
        <SetRow
          label={t('people.joinedCount', { n: joined })}
          sub={
            joined >= INVITE_LOOK_AT
              ? t('people.lookWon')
              : t('people.lookLeft', { n: INVITE_LOOK_AT - joined })
          }
        />
      </SetCard>
      <p className="di-set-note">
        {t('people.inviteHint', { coins: INVITE_COINS, n: INVITE_LOOK_AT })}
      </p>

      {mine && !mine.invited_by ? (
        <SetCard>
          <SetField
            label={t('people.gotCode')}
            value={inviteDraft}
            placeholder="D93AQ5LBS4"
            autoCapitalize="characters"
            autoCorrect="off"
            onChange={(event) => setInviteDraft(cleanInvite(event.target.value))}
          />
          <SetRow label={t('people.useCode')} onClick={redeem} />
        </SetCard>
      ) : null}

      <SetCap>{t('people.addOne')}</SetCap>
      <SetCard>
        <SetField
          label={t('people.add')}
          value={addDraft}
          placeholder={t('people.addPh')}
          inputMode="tel"
          autoCapitalize="off"
          autoCorrect="off"
          onChange={(event) => setAddDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              ask()
            }
          }}
        />
        <SetRow label={t('people.askOne')} onClick={ask} />
      </SetCard>

      <SetCap>{t('people.startFamily')}</SetCap>
      <SetCard>
        <SetField
          label={t('people.newFamily')}
          value={famDraft}
          placeholder={t('people.newFamilyPh')}
          onChange={(event) => setFamDraft(event.target.value)}
        />
        <SetRow label={t('people.makeFamily')} onClick={newFamily} />
        <SetField
          label={t('people.joinCode')}
          value={codeDraft}
          placeholder="ABC234"
          autoCapitalize="characters"
          autoCorrect="off"
          onChange={(event) => setCodeDraft(cleanCode(event.target.value))}
        />
        <SetRow label={t('people.join')} onClick={join} />
      </SetCard>

      {miss ? (
        <p className="di-miss" role="alert">
          {tMiss(miss)}
        </p>
      ) : null}
      {said ? <p className="di-set-note">{said}</p> : null}

      <div className="di-hang-actions">
        <button className="di-key" type="button" onClick={() => goHash('/people')}>
          {t('people.back')}
        </button>
      </div>
    </>,
  )
}
