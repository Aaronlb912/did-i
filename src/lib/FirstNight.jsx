import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { blankLamp, shortFromQuestion } from './board-json.js'
import { hangInto } from './board-ops.js'
import { BoardShell } from './BoardShell.jsx'
import { StarterPicks } from './StarterPicks.jsx'
import { markWelcomeSeen } from './hall-pages.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { firstName } from './session.js'

function asQuestion(raw) {
  let question = String(raw || '').trim()
  if (!question) return ''
  if (!/^did i\b/i.test(question)) question = `Did I ${question}`
  if (!question.endsWith('?')) question += '?'
  return question
}

export function FirstNight({ book, onChange, now }) {
  usePrefs()
  const clock = now || new Date()
  const named = firstName(book)
  const [person, setPerson] = useState(book.keeperName || '')
  const [own, setOwn] = useState('')

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

  function addOwn() {
    const question = asQuestion(own)
    if (!question) return
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
      <section className="di-page di-first">
        <p className="di-face-plate">{t('first.kicker')}</p>
        <h2 className="di-page-title">
          {named ? t('first.titleNamed', { name: named }) : t('first.title')}
        </h2>
        <p className="di-detail-meta">{t('first.body')}</p>
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
        <StarterPicks
          book={book}
          onChange={(next) => land(next)}
          now={clock}
          label={t('first.picks')}
          readyNow
        />
        <label className="di-field di-first-own">
          <span>{t('first.own')}</span>
          <input
            value={own}
            onChange={(event) => setOwn(event.target.value)}
            placeholder={t('first.ownHint')}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addOwn()
              }
            }}
          />
        </label>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={addOwn}>
            {t('first.add')}
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
