import { shortLabel } from './board-json.js'
import { NightStrip } from './NightStrip.jsx'

export function LampFace({ row, onYes, onSkip, book, keys, onPickHole }) {
  if (!row) return null
  const { lamp } = row
  return (
    <section className="di-face" aria-labelledby="di-question">
      <p className="di-face-plate">Tonight</p>
      <h2 id="di-question" className="di-question">
        {lamp.question}
      </h2>
      <div className="di-switch">
        <button className="di-did" type="button" onClick={onYes}>
          DID
        </button>
        <button className="di-tape" type="button" onClick={onSkip}>
          skip
        </button>
      </div>
      {lamp.cadence === 'once' && (!keys || keys.length < 2) ? null : (
        <NightStrip book={book} lamp={lamp} keys={keys} onPickHole={onPickHole} />
      )}
    </section>
  )
}
