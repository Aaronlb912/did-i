import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { boardDate, formatBoardDate } from './recurrence.js'

const IDEAS = [
  {
    kind: 'Medicine',
    question: 'Did I take the evening pills?',
    start: 'Pills',
    body: 'The thing you cannot reconstruct from memory at 11.',
  },
  {
    kind: 'The house',
    question: 'Did I lock the back door?',
    start: 'Back door',
    body: 'A latch, a window, the stove. One question, not a checklist.',
  },
  {
    kind: 'The house',
    question: 'Did I put the keys on the hook?',
    start: 'Keys',
    body: 'Where the thing lives when you are done with it.',
  },
  {
    kind: 'The house',
    question: 'Did I put the bins out?',
    start: 'Bins',
    body: 'A weekly night. Nope if it is not that night.',
  },
  {
    kind: 'Money',
    question: 'Did I pay the water bill?',
    start: 'Water',
    body: 'A monthly ask. The date is yours.',
  },
  {
    kind: 'Something else',
    question: 'Did I charge the phone?',
    start: 'Charge',
    body: 'The boring thing that ruins tomorrow if it did not happen.',
  },
]

export function Ideas({ book, now }) {
  const clock = now || new Date()

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-ideas">
        <p className="di-face-plate">What to ask</p>
        <h2 className="di-page-title">What belongs here</h2>
        <p className="di-about-p">
          This is not a to-do list and not a calendar. Put the question you
          keep asking after the fact. Use one of these, or write your own
          sentence that starts with Did I.
        </p>
        <ul className="di-idea-list">
          {IDEAS.map((idea) => (
            <li key={idea.start}>
              <article className="di-idea">
                <p className="di-face-plate">{idea.kind}</p>
                <h3 className="di-question">{idea.question}</h3>
                <p className="di-detail-meta">{idea.body}</p>
                <button
                  className="di-key"
                  type="button"
                  onClick={() => goHash('/add', { start: idea.start })}
                >
                  Use this
                </button>
              </article>
            </li>
          ))}
        </ul>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/add')}>
            Write your own
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/help')}>
            Help
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
