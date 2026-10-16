import { useRef, useState } from 'react'
import { goHash } from '../site/hash.js'
import { didQuestion, shortFromQuestion } from './board-json.js'
import { BoardShell } from './BoardShell.jsx'
import { firstRunBook, packState, togglePack, togglePick } from './first-run.js'
import { markWelcomeSeen } from './hall-pages.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { firstName } from './session.js'
import { packList } from './starters.js'
import { HangTimeSelect } from './HangTimeSelect.jsx'
import { SetCap, SetCard, SetRow } from './set-bits.jsx'

// First run: check packs (and single questions in them), or type your own.
// Everything checked is added at once, every day, with one time.
export function FirstNight({ book, onChange, now }) {
  usePrefs()
  const clock = now || new Date()
  const named = firstName(book)
  const [person, setPerson] = useState(book.keeperName || '')
  const [askAfter, setAskAfter] = useState('')
  const [blank, setBlank] = useState('')
  const [picks, setPicks] = useState([])
  const packs = packList(book)
  const question = didQuestion(blank)
  const ownNew = Boolean(question) && !picks.some((pick) => pick.question === question)
  const count = picks.length + (ownNew ? 1 : 0)
  // A second submit before the page leaves would add the picks again.
  const finished = useRef(false)

  function withName(next) {
    const keeperName = person.trim()
    if (!keeperName) return next
    return { ...next, keeperName }
  }

  function land(next, face = '') {
    finished.current = true
    markWelcomeSeen()
    onChange(withName(next))
    goHash('/tonight', face ? { face } : '')
  }

  function add(event) {
    event?.preventDefault()
    if (!count || finished.current) return
    const own = ownNew ? { question, short: shortFromQuestion(question, 24) } : null
    const made = firstRunBook(book, picks, own, askAfter, clock)
    land(made.book, made.faceId)
  }

  function startEmpty() {
    if (finished.current) return
    land(book)
  }

  const isOn = (item) => picks.some((pick) => pick.question === item.question)

  return (
    <BoardShell book={book} now={clock} title={book.title} nav={false} back={false} cog={false}>
      <form className="di-page di-first" onSubmit={add}>
        <h2 className="di-page-title">
          {named ? t('first.titleNamed', { name: named }) : t('first.title')}
        </h2>
        <p className="di-detail-meta">{t('first.packsBody')}</p>
        {packs.length ? (
          <div className="di-first-packs">
            {packs.map((pack) => {
              const state = packState(picks, pack)
              const on = pack.items.filter(isOn).length
              return (
                <fieldset key={pack.id} className="di-first-pack" data-state={state}>
                  <button
                    type="button"
                    className="di-first-pack-head"
                    role="checkbox"
                    aria-label={`${pack.title}, ${t('first.stepOf', { n: on, total: pack.items.length })}`}
                    aria-checked={state === 'all' ? 'true' : state === 'some' ? 'mixed' : 'false'}
                    onClick={() => setPicks((list) => togglePack(list, pack))}
                  >
                    <span className="di-first-box" data-state={state} aria-hidden="true" />
                    <span className="di-first-pack-title">{pack.title}</span>
                    <span className="di-first-pack-count">{t('first.stepOf', { n: on, total: pack.items.length })}</span>
                  </button>
                  {pack.items.map((item) => (
                    <label key={item.idea} className="di-first-item">
                      <input type="checkbox" checked={isOn(item)} onChange={() => setPicks((list) => togglePick(list, item))} />
                      <span className="di-first-box" data-state={isOn(item) ? 'all' : 'none'} aria-hidden="true" />
                      <span>{item.question}</span>
                    </label>
                  ))}
                </fieldset>
              )
            })}
          </div>
        ) : null}
        <p className="di-slot-label">{t('first.own')}</p>
        <label className="di-first-card">
          <span className="di-first-lead">{t('tonight.didI')}</span>
          <input
            className="di-first-blank"
            value={blank}
            onChange={(event) => setBlank(event.target.value)}
            placeholder={t('first.ownHint')}
            aria-label={t('first.own')}
            maxLength={120}
            autoCapitalize="none"
            enterKeyHint="done"
          />
          <span className="di-first-swipes">{t('first.swipeLine')}</span>
        </label>
        <SetCap>{t('hang.secSchedule')}</SetCap>
        <SetCard>
          <SetRow label={t('hang.when')} value={t('hang.daily')} sub={t('first.whenLater')} />
        </SetCard>
        <div className="di-field">
          <span>{t('hang.timeRow')}</span>
          <HangTimeSelect ariaLabel={t('hang.timeRow')} value={askAfter} onChange={setAskAfter} />
        </div>
        {!named ? (
          <label className="di-field">
            <span>{t('first.name')}</span>
            <input
              value={person}
              onChange={(event) => setPerson(event.target.value)}
              autoComplete="name"
              placeholder={t('first.nameHint')}
            />
          </label>
        ) : null}
        <div className="di-hang-actions">
          <button className="di-did" type="submit" aria-disabled={!count} aria-describedby={count ? undefined : 'di-first-add-hint'}>
            {count ? t('first.nextCount', { n: count }) : t('first.add')}
          </button>
          {!count ? <small id="di-first-add-hint" className="di-field-hint">{t('first.addHint')}</small> : null}
          <button className="di-key" type="button" onClick={startEmpty}>
            {t('first.startEmpty')}
          </button>
        </div>
      </form>
    </BoardShell>
  )
}
