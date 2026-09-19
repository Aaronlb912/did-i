import { SiteNav } from './SiteNav.jsx'

export function Door({ hasBoard, title, canInstall, onInstall }) {
  return (
    <div className="di-site">
      <SiteNav path="/door" />
      <main className="di-door">
        <section className="di-door-plate">
          <p className="di-face-plate">By the door</p>
          <h1 className="di-question">Did I lock the back door?</h1>
          <p>
            Did I is the unanswered question for tonight. One on the plate. Hit
            DID if you did it. Hit nope if tonight is not that night.
          </p>
          <p>
            Home says what is left. Tonight is where you tap DID or nope.
            Tags group questions. The cog is settings.
          </p>
          <p>
            No account. This browser keeps your questions. Hayes Street is a
            made-up apartment if you want a full set to try first.
          </p>
          <p className="di-door-actions">
            <a className="di-did di-did-small di-link-did" href="#/">
              {hasBoard ? `Open ${title}` : 'Open the home screen'}
            </a>
            <a className="di-skip" href="#/read">
              How to use it
            </a>
            <a className="di-skip" href="#/name">
              Name this phone
            </a>
            {canInstall && onInstall ? (
              <button className="di-skip" type="button" onClick={onInstall}>
                Install
              </button>
            ) : null}
          </p>
        </section>
      </main>
    </div>
  )
}
