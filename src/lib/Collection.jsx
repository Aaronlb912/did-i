import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { CheerChip, LookChip } from './Cosmetic.jsx'
import { CHEERS, LOOKS, buyCheer, buyLook, cheerStageOf, fireCheer, normalizePurse } from './purse.js'
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
                  <strong>{item.name}</strong>
                  <em>{item.line}</em>
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
            const stage = cheerStageOf(book, item.id)
            return (
              <div className="di-shop-row" key={item.id}>
                <button
                  className="di-preview"
                  type="button"
                  aria-label={t('shop.see', { name: item.name })}
                  onClick={() => fireCheer(item.id, stage)}
                >
                  <CheerChip id={item.id} stage={stage} />
                </button>
                <span className="di-shop-copy">
                  <strong>{item.name}</strong>
                  <em>{t('shop.cheerStageLine', { n: stage, max: 5, line: item.line })}</em>
                </span>
                <button
                  className={on ? 'di-did di-did-small' : 'di-key'}
                  type="button"
                  disabled={on}
                  onClick={() => wearCheer(item.id)}
                >
                  {on ? t('shop.on') : t('shop.use')}
                </button>
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
