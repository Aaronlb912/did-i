import { SiteNav } from './SiteNav.jsx'

export function Door({ hasBoard, title, canInstall, onInstall }) {
  return (
    <div className="di-site">
      <SiteNav path="/" />
      <main className="di-door">
        <section className="di-door-plate">
          <p className="di-face-plate">By the door</p>
          <h1 className="di-question">Did I lock the back door?</h1>
          <p>
            One question on the plate. Hit DID if you did it. Hit skip if tonight
            is not that night. The lamps on the edge are the rest of tonight.
          </p>
          <p>
            No account. This browser keeps the board. Hayes Street is the sample
            house if you want to try it first.
          </p>
          <p className="di-door-actions">
            <a className="di-did di-did-small di-link-did" href="#/tonight">
              {hasBoard ? `Open ${title}` : 'Open the hall'}
            </a>
            <a className="di-skip" href="#/name">
              Name this board
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
