import { useCallback, useEffect, useState } from 'react'
import { DIT_ENABLED } from './features.js'
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
  cleanHandle,
  cleanInvite,
  cleanName,
  dropFriend,
  inboxCount,
  joinFamily,
  listFamilies,
  listFriends,
  makeFamily,
  myHandle,
  myInvite,
  personName,
  readMine,
  saveName,
  sayNo,
  sayYes,
  sendDidI,
  setPublicTonight,
  shareStreak,
  useInvite,
} from './people.js'
import { giveCoins } from './purse.js'
import { passAlong } from './native.js'
import { boardDate, formatBoardDate, isoDate } from './recurrence.js'
import { SetCap, SetCard, SetField, SetRow, SetSheet, SetSwitch } from './set-bits.jsx'
import { useOnline } from './useOnline.js'
import { useReduceMotion } from './useReduceMotion.js'

function friendLine(person) {
  if (!person?.share_streak) return t('people.quiet')
  if (person.done_on === isoDate(new Date())) return t('people.doneTonight')
  if (person.streak > 0) return t('people.streakN', { n: person.streak })
  return t('people.noStreak')
}

function SendSheet({ person, still, onClose, onSent }) {
  const [question, setQuestion] = useState('')
  const [note, setNote] = useState('')
  const [miss, setMiss] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    if (!question.trim()) {
      setMiss(t('people.sendBlank'))
      return
    }
    setBusy(true)
    const { miss: why } = await sendDidI(person.user_id, question, note)
    setBusy(false)
    if (why === 'already') {
      setMiss(t('people.sendAlready'))
      return
    }
    if (why) {
      setMiss(why)
      return
    }
    onSent(t('people.sentTo', { name: personName(person) }))
    onClose()
  }

  return (
    <SetSheet title={t('people.sendTitle')} still={still} onClose={onClose}>
      <p className="di-set-note">{t('people.sendHint', { name: personName(person) })}</p>
      <SetCard>
        <SetField
          label={t('people.sendWhat')}
          value={question}
          placeholder={t('people.sendPh')}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <SetField
          label={t('people.sendNote')}
          value={note}
          placeholder={t('people.sendNotePh')}
          onChange={(event) => setNote(event.target.value)}
        />
      </SetCard>
      {miss ? (
        <p className="di-miss" role="alert">
          {tMiss(miss)}
        </p>
      ) : null}
      <div className="di-hang-actions">
        <button className="di-did di-did-small" type="button" disabled={busy} onClick={send}>
          {t('people.send')}
        </button>
        <button className="di-key" type="button" onClick={onClose}>
          {t('settings.neverMind')}
        </button>
      </div>
    </SetSheet>
  )
}

