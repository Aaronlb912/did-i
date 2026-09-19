import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { CheerChip, LookChip, StageChip } from './Cosmetic.jsx'
import {
  CHEERS,
  CHEER_STAGE_GEMS,
  CHEER_STAGE_MAX,
  CHEER_STAGE_USES,
  LOOKS,
  buyCheer,
  buyCheerStage,
  buyLook,
  fireCheer,
  nextCheerStage,
  normalizePurse,
} from './purse.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function Shop({ book, onChange, now }) {
  usePrefs()
  const clock = now || new Date()
  const purse = normalizePurse(book)
  const [miss, setMiss] = useState('')
  const [peekLook, setPeekLook] = useState('')
  const nextStage = nextCheerStage(purse.cheerStage)
  const tapsLeft = nextStage ? Math.max(0, CHEER_STAGE_USES[nextStage] - purse.cheerUses) : 0
  const stageCost = nextStage ? CHEER_STAGE_GEMS[nextStage] : 0

  function take(next) {
    setMiss(next.miss)
    if (!next.miss) {
      setPeekLook('')
      onChange(next.book)
    }
  }

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
      look={peekLook || undefined}
    >
      <section className="di-page di-shop">
        <p className="di-face-plate">Shop</p>
        <h2 className="di-page-title">Spend what you earned</h2>
        <p className="di-detail-meta">
          {purse.coins} {purse.coins === 1 ? 'coin' : 'coins'}. {purse.gems}{' '}
          {purse.gems === 1 ? 'gem' : 'gems'}. Tap a chip to see it. Looks use
          coins. Cheers and firework stages use gems. No real money.
        </p>

        <div className="di-home-block">
          <p className="di-slot-label">Looks</p>
          <p className="di-detail-meta">{t('shop.lookHint')}</p>
          <ul className="di-shop-list">
            {LOOKS.map((item) => {
              const have = purse.looks.includes(item.id)
              const on = purse.lookOn === item.id
              return (
                <li key={item.id}>
                  <button
                    className={peekLook === item.id ? 'di-preview is-on' : 'di-preview'}
                    type="button"
                    aria-label={`See ${item.name}`}
                    onClick={() => setPeekLook(item.id)}
                  >
                    <LookChip id={item.id} />
                  </button>
                  <span>
                    <strong>{item.name}</strong>
                    <em>{have ? item.line : `${item.coins} ${item.coins === 1 ? 'coin' : 'coins'}`}</em>
                  </span>
                  <button
                    className={on ? 'di-did di-did-small' : 'di-key'}
                    type="button"
                    onClick={() => take(buyLook(book, item.id))}
                  >
                    {on ? 'On' : have ? 'Use' : 'Buy'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="di-home-block">
          <p className="di-slot-label">Fireworks</p>
          <p className="di-detail-meta">
            Stage {purse.cheerStage} of {CHEER_STAGE_MAX}.{' '}
            {purse.cheerStage === 1 ? 'One burst' : `${purse.cheerStage} bursts`} when
            you hit DID.
            {nextStage
              ? ` ${tapsLeft} more ${tapsLeft === 1 ? 'DID' : 'DID taps'} to stage ${nextStage}, or ${stageCost} ${stageCost === 1 ? 'gem' : 'gems'}.`
              : ' That is the top.'}
          </p>
          <ul className="di-shop-list">
            <li>
              <button
                className="di-preview"
                type="button"
                aria-label={nextStage ? `See stage ${nextStage}` : 'See stage 5'}
                onClick={() => fireCheer(purse.cheerOn, nextStage || purse.cheerStage)}
              >
                <StageChip stage={nextStage || purse.cheerStage} />
              </button>
              <span>
                <strong>{nextStage ? `Stage ${nextStage}` : 'Stage 5'}</strong>
                <em>
                  {nextStage
                    ? `${nextStage} ${nextStage === 1 ? 'burst' : 'bursts'}. ${stageCost} ${stageCost === 1 ? 'gem' : 'gems'}.`
                    : 'Five bursts. You have this.'}
                </em>
              </span>
              {nextStage ? (
                <button
                  className="di-did di-did-small"
                  type="button"
                  onClick={() => take(buyCheerStage(book))}
                >
                  Buy
                </button>
              ) : (
                <button className="di-did di-did-small" type="button" disabled>
                  On
                </button>
              )}
            </li>
          </ul>
        </div>

        <div className="di-home-block">
          <p className="di-slot-label">Cheers</p>
          <p className="di-detail-meta">The look of the burst. Finish tonight for a gem.</p>
          <ul className="di-shop-list">
            {CHEERS.map((item) => {
              const have = purse.cheers.includes(item.id)
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
                    <em>{have ? item.line : `${item.gems} ${item.gems === 1 ? 'gem' : 'gems'}`}</em>
                  </span>
                  <button
                    className={on ? 'di-did di-did-small' : 'di-key'}
                    type="button"
                    onClick={() => take(buyCheer(book, item.id))}
                  >
                    {on ? 'On' : have ? 'Use' : 'Buy'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {miss ? (
          <p className="di-miss" role="alert">
            {miss}
          </p>
        ) : null}

        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/kit')}>
            Collection
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/')}>
            Home
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
