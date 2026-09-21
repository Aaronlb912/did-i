import { useEffect, useMemo, useRef } from 'react'
import { HangMonthCal } from './HangMonthCal.jsx'
import { HangSelect } from './HangSelect.jsx'
import { HangTimeSelect } from './HangTimeSelect.jsx'
import {
  CADENCE_OPTIONS,
  cadenceDropdownValue,
  isDeadlineMode,
  schedulePick,
} from './hang-schedule.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { useHangDraft } from './useHangDraft.js'

const DAYS = [0, 1, 2, 3, 4, 5, 6]
const PRIORITIES = ['high', 'normal', 'low']

export function HangLamp({
  now,
  lamp,
  seed,
  onSave,
  onCancel,
  miss: missOut,
  start,
  boards = [],
  book,
  tagTitle = '',
  onTagTitle,
}) {
  usePrefs()
  const questionRef = useRef(null)
  const hang = useHangDraft({
    book,
    boards,
    now,
    lamp,
    seed,
    start,
    tagTitle,
    onTagTitle,
  })
  const miss = missOut || hang.miss

  const schedule = schedulePick(hang.draft)
  const deadline = isDeadlineMode(hang.draft)
  const cadenceOptions = useMemo(
    () => CADENCE_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) })),
    [],
  )

  useEffect(() => {
    questionRef.current?.focus()
  }, [])

  function submit(event) {
    if (event) event.preventDefault()
    const { lamp: next, problem } = hang.buildLamp()
    if (problem) {
      hang.setMiss(problem)
      onSave(null, problem)
      return
    }
    onSave(next, '')
  }

  return (
    <form className="di-hang di-plate-loose" onSubmit={submit}>
      <p className="di-hang-kicker">{hang.editing ? t('hang.edit') : t('hang.new')}</p>
      <label className="di-field">
        <span>{t('hang.question')}</span>
        <input
          className="di-hang-input"
          ref={questionRef}
          value={hang.draft.question}
          onChange={(event) => hang.change('question', event.target.value)}
          placeholder={t('hang.questionPh')}
        />
      </label>
      {onTagTitle ? (
        <div className="di-field di-field-tag">
          <span id="di-hang-tag">{t('hang.tag')}</span>
          <div className="di-hang-tags" role="group" aria-labelledby="di-hang-tag">
            {hang.liveTags.map((item) => {
              const on = hang.isTagSelected(item.title)
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
            {hang.knownTag ? (
              <button
                className="di-hang-tags-new"
                type="button"
                onClick={() => onTagTitle('')}
              >
                {t('hang.tagNew')}
              </button>
            ) : (
              <input
                className="di-hang-tags-input"
                value={hang.tagTitle}
                onChange={(event) => hang.setTagTitle(event.target.value)}
                placeholder={t('hang.tagPh')}
                aria-label={t('hang.tagNew')}
              />
            )}
          </div>
          {hang.parkedTags.length ? (
            <div
              className="di-hang-tags-parked"
              role="group"
              aria-label={`${t('hang.tagLater')}. ${t('hang.tagLaterHint')}`}
            >
              <span className="di-hang-tags-parked-label">{t('hang.tagLater')}</span>
              {hang.parkedTags.map((item) => {
                const on = hang.isTagSelected(item.title)
                return (
                  <button
                    key={item.id}
                    className={on ? 'di-key is-pick' : 'di-key di-hang-tags-muted'}
                    type="button"
                    onClick={() => onTagTitle(item.title)}
                  >
                    {item.title}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}
      {deadline ? (
        <div className="di-field">
          <span id="di-hang-due">{t('hang.dueBy')}</span>
          <HangMonthCal
            mode="date"
            value={hang.draft.dueBy}
            onChange={(iso) => hang.change('dueBy', iso)}
            now={hang.clock}
            dayFoldHour={book.dayFoldHour}
          />
          <small className="di-field-hint">{t('hang.dueByHint')}</small>
          <button className="di-text di-hang-timing-back" type="button" onClick={() => hang.change('cadence', 'daily')}>
            {t('hang.useOften')}
          </button>
        </div>
      ) : (
        <div className="di-field di-hang-timing">
          <span id="di-hang-cadence">{t('hang.often')}</span>
          <div className="di-hang-timing-row">
            <HangSelect
              ariaLabel={t('hang.often')}
              value={cadenceDropdownValue(hang.draft)}
              onChange={(value) => hang.change('cadence', value)}
              options={cadenceOptions}
            />
            <span className="di-hang-or">{t('hang.or')}</span>
            <button className="di-key" type="button" onClick={() => hang.changeSchedule('deadline')}>
              {t('hang.deadline')}
            </button>
          </div>
        </div>
      )}
      {!deadline && hang.draft.cadence === 'weekly' ? (
        <fieldset className="di-days">
          <legend>{t('hang.weekdays')}</legend>
          {DAYS.map((day) => (
            <label key={day}>
              <input
                type="checkbox"
                checked={(hang.draft.weekdays || []).includes(day)}
                onChange={() => hang.toggleDay(day)}
              />
              {t(`hang.day.${day}`)}
            </label>
          ))}
        </fieldset>
      ) : null}
      {!deadline && hang.draft.cadence === 'monthly' ? (
        <div className="di-field">
          <span id="di-hang-month">{t('hang.monthDay')}</span>
          <HangMonthCal
            mode="monthly"
            value={hang.draft.monthDay === '' ? '' : hang.draft.monthDay}
            onChange={(day) => hang.change('monthDay', day)}
            now={hang.clock}
            dayFoldHour={book.dayFoldHour}
          />
          <small className="di-field-hint">{t('hang.monthCalHint')}</small>
        </div>
      ) : null}
      {!deadline && schedule === 'once_on' ? (
        <div className="di-field">
          <span id="di-hang-once">{t('hang.onceOn')}</span>
          <HangMonthCal
            mode="date"
            value={hang.draft.onceOn}
            onChange={(iso) => hang.change('onceOn', iso)}
            now={hang.clock}
            dayFoldHour={book.dayFoldHour}
          />
          <small className="di-field-hint">{t('hang.onceOnHint')}</small>
        </div>
      ) : null}
      {!deadline && hang.draft.cadence === 'every_n' ? (
        <>
          <label className="di-field">
            <span>{t('hang.everyNDays')}</span>
            <input
              className="di-hang-input"
              inputMode="numeric"
              value={hang.draft.everyN}
              onChange={(event) => hang.change('everyN', event.target.value)}
              placeholder="3"
            />
          </label>
          <div className="di-field">
            <span id="di-hang-anchor">{t('hang.startingOn')}</span>
            <HangMonthCal
              mode="date"
              value={hang.draft.everyNAnchor}
              onChange={(iso) => hang.change('everyNAnchor', iso)}
              now={hang.clock}
              dayFoldHour={book.dayFoldHour}
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
              className={hang.priority === id ? 'di-key is-pick' : 'di-key'}
              type="button"
              onClick={() => hang.change('priority', id)}
            >
              {t(`hang.priority.${id}`)}
            </button>
          ))}
        </div>
        <small className="di-field-hint">{t(`hang.priority.hint.${hang.priority}`)}</small>
      </div>
      <div className="di-field di-field-notify">
        <span id="di-hang-notify">{t('hang.notify')}</span>
        <div className="di-hang-chips" role="group" aria-labelledby="di-hang-notify">
          <button
            className={hang.notifyOn ? 'di-key is-pick' : 'di-key'}
            type="button"
            onClick={() => hang.change('notify', true)}
          >
            {t('hang.notifyOn')}
          </button>
          <button
            className={!hang.notifyOn ? 'di-key is-pick' : 'di-key'}
            type="button"
            onClick={() => hang.change('notify', false)}
          >
            {t('hang.notifyOff')}
          </button>
          <button
            className="di-text di-hang-more"
            type="button"
            aria-expanded={hang.more}
            onClick={() => hang.setMore((open) => !open)}
          >
            {hang.more ? t('hang.less') : t('hang.more')}
          </button>
        </div>
      </div>
      {hang.more ? (
        <>
          <label className="di-field">
            <span>{t('hang.short')}</span>
            <input
              className="di-hang-input"
              value={hang.draft.short}
              onChange={(event) => hang.change('short', event.target.value)}
              placeholder={t('hang.shortPh')}
            />
          </label>
          <div className="di-field">
            <span id="di-hang-after">{t('hang.askAfter')}</span>
            <HangTimeSelect
              ariaLabel={t('hang.askAfter')}
              value={hang.draft.askAfter}
              onChange={hang.changeAskAfter}
            />
          </div>
          <label className="di-field">
            <span>{t('hang.kind')}</span>
            <input
              className="di-hang-input"
              value={hang.draft.kind}
              onChange={(event) => hang.change('kind', event.target.value)}
              placeholder={t('hang.kindPh')}
            />
          </label>
          <label className="di-field">
            <span>{t('hang.notes')}</span>
            <input
              className="di-hang-input"
              value={hang.draft.notes}
              onChange={(event) => hang.change('notes', event.target.value)}
              placeholder={t('hang.notesPh')}
            />
          </label>
        </>
      ) : null}
      {miss ? (
        <p className="di-miss" role="alert">
          {t(miss)}
        </p>
      ) : null}
      <div className="di-hang-actions">
        <button className="di-did di-did-small" type="button" onClick={() => submit()}>
          {hang.editing ? t('hang.save') : t('hang.add')}
        </button>
        <button className="di-skip" type="button" onClick={onCancel}>
          {t('hang.cancel')}
        </button>
      </div>
    </form>
  )
}
