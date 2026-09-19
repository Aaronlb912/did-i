import { useState } from 'react'
import { SiteNav } from './SiteNav.jsx'

export function NameBoard({
  currentTitle,
  hasBoard,
  onOpenHere,
  onOpenSample,
  onStartEmpty,
}) {
  const [name, setName] = useState(
    currentTitle && currentTitle !== 'My hall' && currentTitle !== 'My board' ? currentTitle : '',
  )
  const [miss, setMiss] = useState('')

  function empty() {
    const title = name.trim()
    if (!title) {
      setMiss('This needs a name.')
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
          <h1 className="di-question">Name this phone.</h1>
          <p>
            Your questions stay on this computer. There is no email and no
            password. Try a demo if you want to tap around without writing
            questions first.
          </p>
          <label className="di-field">
            <span>Tag name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Home"
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
              Try a demo
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
