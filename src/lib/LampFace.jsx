import { shortLabel } from './board-json.js'

export function LampFace({ row, onYes, onSkip }) {
  if (!row) return null
  const { lamp } = row
  return (
    <section className="di-face" aria-labelledby="di-question">
      <p className="di-face-plate">Tonight</p>
      <h2 id="di-question" className="di-question">
        {lamp.question}
      </h2>
      <p className="di-face-short">{shortLabel(lamp)}</p>
      <div className="di-rockers">
        <button className="di-did" type="button" onClick={onYes}>
          DID
        </button>
        <button className="di-skip" type="button" onClick={onSkip}>
          skip
        </button>
      </div>
    </section>
  )
}
