import { useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { blankLamp, didQuestion, shortFromQuestion } from './board-json.js'
import { hangInto } from './board-ops.js'
import { BoardShell } from './BoardShell.jsx'
import { markWelcomeSeen } from './hall-pages.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { firstName } from './session.js'
import { hangStarter, starterBlank, unusedStarters } from './starters.js'
import { HangTimeSelect } from './HangTimeSelect.jsx'
import { SetCap, SetCard, SetRow } from './set-bits.jsx'

// The first question comes up every day; the only choice here is from when.
function timed(next, question, askAfter) {
  if (!askAfter) return next
  const lamps = (next.lamps || []).map((lamp) => (lamp.question === question ? { ...lamp, askAfter } : lamp))
  return { ...next, lamps }
}

const WOBBLE_FIRST = 1200
const WOBBLE_EVERY = 4200

// The first question is a sentence to finish, written on the card it becomes.
export function FirstNight({ book, onChange, now }) {
  usePrefs()
  const clock = now || new Date()
  const named = firstName(book)
  const [person, setPerson] = useState(book.keeperName || '')
  const [askAfter, setAskAfter] = useState('')
  const [blank, setBlank] = useState('')
  const [wave, setWave] = useState(0)
  const [wobble, setWobble] = useState(0)
  const [typing, setTyping] = useState(false)
  const starters = unusedStarters(book, clock, true)
  const question = didQuestion(blank)
  const picked = starters.find((starter) => starter.question === question)
  const idle = !blank.trim() && !typing

  // While nothing is written, the ideas rock in turn as a "tap one" cue.
  useEffect(() => {
    if (!idle) return undefined
    let timer = setTimeout(function again() {
      setWobble((count) => count + 1)
      timer = setTimeout(again, WOBBLE_EVERY)
    }, WOBBLE_FIRST)
    return () => clearTimeout(timer)
  }, [idle])

  function withName(next) {
    const keeperName = person.trim()
    if (!keeperName) return next
    return { ...next, keeperName }
  }

  function land(next, face = '') {
    markWelcomeSeen()
    onChange(withName(next))
    goHash('/tonight', face ? { face } : '')
  }

  function pick(starter) {
    setBlank(starterBlank(starter))
    setWave((count) => count + 1)
  }

  function add(event) {
    event?.preventDefault()
    if (!question) {
      setWobble((count) => count + 1)
      return
    }
    if (picked) {
      land(timed(hangStarter(book, picked, clock, true), picked.question, askAfter))
      return
    }
    const lamp = {
      ...blankLamp(clock),
      question,
      short: shortFromQuestion(question, 24),
      cadence: 'daily',
      askAfter,
      slot: 'whenever',
    }
    land(hangInto(book, lamp), lamp.id)
  }

  return (
    <BoardShell book={book} now={clock} title={book.title} nav={false} back={false} cog={false}>
      <form className="di-page di-first" onSubmit={add}>
        <h2 className="di-page-title">
          {named ? t('first.titleNamed', { name: named }) : t('first.title')}
        </h2>
        <p className="di-detail-meta">{t('first.body')}</p>
        <label className="di-first-card">
          <span key={wave} className="di-first-lead" data-wave={wave ? '' : undefined}>
            {Array.from(t('tonight.didI')).map((char, index) => (
              <span key={index} style={{ '--i': index }}>
                {char}
              </span>
            ))}
          </span>
          <input
            className="di-first-blank"
            value={blank}
            onChange={(event) => setBlank(event.target.value)}
            onFocus={() => setTyping(true)}
            onBlur={() => setTyping(false)}
            placeholder={t('first.ownHint')}
            maxLength={120}
            autoCapitalize="none"
            enterKeyHint="done"
          />
          <span className="di-first-swipes">{t('first.swipeLine')}</span>
        </label>
        {starters.length ? (
          <div className="di-first-picks">
            <p className="di-slot-label">{t('first.picks')}</p>
            <div className="di-tray-files" data-wobble={wobble ? (wobble % 2 ? 'a' : 'b') : undefined}>
              {starters.map((starter, index) => (
                <button
                  key={starter.short}
                  className="di-key di-first-pick"
                  type="button"
                  aria-pressed={picked === starter}
                  style={{ '--i': index }}
                  onClick={() => pick(starter)}
                >
                  {starterBlank(starter)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
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
          <button className="di-did" type="submit" aria-disabled={!question}>
            {t('first.add')}
          </button>
        </div>
      </form>
    </BoardShell>
  )
}
