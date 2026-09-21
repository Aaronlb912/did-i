import { useCallback, useEffect, useState } from 'react'
import { DIT_ENABLED } from './features.js'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { cloudSetUp } from './cloud.js'
import { t, tMiss } from './i18n.js'
import {
  formatPhone,
  friendAskNote,
  friendAskTitle,
  inboxCount,
  listFamilies,
  listFriends,
  personName,
  readMine,
  sayNo,
  sayYes,
  sendDidI,
  setPublicTonight,
  shareStreak,
  syncDisplayName,
} from './people.js'
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
  const [phone, setPhone] = useState('')
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [sheet, setSheet] = useState(null)

  const load = useCallback(async () => {
    if (!account.user) return
    const [who, friendRows, famRows, count] = await Promise.all([
      readMine(),
      listFriends(),
      listFamilies(),
      inboxCount(),
    ])
    setMine(who)
    setPhone(who?.phone || '')
    await syncDisplayName(book.keeperName)
    setLinks(friendRows)
    setFamilies(famRows)
    setWaiting(count)
  }, [account.user, book.keeperName])

  useEffect(() => {
    load()
  }, [load])

  function say(words) {
    setMiss('')
    setSaid(words)
  }

  async function answerAsk(id, yes) {
    const { miss: why } = yes ? await sayYes(id) : await sayNo(id)
    if (why) return setMiss(why)
    return load()
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

      {links.asked.length ? (
        <div className="di-people-asks">
          <SetCap>{t('people.askBanner', { n: links.asked.length })}</SetCap>
          <SetCard>
            {links.asked.map((row) => (
              <div className="di-people-row" key={row.id}>
                <span className="di-people-who">
                  <strong>{friendAskTitle(row.person) || t('people.someone')}</strong>
                  <em>{friendAskNote(row.person)}</em>
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
        </div>
      ) : null}

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
        {mine?.display_name ? (
          <SetRow label={t('people.name')} value={mine.display_name} sub={t('people.nameInAccount')} chevron onClick={() => goHash('/account')} />
        ) : (
          <SetRow label={t('people.name')} sub={t('people.nameInAccount')} chevron onClick={() => goHash('/account')} />
        )}
        <SetRow
          label={t('people.phone')}
          value={phone ? formatPhone(phone) : t('people.phoneMissing')}
          sub={phone ? '' : t('people.phoneMissingSub')}
          chevron
          onClick={() => goHash('/account')}
        />
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
      <SetCard>
        <SetRow
          label={t('people.connect')}
          sub={t('people.connectSub')}
          chevron
          onClick={() => goHash('/people/connect')}
        />
      </SetCard>

      {links.sent.length ? (
        <p className="di-set-note">
          {t('people.outstanding', {
            names: links.sent.map((row) => personName(row.person)).filter(Boolean).join(', '),
          })}
        </p>
      ) : null}

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
