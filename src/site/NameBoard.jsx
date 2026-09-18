import { useState } from 'react'
import { SiteNav } from './SiteNav.jsx'

export function NameBoard({
  currentTitle,
  hasBoard,
  onOpenHere,
  onOpenSample,
  onStartEmpty,
}) {
  const [name, setName] = useState(currentTitle && currentTitle !== 'My hall' ? currentTitle : '')
  const [miss, setMiss] = useState('')

  function empty() {
    const title = name.trim()
    if (!title) {
      setMiss('The board needs a name.')
      return
    }
    setMiss('')
    onStartEmpty(title)
  }

  return (
    <div className="di-site">
      <SiteNav path="/name" />
      <main className="di-door">
        <section className="di-door-plate">
          <p className="di-face-plate">This browser</p>
          <h1 className="di-question">Name the board.</h1>
          <p>
            The hall stays on this computer. There is no email and no password.
            Hayes Street is a made-up apartment you can open to see how it
            feels.
          </p>
          <label className="di-field">
            <span>Board name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Hayes Street"
            />
          </label>
          {miss ? (
            <p className="di-miss" role="alert">
              {miss}
            </p>
          ) : null}
          <p className="di-door-actions">
            {hasBoard ? (
              <button className="di-did di-did-small" type="button" onClick={onOpenHere}>
                Open {currentTitle}
              </button>
            ) : null}
            <button className="di-did di-did-small" type="button" onClick={onOpenSample}>
              Hayes Street sample
            </button>
            <button className="di-skip" type="button" onClick={empty}>
              Start empty
            </button>
          </p>
        </section>
      </main>
    </div>
  )
}
