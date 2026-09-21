import { useEffect, useMemo, useRef } from 'react'
import { HangMonthCal } from './HangMonthCal.jsx'
import { HangSelect } from './HangSelect.jsx'
import { HangTimeSelect } from './HangTimeSelect.jsx'
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

  const cadenceOptions = useMemo(
    () => [
      { value: 'daily', label: t('hang.daily') },
      { value: 'weekly', label: t('hang.weekly') },
      { value: 'monthly', label: t('hang.monthly') },
      { value: 'every_n', label: t('hang.everyN') },
      { value: 'once', label: t('hang.once') },
    ],
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
        <div className="di-field">
          <span id="di-hang-tag">{t('hang.tag')}</span>
          <div className="di-tagpick" role="group" aria-labelledby="di-hang-tag">
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
            <button
              className="di-tagpick-new"
              type="button"
              aria-pressed={!hang.knownTag}
              onClick={() => onTagTitle('')}
            >
              {t('hang.tagNew')}
            </button>
          </div>
          {hang.parkedTags.length ? (
            <div className="di-tagpick di-tagpick-later" role="group" aria-label={t('hang.tagLater')}>
              <span className="di-tagpick-cap">{t('hang.tagLater')}</span>
              <span className="di-tagpick-hint">{t('hang.tagLaterHint')}</span>
              {hang.parkedTags.map((item) => {
                const on = hang.isTagSelected(item.title)
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
          {hang.knownTag ? null : (
            <input
              className="di-hang-input"
              value={hang.tagTitle}
              onChange={(event) => hang.setTagTitle(event.target.value)}
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
          value={hang.draft.cadence}
          onChange={(value) => hang.change('cadence', value)}
          options={cadenceOptions}
        />
      </div>
      {hang.draft.cadence === 'weekly' ? (
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
      {hang.draft.cadence === 'monthly' ? (
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
      {hang.draft.cadence === 'once' ? (
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
      {hang.draft.cadence === 'every_n' ? (
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
      <div className="di-field">
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
      <button
        className="di-key"
        type="button"
        aria-expanded={hang.more}
        onClick={() => hang.setMore((open) => !open)}
      >
        {hang.more ? t('hang.less') : t('hang.more')}
      </button>
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
