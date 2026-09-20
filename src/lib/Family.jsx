import { useCallback, useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useBackDismiss } from '../site/nav.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { t, tMiss } from './i18n.js'
import {
  addFamilyLamp,
  answerFamilyLamp,
  dropFamilyLamp,
  dropMember,
  editFamilyLamp,
  familyHistory,
  leaveFamily,
  listFamilyLamps,
  personName,
  readFamily,
  sendCheer,
  setRole,
} from './people.js'
import { FAMILY_CHEER_GEMS, fireCheer, normalizePurse, spendGems } from './purse.js'
import { passAlong } from './native.js'
import { addDaysIso, boardDate, formatBoardDate } from './recurrence.js'
import { SetCap, SetCard, SetRow } from './set-bits.jsx'
import { useOnline } from './useOnline.js'
const EVERYONE = 'everyone'

export function Family({ book, onChange, now, familyId }) {
  const clock = now || new Date()
  const account = useAccount()
  const purse = normalizePurse(book)
  const [fam, setFam] = useState(null)
  const [lamps, setLamps] = useState([])
  const [answers, setAnswers] = useState([])
  // The family's own fold hour, not this phone's, or two people file the
  // same night under two keys.
  const [night, setNight] = useState(() => boardDate(clock, book.dayFoldHour))
  const [nights, setNights] = useState([])
  const [past, setPast] = useState([])
  const [edit, setEdit] = useState(null)
  const [ready, setReady] = useState(false)
  const [draft, setDraft] = useState('')
  const [forId, setForId] = useState(EVERYONE)
  const [miss, setMiss] = useState('')
  const online = useOnline()

  useBackDismiss(Boolean(edit), () => setEdit(null))

  const load = useCallback(async () => {
    if (!familyId || !account.user) {
      setReady(true)
      return
    }
    const row = await readFamily(familyId)
    setFam(row)
    if (row) {
      const key = boardDate(new Date(), row.fold_hour)
      setNight(key)
      const back = []
      for (let step = 6; step >= 0; step -= 1) back.push(addDaysIso(key, -step))
      setNights(back)
      const [tonightRows, pastRows] = await Promise.all([
        listFamilyLamps(familyId, key),
        familyHistory(familyId, back),
      ])
      setLamps(tonightRows.lamps)
      setAnswers(tonightRows.answers)
      setPast(pastRows)
    }
    setReady(true)
  }, [familyId, account.user])

  useEffect(() => {
    load()
  }, [load])

  function answerFor(lampId, userId) {
    return answers.find((row) => row.lamp_id === lampId && row.user_id === userId) || null
  }

  function whoFor(lamp) {
    if (!lamp.for_id) return t('family.everyone')
    const member = fam?.members.find((row) => row.user_id === lamp.for_id)
    if (!member) return t('family.someone')
    return member.you ? t('family.youAre') : personName(member.person) || t('family.someone')
  }

  // Who is meant to answer this one, so the row can say 2 of 3.
  function owing(lamp) {
    if (!fam) return []
    if (lamp.for_id) return fam.members.filter((row) => row.user_id === lamp.for_id)
    return fam.members
  }

  function mineToAnswer(lamp) {
    if (!fam) return false
    return !lamp.for_id || lamp.for_id === fam.youId
  }

  async function tap(lamp, status) {
    const { miss: why } = await answerFamilyLamp(fam.id, lamp.id, night, status)
    if (why) return setMiss(why)
    return load()
  }

  async function add() {
    if (!draft.trim()) return setMiss(t('family.blank'))
    const { miss: why } = await addFamilyLamp(
      fam.id,
      fam.tag?.id,
      draft,
      forId === EVERYONE ? null : forId,
    )
    if (why === 'notag') return setMiss(t('family.noTag'))
    if (why) return setMiss(why)
    setDraft('')
    setMiss('')
    return load()
  }

  const shell = (children) => (
    <BoardShell
      book={book}
      now={clock}
      title={fam?.name || t('family.kicker')}
      date={formatBoardDate(night)}
    >
      <section className="di-page di-set di-people">
        <p className="di-face-plate">{t('family.kicker')}</p>
        {online ? null : <p className="di-set-note di-off-line">{t('people.offline')}</p>}
        {children}
      </section>
    </BoardShell>
  )

  if (!ready) return shell(<p className="di-set-note">{t('family.loading')}</p>)

  if (!fam) {
    return shell(
      <>
        <h2 className="di-page-title">{t('family.goneTitle')}</h2>
        <p className="di-set-note">{t('family.goneBody')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/people')}>
            {t('family.back')}
          </button>
        </div>
      </>,
    )
  }

  return shell(
    <>
      <h2 className="di-page-title">{fam.name}</h2>
      <SetCard>
        <SetRow
          label={t('family.codeLine', { code: fam.code })}
          sub={t('people.tapToSend')}
          onClick={async () => {
            const how = await passAlong(
              t('family.codeInvite', { name: fam.name, code: fam.code }),
              fam.name,
            )
            if (how) setMiss('')
          }}
        />
      </SetCard>

      <SetCap>{t('family.tonight')}</SetCap>
      {lamps.length ? (
        <SetCard>
          {lamps.map((lamp) => {
            const crowd = owing(lamp)
            const done = crowd.filter((row) => {
              const answer = answerFor(lamp.id, row.user_id)
              return answer && answer.status !== 'skip'
            })
            const mine = mineToAnswer(lamp) ? answerFor(lamp.id, fam.youId) : null
            return (
              <div className="di-people-row di-family-row" key={lamp.id}>
                <span className="di-people-who">
                  <strong>{lamp.question}</strong>
                  <em>
                    {t('family.forWho', { who: whoFor(lamp) })}
                    {' · '}
                    {t('family.doneCount', { done: done.length, all: crowd.length })}
                  </em>
                </span>
                {mineToAnswer(lamp) ? (
                  <>
                    <button
                      className={mine?.status === 'yes' ? 'di-did di-did-small is-on' : 'di-did di-did-small'}
                      type="button"
                      disabled={mine?.status === 'yes'}
                      onClick={() => tap(lamp, 'yes')}
                    >
                      {mine?.status === 'yes' ? t('family.did') : t('family.doIt')}
                    </button>
                    <button className="di-key" type="button" onClick={() => tap(lamp, 'skip')}>
                      {t('family.nope')}
                    </button>
                  </>
                ) : (
                  <span className="di-set-val">{done.length ? t('family.theirDone') : t('family.theirWait')}</span>
                )}
                {fam.parent || lamp.made_by === fam.youId ? (
                  <>
                    <button
                      className="di-key"
                      type="button"
                      onClick={() => setEdit({ id: lamp.id, text: lamp.question })}
                    >
                      {t('family.edit')}
                    </button>
                    <button
                      className="di-key"
                      type="button"
                      onClick={async () => {
                        const { miss: why } = await dropFamilyLamp(lamp.id)
                        if (why) setMiss(why)
                        load()
                      }}
                    >
                      {t('family.remove')}
                    </button>
                  </>
                ) : null}
              </div>
            )
          })}
        </SetCard>
      ) : (
        <p className="di-set-note">{t('family.noLamps')}</p>
      )}

      <SetCap>{fam.parent ? t('family.assign') : t('family.addYours')}</SetCap>
      <div className="di-fam-add">
        <label className="di-field">
          <span>{t('family.what')}</span>
          <input
            value={draft}
            placeholder={t('family.whatPh')}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                add()
              }
            }}
          />
        </label>
        {fam.parent ? (
          <div className="di-field">
            <span id="di-fam-for">{t('family.forWhoLabel')}</span>
            <div className="di-hang-chips" role="group" aria-labelledby="di-fam-for">
              <button
                className={forId === EVERYONE ? 'di-key is-pick' : 'di-key'}
                type="button"
                aria-pressed={forId === EVERYONE}
                onClick={() => setForId(EVERYONE)}
              >
                {t('family.everyone')}
              </button>
              {fam.members.map((row) => (
                <button
                  key={row.user_id}
                  className={forId === row.user_id ? 'di-key is-pick' : 'di-key'}
                  type="button"
                  aria-pressed={forId === row.user_id}
                  onClick={() => setForId(row.user_id)}
                >
                  {row.you ? t('family.youAre') : personName(row.person) || t('family.someone')}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={add}>
            {t('family.put')}
          </button>
        </div>
        <p className="di-set-note">
          {fam.parent ? t('family.assignHint') : t('family.kidHint')}
        </p>
      </div>

      <SetCap>{t('family.week')}</SetCap>
      <SetCard>
        {fam.members.map((row) => {
          const done = nights.map((one) =>
            past.some(
              (item) =>
                item.user_id === row.user_id && item.period_key === one && item.status !== 'skip',
            ),
          )
          return (
            <div className="di-people-row" key={`week-${row.user_id}`}>
              <span className="di-people-who">
                <strong>
                  {row.you ? t('family.youAre') : personName(row.person) || t('family.someone')}
                </strong>
                <em>{t('family.weekCount', { n: done.filter(Boolean).length })}</em>
              </span>
              <span className="di-week-dots" aria-hidden="true">
                {nights.map((one, at) => (
                  <i key={one} className={done[at] ? 'is-on' : undefined} />
                ))}
              </span>
            </div>
          )
        })}
      </SetCard>
      <p className="di-set-note">
        {t('family.weekFrom', {
          from: formatBoardDate(nights[0] || night),
          to: formatBoardDate(night),
        })}
      </p>

      <SetCap>{t('family.people')}</SetCap>
      <SetCard>
        {fam.members.map((row) => (
          <div className="di-people-row" key={row.user_id}>
            <span className="di-people-who">
              <strong>
                {row.you ? t('family.youAre') : personName(row.person) || t('family.someone')}
              </strong>
              <em>{row.role === 'parent' ? t('people.parent') : t('people.kid')}</em>
            </span>
            {!row.you && row.person?.done_on === night ? (
              <button
                className="di-key"
                type="button"
                disabled={purse.gems < FAMILY_CHEER_GEMS}
                onClick={async () => {
                  const spent = spendGems(book, FAMILY_CHEER_GEMS)
                  if (spent.miss) return setMiss(t('family.needGems', { n: FAMILY_CHEER_GEMS }))
                  const { miss: why } = await sendCheer(row.user_id, t('family.cheerNote'), purse.cheerOn)
                  if (why) return setMiss(why)
                  if (onChange) onChange(spent.book)
                  fireCheer(purse.cheerOn, 1)
                  setMiss(t('family.cheerSent', { name: personName(row.person) || t('family.someone') }))
                }}
              >
                {t('family.cheer', { n: FAMILY_CHEER_GEMS })}
              </button>
            ) : null}
            {fam.parent && !row.you ? (
              <>
                <button
                  className="di-key"
                  type="button"
                  onClick={async () => {
                    const { miss: why } = await setRole(
                      fam.id,
                      row.user_id,
                      row.role === 'parent' ? 'kid' : 'parent',
                    )
                    if (why === 'lastparent') setMiss(t('family.lastParent'))
                    else if (why) setMiss(why)
                    load()
                  }}
                >
                  {row.role === 'parent' ? t('family.makeKid') : t('family.makeParent')}
                </button>
                <button
                  className="di-key"
                  type="button"
                  onClick={async () => {
                    const { miss: why } = await dropMember(fam.id, row.user_id)
                    if (why === 'lastparent') setMiss(t('family.lastParent'))
                    else if (why) setMiss(why)
                    load()
                  }}
                >
                  {t('family.remove')}
                </button>
              </>
            ) : null}
          </div>
        ))}
      </SetCard>
      <p className="di-set-note">{t('family.inviteHint', { code: fam.code })}</p>

      <SetCard>
        <SetRow
          label={t('family.leave')}
          danger
          onClick={async () => {
            const { miss: why } = await leaveFamily(fam.id)
            if (why === 'lastparent') return setMiss(t('family.lastParentLeave'))
            if (why) return setMiss(why)
            return goHash('/people')
          }}
        />
      </SetCard>

      {miss ? (
        <p className="di-miss" role="alert">
          {tMiss(miss)}
        </p>
      ) : null}

      {edit ? (
        <div className="di-buy-veil" role="presentation" onClick={() => setEdit(null)}>
          <div
            className="di-buy-pop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="di-fam-edit"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="di-face-plate">{t('family.edit')}</p>
            <h2 id="di-fam-edit" className="di-buy-title">
              {t('family.editTitle')}
            </h2>
            <label className="di-field">
              <span>{t('family.what')}</span>
              <input
                value={edit.text}
                onChange={(event) => setEdit({ ...edit, text: event.target.value })}
              />
            </label>
            <div className="di-hang-actions">
              <button
                className="di-did di-did-small"
                type="button"
                onClick={async () => {
                  const { miss: why } = await editFamilyLamp(edit.id, edit.text)
                  if (why === 'blank') return setMiss(t('family.blank'))
                  if (why) setMiss(why)
                  setEdit(null)
                  return load()
                }}
              >
                {t('family.save')}
              </button>
              <button className="di-key" type="button" onClick={() => setEdit(null)}>
                {t('settings.neverMind')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>,
  )
}
