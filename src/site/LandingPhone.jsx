import { useEffect, useMemo, useRef, useState } from 'react'
import { putAnswer } from '../lib/board-ops.js'
import { shortLabel } from '../lib/board-json.js'
import { hallHeat, hallHour } from '../lib/hall-feel.js'
import { LampFace } from '../lib/LampFace.jsx'
import { NightMeter } from '../lib/NightMeter.jsx'
import { PurseLine } from '../lib/PurseLine.jsx'
import { sampleNowBoard } from '../lib/sample-board.js'
import { MastCogs } from '../lib/SettingsCog.jsx'
import { WeekStrip } from '../lib/WeekStrip.jsx'
import { t } from '../lib/i18n.js'
import { usePrefs, useTheme } from '../lib/prefs.js'
import { normalizePurse } from '../lib/purse.js'
import {
  addDaysIso,
  boardDate,
  faceReadyTonight,
  formatBoardDate,
  periodKeyFor,
  recentPeriodKeys,
} from '../lib/recurrence.js'
import { rowKey, taggedDue } from '../lib/tags.js'
import { useReduceMotion } from '../lib/useReduceMotion.js'

const DEMO_PULL_MS = 1400
const DEMO_START_MS = 1600
const DEMO_FLY_MS = 420
const DEMO_PAUSE_MS = 2800
const DEMO_RESET_MS = 1800

const DEMO_KEYS = [
  'web.landing.demo1',
  'web.landing.demo2',
  'web.landing.demo3',
]

const DEMO_CHIP_KEYS = [
  'web.landing.chip1',
  'web.landing.chip2',
  'web.landing.chip3',
]

function demoBook() {
  const base = sampleNowBoard()
  const today = boardDate(new Date(), base.dayFoldHour)
  const lamps = base.lamps.slice(0, DEMO_KEYS.length)
  const door = lamps[0]
  return {
    ...base,
    title: 'Hayes Street',
    lamps,
    answers: [
      {
        id: `ans-${door.id}-${addDaysIso(today, -1)}`,
        lampId: door.id,
        periodKey: periodKeyFor(door, addDaysIso(today, -1)),
        status: 'yes',
        answeredAt: `${addDaysIso(today, -1)}T21:04:00`,
        note: '',
      },
      {
        id: `ans-${door.id}-${addDaysIso(today, -2)}`,
        lampId: door.id,
        periodKey: periodKeyFor(door, addDaysIso(today, -2)),
        status: 'yes',
        answeredAt: `${addDaysIso(today, -2)}T21:11:00`,
        note: '',
      },
    ],
    opens: [today, addDaysIso(today, -1), addDaysIso(today, -2)],
  }
}

function withDemoCopy(book) {
  return {
    ...book,
    lamps: book.lamps.map((lamp, index) => ({
      ...lamp,
      question: t(DEMO_KEYS[index] || DEMO_KEYS[0]),
      short: t(DEMO_CHIP_KEYS[index] || DEMO_CHIP_KEYS[0]),
    })),
  }
}

function LandingAppNav() {
  usePrefs()
  return (
    <nav className="di-appnav is-live" data-at="0" data-tabs="2" aria-hidden="true">
      <i className="di-appnav-pip" />
      <span className="is-on">{t('nav.home')}</span>
      <span>{t('nav.questions')}</span>
    </nav>
  )
}

