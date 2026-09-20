import { useEffect, useRef, useState } from 'react'
import {
  blankLamp,
  lampNotifyOn,
  lampPriority,
  missLamp,
  shortLabel,
  slotFromAskAfter,
} from './board-json.js'
import { findBookByTitle } from './board-shelf.js'
import { HangMonthCal } from './HangMonthCal.jsx'
import { HangSelect } from './HangSelect.jsx'
import { HangTimeSelect } from './HangTimeSelect.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { isoDate } from './recurrence.js'
import { STARTERS } from './starters.js'

const DAYS = [0, 1, 2, 3, 4, 5, 6]
const PRIORITIES = ['high', 'normal', 'low']

function hasExtraFields(item) {
  return Boolean(
    item && (item.short || item.askAfter || item.notes || String(item.kind || '').trim()),
  )
}

export function HangLamp({
  now,
  lamp,
  seed,
  onSave,
  onCancel,
  miss,
  start,
  boards = [],
  tagTitle = '',
  onTagTitle,
}) {
  usePrefs()
  const [draft, setDraft] = useState(() => {
    if (lamp) return { ...lamp }
    if (seed) return { ...seed }
    const pick = STARTERS.find(
      (item) => item.short.toLowerCase() === String(start || '').toLowerCase(),
    )
    return pick ? { ...blankLamp(now), ...pick } : blankLamp(now)
  })
  const questionRef = useRef(null)
  const editing = Boolean(lamp)
  const [more, setMore] = useState(() => hasExtraFields(lamp) || hasExtraFields(seed))
  const priority = lampPriority(draft)
  const notifyOn = lampNotifyOn(draft)
  const knownTag = Boolean(findBookByTitle(boards, tagTitle))
  const liveTags = (boards || []).filter((item) => !item.archived)
  const parkedTags = (boards || []).filter((item) => item.archived)

  useEffect(() => {
    questionRef.current?.focus()
  }, [])

  function change(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  function changeAskAfter(next) {
    setDraft((prev) => ({
      ...prev,
      askAfter: next,
      slot: slotFromAskAfter(next),
    }))
  }

  function changeCadence(value) {
    setDraft((prev) => {
      const next = { ...prev, cadence: value }
      if (value === 'once' && !/^\d{4}-\d{2}-\d{2}$/.test(String(prev.onceOn || ''))) {
        next.onceOn = isoDate(new Date(now))
      }
      return next
    })
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
      onceOn: draft.cadence === 'once' ? draft.onceOn : '',
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
          className="di-hang-input"
          ref={questionRef}
          value={draft.question}
          onChange={(event) => change('question', event.target.value)}
          placeholder={t('hang.questionPh')}
        />
      </label>
      {onTagTitle ? (
        <div className="di-field">
          <span id="di-hang-tag">{t('hang.tag')}</span>
          <div className="di-tagpick" role="group" aria-labelledby="di-hang-tag">
            {liveTags.map((item) => {
              const on = Boolean(findBookByTitle([item], tagTitle))
              return (
                <button
                  key={item.id}
                  className={on ? 'di-key is-pick' : 'di-key'}
                  type="button"
                  onClick={() => onTagTitle(item.title)}
                >
                  {item.title}
                </button>
              )
            })}
            <button
              className="di-tagpick-new"
              type="button"
              aria-pressed={!knownTag}
              onClick={() => onTagTitle('')}
            >
              {t('hang.tagNew')}
            </button>
          </div>
          {parkedTags.length ? (
            <div className="di-tagpick di-tagpick-later" role="group" aria-label={t('hang.tagLater')}>
              <span className="di-tagpick-cap">{t('hang.tagLater')}</span>
              <span className="di-tagpick-hint">{t('hang.tagLaterHint')}</span>
              {parkedTags.map((item) => {
                const on = Boolean(findBookByTitle([item], tagTitle))
                return (
                  <button
                    key={item.id}
                    className={on ? 'di-key is-pick' : 'di-key di-tagpick-old'}
                    type="button"
                    onClick={() => onTagTitle(item.title)}
                  >
                    {item.title}
                  </button>
                )
              })}
            </div>
          ) : null}
          {knownTag ? null : (
            <input
              className="di-hang-input"
              value={tagTitle}
              onChange={(event) => onTagTitle(event.target.value)}
              placeholder={t('hang.tagPh')}
              aria-label={t('hang.tagNew')}
            />
          )}
        </div>
      ) : null}
      <div className="di-field">
        <span id="di-hang-cadence">{t('hang.often')}</span>
        <HangSelect
          ariaLabel={t('hang.often')}
          value={draft.cadence}
          onChange={changeCadence}
          options={[
            { value: 'daily', label: t('hang.daily') },
            { value: 'weekly', label: t('hang.weekly') },
            { value: 'monthly', label: t('hang.monthly') },
            { value: 'every_n', label: t('hang.everyN') },
            { value: 'once', label: t('hang.once') },
          ]}
        />
      </div>
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
        <div className="di-field">
          <span id="di-hang-month">{t('hang.monthDay')}</span>
          <HangMonthCal
            mode="monthly"
            value={draft.monthDay === '' ? '' : draft.monthDay}
            onChange={(day) => change('monthDay', day)}
            now={now}
            dayFoldHour={4}
          />
          <small className="di-field-hint">{t('hang.monthCalHint')}</small>
        </div>
      ) : null}
      {draft.cadence === 'once' ? (
        <div className="di-field">
          <span id="di-hang-once">{t('hang.onceOn')}</span>
          <HangMonthCal
            mode="date"
            value={draft.onceOn}
            onChange={(iso) => change('onceOn', iso)}
            now={now}
            dayFoldHour={4}
          />
          <small className="di-field-hint">{t('hang.onceOnHint')}</small>
        </div>
      ) : null}
      {draft.cadence === 'every_n' ? (
        <>
          <label className="di-field">
            <span>{t('hang.everyNDays')}</span>
            <input
              className="di-hang-input"
              inputMode="numeric"
              value={draft.everyN}
              onChange={(event) => change('everyN', event.target.value)}
              placeholder="3"
            />
          </label>
          <div className="di-field">
            <span id="di-hang-anchor">{t('hang.startingOn')}</span>
            <HangMonthCal
              mode="date"
              value={draft.everyNAnchor}
              onChange={(iso) => change('everyNAnchor', iso)}
              now={now}
              dayFoldHour={4}
            />
          </div>
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
        <small className="di-field-hint">{t(`hang.priority.hint.${priority}`)}</small>
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
              className="di-hang-input"
              value={draft.short}
              onChange={(event) => change('short', event.target.value)}
              placeholder={t('hang.shortPh')}
            />
          </label>
          <div className="di-field">
            <span id="di-hang-after">{t('hang.askAfter')}</span>
            <HangTimeSelect
              ariaLabel={t('hang.askAfter')}
              value={draft.askAfter}
              onChange={changeAskAfter}
            />
          </div>
          <label className="di-field">
            <span>{t('hang.kind')}</span>
            <input
              className="di-hang-input"
              value={draft.kind}
              onChange={(event) => change('kind', event.target.value)}
              placeholder={t('hang.kindPh')}
            />
          </label>
          <label className="di-field">
            <span>{t('hang.notes')}</span>
            <input
              className="di-hang-input"
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
          {t(miss)}
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
