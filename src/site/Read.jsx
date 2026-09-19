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
            Home is the front. It tells you what is left tonight.
            Tonight is the tap. One question. DID or nope. Finish tonight and
            the streak goes up. Come back tomorrow.
          </p>
          <p>
            A question can wait until a clock time. Coming up shows the next
            nights so a waiting question is not a blank screen. Last time is
            last night, or the last due day, if you missed it. Late still
            counts.
          </p>
          <p>
            Add a question from Questions, or start from What to ask. It can be
            every day, some weekdays, monthly, every few days, or once. The day
            folds at the hour in Settings, so a 1am tap still belongs to last
            night if the fold is 4.
          </p>
          <p>
            This phone keeps your questions. There is no email. Settings has a copy
            of the file, an optional number lock, and reminders. Chrome and
            Android can ping at the ask-after hour. An iPhone can install the
            page. Pings there are weak until a Mac builds the native app.
          </p>
          <p>
            y or space is DID. s is nope. n adds a question. Escape closes a
            plate. u undoes the last tap for a few seconds.
          </p>
          <p>
            <a className="di-skip" href="#/">
              Open the home screen
            </a>
            {' · '}
            <a className="di-skip" href="#/help">
              Help in the app
            </a>
          </p>
        </article>
      </main>
    </div>
  )
}
