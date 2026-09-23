import { useCallback, useEffect, useMemo, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { cloudSetUp, supabaseSqlUrl } from './cloud.js'
import { didTonightLabels } from './dit-board.js'
import { t, tMiss } from './i18n.js'
import { feelTap } from './native.js'
import {
  TONIGHT_CHEER_GEMS,
  cheerOn,
  personName,
  readMine,
  reportTonightLine,
  setPublicTonight,
  syncTonightBoard,
  tonightWall,
} from './people.js'
import { fireCheer, normalizePurse, spendGems } from './purse.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { LegalLinks } from './LegalLinks.jsx'
import { GemShort } from './shop-bits.jsx'
import { SetCap, SetCard, SetRow, SetSwitch } from './set-bits.jsx'
import { useOnline } from './useOnline.js'

function streakLine(row) {
  if (row.streak > 0) return t('all.streakN', { n: row.streak })
  return t('all.noStreak')
}

export function Everyone({ book, boards = [], onChange, now }) {
  const clock = now || new Date()
  const account = useAccount()
  const online = useOnline()
  const night = boardDate(clock)
  const purse = normalizePurse(book)
  const shelf = { boards: boards.length ? boards : [book], currentId: book?.id }

  const [mine, setMine] = useState(null)
  const [rows, setRows] = useState([])
  const [tally, setTally] = useState(0)
  const [ready, setReady] = useState(false)
  const [setup, setSetup] = useState(false)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [gemShort, setGemShort] = useState(false)

  const load = useCallback(async () => {
    if (!cloudSetUp() || !account.user) {
      setReady(true)
      return
    }
    const [who, wall] = await Promise.all([readMine(), tonightWall(night)])
    setMine(who)
    setRows(wall.rows)
    setTally(wall.tally)
    setSetup(wall.miss === 'setup')
    if (wall.miss && wall.miss !== 'off' && wall.miss !== 'setup') setMiss(wall.miss)
    setReady(true)
  }, [account.user, night])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, 300000)
    function onShow() {
      if (!document.hidden) load()
    }
    document.addEventListener('visibilitychange', onShow)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [load])

  const sorted = useMemo(() => [...rows].sort((a, b) => Number(b.you) - Number(a.you)), [rows])

  function say(words) {
    setMiss('')
    setSaid(words)
  }

  async function flip(on) {
    const { miss: why } = await setPublicTonight(on)
    if (why === 'setup') return setSetup(true)
    if (why) return setMiss(why)
    if (on && mine?.done_on === night) {
      await syncTonightBoard(didTonightLabels(shelf, night), night)
    }
    say(on ? t('all.nowOn') : t('all.nowOff'))
    return load()
  }

  async function flag(line) {
    const { miss: why } = await reportTonightLine(line.id)
    if (why) return setMiss(why)
    say(t('all.reported'))
    return load()
  }

  async function cheer(row) {
    if (purse.gems < TONIGHT_CHEER_GEMS) {
      setGemShort(true)
      return
    }
    const { miss: why, fresh } = await cheerOn(row.user_id, night)
    if (why === 'setup') return setSetup(true)
    if (why) return setMiss(why)
    if (!fresh) return setMiss(t('all.cheeredAlready'))
    const spent = spendGems(book, TONIGHT_CHEER_GEMS)
    if (spent.miss) {
      setGemShort(true)
      return
    }
    if (onChange) onChange(spent.book)
    fireCheer(purse.cheerOn, 1)
    feelTap('did')
    say(t('all.cheerSent', { name: personName(row) || t('all.someone') }))
    return load()
  }

  const shell = (children) => (
    <BoardShell
      book={book}
      now={clock}
      title={t('all.kicker')}
      date={formatBoardDate(night)}
      back={false}
    >
      <section className="di-page di-set di-all">
        <p className="di-face-plate">{t('all.kicker')}</p>
        {online ? null : <p className="di-set-note di-off-line">{t('people.offline')}</p>}
        {children}
      </section>
    </BoardShell>
  )

  if (!cloudSetUp()) {
    return shell(
      <>
        <h2 className="di-page-title">{t('all.offTitle')}</h2>
        <p className="di-set-note">{t('all.offBody')}</p>
      </>,
    )
  }

  if (!account.user) {
    return shell(
      <>
        <h2 className="di-page-title">{t('all.outTitle')}</h2>
        <p className="di-set-note">{t('all.outBody')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/account')}>
            {t('people.goAccount')}
          </button>
        </div>
      </>,
    )
  }

  if (!ready) return shell(<p className="di-set-note">{t('all.loading')}</p>)

  if (setup) {
    const sqlUrl = supabaseSqlUrl()
    return shell(
      <>
        <h2 className="di-page-title">{t('all.setupTitle')}</h2>
        <p className="di-set-note">{t('all.setupBody')}</p>
        {sqlUrl ? (
          <div className="di-hang-actions">
            <a className="di-did di-did-small" href={sqlUrl} target="_blank" rel="noreferrer">
              {t('all.setupOpen')}
            </a>
          </div>
        ) : null}
      </>,
    )
  }

  const showing = Boolean(mine?.public_tonight)

  return shell(
    <>
      <h2 className="di-page-title">
        {tally === 1 ? t('all.tallyOne') : t('all.tally', { n: tally })}
      </h2>

      {showing ? null : (
        <>
          <SetCard>
            <SetRow label={t('all.joinTitle')} sub={t('all.joinBody')} />
            <SetRow label={t('all.join')} onClick={() => flip(true)} />
          </SetCard>
          <LegalLinks leadKey="legal.ditLead" />
        </>
      )}

      {showing ? <p className="di-set-note">{t('all.boardHint')}</p> : null}

      <SetCap>{t('all.listCap')}</SetCap>
      {sorted.length ? (
        <SetCard>
          {sorted.map((row) => (
            <div className={row.you ? 'di-all-row is-you' : 'di-all-row'} key={row.user_id}>
              <i className="di-all-pip" aria-hidden="true" />
              <span className="di-all-who">
                <strong>
                  {row.you ? t('all.you') : personName(row) || t('all.someone')}
                </strong>
                <em>{streakLine(row)}</em>
                {(row.lines || []).map((line) => (
                  <small key={line.id}>
                    {line.label}
                    {row.you ? null : (
                      <button
                        className="di-all-flag"
                        type="button"
                        onClick={() => flag(line)}
                        title={t('all.report')}
                        aria-label={t('all.report')}
                      >
                        <span aria-hidden="true">!</span>
                      </button>
                    )}
                  </small>
                ))}
              </span>
              {row.you ? (
                <span className="di-all-tally">
                  {row.cheers ? t('all.cheersN', { n: row.cheers }) : ''}
                </span>
              ) : (
                <button
                  className={row.cheered ? 'di-key is-on' : 'di-key'}
                  type="button"
                  disabled={row.cheered}
                  onClick={() => cheer(row)}
                >
                  {row.cheered
                    ? t('all.cheered', { n: row.cheers })
                    : t('all.cheer', { n: TONIGHT_CHEER_GEMS })}
                </button>
              )}
            </div>
          ))}
        </SetCard>
      ) : (
        <SetCard>
          <SetRow label={t('all.nobody')} sub={t('all.nobodySub')} />
        </SetCard>
      )}

      {showing ? (
        <>
          <SetCap>{t('all.youCap')}</SetCap>
          <SetCard>
            <SetSwitch
              label={t('all.showing')}
              sub={t('all.showingSub')}
              on={showing}
              onClick={() => flip(false)}
            />
          </SetCard>
          <p className="di-set-note">{t('all.privacy')}</p>
        </>
      ) : null}

      <GemShort open={gemShort} onClose={() => setGemShort(false)} />
      {miss ? (
        <p className="di-miss" role="alert">
          {tMiss(miss)}
        </p>
      ) : null}
      {said ? <p className="di-set-note">{said}</p> : null}
    </>,
  )
}
