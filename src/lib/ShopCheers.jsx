import { useState } from 'react'
import { BoardShell } from './BoardShell.jsx'
import { CheerChip } from './Cosmetic.jsx'
import { buyCheerStageWithCoins, buyWithGems } from './coin-shop.js'
import {
  CHEERS,
  CHEER_GEMS,
  CHEER_STAGE_COIN,
  CHEER_STAGE_COINS,
  buyCheerStage,
  cheerStageOf,
  cheerText,
  fireCheer,
  nextCheerStage,
  normalizePurse,
} from './purse.js'
import { activeLook } from './active-look.js'
import { goHash } from '../site/hash.js'
import { BuyConfirm, NO_MISS, ShopPurse, coinLine, gemLine, gateConfirm, shopMiss, shortGemConfirm, signInConfirm } from './shop-bits.jsx'
import { accountSessionOn } from './session-id.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function ShopCheers({ book, onChange, now }) {
  usePrefs()
  const clock = now || new Date()
  const purse = normalizePurse(book)
  const coat = activeLook(book)
  const [miss, setMiss] = useState(NO_MISS)
  const [confirm, setConfirm] = useState(null)

  function take(next, id) {
    const gate = gateConfirm(next)
    if (gate) {
      setMiss(NO_MISS)
      setConfirm(gate)
      return
    }
    setMiss({ id, text: shopMiss(next) })
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
        <p className="di-set-note">{t('shop.cheerHint', { cheer: CHEER_GEMS, stage: CHEER_STAGE_COIN })}</p>

        <div className="di-set-card di-shop-card">
          {CHEERS.map((item) => {
            const have = purse.cheers.includes(item.id)
            const stage = cheerStageOf(book, item.id)
            const next = have ? nextCheerStage(stage) : 0
            const stageCost = next ? CHEER_STAGE_COINS[next] : 0
            return (
              <div className="di-shop-row" key={item.id}>
                <button
                  className="di-preview"
                  type="button"
                  aria-label={t('shop.see', { name: t(cheerText(item.id, 'name')) })}
                  onClick={() =>
                    fireCheer(item.id, 1, coat, undefined, true)
                  }
                >
                  <CheerChip id={item.id} stage={have ? stage : 1} />
                </button>
                <span className="di-shop-copy">
                  <strong>{t(cheerText(item.id, 'name'))}</strong>
                  {miss.id === item.id && miss.text ? (
                    <em className="di-shop-miss" role="alert">
                      {miss.text}
                    </em>
                  ) : null}
                </span>
                {have ? (
                  next ? (
                    <button
                      className="di-key"
                      type="button"
                      onClick={() => {
                        setMiss(NO_MISS)
                        setConfirm({
                          title: t(cheerText(item.id, 'name')),
                          body: t('shop.buyStageBody', { n: next, cost: coinLine(stageCost) }),
                          go: async () => take(await buyCheerStageWithCoins(book, item.id), item.id),
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
                      if (!accountSessionOn()) {
                        setConfirm(signInConfirm())
                        return
                      }
                      if (purse.gems < item.gems) {
                        setConfirm(shortGemConfirm())
                        return
                      }
                      setMiss(NO_MISS)
                      setConfirm({
                        title: t(cheerText(item.id, 'name')),
                        body: t('shop.buyCheerBody', { cost: gemLine(item.gems) }),
                        go: async () => take(await buyWithGems(book, 'cheer', item.id), item.id),
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

      </section>
      <BuyConfirm
        confirm={confirm}
        onClose={() => setConfirm(null)}
        onGo={() => {
          if (confirm?.short) {
            setConfirm(null)
            goHash(confirm.to || '/gems')
            return
          }
          const go = confirm?.go
          setConfirm(null)
          if (typeof go === 'function') go()
        }}
      />
    </BoardShell>
  )
}
