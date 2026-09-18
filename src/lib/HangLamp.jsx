import { useEffect, useRef, useState } from 'react'
import { blankLamp, missLamp, shortLabel } from './board-json.js'

const DAYS = [
  { n: 0, label: 'Sun' },
  { n: 1, label: 'Mon' },
  { n: 2, label: 'Tue' },
  { n: 3, label: 'Wed' },
  { n: 4, label: 'Thu' },
  { n: 5, label: 'Fri' },
  { n: 6, label: 'Sat' },
]

export function HangLamp({ now, lamp, onSave, onCancel, miss }) {
  const [draft, setDraft] = useState(() => (lamp ? { ...lamp } : blankLamp(now)))
  const questionRef = useRef(null)
  const editing = Boolean(lamp)

  useEffect(() => {
    questionRef.current?.focus()
  }, [])

  function change(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  function toggleDay(day) {
    setDraft((prev) => {
      const has = prev.weekdays.includes(day)
      const weekdays = has
        ? prev.weekdays.filter((item) => item !== day)
        : [...prev.weekdays, day].sort((a, b) => a - b)
      return { ...prev, weekdays }
    })
  }

  function submit(event) {
    if (event) event.preventDefault()
    const next = {
      ...draft,
      question: draft.question.trim(),
      short: draft.short.trim() || shortLabel(draft),
      monthDay: draft.cadence === 'monthly' ? draft.monthDay : '',
      everyN: draft.cadence === 'every_n' ? Number(draft.everyN) || draft.everyN : '',
      everyNAnchor: draft.cadence === 'every_n' ? draft.everyNAnchor : '',
      weekdays: draft.cadence === 'weekly' ? draft.weekdays : [],
    }
    const problem = missLamp(next)
    if (problem) {
      onSave(null, problem)
      return
    }
    onSave(next, '')
  }

  return (
    <form className="di-hang" onSubmit={submit}>
      <p className="di-hang-kicker">{editing ? 'Edit plate' : 'New plate'}</p>
      <label className="di-field">
        <span>Question</span>
        <input
          ref={questionRef}
          value={draft.question}
          onChange={(event) => change('question', event.target.value)}
          placeholder="Did I lock the back door?"
        />
      </label>
      <label className="di-field">
        <span>Short label</span>
        <input
          value={draft.short}
          onChange={(event) => change('short', event.target.value)}
          placeholder="Back door"
        />
      </label>
      <label className="di-field">
        <span>Kind</span>
        <select value={draft.kind} onChange={(event) => change('kind', event.target.value)}>
          <option value="house">House</option>
          <option value="pills">Pills</option>
          <option value="money">Money</option>
          <option value="people">People</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="di-field">
        <span>How often</span>
        <select
          value={draft.cadence}
          onChange={(event) => change('cadence', event.target.value)}
        >
          <option value="daily">Every day</option>
          <option value="weekly">Some weekdays</option>
          <option value="monthly">Monthly</option>
          <option value="every_n">Every N days</option>
          <option value="once">Once</option>
        </select>
      </label>
      {draft.cadence === 'weekly' ? (
        <fieldset className="di-days">
          <legend>Weekdays</legend>
          {DAYS.map((day) => (
            <label key={day.n}>
              <input
                type="checkbox"
                checked={draft.weekdays.includes(day.n)}
                onChange={() => toggleDay(day.n)}
              />
              {day.label}
            </label>
          ))}
        </fieldset>
      ) : null}
      {draft.cadence === 'monthly' ? (
        <label className="di-field">
          <span>Day of the month</span>
          <select
            value={draft.monthDay === '' ? '' : String(draft.monthDay)}
            onChange={(event) =>
              change('monthDay', event.target.value === 'last' ? 'last' : Number(event.target.value) || '')
            }
          >
            <option value="">Pick a day</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
            <option value="last">Last day</option>
          </select>
        </label>
      ) : null}
      {draft.cadence === 'every_n' ? (
        <>
          <label className="di-field">
            <span>Every how many days</span>
            <input
              inputMode="numeric"
              value={draft.everyN}
              onChange={(event) => change('everyN', event.target.value)}
              placeholder="3"
            />
          </label>
          <label className="di-field">
            <span>Starting on</span>
            <input
              type="date"
              value={draft.everyNAnchor}
              onChange={(event) => change('everyNAnchor', event.target.value)}
            />
          </label>
        </>
      ) : null}
      <label className="di-field">
        <span>When</span>
        <select value={draft.slot} onChange={(event) => change('slot', event.target.value)}>
          <option value="morning">Morning</option>
          <option value="whenever">Whenever</option>
          <option value="night">Night</option>
        </select>
      </label>
      <label className="di-field">
        <span>Ask after (optional)</span>
        <input
          type="time"
          value={draft.askAfter}
          onChange={(event) => change('askAfter', event.target.value)}
        />
      </label>
      <label className="di-field">
        <span>Notes</span>
        <input
          value={draft.notes}
          onChange={(event) => change('notes', event.target.value)}
        />
      </label>
      {miss ? (
        <p className="di-miss" role="alert">
          {miss}
        </p>
      ) : null}
      <div className="di-hang-actions">
        <button className="di-did di-did-small" type="button" onClick={() => submit()}>
          {editing ? 'Save' : 'Hang'}
        </button>
        <button className="di-skip" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