export function LandingPhone() {
  const prefs = usePrefs()
  const theme = useTheme()
  const reduce = useReduceMotion()
  const clock = useMemo(() => new Date(), [])
  const [book, setBook] = useState(() => withDemoCopy(demoBook()))

  useEffect(() => {
    setBook((prev) => withDemoCopy(prev))
  }, [prefs.locale])
  const [demoPull, setDemoPull] = useState(0)
  const [demoFly, setDemoFly] = useState('')
  const viewport = useRef(null)
  const [frame, setFrame] = useState({ scale: 0.68, x: 0, y: 0 })

  const dateIso = boardDate(clock, book.dayFoldHour)
  const due = taggedDue([book], clock, '')
  const ready = faceReadyTonight(book, clock)
  const faceRow = ready[0] || null
  const heat = hallHeat(book, clock)
  const hour = hallHour(clock)
  const purse = normalizePurse(book)

  useEffect(() => {
    const node = viewport.current
    if (!node) return undefined
    const sync = () => {
      const w = node.clientWidth
      const h = node.clientHeight
      const scale = Math.min(w / 390, h / 844)
      const scaledW = 390 * scale
      const scaledH = 844 * scale
      setFrame({
        scale,
        x: Math.max(0, (w - scaledW) / 2),
        y: Math.max(0, (h - scaledH) / 2),
      })
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (reduce || !faceRow) return undefined

    let alive = true
    let pullFrame
    let timer

    function resetBook() {
      setBook(withDemoCopy(demoBook()))
      setDemoPull(0)
      setDemoFly('')
    }

    function runCycle() {
      setDemoPull(0)
      setDemoFly('')
      const start = performance.now()
      function pullStep(now) {
        if (!alive) return
        const t = Math.min(1, (now - start) / DEMO_PULL_MS)
        const ease = 1 - (1 - t) ** 3
        setDemoPull(ease * 0.92)
        if (t < 1) pullFrame = requestAnimationFrame(pullStep)
        else {
          setDemoFly('did')
          timer = window.setTimeout(() => {
            if (!alive) return
            setBook((prev) => {
              const row = faceReadyTonight(prev, clock)[0]
              if (!row) {
                resetBook()
                return withDemoCopy(demoBook())
              }
              const next = putAnswer(prev, row, 'yes', clock)
              const left = faceReadyTonight(next, clock)
              if (!left.length) {
                timer = window.setTimeout(resetBook, DEMO_RESET_MS)
                return next
              }
              return next
            })
            setDemoPull(0)
            setDemoFly('')
            timer = window.setTimeout(runCycle, DEMO_PAUSE_MS)
          }, DEMO_FLY_MS)
        }
      }

      pullFrame = requestAnimationFrame(pullStep)
    }

    timer = window.setTimeout(runCycle, DEMO_START_MS)
    return () => {
      alive = false
      cancelAnimationFrame(pullFrame)
      window.clearTimeout(timer)
    }
  }, [reduce, faceRow?.lamp?.id, faceRow?.periodKey, clock])

  const keys = faceRow ? recentPeriodKeys(faceRow.lamp, dateIso, 7) : []

  return (
    <div className="di-land-phone-wrap" aria-hidden="true">
      <div className="di-land-phone-glow" />
      <div className="di-land-phone-device">
        <div className="di-land-phone-bezel">
          <div className="di-land-phone-notch" />
          <div className="di-land-phone-viewport" ref={viewport}>
            <div
              className="di-land-phone-scale"
              style={{
                transform: `translate(${frame.x}px, ${frame.y}px) scale(${frame.scale})`,
              }}
            >
              <div
                className="di-hall di-land-hall"
                data-heat={heat}
                data-hour={hour}
                data-sit="ask"
                data-look={book.lookOn || 'lime'}
                data-theme={theme}
              >
              <div className="di-board di-land-board" data-heat={heat}>
                <header className="di-mast">
                  <p className="di-title-static">{t('tonight.didI')}</p>
                  <p className="di-date">{formatBoardDate(dateIso)}</p>
                  <div className="di-mast-actions">
                    <PurseLine purse={purse} className="di-mast-purse" gemsLink />
                    <MastCogs showAdd />
                  </div>
                </header>

                <NightMeter due={due} />

                {due.length ? (
                  <div className="di-edge-wrap">
                    <ul className="di-edge" aria-label={t('tonight.aria')}>
                      {due.map((row) => {
                        const on =
                          row.answer &&
                          (row.answer.status === 'yes' || row.answer.status === 'late')
                        const skip = row.answer?.status === 'skip'
                        const isFace = faceRow && row.lamp.id === faceRow.lamp.id
                        return (
                          <li key={rowKey(row)}>
                            <button
                              type="button"
                              className={[
                                'di-jewel',
                                on ? 'is-on' : '',
                                skip ? 'is-skip' : '',
                                isFace ? 'is-face' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              tabIndex={-1}
                              aria-hidden="true"
                            >
                              <span className="di-jewel-ring">
                                <span className="di-jewel-glass" />
                              </span>
                              <span className="di-jewel-label">{shortLabel(row.lamp)}</span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ) : null}

                <div className="di-face-slot">
                  {faceRow ? (
                    <LampFace
                      row={faceRow}
                      book={book}
                      keys={keys}
                      demoPull={demoPull}
                      demoFly={demoFly}
                      demoQuiet
                      questionId="di-land-question"
                      onYes={() => {}}
                      onSkip={() => {}}
                    />
                  ) : (
                    <section className="di-face">
                      <p className="di-face-plate">{t('tonight.doneKicker')}</p>
                      <h2 className="di-question">{t('tonight.doneTitle')}</h2>
                    </section>
                  )}
                </div>

                <WeekStrip boards={[book]} now={clock} />
              </div>
              <LandingAppNav />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
