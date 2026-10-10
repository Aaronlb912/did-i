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
import { cadenceLine, didQuestion, SHORT_MAX, UNIT_MAX } from './board-json.js'
import { clockWords } from './hall-pages.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { useHangDraft } from './useHangDraft.js'
import { LampManage } from './LampManage.jsx'

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
  onPause,
  onRemove,
  head,
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
    words: head ? start : '',
    tagTitle,
    onTagTitle,
  })
  // A name saved under an older, longer limit still fits, so it can be edited.
  const shortRoom = Math.max(SHORT_MAX, String(lamp?.short || '').length)
  const miss = missOut || hang.miss

  const schedule = schedulePick(hang.draft)
  const previewMeta = [
    hang.draft.cadence === 'every_n' && !Number(hang.draft.everyN) ? '' : cadenceLine(hang.draft),
    hang.draft.askAfter ? clockWords(hang.draft.askAfter) : '',
  ]
    .filter(Boolean)
    .join(' · ')
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
      {/* head: the Did I / Did we / Did you switch, given the question so far. */}
      {head ? head(hang.draft.question) : <p className="di-hang-kicker">{hang.editing ? t('hang.edit') : t('hang.new')}</p>}
      <div className="di-hang-preview" aria-hidden="true">
        <p className="di-face-plate">{String(hang.tagTitle || '').trim() || book?.title || ''}</p>
        <p className="di-hang-preview-q">{didQuestion(hang.draft.question) || t('hang.questionPh')}</p>
        {previewMeta ? <p className="di-hang-preview-meta">{previewMeta}</p> : null}
      </div>
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
      <p className="di-set-cap">{t('hang.secSchedule')}</p>
      <div className="di-hang-group">
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
      {!deadline && hang.draft.cadence === 'every' ? (
        <label className="di-field">
          <span>{t('hang.everyDays')}</span>
          <input
            className="di-hang-input"
            inputMode="numeric"
            value={hang.draft.everyDays}
            onChange={(event) => hang.change('everyDays', event.target.value.replace(/\D/g, ''))}
            placeholder="7"
            maxLength={3}
          />
          <small className="di-field-hint">{t('hang.everyHint')}</small>
        </label>
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
        <span id="di-hang-after">{t('hang.timeRow')}</span>
        <HangTimeSelect
          ariaLabel={t('hang.timeRow')}
          value={hang.draft.askAfter}
          onChange={hang.changeAskAfter}
        />
        <small className="di-field-hint">{hang.draft.askAfter ? t('hang.timeHint') : t('hang.anyTimeHint')}</small>
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
        </div>
      </div>
      </div>

      <p className="di-set-cap">{t('hang.secOrganize')}</p>
      <div className="di-hang-group">
      {onTagTitle ? (
        <div className="di-field di-field-tag">
          <span id="di-hang-tag">{t('hang.tag')}</span>
          <p className="di-hang-tags-one">{t('hang.tagOne')}</p>
          <p className="di-hang-tags-one">{t('hang.folderVsTopic')}</p>
          <div className="di-hang-tags" role="radiogroup" aria-labelledby="di-hang-tag">
            {hang.liveTags.map((item) => {
              const on = hang.isTagSelected(item.title)
              return (
                <button
                  key={item.id}
                  className={on ? 'di-key is-pick' : 'di-key'}
                  type="button"
                  role="radio"
                  aria-checked={on}
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
              role="radiogroup"
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
                    role="radio"
                    aria-checked={on}
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
      <button
        className={hang.more ? 'di-key is-pick di-hang-more' : 'di-key di-hang-more'}
        type="button"
        aria-expanded={hang.more}
        onClick={() => hang.setMore((open) => !open)}
      >
        {hang.more ? t('hang.less') : t('hang.details')}
      </button>
      {hang.more ? (
        <>
          <label className="di-field">
            <span>{t('hang.short')}</span>
            <input
              className="di-hang-input"
              value={hang.draft.short}
              onChange={(event) => hang.change('short', event.target.value)}
              placeholder={t('hang.shortPh')}
              maxLength={shortRoom}
            />
          </label>
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
          <div className="di-field">
            <div className="di-hang-chips">
              <button
                className={hang.draft.trackAmount ? 'di-key is-pick' : 'di-key'}
                type="button"
                aria-pressed={Boolean(hang.draft.trackAmount)}
                onClick={() => hang.change('trackAmount', !hang.draft.trackAmount)}
              >
                {t('hang.trackAmount')}
              </button>
            </div>
            <small className="di-field-hint">{t('hang.trackAmountSub')}</small>
          </div>
          {hang.draft.trackAmount ? (
            <label className="di-field">
              <span>{t('hang.amountUnit')}</span>
              <input
                className="di-hang-input"
                value={hang.draft.amountUnit || ''}
                onChange={(event) => hang.change('amountUnit', event.target.value)}
                placeholder={t('hang.amountUnitPh')}
                maxLength={UNIT_MAX}
              />
            </label>
          ) : null}
        </>
      ) : null}
      </div>
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
      {lamp && onPause ? (
        <LampManage
          lamp={{ ...lamp, archived: Boolean(hang.draft.archived) }}
          onArchive={() => {
            // Pause now, and keep the unsaved draft in step so Save does not undo it.
            onPause()
            hang.change('archived', !hang.draft.archived)
          }}
          onRemove={onRemove}
        />
      ) : null}
    </form>
  )
}
