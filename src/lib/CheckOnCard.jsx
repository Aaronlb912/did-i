import { useEffect, useState } from 'react'
import { useAccount } from './account.js'
import { t, tMiss } from './i18n.js'
import { listKnownPeople, personName } from './people.js'
import {
  CHECK_ON_DEFAULT,
  checkOnFits,
  cleanMinute,
  minuteClock,
  readCheckOn,
  saveCheckOn,
  stopCheckOn,
} from './check-on.js'
import { SetCap } from './set-bits.jsx'

/**
 * "Ask a friend to check on me" on one of your own questions (web). One
 * friend or family member, one time. Says plainly that only the question's
 * words go to that person. Same rules as the phone's CheckOnCard.
 */
export function CheckOnCard({ lamp }) {
  const account = useAccount()
  const fits = Boolean(account.user) && checkOnFits(lamp)
  const [row, setRow] = useState(null)
  const [people, setPeople] = useState(null)
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState('')
  const [at, setAt] = useState(CHECK_ON_DEFAULT)
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')

  useEffect(() => {
    if (!fits) return undefined
    let live = true
    Promise.all([readCheckOn(lamp.id), listKnownPeople().catch(() => [])])
      .then(([mine, known]) => {
        if (!live) return
        setRow(mine.row)
        setPeople(known)
        if (mine.miss && mine.miss !== 'off' && mine.miss !== 'out') setMiss(tMiss(mine.miss))
      })
      .catch(() => live && setMiss(t('people.reach')))
    return () => {
      live = false
    }
  }, [fits, lamp?.id])

  if (!fits) return null
  const buddy = row ? (people || []).find((p) => p.user_id === row.buddy_id) : null
  const buddyName = personName(buddy) || t('people.someone')

  function start() {
    setPick(row?.buddy_id || '')
    setAt(row ? cleanMinute(row.at_minute) : CHECK_ON_DEFAULT)
    setMiss('')
    setSaid('')
    setOpen(true)
  }

  async function save() {
    if (busy) return
    if (!pick) return setMiss(t('checkOn.pickFirst'))
    setBusy(true)
    const res = await saveCheckOn(lamp, pick, at)
    if (res.miss) {
      setBusy(false)
      return setMiss(tMiss(res.miss))
    }
    const fresh = await readCheckOn(lamp.id)
    setBusy(false)
    setRow(fresh.row)
    setOpen(false)
    setMiss('')
    setSaid(t('checkOn.saved'))
  }

  async function stop() {
    if (busy) return
    setBusy(true)
    const res = await stopCheckOn(row.id)
    setBusy(false)
    if (res.miss) return setMiss(tMiss(res.miss))
    setRow(null)
    setMiss('')
    setSaid(t('checkOn.stopped'))
  }

  return (
    <>
      <SetCap>{t('checkOn.title')}</SetCap>
      <div className="di-check-on">
        {!open && row ? (
          <>
            <p className="di-set-note">{t('checkOn.isOn', { name: buddyName, time: minuteClock(row.at_minute) })}</p>
            <div className="di-hang-actions">
              <button className="di-key" type="button" onClick={start}>
                {t('checkOn.change')}
              </button>
              <button className="di-key" type="button" disabled={busy} onClick={stop}>
                {t('checkOn.stop')}
              </button>
            </div>
          </>
        ) : null}
        {!open && !row ? (
          <>
            <p className="di-set-note">{t('checkOn.sub')}</p>
            <div className="di-hang-actions">
              <button className="di-key" type="button" onClick={start}>
                {t('checkOn.start')}
              </button>
            </div>
          </>
        ) : null}
        {open ? (
          <>
            <p className="di-check-on-share">{t('checkOn.shareNote', { question: lamp.question })}</p>
            {people && !people.length ? (
              <p className="di-set-note">{t('checkOn.nobody')}</p>
            ) : (
              <div className="di-hang-chips" role="radiogroup" aria-label={t('checkOn.title')}>
                {(people || []).map((p) => (
                  <button
                    key={p.user_id}
                    className={pick === p.user_id ? 'di-key is-pick' : 'di-key'}
                    type="button"
                    role="radio"
                    aria-checked={pick === p.user_id}
                    onClick={() => setPick(p.user_id)}
                  >
                    {personName(p) || t('people.noName')}
                  </button>
                ))}
              </div>
            )}
            <label className="di-field">
              <span>{t('checkOn.timeLabel')}</span>
              <input
                type="time"
                step={60}
                value={minuteClock(at)}
                onChange={(event) => {
                  const [h, m] = String(event.target.value || '').split(':').map(Number)
                  if (Number.isInteger(h) && Number.isInteger(m)) setAt(cleanMinute(h * 60 + m))
                }}
              />
            </label>
            <div className="di-hang-actions">
              <button className="di-did di-did-small" type="button" disabled={busy} onClick={save}>
                {t('checkOn.save')}
              </button>
              <button className="di-key" type="button" onClick={() => setOpen(false)}>
                {t('settings.neverMind')}
              </button>
            </div>
          </>
        ) : null}
        {said ? (
          <p className="di-set-note" role="status">
            {said}
          </p>
        ) : null}
        {miss ? (
          <p className="di-miss" role="alert">
            {miss}
          </p>
        ) : null}
      </div>
    </>
  )
}
