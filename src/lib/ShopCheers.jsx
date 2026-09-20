import { useState } from 'react'
import { BoardShell } from './BoardShell.jsx'
import { CheerChip } from './Cosmetic.jsx'
import {
  CHEERS,
  CHEER_STAGE_GEMS,
  buyCheer,
  buyCheerStage,
  cheerPlayOf,
  cheerStageOf,
  cheerText,
  fireCheer,
  nextCheerStage,
  normalizePurse,
} from './purse.js'
import { activeLook } from './dit-board.js'
import { BuyConfirm, ShopPurse, gemLine, shopMiss } from './shop-bits.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function ShopCheers({ book, onChange, now }) {
  usePrefs()
  const clock = now || new Date()
  const purse = normalizePurse(book)
  const coat = activeLook(book)
  const [miss, setMiss] = useState('')
  const [confirm, setConfirm] = useState(null)

  function take(next) {
    setMiss(shopMiss(next))
    if (!next.miss) {
      setConfirm(null)
      onChange(next.book)
    }
  }

  return (
    <BoardShell book={book} now={clock} title={t('shop.cheers')} date={formatBoardDate(boardDate(clock, book.dayFoldHour))}>
      <section className="di-page di-shop di-set">
        <h2 className="di-page-title">{t('shop.cheers')}</h2>
        <ShopPurse purse={purse} />
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
                  aria-label={t('shop.see', { name: t(cheerText(item.id, 'name')) })}
                  onClick={() => fireCheer(item.id, have ? cheerPlayOf(book, item.id) : 1, coat)}
                >
                  <CheerChip id={item.id} stage={have ? stage : 1} />
                </button>
                <span className="di-shop-copy">
                  <strong>{t(cheerText(item.id, 'name'))}</strong>
                  <em>
                    {t(cheerText(item.id, 'line'))}
                    {' · '}
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
                      onClick={() => {
                        setMiss('')
                        setConfirm({
                          title: t(cheerText(item.id, 'name')),
                          body: t('shop.buyStageBody', { n: next, cost: gemLine(cost) }),
                          go: () => take(buyCheerStage(book, item.id)),
                        })
                      }}
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
                    onClick={() => {
                      setMiss('')
                      setConfirm({
                        title: t(cheerText(item.id, 'name')),
                        body: t('shop.buyCheerBody', { cost: gemLine(item.gems) }),
                        go: () => take(buyCheer(book, item.id)),
                      })
                    }}
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
      <BuyConfirm
        confirm={confirm}
        onClose={() => setConfirm(null)}
        onGo={() => {
          const go = confirm?.go
          setConfirm(null)
          if (typeof go === 'function') go()
        }}
      />
    </BoardShell>
  )
}
