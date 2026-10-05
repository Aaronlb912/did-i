import { useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { isReactNative } from './env.js'
import { startGemPurchase } from './gem-buy.js'
import { initGemIap, iapReady, storePrice } from './gem-iap.js'
import { GEM_PACKS, packPriceLabel } from './gem-packs.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { GemIcon, PurseBits } from './PurseIcons.jsx'
import { normalizePurse } from './purse.js'
import { LegalLinks } from './LegalLinks.jsx'
import { boardDate, formatBoardDate } from './recurrence.js'

function gemLine(n) {
  return n === 1 ? t('shop.gemOne') : t('shop.gems', { n })
}

function gemMiss(code) {
  if (code === 'signin') return t('gems.needSignIn')
  if (code === 'app') return t('gems.appOnly')
  if (code === 'setup') return t('gems.setup')
  if (code === 'store') return t('gems.storeError')
  return t('gems.setup')
}

export function GemShop({ book, now }) {
  usePrefs()
  const clock = now || new Date()
  const purse = normalizePurse(book)
  const native = isReactNative()
  const signedIn = Boolean(useAccount().user)
  const [miss, setMiss] = useState('')
  const [note, setNote] = useState('')
  const [storeReady, setStoreReady] = useState(!native)

  useEffect(() => {
    if (!native) return undefined
    initGemIap().then(() => setStoreReady(iapReady()))
    return undefined
  }, [native])

  async function buy(packId) {
    setMiss('')
    setNote('')
    if (!native) {
      setMiss(t('gems.appOnly'))
      return
    }
    const out = await startGemPurchase(packId)
    if (out.miss === 'signin') {
      goHash('/account')
      return
    }
    if (out.miss) {
      setMiss(gemMiss(out.miss))
      return
    }
    setNote(out.pending ? t('gems.pending') : t('gems.return'))
  }

  return (
    <BoardShell
      book={book}
      now={clock}
      title={t('gems.title')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-gems di-set">
        <h2 className="di-page-title">{t('gems.title')}</h2>

        <p className="di-shop-purse">
          <PurseBits purse={purse} />
        </p>
        <p className="di-set-note">{t('gems.balance', { gems: purse.gems })}</p>
        <p className="di-set-note">{native ? t(signedIn ? 'gems.hintNativeIn' : 'gems.hintNative') : t(signedIn ? 'gems.hintIn' : 'gems.hint')}</p>
        {native && !storeReady ? <p className="di-set-note">{t('gems.loadingStore')}</p> : null}
        {!native ? <p className="di-set-note">{t('gems.appOnly')}</p> : null}

        <div className="di-set-card di-shop-card di-gem-packs">
          {GEM_PACKS.map((pack) => {
            const price = packPriceLabel(pack, native ? storePrice(pack.id) : '')
            return (
              <div className="di-shop-row di-gem-pack" key={pack.id}>
                <span className="di-gem-pack-mark" aria-hidden="true">
                  <GemIcon className="di-gem-icon di-gem-icon-pack" />
                  <span className="di-gem-pack-n">{pack.gems}</span>
                </span>
                <span className="di-shop-copy">
                  <strong>{gemLine(pack.gems)}</strong>
                  <em>
                    {pack.bonus ? `${t('gems.bonus', { base: pack.base, bonus: pack.bonus })} · ` : ''}
                    {price}
                  </em>
                </span>
                <button
                  className="di-did di-did-small"
                  type="button"
                  disabled={native && !storeReady}
                  onClick={() => buy(pack.id)}
                >
                  {t('gems.buy')}
                </button>
              </div>
            )
          })}
        </div>

        <p className="di-set-note">{t('gems.earn')}</p>
        <LegalLinks leadKey="legal.gemLead" />

        {note ? <p className="di-set-note">{note}</p> : null}
        {miss ? (
          <p className="di-miss" role="alert">
            {miss}
          </p>
        ) : null}
      </section>
    </BoardShell>
  )
}
