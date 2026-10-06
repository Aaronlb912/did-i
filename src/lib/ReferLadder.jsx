// The Refer page ladder for the website. Same rungs as the phone
// (native/components/ReferLadder.jsx); the buddy and frame rungs open a sheet.
import { useId, useState } from 'react'
import { BuddyArt } from './BuddyArt.jsx'
import { previewSample } from './board-shelf.js'
import { frameText } from './frames.js'
import { t } from './i18n.js'
import { referLadder, referLadderNote } from './invite-reward.js'
import { buddyText, lookText, normalizePurse } from './purse.js'
import { SetSheet } from './set-bits.jsx'

const SPARK = 'M0 -1 Q0 0 1 0 Q0 0 0 1 Q0 0 -1 0 Q0 0 0 -1 Z'

// Bloom around a box of w x h with corner radius r, drawn g px outside it.
// Still: the edge and sparks only; live: a light walks round and sparks twinkle.
export function BloomSvg({ w, h, r, g, live = false }) {
  const id = `bloom${useId().replace(/:/g, '')}`
  const W = w + 2 * g
  const H = h + 2 * g
  const x = g / 2
  const y = g / 2
  const RW = W - g
  const RH = H - g
  const R = r + g / 2
  const s = live ? 7 : 3
  const sparks = [
    [x + 2, y + 2, s, 0],
    [x + RW - 2, y + 2, s * 0.8, 0.9],
    [x + RW - 2, y + RH - 2, s, 1.6],
    [x + 2, y + RH - 2, s * 0.8, 2.2],
  ]
  return (
    <svg className="di-bloom-svg" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--di-on)" />
          <stop offset="0.5" stopColor="#7fd4ec" />
          <stop offset="1" stopColor="#b98cff" />
        </linearGradient>
        <filter id={`${id}f`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <rect x={x} y={y} width={RW} height={RH} rx={R} fill="none" stroke={`url(#${id})`} strokeWidth={live ? 3 : 2} opacity="0.85" />
      {live ? (
        <>
          <rect className="di-bloom-walk" x={x} y={y} width={RW} height={RH} rx={R} fill="none" stroke="#fff6d8" strokeWidth="7" strokeDasharray="70 330" pathLength="400" strokeLinecap="round" filter={`url(#${id}f)`} />
          <rect className="di-bloom-walk" x={x} y={y} width={RW} height={RH} rx={R} fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="40 360" strokeDashoffset="-15" pathLength="400" strokeLinecap="round" />
        </>
      ) : null}
      {sparks.map(([cx, cy, k, d]) => (
        <path
          key={d}
          className={live ? 'di-bloom-spark' : undefined}
          style={live ? { animationDelay: `${d}s` } : undefined}
          d={SPARK}
          fill="#fff6d8"
          transform={`translate(${cx} ${cy}) scale(${k})`}
        />
      ))}
    </svg>
  )
}

function MiniCard({ children }) {
  const sample = previewSample()
  return (
    <div className="di-refer-mini">
      <span className="di-refer-mini-k">{sample.tag}</span>
      <span className="di-refer-mini-q">{sample.question}</span>
      {children}
    </div>
  )
}

function rungTitle(rung) {
  if (rung.kind === 'gems') return rung.gems === 1 ? t('shop.gemOne') : t('shop.gems', { n: rung.gems })
  if (rung.kind === 'look') return t('refer.look', { name: t(lookText(rung.id, 'name')) })
  if (rung.kind === 'buddy') return t('refer.buddy', { name: t(buddyText(rung.id, 'name')) })
  return t('refer.frame', { name: t(frameText(rung.id, 'name')) })
}

function rungSub(rung) {
  if (rung.kind === 'look') return t(lookText(rung.id, 'line'))
  if (rung.kind === 'buddy') return t('refer.buddySub')
  if (rung.kind === 'frame') return t('refer.frameSub')
  return ''
}

function rungState(rung) {
  if (rung.state === 'got') return t('refer.got')
  if (rung.state === 'next' && rung.left === 1) return t('refer.next')
  return t('refer.toGo', { n: rung.left })
}

function Preview({ rung }) {
  if (rung.kind === 'buddy') return <BuddyArt id={rung.id} className="di-buddy-art di-refer-chip" />
  if (rung.kind === 'frame') {
    return (
      <span className="di-refer-tile">
        <span className="di-refer-tile-card" />
        <BloomSvg w={22} h={27} r={5} g={6} />
      </span>
    )
  }
  return null
}

function Sheet({ rung, book, onClose }) {
  const purse = normalizePurse(book || {})
  if (rung.kind === 'buddy') {
    const owned = purse.buddies.includes(rung.id)
    return (
      <SetSheet title={t(buddyText(rung.id, 'name'))} onClose={onClose}>
        <div className="di-refer-sheet-art">
          <BuddyArt id={rung.id} className="di-buddy-art di-refer-big" />
          <MiniCard>
            <BuddyArt id={rung.id} className="di-buddy-art di-refer-chip di-refer-on-card" />
          </MiniCard>
        </div>
        <p className="di-set-note">{t(buddyText(rung.id, 'line'))}</p>
        <p className="di-set-note">{owned ? t('shop.owned') : t('refer.buddyHow', { n: rung.n })}</p>
      </SetSheet>
    )
  }
  const owned = purse.frames.includes(rung.id)
  return (
    <SetSheet title={t(frameText(rung.id, 'name'))} onClose={onClose}>
      <div className="di-refer-sheet-art">
        <span className="di-refer-framed">
          <MiniCard />
          <BloomSvg w={150} h={96} r={16} g={16} live />
        </span>
      </div>
      <p className="di-set-note">{t(frameText(rung.id, 'desc'))}</p>
      <p className="di-set-note">{owned ? t('shop.owned') : t('frames.howRefer', { n: rung.n })}</p>
    </SetSheet>
  )
}

export function ReferLadder({ joined = 0, book }) {
  const [open, setOpen] = useState(null)
  const ladder = referLadder(joined)
  const note = referLadderNote(ladder)
  const count = ladder.toFrame ? t('refer.count', { n: ladder.joined, of: ladder.goal }) : t('refer.countAll', { n: ladder.joined })
  return (
    <div className="di-refer-ladder">
      <span className="di-refer-k">{t('refer.kicker')}</span>
      <p className="di-refer-big-n">{count}</p>
      <div className="di-meter-bar" role="progressbar" aria-label={count} aria-valuenow={Math.min(ladder.joined, ladder.goal)} aria-valuemin={0} aria-valuemax={ladder.goal}>
        <span className="di-meter-fill" style={{ width: `${ladder.pct}%` }} />
      </div>
      <p className="di-set-note">{t(note.key, note.vars)}</p>
      {ladder.rungs.map((rung) => {
        const sub = rungSub(rung)
        const tap = rung.kind === 'buddy' || rung.kind === 'frame'
        const inner = (
          <>
            <span className="di-refer-n">{rung.n}</span>
            <span className="di-refer-what">
              {rungTitle(rung)}
              {sub ? <small>{sub}</small> : null}
            </span>
            <Preview rung={rung} />
            <span className="di-refer-st">{rungState(rung)}</span>
          </>
        )
        const cls = `di-refer-rung is-${rung.state}`
        return tap ? (
          <button key={`${rung.kind}${rung.n}`} type="button" className={cls} onClick={() => setOpen(rung)}>
            {inner}
          </button>
        ) : (
          <div key={`${rung.kind}${rung.n}`} className={cls}>
            {inner}
          </div>
        )
      })}
      {open ? <Sheet rung={open} book={book} onClose={() => setOpen(null)} /> : null}
    </div>
  )
}
