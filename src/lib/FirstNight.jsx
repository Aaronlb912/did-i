import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { blankLamp, didQuestion, shortFromQuestion } from './board-json.js'
import { hangInto } from './board-ops.js'
import { BoardShell } from './BoardShell.jsx'
import { markWelcomeSeen } from './hall-pages.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { firstName } from './session.js'
import { hangStarter, starterBlank, unusedStarters } from './starters.js'

// The first question is a sentence to finish, written on the card it becomes.
export function FirstNight({ book, onChange, now }) {
  usePrefs()
  const clock = now || new Date()
  const named = firstName(book)
  const [person, setPerson] = useState(book.keeperName || '')
  const [blank, setBlank] = useState('')
  const starters = unusedStarters(book, clock, true)
  const question = didQuestion(blank)
  const picked = starters.find((starter) => starter.question === question)

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

  function add(event) {
    event?.preventDefault()
    if (!question) return
    if (picked) {
      land(hangStarter(book, picked, clock, true))
      return
    }
    const lamp = {
      ...blankLamp(clock),
      question,
      short: shortFromQuestion(question, 24),
      cadence: 'daily',
      askAfter: '',
      slot: 'whenever',
    }
    land(hangInto(book, lamp), lamp.id)
  }

  return (
    <BoardShell book={book} now={clock} title={book.title} nav={false}>
      <form className="di-page di-first" onSubmit={add}>
        <h2 className="di-page-title">
          {named ? t('first.titleNamed', { name: named }) : t('first.title')}
        </h2>
        <p className="di-detail-meta">{t('first.body')}</p>
        <label className="di-first-card">
          <span className="di-first-lead">{t('tonight.didI')}</span>
          <input
            className="di-first-blank"
            value={blank}
            onChange={(event) => setBlank(event.target.value)}
            placeholder={t('first.ownHint')}
            maxLength={120}
            autoCapitalize="none"
            enterKeyHint="done"
          />
          <span className="di-first-swipes" aria-hidden="true">
            <span className="di-first-nope">{t('first.swipeNope')}</span>
            <span className="di-first-did">{t('first.swipeDid')}</span>
          </span>
        </label>
        {starters.length ? (
          <div className="di-first-picks">
            <p className="di-slot-label">{t('first.picks')}</p>
            <div className="di-tray-files">
              {starters.map((starter) => (
                <button
                  key={starter.short}
                  className="di-key di-first-pick"
                  type="button"
                  aria-pressed={picked === starter}
                  onClick={() => setBlank(starterBlank(starter))}
                >
                  {starterBlank(starter)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
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
          <button className="di-did" type="submit" disabled={!question}>
            {t('first.add')}
          </button>
        </div>
      </form>
    </BoardShell>
  )
}