export function People({ book, onChange, now }) {
  const clock = now || new Date()
  const account = useAccount()
  const still = useReduceMotion()
  const online = useOnline()

  const [mine, setMine] = useState(null)
  const [links, setLinks] = useState({ friends: [], asked: [], sent: [] })
  const [families, setFamilies] = useState([])
  const [waiting, setWaiting] = useState(0)
  const [invite, setInvite] = useState('')
  const [joined, setJoined] = useState(0)
  const [inviteDraft, setInviteDraft] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const [handle, setHandle] = useState('')
  const [addDraft, setAddDraft] = useState('')
  const [famDraft, setFamDraft] = useState('')
  const [codeDraft, setCodeDraft] = useState('')
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [sheet, setSheet] = useState(null)

  const load = useCallback(async () => {
    if (!account.user) return
    const [who, friendRows, famRows, count, code, tag] = await Promise.all([
      readMine(),
      listFriends(),
      listFamilies(),
      inboxCount(),
      myInvite(),
      myHandle(),
    ])
    setMine(who)
    setNameDraft(who?.display_name || '')
    setHandle(tag || who?.handle || '')
    setLinks(friendRows)
    setFamilies(famRows)
    setWaiting(count)
    setInvite(code)
  }, [account.user])

  // Anything an invite earned lands in the purse the next time this
  // screen opens. The server only pays each one once.
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

  async function keepName() {
    const { miss: why, name } = await saveName(nameDraft)
    if (why) return setMiss(why)
    setNameDraft(name)
    say(t('people.nameSaved'))
    return load()
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
    if (why === 'short') return setMiss(t('people.handleShort'))
    if (why === 'nobody') return setMiss(t('people.noOne', { handle: cleanHandle(addDraft) }))
    if (why) return setMiss(why)
    setAddDraft('')
    say(t('people.asked', { name: personName(person) }))
    return load()
  }

  async function answerAsk(id, yes) {
    const { miss: why } = yes ? await sayYes(id) : await sayNo(id)
    if (why) return setMiss(why)
    return load()
  }

  async function cut(person) {
    const { miss: why } = await dropFriend(person.user_id)
    if (why) return setMiss(why)
    say(t('people.dropped', { name: personName(person) }))
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
      title={t('people.kicker')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-set di-people">
        <p className="di-face-plate">{t('people.kicker')}</p>
        {online ? null : <p className="di-set-note di-off-line">{t('people.offline')}</p>}
        {children}
      </section>
    </BoardShell>
  )

  if (!cloudSetUp()) {
    return shell(
      <>
        <h2 className="di-page-title">{t('people.offTitle')}</h2>
        <p className="di-set-note">{t('people.offBody')}</p>
      </>,
    )
  }

  if (!account.user) {
    return shell(
      <>
        <h2 className="di-page-title">{t('people.outTitle')}</h2>
        <p className="di-set-note">{t('people.outBody')}</p>
        <div className="di-hang-actions">
          <button
            className="di-did di-did-small"
            type="button"
            onClick={() => goHash('/account')}
          >
            {t('people.goAccount')}
          </button>
        </div>
      </>,
    )
  }

  return shell(
    <>
      <h2 className="di-page-title">{t('people.title')}</h2>

      {/* What is actually between you and other people comes first. The
          settings for your own name and code sit underneath it. */}
      <SetCard>
        <SetRow
          label={waiting ? t('people.waiting', { n: waiting }) : t('inbox.kicker')}
          sub={waiting ? t('people.waitingSub') : t('people.inboxQuiet')}
          chevron
          onClick={() => goHash('/inbox')}
        />
        <SetRow
          label={t('sent.kicker')}
          sub={t('sent.rowSub')}
          chevron
          onClick={() => goHash('/sent')}
        />
      </SetCard>

      <SetCap>{t('people.friends')}</SetCap>
      {links.friends.length ? (
        <SetCard>
          {links.friends.slice(0, 6).map((row) => (
            <div className="di-people-row" key={row.id}>
              <span className="di-people-who">
                <strong>{personName(row.person) || t('people.someone')}</strong>
                <em>{friendLine(row.person)}</em>
              </span>
              <button
                className="di-did di-did-small"
                type="button"
                onClick={() => setSheet({ kind: 'send', person: row.person })}
              >
                {t('people.sendShort')}
              </button>
            </div>
          ))}
          <SetRow
            label={t('friends.title', { n: links.friends.length })}
            sub={t('friends.seeSub')}
            chevron
            onClick={() => goHash('/friends')}
          />
        </SetCard>
      ) : (
        <SetCard>
          <SetRow
            label={t('people.noFriends')}
            sub={t('friends.seeSub')}
            chevron
            onClick={() => goHash('/friends')}
          />
        </SetCard>
      )}

      <SetCap>{t('people.families')}</SetCap>
      {families.length ? (
        <SetCard>
          {families.map((fam) => (
            <SetRow
              key={fam.id}
              label={fam.name}
              sub={fam.role === 'parent' ? t('people.parent') : t('people.kid')}
              chevron
              onClick={() => goHash('/family', { id: fam.id })}
            />
          ))}
        </SetCard>
      ) : (
        <p className="di-set-note">{t('people.noFamilies')}</p>
      )}

      <SetCap>{t('people.you')}</SetCap>
      <SetCard>
        <SetField
          label={t('people.name')}
          value={nameDraft}
          placeholder={t('people.namePh')}
          onChange={(event) => setNameDraft(cleanName(event.target.value))}
          onBlur={keepName}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              keepName()
            }
          }}
        />
        <SetRow label={t('people.handle')} value={handle ? `@${handle}` : '...'} />
        {DIT_ENABLED ? (
          <>
            <SetSwitch
              label={t('people.shareStreak')}
              sub={t('people.shareStreakSub')}
              on={Boolean(mine?.share_streak)}
              onClick={async () => {
                await shareStreak(!mine?.share_streak)
                load()
              }}
            />
            <SetSwitch
              label={t('all.showing')}
              sub={t('all.joinBody')}
              on={Boolean(mine?.public_tonight)}
              onClick={async () => {
                await setPublicTonight(!mine?.public_tonight)
                load()
              }}
            />
            <SetRow
              label={t('all.kicker')}
              sub={t('all.listCap')}
              chevron
              onClick={() => goHash('/everyone')}
            />
          </>
        ) : null}
      </SetCard>
      <p className="di-set-note">{t('people.handleHint')}</p>

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

      {links.asked.length ? (
        <>
          <SetCap>{t('people.asks')}</SetCap>
          <SetCard>
            {links.asked.map((row) => (
              <div className="di-people-row" key={row.id}>
                <span className="di-people-who">
                  <strong>{personName(row.person) || t('people.someone')}</strong>
                  <em>{t('people.wantsIn')}</em>
                </span>
                <button
                  className="di-did di-did-small"
                  type="button"
                  onClick={() => answerAsk(row.id, true)}
                >
                  {t('people.yes')}
                </button>
                <button className="di-key" type="button" onClick={() => answerAsk(row.id, false)}>
                  {t('people.no')}
                </button>
              </div>
            ))}
          </SetCard>
        </>
      ) : null}

      <SetCap>{t('people.addOne')}</SetCap>
      <SetCard>
        <SetField
          label={t('people.add')}
          value={addDraft}
          placeholder={t('people.addPh')}
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

      {links.sent.length ? (
        <p className="di-set-note">
          {t('people.outstanding', {
            names: links.sent.map((row) => personName(row.person)).filter(Boolean).join(', '),
          })}
        </p>
      ) : null}

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

      {sheet?.kind === 'send' ? (
        <SendSheet
          person={sheet.person}
          still={still}
          onClose={() => setSheet(null)}
          onSent={say}
        />
      ) : null}
    </>,
  )
}
