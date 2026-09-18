import { SiteNav } from './SiteNav.jsx'

export function Into() {
  return (
    <div className="di-site">
      <SiteNav path="/into" />
      <main className="di-door">
        <article className="di-door-plate di-read">
          <p className="di-face-plate">Drop in</p>
          <h1 className="di-question">If you already run a React app.</h1>
          <p>Copy the src/lib folder into your src folder.</p>
          <pre className="di-pre">{`import { Tonight, sampleBoard, emptyBoard } from './lib'

<Tonight value={book} onChange={setBook} />`}</pre>
          <p>
            Tonight does not write localStorage. Persist in the host. Pass now
            if you need a frozen clock.
          </p>
          <p>
            <a className="di-skip" href="#/door">
              Back to the door
            </a>
          </p>
        </article>
      </main>
    </div>
  )
}
