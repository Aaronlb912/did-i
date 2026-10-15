import { useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { AccessoryChip, BuddyChip, CheerChip, LookChip } from './Cosmetic.jsx'
import { ACCESSORIES, ACCESSORY_SLOTS } from './accessories.js'
import { AccessoryPreview } from './ShopAccessories.jsx'
import { KitFocus, KitTabs, KitTile, kitTabDefault } from './kit-bits.jsx'
import { buyLookWithCoins } from './coin-shop.js'
import {
  CHEER_STAGE_MAX,
  buddyText,
  cheerText,
  lookText,
  buyLook,
  isGemLook,
  cheerPlayOf,
  cheerStageOf,
  fireCheer,
  liveBuddies,
  liveLooks,
  normalizePurse,
  ownableCheers,
  wearBuddy,
  wearCheer,
  wearCheerStage,
  wearAccessory,
} from './purse.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { activeLook } from './active-look.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { LookPreviewCard, NO_MISS, shopMiss } from './shop-bits.jsx'

const STAGES = [1, 2, 3, 4, 5]

export function Collection({ book, onChange, now, startTab }) {
  usePrefs()
  const clock = now || new Date()
  const [tab, setTab] = useState(['looks', 'cheers', 'buddies', 'accessories'].includes(startTab) ? startTab : 'looks')
  const [pick, setPick] = useState('')
  const [peekLook, setPeekLook] = useState('')
  const [miss, setMiss] = useState(NO_MISS)
  const purse = normalizePurse(book)
  const coat = activeLook(book)
  const looks = liveLooks().filter((item) => purse.looks.includes(item.id))
  const buddies = liveBuddies().filter((item) => purse.buddies.includes(item.id))
  const cheers = ownableCheers().filter((item) => purse.cheers.includes(item.id))
  const accessories = ACCESSORIES.filter((item) => purse.accessories.includes(item.id))
  const focusId = pick || kitTabDefault(tab, purse)

  useEffect(() => {
    setPick('')
    setPeekLook('')
    setMiss(NO_MISS)
  }, [tab])

  async function wearLook(id) {
    const item = liveLooks().find((row) => row.id === id)
    const next =
      item && item.coins > 0 && !isGemLook(id)
        ? await buyLookWithCoins(book, id)
        : buyLook(book, id)
    setMiss({ id, text: shopMiss(next) })
    if (!next.miss) onChange(next.book)
  }

  function pickCheer(id) {
    onChange(wearCheer(book, id).book)
  }

  function pickStage(id, n) {
    const next = wearCheerStage(book, id, n)
    if (!next.miss) {
      fireCheer(id, n, coat, undefined, true)
      onChange(next.book)
    }
  }

  function focusLook() {
    const item = looks.find((row) => row.id === focusId)
    if (!item) return null
    const on = purse.lookOn === item.id
    return (
      <>
        <LookChip id={item.id} />
        <span className="di-shop-copy">
          <strong>{t(lookText(item.id, 'name'))}</strong>
          <em>{t(lookText(item.id, 'line'))}</em>
          {miss.id === item.id && miss.text ? (
            <em className="di-shop-miss" role="alert">
              {miss.text}
            </em>
          ) : null}
        </span>
        <button
          className={on ? 'di-did di-did-small' : 'di-key'}
          type="button"
          disabled={on}
          onClick={() => wearLook(item.id)}
        >
          {on ? t('shop.on') : t('shop.use')}
        </button>
      </>
    )
  }

  function focusBuddy() {
    if (focusId === 'off') {
      const on = !purse.buddyOn
      return (
        <>
          <span className="di-buddy-chip di-buddy-chip-off" aria-hidden="true" />
          <span className="di-shop-copy">
            <strong>{t('kit.buddyOff')}</strong>
            <em>{t('kit.buddyOffLine')}</em>
          </span>
          <button
            className={on ? 'di-did di-did-small' : 'di-key'}
            type="button"
            disabled={on}
            onClick={() => onChange(wearBuddy(book, '').book)}
          >
            {on ? t('shop.on') : t('shop.use')}
          </button>
        </>
      )
    }
    const item = buddies.find((row) => row.id === focusId)
    if (!item) return null
    const on = purse.buddyOn === item.id
    return (
      <>
        <BuddyChip id={item.id} />
        <span className="di-shop-copy">
          <strong>{t(buddyText(item.id, 'name'))}</strong>
          <em>{t(buddyText(item.id, 'line'))}</em>
        </span>
        <button
          className={on ? 'di-did di-did-small' : 'di-key'}
          type="button"
          disabled={on}
          onClick={() => onChange(wearBuddy(book, item.id).book)}
        >
          {on ? t('shop.on') : t('shop.use')}
        </button>
      </>
    )
  }

  function focusCheer() {
    if (focusId === 'off') {
      const on = !purse.cheerOn
      return (
        <>
          <span className="di-cheer-chip di-cheer-chip-off" aria-hidden="true" />
          <span className="di-shop-copy">
            <strong>{t('kit.cheerOff')}</strong>
            <em>{t('kit.cheerOffLine')}</em>
          </span>
          <button
            className={on ? 'di-did di-did-small' : 'di-key'}
            type="button"
            disabled={on}
            onClick={() => pickCheer('')}
          >
            {on ? t('shop.on') : t('shop.use')}
          </button>
        </>
      )
    }
    const item = cheers.find((row) => row.id === focusId)
    if (!item) return null
    const on = purse.cheerOn === item.id
    const owned = cheerStageOf(book, item.id)
    const play = cheerPlayOf(book, item.id)
    return (
      <>
        <button
          className="di-preview"
          type="button"
          aria-label={t('shop.see', { name: t(cheerText(item.id, 'name')) })}
          onClick={() => fireCheer(item.id, play, coat, undefined, true)}
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
          onClick={() => pickCheer(item.id)}
        >
          {on ? t('shop.on') : t('shop.use')}
        </button>
        <div className="di-stage-picks di-kit-stage-picks" role="group" aria-label={t('kit.stages')}>
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
      </>
    )
  }

  return (
    <BoardShell
      book={book}
      now={clock}
      title={t('kit.title')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
      look={peekLook || undefined}
    >
      <section className="di-page di-kit di-set">
        <h2 className="di-page-title">{t('kit.title')}</h2>
        <p className="di-set-note">{t('kit.hint')}</p>

        <KitTabs
          tab={tab}
          onTab={setTab}
          counts={{ looks: looks.length, cheers: cheers.length, buddies: buddies.length, accessories: accessories.length }}
        />

        {/* Accessories are worn with a tap on the tile; no focus row. */}
        {tab !== 'accessories' ? (
          <KitFocus>
            {tab === 'looks' ? focusLook() : null}
            {tab === 'buddies' ? focusBuddy() : null}
            {tab === 'cheers' ? focusCheer() : null}
          </KitFocus>
        ) : null}

        {tab === 'looks' && peekLook && isGemLook(peekLook) ? <LookPreviewCard /> : null}

        {tab === 'looks' ? (
          <div className="di-set-card di-kit-grid" role="tabpanel">
            {looks.map((item) => {
              const on = focusId === item.id
              const worn = purse.lookOn === item.id
              return (
                <KitTile
                  key={item.id}
                  on={on}
                  worn={worn}
                  label={t(lookText(item.id, 'name'))}
                  ariaLabel={t('shop.see', { name: t(lookText(item.id, 'name')) })}
                  onClick={() => {
                    setPick(item.id)
                    setPeekLook(item.id)
                  }}
                >
                  <LookChip id={item.id} />
                </KitTile>
              )
            })}
          </div>
        ) : null}

        {tab === 'buddies' ? (
          <div className="di-set-card di-kit-grid" role="tabpanel">
            {!buddies.length ? <p className="di-set-note di-kit-empty">{t('kit.noBuddies')}</p> : null}
            {buddies.map((item) => {
              const on = focusId === item.id
              const worn = purse.buddyOn === item.id
              return (
                <KitTile
                  key={item.id}
                  on={on}
                  worn={worn}
                  label={t(buddyText(item.id, 'name'))}
                  ariaLabel={t(buddyText(item.id, 'name'))}
                  onClick={() => setPick(item.id)}
                >
                  <BuddyChip id={item.id} />
                </KitTile>
              )
            })}
            <KitTile
              on={focusId === 'off'}
              worn={!purse.buddyOn}
              label={t('kit.buddyOff')}
              ariaLabel={t('kit.buddyOff')}
              onClick={() => setPick('off')}
            >
              <span className="di-buddy-chip di-buddy-chip-off" aria-hidden="true" />
            </KitTile>
          </div>
        ) : null}

        {tab === 'accessories' ? (
          <>
            <AccessoryPreview id="" purse={purse} />
            {!accessories.length ? (
              <div className="di-set-card di-kit-grid" role="tabpanel">
                <p className="di-set-note di-kit-empty">
                  {t('kit.noAccessories')}{' '}
                  <button className="di-text" type="button" onClick={() => goHash('/shop/accessories')}>
                    {t('shop.allAccessories')}
                  </button>
                </p>
              </div>
            ) : null}
            {/* One shelf per spot on the buddy, in the shop's order. */}
            {ACCESSORY_SLOTS.map((slot) => {
              const list = accessories.filter((item) => item.slot === slot)
              if (!list.length) return null
              return (
                <div key={slot} role="tabpanel">
                  <p className="di-set-cap">{t(`shop.slot.${slot}`)}</p>
                  <div className="di-set-card di-kit-grid">
                    {list.map((item) => (
                      <KitTile
                        key={item.id}
                        on={false}
                        worn={purse.worn[item.slot] === item.id}
                        label={t(`accessory.${item.id}`)}
                        ariaLabel={t(`accessory.${item.id}`)}
                        onClick={() => onChange(wearAccessory(book, item.id).book)}
                      >
                        <AccessoryChip id={item.id} buddyId={purse.buddyOn || 'ant'} />
                      </KitTile>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        ) : null}

        {tab === 'cheers' ? (
          <div className="di-set-card di-kit-grid" role="tabpanel">
            {cheers.map((item) => {
              const on = focusId === item.id
              const worn = purse.cheerOn === item.id
              const play = cheerPlayOf(book, item.id)
              return (
                <KitTile
                  key={item.id}
                  on={on}
                  worn={worn}
                  label={t(cheerText(item.id, 'name'))}
                  ariaLabel={t(cheerText(item.id, 'name'))}
                  onClick={() => {
                    setPick(item.id)
                    fireCheer(item.id, play, coat, undefined, true)
                  }}
                >
                  <CheerChip id={item.id} stage={play} />
                </KitTile>
              )
            })}
            <KitTile
              on={focusId === 'off'}
              worn={!purse.cheerOn}
              label={t('kit.cheerOff')}
              ariaLabel={t('kit.cheerOff')}
              onClick={() => setPick('off')}
            >
              <span className="di-cheer-chip di-cheer-chip-off" aria-hidden="true" />
            </KitTile>
          </div>
        ) : null}

        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/shop')}>
            {t('shop.title')}
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
