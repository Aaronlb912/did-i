import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { HangLamp } from './HangLamp.jsx'
import { BoardShell } from './BoardShell.jsx'
import { emptyBoard } from './board-json.js'
import { hangInto, commitBook } from './board-ops.js'
import { findBookByTitle, findBookHoldingLamp } from './board-shelf.js'
import { boardDate, formatBoardDate } from './recurrence.js'

function bookForTag(boards, book, name) {
  const title = name.trim() || book.title
  const hit = findBookByTitle(boards, title)
  if (hit) return hit
  return { ...emptyBoard(), title, keeperName: book.keeperName }
}

export function HangPage({ book, boards = [], onChange, onSaveTo, now, lampId, start }) {
  const clock = now || new Date()
  const sourceBook = findBookHoldingLamp(boards, lampId)
  const existing = sourceBook
    ? (sourceBook.lamps || []).find((lamp) => lamp.id === lampId) || null
    : null
  const [miss, setMiss] = useState('')
  const [tagTitle, setTagTitle] = useState(sourceBook?.title || book.title)

  function save(lamp, problem) {
    if (problem || !lamp) {
      setMiss(problem || 'The plate is unfinished.')
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
        start={start}
        miss={miss}
        boards={boards}
        tagTitle={tagTitle}
        onTagTitle={setTagTitle}
        onSave={save}
        onCancel={() => goHash('/')}
      />
    </BoardShell>
  )
}
