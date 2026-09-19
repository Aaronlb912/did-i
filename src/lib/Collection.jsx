import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { CheerChip, LookChip, StageChip } from './Cosmetic.jsx'
import { CHEERS, LOOKS, buyCheer, buyLook, fireCheer, normalizePurse } from './purse.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function Collection({ book, onChange, now }) {
  usePrefs()
  const clock = now || new Date()
  const purse = normalizePurse(book)
  const looks = LOOKS.filter((item) => purse.looks.includes(item.id))
  const cheers = CHEERS.filter((item) => purse.cheers.includes(item.id))

  function wearLook(id) {
    onChange(buyLook(book, id).book)
  }

  function wearCheer(id) {
    onChange(buyCheer(book, id).book)
  }

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-kit">
        <p className="di-face-plate">Collection</p>
        <h2 className="di-page-title">What you already bought</h2>
        <p className="di-detail-meta">
          {t('kit.hint')}
        </p>

        <div className="di-home-block">
          <p className="di-slot-label">Looks</p>
          <ul className="di-shop-list">
            {looks.map((item) => {
              const on = purse.lookOn === item.id
              return (
                <li key={item.id}>
                  <LookChip id={item.id} />
                  <span>
                    <strong>{item.name}</strong>
                    <em>{item.line}</em>
                  </span>
                  <button
                    className={on ? 'di-did di-did-small' : 'di-key'}
                    type="button"
                    onClick={() => wearLook(item.id)}
                  >
                    {on ? 'On' : 'Use'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="di-home-block">
          <p className="di-slot-label">Fireworks</p>
          <ul className="di-shop-list">
            <li>
              <StageChip stage={purse.cheerStage} />
              <span>
                <strong>Stage {purse.cheerStage}</strong>
                <em>
                  {purse.cheerStage === 1
                    ? 'One burst when you hit DID.'
                    : `${purse.cheerStage} bursts when you hit DID.`}
                </em>
              </span>
              <button
                className="di-key"
                type="button"
                onClick={() => fireCheer(purse.cheerOn, purse.cheerStage)}
              >
                Try
              </button>
            </li>
          </ul>
        </div>

        <div className="di-home-block">
          <p className="di-slot-label">Cheers</p>
          <ul className="di-shop-list">
            {cheers.map((item) => {
              const on = purse.cheerOn === item.id
              return (
                <li key={item.id}>
                  <button
                    className="di-preview"
                    type="button"
                    aria-label={`See ${item.name}`}
                    onClick={() => fireCheer(item.id, purse.cheerStage)}
                  >
                    <CheerChip id={item.id} />
                  </button>
                  <span>
                    <strong>{item.name}</strong>
                    <em>{item.line}</em>
                  </span>
                  <button
                    className={on ? 'di-did di-did-small' : 'di-key'}
                    type="button"
                    onClick={() => wearCheer(item.id)}
                  >
                    {on ? 'On' : 'Use'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/shop')}>
            Shop
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/')}>
            Home
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
