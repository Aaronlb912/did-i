import { useMemo } from 'react'
import { NightStrip } from './NightStrip.jsx'
import { LampManage } from './LampManage.jsx'
import { cadenceLine, lampBuzzes, lampNotifyOn, lampPriority } from './board-json.js'
import { clockWords } from './hall-pages.js'
import { t } from './i18n.js'
import { amountAverageLine, amountWords, lampAmounts, lampRecord, lastDidTimes } from './lamp-record.js'
import { pillStatusLabel } from './pill-status.js'
import { usePrefs } from './prefs.js'
import { formatBoardDate, isEvery, recentPeriodKeys } from './recurrence.js'
import { gapLine, lastTimeLine, sinceBadge } from './every-copy.js'
import { SetCap, SetCard, SetRow } from './set-bits.jsx'

function reminderLine(lamp) {
  if (!lampNotifyOn(lamp)) return t('hang.remindOff')
  if (!lampBuzzes(lamp)) return t('hang.remindQuiet')
  if (lamp.askAfter) return t('hang.remindAt', { time: clockWords(lamp.askAfter) })
  return t('hang.remindAny')
}

export function LampDetail({ book, lamp, dateIso, onClose, onEdit, onDuplicate, onArchive, onRemove }) {
  const gentle = usePrefs().gentle === true
  // A paused question keeps its recent nights on show.
  const keys = useMemo(
    () => (lamp ? recentPeriodKeys({ ...lamp, archived: false }, dateIso, 7) : []),
    [lamp, dateIso],
  )
  const record = useMemo(() => lampRecord(book, lamp, dateIso, 30), [book, lamp, dateIso])
  const lastFive = useMemo(() => lastDidTimes(book, lamp, 5), [book, lamp])
  const amounts = useMemo(() => lampAmounts(book, lamp, dateIso, 14, 30), [book, lamp, dateIso])
  if (!lamp) return null
  const status = lamp.archived
    ? t('lamp.pausedLine')
    : record.due
      ? t('lamp.tonightIs', { status: pillStatusLabel(record.tonight) })
      : t('lamp.notTonight')
  const extras = [lamp.kind, lamp.notes].map((item) => String(item || '').trim()).filter(Boolean)
  const edit = () => onEdit(lamp)

  return (
    <section className="di-detail di-plate-hand">
      <p className="di-hang-kicker">{t('lamp.kicker')}</p>
      <div className={lamp.archived ? 'di-hang-preview is-paused' : 'di-hang-preview'}>
        <p className="di-face-plate">{book.title}</p>
        <h2 className="di-hang-preview-q">{lamp.question}</h2>
        <p className="di-hang-preview-meta">{status}</p>
        <NightStrip book={book} lamp={lamp} keys={keys} />
      </div>

      {isEvery(lamp) ? (
        <div className="di-lamp-tiles">
          <div className="di-lamp-tile">
            <strong className="is-on">{sinceBadge(book, lamp, dateIso, false) || '-'}</strong>
            <span>{lastTimeLine(book, lamp, dateIso, true)}</span>
          </div>
          <div className="di-lamp-tile">
            <span>{gapLine(book, lamp, dateIso)}</span>
          </div>
        </div>
      ) : (
        <div className={gentle ? 'di-lamp-tiles is-one' : 'di-lamp-tiles'}>
          {gentle ? null : (
            <div className="di-lamp-tile">
              <strong className="is-on">{record.streak}</strong>
              <span>{t('lamp.streakCap')}</span>
            </div>
          )}
          <div className="di-lamp-tile">
            <strong>
              {record.did}
              <em> / {record.asked}</em>
            </strong>
            <span>{t('lamp.didCap', { n: 30 })}</span>
          </div>
        </div>
      )}

      <div className="di-hang-actions">
        <button className="di-did di-did-small" type="button" onClick={edit}>
          {t('lamp.edit')}
        </button>
        <button className="di-key" type="button" onClick={() => onDuplicate(lamp)}>
          {t('lamp.copy')}
        </button>
        <button className="di-key" type="button" onClick={onClose}>
          {t('nav.back')}
        </button>
      </div>

      {lamp.trackAmount ? (
        <>
          <SetCap>{t('amounts.title')}</SetCap>
          <div className="di-amounts">
            {amounts.count ? (
              <>
                <p className="di-amounts-avg">{amountAverageLine(amounts.average, lamp.amountUnit)}</p>
                <div className="di-amounts-bars" role="list" aria-label={t('amounts.cap')}>
                  {amounts.bars.map((bar) => (
                    <span
                      key={bar.night}
                      role="listitem"
                      className="di-amounts-bar"
                      title={
                        bar.amount === null
                          ? t('amounts.barNone', { date: formatBoardDate(bar.night) })
                          : t('amounts.bar', { date: formatBoardDate(bar.night), amount: amountWords(bar.amount, lamp.amountUnit) })
                      }
                    >
                      {bar.amount ? (
                        <i style={{ height: `${Math.max(4, Math.round((bar.amount / amounts.max) * 100))}%` }} />
                      ) : null}
                    </span>
                  ))}
                </div>
                <p className="di-amounts-cap">{t('amounts.cap')}</p>
              </>
            ) : (
              <p className="di-amounts-cap">{t('amounts.empty')}</p>
            )}
          </div>
        </>
      ) : null}

      <SetCap>{t('lamp.lastFive')}</SetCap>
      <SetCard>
        {lastFive.length ? (
          lastFive.map((row) => (
            <SetRow
              key={row.periodKey}
              label={row.night ? formatBoardDate(row.night) : row.periodKey}
              sub={row.note}
              value={amountWords(row.amount, lamp.amountUnit)}
            />
          ))
        ) : (
          <SetRow label={t('lamp.lastFiveEmpty')} />
        )}
      </SetCard>

      <SetCap>{t('hang.secSchedule')}</SetCap>
      <SetCard>
        <SetRow label={t('hang.when')} value={cadenceLine(lamp)} chevron onClick={edit} />
        <SetRow
          label={t('hang.timeRow')}
          value={lamp.askAfter ? clockWords(lamp.askAfter) : t('hang.askAny')}
          chevron
          onClick={edit}
        />
        <SetRow label={t('hang.reminder')} sub={reminderLine(lamp)} />
      </SetCard>

      <SetCap>{t('hang.secOrganize')}</SetCap>
      <SetCard>
        <SetRow label={t('hang.tag')} value={book.title} chevron onClick={edit} />
        <SetRow label={t('hang.priority')} value={t(`hang.priority.${lampPriority(lamp)}`)} chevron onClick={edit} />
        <SetRow
          label={t('hang.details')}
          sub={extras.join(' · ')}
          value={extras.length ? '' : t('hang.detailsNone')}
          chevron
          onClick={edit}
        />
      </SetCard>

      <LampManage lamp={lamp} onArchive={() => onArchive(lamp)} onRemove={() => onRemove(lamp)} />
    </section>
  )
}
