import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { HangLamp } from './HangLamp.jsx'
import { BoardShell } from './BoardShell.jsx'
import { duplicateLamp, emptyBoard } from './board-json.js'
import { hangInto, commitBook } from './board-ops.js'
import { findBookByTitle, findBookHoldingLamp } from './board-shelf.js'
import { t } from './i18n.js'
import { boardDate, formatBoardDate } from './recurrence.js'

function bookForTag(boards, book, name) {
  const title = name.trim() || book.title
  const hit = findBookByTitle(boards, title)
  if (hit) return hit
  return { ...emptyBoard(), title, keeperName: book.keeperName }
}

export function HangPage({ book, boards = [], onChange, onSaveTo, now, lampId, copyId, start }) {
  const clock = now || new Date()
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
    else goHash(wasEmpty ? '/tonight' : '/')
  }

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <HangLamp
        now={clock}
        lamp={existing}
        seed={copySource ? duplicateLamp(copySource, clock) : null}
        start={start}
        miss={miss}
        boards={boards}
        tagTitle={tagTitle}
        onTagTitle={setTagTitle}
        onSave={save}
        onCancel={() => {
          if (existing) goHash('/lamp', { id: existing.id })
          else if (copySource) goHash('/lamp', { id: copySource.id })
          else goHash('/')
        }}
      />
    </BoardShell>
  )
}
