import { useEffect, useRef, useState } from 'react'
import { blankLamp, lampNotifyOn, lampPriority, missLamp, shortLabel } from './board-json.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { STARTERS } from './starters.js'

const DAYS = [0, 1, 2, 3, 4, 5, 6]
const PRIORITIES = ['high', 'normal', 'low']

export function HangLamp({ now, lamp, onSave, onCancel, miss, start, boards = [], tagTitle = '', onTagTitle }) {
  usePrefs()
  const [draft, setDraft] = useState(() => {
    if (lamp) return { ...lamp }
    const pick = STARTERS.find(
      (item) => item.short.toLowerCase() === String(start || '').toLowerCase(),
    )
    return pick ? { ...blankLamp(now), ...pick } : blankLamp(now)
  })
  const questionRef = useRef(null)
  const editing = Boolean(lamp)
  const [more, setMore] = useState(() =>
    Boolean(
      lamp &&
        (lamp.short ||
          lamp.askAfter ||
          lamp.notes ||
          (lamp.slot && lamp.slot !== 'whenever') ||
          (lamp.kind && lamp.kind !== 'other')),
    ),
  )
  const priority = lampPriority(draft)
  const notifyOn = lampNotifyOn(draft)

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
      priority,
      notify: notifyOn,
    }
    const problem = missLamp(next)
    if (problem) {
      onSave(null, problem)
      return
    }
    onSave(next, '')
  }

  return (
    <form className="di-hang di-plate-loose" onSubmit={submit}>
      <p className="di-hang-kicker">{editing ? t('hang.edit') : t('hang.new')}</p>
      <label className="di-field">
        <span>{t('hang.question')}</span>
        <input
          ref={questionRef}
          value={draft.question}
          onChange={(event) => change('question', event.target.value)}
          placeholder={t('hang.questionPh')}
        />
      </label>
      {onTagTitle ? (
        <label className="di-field">
          <span>{t('hang.tag')}</span>
          <input
            list="di-hang-tags"
            value={tagTitle}
            onChange={(event) => onTagTitle(event.target.value)}
            placeholder={t('hang.tagPh')}
          />
          <datalist id="di-hang-tags">
            {boards.map((item) => (
              <option key={item.id} value={item.title} />
            ))}
          </datalist>
        </label>
      ) : null}
      <label className="di-field">
        <span>{t('hang.often')}</span>
        <select
          value={draft.cadence}
          onChange={(event) => change('cadence', event.target.value)}
        >
          <option value="daily">{t('hang.daily')}</option>
          <option value="weekly">{t('hang.weekly')}</option>
          <option value="monthly">{t('hang.monthly')}</option>
          <option value="every_n">{t('hang.everyN')}</option>
          <option value="once">{t('hang.once')}</option>
        </select>
      </label>
      {draft.cadence === 'weekly' ? (
        <fieldset className="di-days">
          <legend>{t('hang.weekdays')}</legend>
          {DAYS.map((day) => (
            <label key={day}>
              <input
                type="checkbox"
                checked={draft.weekdays.includes(day)}
                onChange={() => toggleDay(day)}
              />
              {t(`hang.day.${day}`)}
            </label>
          ))}
        </fieldset>
      ) : null}
      {draft.cadence === 'monthly' ? (
        <label className="di-field">
          <span>{t('hang.monthDay')}</span>
          <select
            value={draft.monthDay === '' ? '' : String(draft.monthDay)}
            onChange={(event) =>
              change('monthDay', event.target.value === 'last' ? 'last' : Number(event.target.value) || '')
            }
          >
            <option value="">{t('hang.pickDay')}</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
            <option value="last">{t('hang.lastDay')}</option>
          </select>
        </label>
      ) : null}
      {draft.cadence === 'every_n' ? (
        <>
          <label className="di-field">
            <span>{t('hang.everyNDays')}</span>
            <input
              inputMode="numeric"
              value={draft.everyN}
              onChange={(event) => change('everyN', event.target.value)}
              placeholder="3"
            />
          </label>
          <label className="di-field">
            <span>{t('hang.startingOn')}</span>
            <input
              type="date"
              value={draft.everyNAnchor}
              onChange={(event) => change('everyNAnchor', event.target.value)}
            />
          </label>
        </>
      ) : null}
      <div className="di-field">
        <span id="di-hang-priority">{t('hang.priority')}</span>
        <div className="di-hang-chips" role="group" aria-labelledby="di-hang-priority">
          {PRIORITIES.map((id) => (
            <button
              key={id}
              className={priority === id ? 'di-key is-pick' : 'di-key'}
              type="button"
              onClick={() => change('priority', id)}
            >
              {t(`hang.priority.${id}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="di-field">
        <span id="di-hang-notify">{t('hang.notify')}</span>
        <div className="di-hang-chips" role="group" aria-labelledby="di-hang-notify">
          <button
            className={notifyOn ? 'di-key is-pick' : 'di-key'}
            type="button"
            onClick={() => change('notify', true)}
          >
            {t('hang.notifyOn')}
          </button>
          <button
            className={!notifyOn ? 'di-key is-pick' : 'di-key'}
            type="button"
            onClick={() => change('notify', false)}
          >
            {t('hang.notifyOff')}
          </button>
        </div>
      </div>
      {more ? (
        <>
          <label className="di-field">
            <span>{t('hang.short')}</span>
            <input
              value={draft.short}
              onChange={(event) => change('short', event.target.value)}
              placeholder={t('hang.shortPh')}
            />
          </label>
          <label className="di-field">
            <span>{t('hang.timeOfDay')}</span>
            <select value={draft.slot} onChange={(event) => change('slot', event.target.value)}>
              <option value="morning">{t('hang.morning')}</option>
              <option value="whenever">{t('hang.whenever')}</option>
              <option value="night">{t('hang.night')}</option>
            </select>
          </label>
          <label className="di-field">
            <span>{t('hang.askAfter')}</span>
            <input
              type="time"
              value={draft.askAfter}
              onChange={(event) => change('askAfter', event.target.value)}
            />
          </label>
          <label className="di-field">
            <span>{t('hang.kind')}</span>
            <select value={draft.kind} onChange={(event) => change('kind', event.target.value)}>
              <option value="house">{t('hang.kind.house')}</option>
              <option value="pills">{t('hang.kind.pills')}</option>
              <option value="money">{t('hang.kind.money')}</option>
              <option value="people">{t('hang.kind.people')}</option>
              <option value="other">{t('hang.kind.other')}</option>
            </select>
          </label>
          <label className="di-field">
            <span>{t('hang.notes')}</span>
            <input
              value={draft.notes}
              onChange={(event) => change('notes', event.target.value)}
              placeholder={t('hang.notesPh')}
            />
          </label>
        </>
      ) : null}
      <button
        className="di-key"
        type="button"
        aria-expanded={more}
        onClick={() => setMore((open) => !open)}
      >
        {more ? t('hang.less') : t('hang.more')}
      </button>
      {miss ? (
        <p className="di-miss" role="alert">
          {miss}
        </p>
      ) : null}
      <div className="di-hang-actions">
        <button className="di-did di-did-small" type="button" onClick={() => submit()}>
          {editing ? t('hang.save') : t('hang.add')}
        </button>
        <button className="di-skip" type="button" onClick={onCancel}>
          {t('hang.cancel')}
        </button>
      </div>
    </form>
  )
}
