import { useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { CheerChip, LookChip } from './Cosmetic.jsx'
import {
  CHEERS,
  CHEER_STAGE_GEMS,
  LOOKS,
  buyCheer,
  buyCheerStage,
  buyLook,
  cheerStageOf,
  cheerPlayOf,
  fireCheer,
  nextCheerStage,
  normalizePurse,
} from './purse.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { useReduceMotion } from './useReduceMotion.js'

function coinLine(n) {
  return n === 1 ? t('shop.coinOne') : t('shop.coins', { n })
}

function gemLine(n) {
  return n === 1 ? t('shop.gemOne') : t('shop.gems', { n })
}

export function Shop({ book, onChange, now }) {
  usePrefs()
  const still = useReduceMotion()
  const clock = now || new Date()
  const purse = normalizePurse(book)
  const [miss, setMiss] = useState('')
  const [peekLook, setPeekLook] = useState('')
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    if (!confirm) return undefined
    function onKey(event) {
      if (event.key === 'Escape') setConfirm(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirm])

  function take(next) {
    setMiss(next.miss)
    if (!next.miss) {
      setPeekLook('')
      setConfirm(null)
      onChange(next.book)
    }
  }

  function askBuy(plan) {
    setMiss('')
    setConfirm(plan)
  }

  return (
    <BoardShell
      book={book}
      now={clock}
      title={t('shop.title')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
      look={peekLook || undefined}
    >
      <section className="di-page di-shop di-set">
        <div className="di-shop-head">
          <h2 className="di-page-title">{t('shop.title')}</h2>
          <button className="di-key" type="button" onClick={() => goHash('/kit')}>
            {t('shop.kit')}
          </button>
        </div>
        <p className="di-shop-purse">
          {t('tonight.purse', { coins: purse.coins, gems: purse.gems })}
        </p>
        <p className="di-set-note">{t('shop.hint')}</p>

        <p className="di-set-cap">{t('shop.looks')}</p>
        <div className="di-set-card di-shop-card">
          {LOOKS.map((item) => {
            const have = purse.looks.includes(item.id)
            const on = purse.lookOn === item.id
            return (
              <div className="di-shop-row" key={item.id}>
                <button
                  className="di-preview"
                  type="button"
                  aria-label={t('shop.see', { name: item.name })}
                  onClick={() => setPeekLook(item.id)}
                >
                  <LookChip id={item.id} />
                </button>
                <span className="di-shop-copy">
                  <strong>{item.name}</strong>
                  <em>{have ? item.line : coinLine(item.coins)}</em>
                </span>
                <button
                  className={on ? 'di-did di-did-small' : 'di-key'}
                  type="button"
                  disabled={on}
                  onClick={() => {
                    if (have) {
                      take(buyLook(book, item.id))
                      return
                    }
                    askBuy({
                      title: item.name,
                      body: t('shop.buyLookBody', { cost: coinLine(item.coins) }),
                      go: () => take(buyLook(book, item.id)),
                    })
                  }}
                >
                  {on ? t('shop.on') : have ? t('shop.use') : t('shop.buy')}
                </button>
              </div>
            )
          })}
        </div>

        <p className="di-set-cap">{t('shop.cheers')}</p>
        <p className="di-set-note">{t('shop.cheerHint')}</p>
        <div className="di-set-card di-shop-card">
          {CHEERS.map((item) => {
            const have = purse.cheers.includes(item.id)
            const stage = cheerStageOf(book, item.id)
            const next = have ? nextCheerStage(stage) : 0
            const cost = next ? CHEER_STAGE_GEMS[next] : item.gems
            return (
              <div className="di-shop-row" key={item.id}>
                <button
                  className="di-preview"
                  type="button"
                  aria-label={t('shop.see', { name: item.name })}
                  onClick={() => fireCheer(item.id, have ? cheerPlayOf(book, item.id) : 1)}
                >
                  <CheerChip id={item.id} stage={have ? stage : 1} />
                </button>
                <span className="di-shop-copy">
                  <strong>{item.name}</strong>
                  <em>
                    {have
                      ? next
                        ? gemLine(cost)
                        : t('shop.owned')
                      : item.gems
                        ? gemLine(item.gems)
                        : t('shop.owned')}
                  </em>
                </span>
                {have ? (
                  next ? (
                    <button
                      className="di-key"
                      type="button"
                      onClick={() =>
                        askBuy({
                          title: item.name,
                          body: t('shop.buyStageBody', { n: next, cost: gemLine(cost) }),
                          go: () => take(buyCheerStage(book, item.id)),
                        })
                      }
                    >
                      {t('shop.nextStage')}
                    </button>
                  ) : (
                    <button className="di-key" type="button" disabled>
                      {t('shop.owned')}
                    </button>
                  )
                ) : (
                  <button
                    className="di-key"
                    type="button"
                    onClick={() =>
                      askBuy({
                        title: item.name,
                        body: t('shop.buyCheerBody', { cost: gemLine(item.gems) }),
                        go: () => take(buyCheer(book, item.id)),
                      })
                    }
                  >
                    {t('shop.buy')}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {miss ? (
          <p className="di-miss" role="alert">
            {miss}
          </p>
        ) : null}
      </section>
      {confirm ? (
        <div className="di-buy-veil" role="presentation" onClick={() => setConfirm(null)}>
          <div
            className={still ? 'di-buy-pop is-still' : 'di-buy-pop'}
            role="dialog"
            aria-modal="true"
            aria-labelledby="di-buy-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="di-face-plate">{t('shop.buyKicker')}</p>
            <h2 id="di-buy-title" className="di-buy-title">
              {confirm.title}
            </h2>
            <p className="di-detail-meta">{confirm.body}</p>
            <div className="di-hang-actions">
              <button
                className="di-did di-did-small"
                type="button"
                onClick={() => {
                  const go = confirm.go
                  setConfirm(null)
                  if (typeof go === 'function') go()
                }}
              >
                {t('shop.buy')}
              </button>
              <button className="di-key" type="button" onClick={() => setConfirm(null)}>
                {t('settings.neverMind')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </BoardShell>
  )
}
