import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { HangLamp } from './HangLamp.jsx'
import { LeadSwitch, wordsAfterLead } from './LeadSwitch.jsx'
import { useAccount } from './account.js'
import { soundsTogether } from './did-we.js'
import { t } from './i18n.js'
import { BoardShell } from './BoardShell.jsx'
import { duplicateLamp } from './board-json.js'
import { commitBook } from './achievements.js'
import { hangInto, takeDown, toggleArchive } from './board-ops.js'
import { LampDeleteConfirm } from './LampManage.jsx'
import { useBackDismiss } from '../site/nav.js'
import { findBookHoldingLamp } from './board-shelf.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { bookForTag } from './useHangDraft.js'

export function HangPage({ book, boards = [], onChange, onSaveTo, now, lampId, copyId, start }) {
  const clock = now || new Date()
  const account = useAccount()
  const sourceBook = findBookHoldingLamp(boards, lampId || copyId)
  const existing = sourceBook
    ? (sourceBook.lamps || []).find((lamp) => lamp.id === lampId) || null
    : null
  const copySource =
    copyId && !existing
      ? (sourceBook?.lamps || []).find((lamp) => lamp.id === copyId) || null
      : null
  const [miss, setMiss] = useState('')
  const [tagTitle, setTagTitle] = useState(sourceBook?.title || book.title)
  const [confirmGone, setConfirmGone] = useState(false)

  useBackDismiss(confirmGone, () => setConfirmGone(false))

  function save(lamp, problem) {
    if (problem || !lamp) {
      setMiss(problem || 'hang.unfinished')
      return
    }
    const target = bookForTag(boards, book, tagTitle)
    const wasEmpty = (target.lamps || []).filter((item) => !item.archived).length === 0
    if (onSaveTo) onSaveTo(target, lamp, sourceBook, clock)
    else onChange(commitBook(hangInto(target, lamp, Boolean(existing)), clock))
    if (existing) goHash('/lamp', { id: lamp.id })
    else goHash(wasEmpty ? '/tonight' : '/lamps')
  }

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      {confirmGone && existing && sourceBook ? (
        <LampDeleteConfirm
          book={sourceBook}
          lamp={existing}
          onDelete={() => {
            onChange(commitBook(takeDown(sourceBook, existing), clock))
            goHash('/lamps')
          }}
          onKeep={() => setConfirmGone(false)}
        />
      ) : null}
      {/* Hidden, not unmounted, so "Keep it" comes back to the unsaved draft. */}
      <div hidden={confirmGone}>
      <HangLamp
        onPause={existing && sourceBook ? () => onChange(commitBook(toggleArchive(sourceBook, existing), clock)) : undefined}
        onRemove={() => setConfirmGone(true)}
        book={book}
        now={clock}
        lamp={existing}
        seed={copySource ? duplicateLamp(copySource, clock) : null}
        start={start}
        miss={miss}
        boards={boards}
        tagTitle={tagTitle}
        onTagTitle={setTagTitle}
        head={
          existing || copySource
            ? undefined
            : (question) => (
                <>
                  <LeadSwitch mode="i" question={question} />
                  {account.user && soundsTogether(wordsAfterLead(question)) ? (
                    <button
                      className="di-key di-lead-we-hint"
                      type="button"
                      onClick={() => {
                        const words = wordsAfterLead(question)
                        goHash('/we/new', words ? { start: words } : {})
                      }}
                    >
                      {t('lead.makeWe')}
                    </button>
                  ) : null}
                </>
              )
        }
        onSave={save}
        onCancel={() => {
          if (existing) goHash('/lamp', { id: existing.id })
          else if (copySource) goHash('/lamp', { id: copySource.id })
          else goHash('/lamps')
        }}
      />
      </div>
    </BoardShell>
  )
}
