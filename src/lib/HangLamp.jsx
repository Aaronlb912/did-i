import { useEffect, useRef, useState } from 'react'
import { blankLamp, missLamp, shortLabel } from './board-json.js'

export function HangLamp({ now, onSave, onCancel, miss }) {
  const [draft, setDraft] = useState(() => blankLamp(now))
  const questionRef = useRef(null)

  useEffect(() => {
    questionRef.current?.focus()
  }, [])

  function change(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  function submit(event) {
    if (event) event.preventDefault()
    const next = {
      ...draft,
      question: draft.question.trim(),
      short: draft.short.trim() || shortLabel(draft),
      cadence: 'daily',
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
      <p className="di-hang-kicker">New plate</p>
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
        <span>When</span>
        <select value={draft.slot} onChange={(event) => change('slot', event.target.value)}>
          <option value="morning">Morning</option>
          <option value="whenever">Whenever</option>
          <option value="night">Night</option>
        </select>
      </label>
      <p className="di-hang-note">This hang is a daily lamp. Other cadences come next.</p>
      {miss ? (
        <p className="di-miss" role="alert">
          {miss}
        </p>
      ) : null}
      <div className="di-hang-actions">
        <button className="di-did di-did-small" type="button" onClick={() => submit()}>
          Hang
        </button>
        <button className="di-skip" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
