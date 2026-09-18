import { SiteNav } from './SiteNav.jsx'

export function Read() {
  return (
    <div className="di-site">
      <SiteNav path="/read" />
      <main className="di-door">
        <article className="di-door-plate di-read">
          <p className="di-face-plate">How</p>
          <h1 className="di-question">How to use it.</h1>
          <p>
            The big plate is the thing you have not answered yet. Hit DID if you
            did it. Hit skip if tonight is not that night. Skip does not smash
            the chain.
          </p>
          <p>
            Small lamps on the edge are the rest of tonight. A waiting lamp is
            dim until its time. Last time is last night, or the last due day,
            if you missed it. Late still counts.
          </p>
          <p>
            Hang a lamp for a new question. It can be every day, some weekdays,
            monthly, every few days, or once. The day folds at 4 in the morning,
            so a 1am tap still belongs to last night.
          </p>
          <p>
            Tray has JSON if you want a copy. Print tonight makes a fridge slip
            of what is still unanswered. Quiet mode hides the little enamel
            marks. Ask at lamp time is in the tray. Chrome and Android can ping
            at the ask-after hour if this hall was opened today. An iPhone can
            install the page. Pings there are weak.
          </p>
          <p>
            y or space is DID. s is skip. n hangs a lamp. Escape closes a plate.
            u undoes the last tap for a few seconds.
          </p>
          <p>
            <a className="di-skip" href="#/">
              Open the hall
            </a>
          </p>
        </article>
      </main>
    </div>
  )
}
