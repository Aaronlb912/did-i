import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { useBackDismiss } from '../site/nav.js'
import { BoardShell } from './BoardShell.jsx'
import { LampDetail } from './LampDetail.jsx'
import { LampDeleteConfirm } from './LampManage.jsx'
import { commitBook } from './achievements.js'
import { takeDown, toggleArchive } from './board-ops.js'
import { findBookHoldingLamp } from './board-shelf.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function LampPage({ book, boards = [], onChange, now, lampId }) {
  usePrefs()
  const clock = now || new Date()
  const shelf = boards.length ? boards : [book]
  const lampBook = findBookHoldingLamp(shelf, lampId) || book
  const dateIso = boardDate(clock, lampBook.dayFoldHour)
  const lamp = (lampBook.lamps || []).find((item) => item.id === lampId) || null
  const [confirmGone, setConfirmGone] = useState(false)

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

  if (confirmGone) {
    return (
      <BoardShell book={lampBook} now={clock} title={lampBook.title} date={formatBoardDate(dateIso)}>
        <LampDeleteConfirm
          book={lampBook}
          lamp={lamp}
          onDelete={() => {
            change(takeDown(lampBook, lamp))
            goHash('/lamps')
          }}
          onKeep={() => setConfirmGone(false)}
        />
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
      />
    </BoardShell>
  )
}
