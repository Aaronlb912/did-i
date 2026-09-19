import { NightStrip } from './NightStrip.jsx'
import { cadenceLine, lampNotifyOn, lampPriority } from './board-json.js'
import { clockWords } from './hall-pages.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { recentPeriodKeys } from './recurrence.js'

export function LampDetail({
  book,
  lamp,
  dateIso,
  onClose,
  onEdit,
  onDuplicate,
  onArchive,
  onRemove,
  onMarkHole,
}) {
  usePrefs()
  if (!lamp) return null
  const keys = recentPeriodKeys(lamp, dateIso, 7)
  const priority = lampPriority(lamp)
  const meta = [
    t(`hang.kind.${lamp.kind}`) || t('hang.kind.other'),
    cadenceLine(lamp),
    priority !== 'normal' ? t(`hang.priority.${priority}`) : '',
    lampNotifyOn(lamp) ? '' : t('hang.notifyOff'),
    lamp.askAfter ? t('lamp.until', { time: clockWords(lamp.askAfter) }) : '',
    lamp.archived ? t('lamp.paused') : '',
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <section className="di-detail di-plate-hand">
      <p className="di-hang-kicker">{t('lamp.kicker')}</p>
      <h2 className="di-question di-detail-q">{lamp.question}</h2>
      <p className="di-detail-meta">{meta}</p>
      {lamp.notes ? <p className="di-detail-notes">{lamp.notes}</p> : null}
      <NightStrip book={book} lamp={lamp} keys={keys} onPickHole={onMarkHole} />
      <div className="di-hang-actions">
        <button className="di-did di-did-small" type="button" onClick={() => onEdit(lamp)}>
          {t('lamp.edit')}
        </button>
        <button className="di-key" type="button" onClick={onClose}>
          {t('lamp.done')}
        </button>
      </div>
      <div className="di-detail-more">
        <button className="di-text" type="button" onClick={() => onDuplicate(lamp)}>
          {t('lamp.copy')}
        </button>
        <button className="di-text" type="button" onClick={() => onArchive(lamp)}>
          {lamp.archived ? t('lamp.askAgain') : t('lamp.stop')}
        </button>
        <button className="di-text" type="button" onClick={() => onRemove(lamp)}>
          {t('lamp.delete')}
        </button>
      </div>
    </section>
  )
}
