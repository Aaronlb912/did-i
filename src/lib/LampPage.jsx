import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { useBackDismiss } from '../site/nav.js'
import { BoardShell } from './BoardShell.jsx'
import { LampDetail } from './LampDetail.jsx'
import { HolePlate } from './HolePlate.jsx'
import { commitBook } from './achievements.js'
import { putAnswer, takeDown, toggleArchive } from './board-ops.js'
import { findBookHoldingLamp } from './board-shelf.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { answerFor, boardDate, formatBoardDate, periodKeyFor } from './recurrence.js'

export function LampPage({ book, boards = [], onChange, now, lampId }) {
  usePrefs()
  const clock = now || new Date()
  const shelf = boards.length ? boards : [book]
  const lampBook = findBookHoldingLamp(shelf, lampId) || book
  const dateIso = boardDate(clock, lampBook.dayFoldHour)
  const lamp = (lampBook.lamps || []).find((item) => item.id === lampId) || null
  const [holePick, setHolePick] = useState(null)
  const [confirmGone, setConfirmGone] = useState(false)

  useBackDismiss(Boolean(holePick), () => setHolePick(null))
  useBackDismiss(confirmGone, () => setConfirmGone(false))

  function change(next) {
    onChange(commitBook(next, clock))
  }

  if (!lamp) {
    return (
      <BoardShell book={lampBook} now={clock} title={lampBook.title} date={formatBoardDate(dateIso)}>
        <section className="di-empty">
          <p className="di-face-plate">{t('lamp.missing')}</p>
          <h2 className="di-question">{t('lamp.gone')}</h2>
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/lamps')}>
            {t('nav.questions')}
          </button>
        </section>
      </BoardShell>
    )
  }

  if (holePick) {
    return (
      <BoardShell book={lampBook} now={clock} title={lampBook.title} date={formatBoardDate(dateIso)}>
        <HolePlate
          lamp={holePick.lamp}
          periodKey={holePick.periodKey}
          wasSkip={answerFor(lampBook, holePick.lamp.id, holePick.periodKey)?.status === 'skip'}
          onLate={() => {
            change(putAnswer(lampBook, holePick, 'late', clock))
            setHolePick(null)
          }}
          onSkip={
            answerFor(lampBook, holePick.lamp.id, holePick.periodKey)?.status === 'skip'
              ? undefined
              : () => {
                  change(putAnswer(lampBook, holePick, 'skip', clock))
                  setHolePick(null)
                }
          }
          onClose={() => setHolePick(null)}
        />
      </BoardShell>
    )
  }

  if (confirmGone) {
    const taps = (lampBook.answers || []).filter((item) => item.lampId === lamp.id).length
    return (
      <BoardShell book={lampBook} now={clock} title={lampBook.title} date={formatBoardDate(dateIso)}>
        <section className="di-face">
          <p className="di-face-plate">{t('lamp.delete')}</p>
          <h2 className="di-question">{t('lamp.deleteTitle')}</h2>
          <p className="di-detail-meta">
            {taps === 0
              ? t('lamp.deleteNone')
              : taps === 1
                ? t('lamp.deleteOne')
                : t('lamp.deleteSome', { n: taps })}
          </p>
          <div className="di-hang-actions">
            <button
              className="di-did di-did-small"
              type="button"
              onClick={() => {
                change(takeDown(lampBook, lamp))
                goHash('/lamps')
              }}
            >
              {t('lamp.delete')}
            </button>
            <button className="di-key" type="button" onClick={() => setConfirmGone(false)}>
              {t('lamp.keep')}
            </button>
          </div>
        </section>
      </BoardShell>
    )
  }

  return (
    <BoardShell book={lampBook} now={clock} title={lampBook.title} date={formatBoardDate(dateIso)}>
      <LampDetail
        book={lampBook}
        lamp={lamp}
        dateIso={dateIso}
        onClose={() => goHash('/lamps')}
        onEdit={(item) => goHash('/add', { id: item.id })}
        onDuplicate={(item) => goHash('/add', { copy: item.id })}
        onArchive={(item) => change(toggleArchive(lampBook, item))}
        onRemove={() => setConfirmGone(true)}
        stripNoPickKeys={[periodKeyFor(lamp, dateIso)]}
        onMarkHole={(item, periodKey) => setHolePick({ lamp: item, periodKey })}
      />
    </BoardShell>
  )
}
