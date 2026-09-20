import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { CheerChip, LookChip } from './Cosmetic.jsx'
import {
  CHEERS,
  CHEER_STAGE_MAX,
  LOOKS,
  buyCheer,
  cheerText,
  lookText,
  buyLook,
  cheerPlayOf,
  cheerStageOf,
  fireCheer,
  normalizePurse,
  wearCheerStage,
} from './purse.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { activeLook } from './dit-board.js'
import { boardDate, formatBoardDate } from './recurrence.js'

const STAGES = [1, 2, 3, 4, 5]

export function Collection({ book, onChange, now }) {
  usePrefs()
  const clock = now || new Date()
  const purse = normalizePurse(book)
  const coat = activeLook(book)
  const looks = LOOKS.filter((item) => purse.looks.includes(item.id))
  const cheers = CHEERS.filter((item) => purse.cheers.includes(item.id))

  function wearLook(id) {
    onChange(buyLook(book, id).book)
  }

  function wearCheer(id) {
    onChange(buyCheer(book, id).book)
  }

  function pickStage(id, n) {
    const next = wearCheerStage(book, id, n)
    if (!next.miss) {
      fireCheer(id, n, coat)
      onChange(next.book)
    }
  }

  return (
    <BoardShell
      book={book}
      now={clock}
      title={t('kit.title')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-kit di-set">
        <h2 className="di-page-title">{t('kit.title')}</h2>
        <p className="di-set-note">{t('kit.hint')}</p>

        <p className="di-set-cap">{t('shop.looks')}</p>
        <div className="di-set-card di-shop-card">
          {looks.map((item) => {
            const on = purse.lookOn === item.id
            return (
              <div className="di-shop-row" key={item.id}>
                <LookChip id={item.id} />
                <span className="di-shop-copy">
                  <strong>{t(lookText(item.id, 'name'))}</strong>
                  <em>{t(lookText(item.id, 'line'))}</em>
                </span>
                <button
                  className={on ? 'di-did di-did-small' : 'di-key'}
                  type="button"
                  disabled={on}
                  onClick={() => wearLook(item.id)}
                >
                  {on ? t('shop.on') : t('shop.use')}
                </button>
              </div>
            )
          })}
        </div>

        <p className="di-set-cap">{t('shop.cheers')}</p>
        <div className="di-set-card di-shop-card">
          {cheers.map((item) => {
            const on = purse.cheerOn === item.id
            const owned = cheerStageOf(book, item.id)
            const play = cheerPlayOf(book, item.id)
            return (
              <div className="di-shop-row di-cheer-pick" key={item.id}>
                <button
                  className="di-preview"
                  type="button"
                  aria-label={t('shop.see', { name: t(cheerText(item.id, 'name')) })}
                  onClick={() => fireCheer(item.id, play, coat)}
                >
                  <CheerChip id={item.id} stage={play} />
                </button>
                <span className="di-shop-copy">
                  <strong>{t(cheerText(item.id, 'name'))}</strong>
                  <em>
                    {t('shop.cheerStageLine', {
                      n: play,
                      max: CHEER_STAGE_MAX,
                      line: t(cheerText(item.id, 'line')),
                    })}
                  </em>
                </span>
                <button
                  className={on ? 'di-did di-did-small' : 'di-key'}
                  type="button"
                  disabled={on}
                  onClick={() => wearCheer(item.id)}
                >
                  {on ? t('shop.on') : t('shop.use')}
                </button>
                <div className="di-stage-picks" role="group" aria-label={t('kit.stages')}>
                  {STAGES.map((n) => {
                    const have = n <= owned
                    const using = on && play === n
                    return (
                      <button
                        key={n}
                        className={using ? 'di-stage-use is-on' : 'di-stage-use'}
                        type="button"
                        disabled={!have}
                        aria-pressed={using}
                        aria-label={have ? t('kit.useStage', { n }) : t('kit.stageLocked', { n })}
                        onClick={() => pickStage(item.id, n)}
                      >
                        {n}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/shop')}>
            {t('shop.title')}
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
