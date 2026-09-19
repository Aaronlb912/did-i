import { NightStrip } from './NightStrip.jsx'
import { answerFor } from './recurrence.js'

export function LampFace({ row, onYes, onSkip, book, tag, keys, onPickHole }) {
  if (!row) return null
  const { lamp } = row
  const hasHistory = (keys || []).some((key) => answerFor(book, lamp.id, key))
  return (
    <section className="di-face" aria-labelledby="di-question">
      <p className="di-face-plate">{tag || 'Tonight'}</p>
      <h2 id="di-question" className="di-question">
        {lamp.question}
      </h2>
      <div className="di-switch">
        <button className="di-did" type="button" onClick={onYes}>
          DID
        </button>
        <button className="di-tape" type="button" onClick={onSkip}>
          nope
        </button>
      </div>
      {hasHistory ? (
        <NightStrip
          book={book}
          lamp={lamp}
          keys={keys}
          onPickHole={onPickHole ? (item, key) => onPickHole(item, key, row) : undefined}
        />
      ) : null}
    </section>
  )
}
