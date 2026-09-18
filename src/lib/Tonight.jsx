import { useEffect, useRef, useState } from 'react'
import { LampFace } from './LampFace.jsx'
import { HangLamp } from './HangLamp.jsx'
import { LampDetail } from './LampDetail.jsx'
import { NightStrip } from './NightStrip.jsx'
import { ACHIEVEMENTS, unlockAchievements } from './achievements.js'
import {
  answeredAtIso,
  blankLamp,
  downloadBook,
  duplicateLamp,
  missLamp,
  newAnswerId,
  parseBookText,
  shortLabel,
} from './board-json.js'
import {
  allClearTonight,
  boardDate,
  catchUpRows,
  dueTonight,
  faceReadyTonight,
  formatBoardDate,
  recentPeriodKeys,
  unansweredTonight,
  waitingTonight,
} from './recurrence.js'
import './did-i.css'

const SLOTS = [
  { id: 'morning', label: 'Morning' },
  { id: 'whenever', label: 'Whenever' },
  { id: 'night', label: 'Night' },
]

export function Tonight({ value, onChange, now, onResetSample, onLeave, onRead }) {
  const clock = now || new Date()
  const fileRef = useRef(null)
  const undoTimer = useRef(null)
  const [hanging, setHanging] = useState(false)
  const [editLamp, setEditLamp] = useState(null)
  const [hangMiss, setHangMiss] = useState('')
  const [faceId, setFaceId] = useState('')
  const [openId, setOpenId] = useState('')
  const [trayOpen, setTrayOpen] = useState(false)
  const [titleEdit, setTitleEdit] = useState(false)
  const [titleDraft, setTitleDraft] = useState(value.title)
  const [loadMiss, setLoadMiss] = useState('')
  const [undo, setUndo] = useState(null)
  const [holePick, setHolePick] = useState(null)

  const dateIso = boardDate(clock, value.dayFoldHour)
  const due = dueTonight(value, clock)
  const unanswered = unansweredTonight(value, clock)
  const ready = faceReadyTonight(value, clock)
  const waiting = waitingTonight(value, clock)
  const catchUp = catchUpRows(value, clock)
  const hallOn = allClearTonight(value, clock)
  const empty = (value.lamps || []).filter((lamp) => !lamp.archived).length === 0
  const slotsUsed = new Set(due.map((row) => row.lamp.slot || 'whenever'))
  const showSlotGroups = slotsUsed.size > 1

  const faceRow = ready.find((row) => row.lamp.id === faceId) || ready[0] || null
  const openLamp = (value.lamps || []).find((lamp) => lamp.id === openId) || null

  useEffect(() => {
    setTitleDraft(value.title)
  }, [value.title])

  useEffect(() => {
    return () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current)
    }
  }, [])

  useEffect(() => {
    function onKey(event) {
      if (event.target.closest('input, textarea, select')) return
      if (event.key === 'Escape') {
        event.preventDefault()
        setHanging(false)
        setEditLamp(null)
        setHangMiss('')
        setOpenId('')
        setTitleEdit(false)
        setHolePick(null)
        return
      }
      if (event.key === 'u' && undo) {
        event.preventDefault()
        applyUndo()
        return
      }
      if (hanging || openLamp || holePick) return
      if (event.key === 'n') {
        event.preventDefault()
        setHanging(true)
        setEditLamp(null)
        setHangMiss('')
        return
      }
      if (!faceRow) return
      if (event.key === 'y' || event.key === ' ') {
        event.preventDefault()
        mark(faceRow, 'yes')
        return
      }
      if (event.key === 's') {
        event.preventDefault()
        mark(faceRow, 'skip')
        return
      }
      if (event.key === 'j' || event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault()
        moveFace(1)
      }
      if (event.key === 'k' || event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault()
        moveFace(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function change(next) {
    onChange(unlockAchievements(next, clock))
  }

  function armUndo(payload) {
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    setUndo(payload)
    undoTimer.current = window.setTimeout(() => setUndo(null), 6000)
  }

  function applyUndo() {
    if (!undo) return
    change(undo.book)
    setUndo(null)
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
  }

  function writeAnswer(row, status) {
    const answer = {
      id: newAnswerId(),
      lampId: row.lamp.id,
      periodKey: row.periodKey,
      status,
      answeredAt: answeredAtIso(clock),
      note: '',
    }
    return {
      ...value,
      answers: [...value.answers.filter((item) => !(item.lampId === row.lamp.id && item.periodKey === row.periodKey)), answer],
    }
  }

  function mark(row, status) {
    if (!row) return
    const next = writeAnswer(row, status)
    change(next)
    setFaceId('')
    setHolePick(null)
    armUndo({ book: value, label: 'Tap saved.' })
  }

  function moveFace(step) {
    if (!ready.length) return
    const ids = ready.map((row) => row.lamp.id)
    const current = faceRow ? ids.indexOf(faceRow.lamp.id) : 0
    const next = (current + step + ids.length) % ids.length
    setFaceId(ids[next])
  }

  function hangSave(lamp, problem) {
    if (problem || !lamp) {
      setHangMiss(problem || missLamp(blankLamp(clock)))
      return
    }
    let next
    if (editLamp) {
      next = {
        ...value,
        lamps: value.lamps.map((item) => (item.id === lamp.id ? lamp : item)),
      }
    } else {
      next = { ...value, lamps: [...value.lamps, lamp] }
    }
    change(next)
    setHanging(false)
    setEditLamp(null)
    setHangMiss('')
    armUndo({ book: value, label: editLamp ? 'Plate saved.' : 'Lamp hung.' })
  }

  function removeLamp(lamp) {
    const next = {
      ...value,
      lamps: value.lamps.filter((item) => item.id !== lamp.id),
      answers: value.answers.filter((item) => item.lampId !== lamp.id),
    }
    change(next)
    setOpenId('')
    if (faceId === lamp.id) setFaceId('')
    armUndo({ book: value, label: 'Lamp taken down.' })
  }

  function archiveLamp(lamp) {
    const next = {
      ...value,
      lamps: value.lamps.map((item) =>
        item.id === lamp.id ? { ...item, archived: !item.archived } : item,
      ),
    }
    change(next)
    setOpenId('')
    armUndo({ book: value, label: lamp.archived ? 'Hung again.' : 'Lamp taken down.' })
  }

  function copyLamp(lamp) {
    const copy = duplicateLamp(lamp, clock)
    change({ ...value, lamps: [...value.lamps, copy] })
    setOpenId(copy.id)
    armUndo({ book: value, label: 'Copy hung.' })
  }

  function saveTitle() {
    const title = titleDraft.trim()
    if (!title) {
      setTitleDraft(value.title)
      setTitleEdit(false)
      return
    }
    change({ ...value, title })
    setTitleEdit(false)
  }

  function onLoadFile(event) {
    const file = event.target.files && event.target.files[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseBookText(String(reader.result || ''))
      if (!parsed.ok) {
        setLoadMiss(parsed.reason)
        return
      }
      setLoadMiss('')
      change(parsed.book)
    }
    reader.readAsText(file)
  }

  function jewelClick(row) {
    if (row.answer) {
      setOpenId(row.lamp.id)
      setHanging(false)
      return
    }
    if (!row.waiting) setFaceId(row.lamp.id)
    setOpenId('')
  }

  function pickHole(lamp, periodKey) {
    setHolePick({ lamp, periodKey })
  }

  const dueWithWait = due.map((row) => ({
    ...row,
    waiting: !row.answer && !ready.some((item) => item.lamp.id === row.lamp.id),
  }))

  let body = null
  if (hanging) {
    body = (
      <HangLamp
        now={clock}
        lamp={editLamp}
        miss={hangMiss}
        onSave={hangSave}
        onCancel={() => {
          setHanging(false)
          setEditLamp(null)
          setHangMiss('')
        }}
      />
    )
  } else if (openLamp) {
    body = (
      <LampDetail
        book={value}
        lamp={openLamp}
        dateIso={dateIso}
        onClose={() => setOpenId('')}
        onEdit={(lamp) => {
          setEditLamp(lamp)
          setHanging(true)
          setHangMiss('')
          setOpenId('')
        }}
        onDuplicate={copyLamp}
        onArchive={archiveLamp}
        onRemove={removeLamp}
        onMarkHole={pickHole}
      />
    )
  } else if (empty) {
    body = (
      <section className="di-empty">
        <p className="di-empty-plate">Blank plate</p>
        <h2 className="di-question">Nothing is hanging yet.</h2>
        <p>Hang a lamp for the thing you keep asking yourself at the door.</p>
        <button
          className="di-did di-did-small"
          type="button"
          onClick={() => {
            setHanging(true)
            setEditLamp(null)
          }}
        >
          Hang a lamp
        </button>
      </section>
    )
  } else if (faceRow) {
    body = (
      <>
        <LampFace row={faceRow} onYes={() => mark(faceRow, 'yes')} onSkip={() => mark(faceRow, 'skip')} />
        <NightStrip
          book={value}
          lamp={faceRow.lamp}
          keys={recentPeriodKeys(faceRow.lamp, dateIso, 7)}
        />
      </>
    )
  } else if (waiting.length) {
    body = (
      <section className="di-clear">
        <p className="di-face-plate">Not yet</p>
        <h2 className="di-question">Those lamps wait.</h2>
        <p>
          {waiting
            .map((row) => `${shortLabel(row.lamp)} after ${row.lamp.askAfter}`)
            .join('. ')}
          .
        </p>
      </section>
    )
  } else if (due.length === 0) {
    body = (
      <section className="di-clear">
        <p className="di-face-plate">Tonight</p>
        <h2 className="di-question">Nothing is due.</h2>
        <p>Sunday bins stay dark until Sunday. Hang a daily lamp if you need a question tonight.</p>
      </section>
    )
  } else if (hallOn) {
    body = (
      <section className="di-clear di-clear-on">
        <p className="di-face-plate">Tonight</p>
        <h2 className="di-question">The hall is on.</h2>
        <p>Every lamp that needed a tap got one.</p>
      </section>
    )
  }

  return (
    <div className="di-hall">
      <div className="di-board">
        <header className="di-mast">
          {titleEdit ? (
            <input
              className="di-title-input"
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={saveTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  saveTitle()
                }
              }}
              aria-label="Board name"
            />
          ) : (
            <button className="di-title" type="button" onClick={() => setTitleEdit(true)}>
              {value.title}
            </button>
          )}
          <p className="di-date">{formatBoardDate(dateIso)}</p>
        </header>

        {body}

        {catchUp.length > 0 && !hanging && !openLamp ? (
          <div className="di-catch">
            <p className="di-catch-kicker">Last time</p>
            <ul>
              {catchUp.map((row) => (
                <li key={row.lamp.id}>
                  <span>
                    {shortLabel(row.lamp)} · {formatBoardDate(row.dateIso)}
                  </span>
                  <span className="di-catch-actions">
                    <button className="di-text" type="button" onClick={() => mark(row, 'late')}>
                      late
                    </button>
                    <button className="di-text" type="button" onClick={() => mark(row, 'skip')}>
                      skip
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {dueWithWait.length > 0 && !hanging ? (
          <div className="di-edge-wrap">
            {SLOTS.filter((slot) => dueWithWait.some((row) => (row.lamp.slot || 'whenever') === slot.id)).map(
              (slot) => (
                <div key={slot.id} className="di-slot">
                  {showSlotGroups ? <p className="di-slot-label">{slot.label}</p> : null}
                  <ul className="di-edge" aria-label={showSlotGroups ? slot.label : "Tonight's lamps"}>
                    {dueWithWait
                      .filter((row) => (row.lamp.slot || 'whenever') === slot.id)
                      .map((row) => {
                        const on =
                          row.answer && (row.answer.status === 'yes' || row.answer.status === 'late')
                        const skip = row.answer?.status === 'skip'
                        const late = row.answer?.status === 'late'
                        const isFace =
                          faceRow && row.lamp.id === faceRow.lamp.id && !hanging && !openLamp
                        return (
                          <li key={row.lamp.id}>
                            <button
                              type="button"
                              className={[
                                'di-jewel',
                                on ? 'is-on' : '',
                                skip ? 'is-skip' : '',
                                late ? 'is-late' : '',
                                row.waiting ? 'is-wait' : '',
                                isFace ? 'is-face' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              onClick={() => jewelClick(row)}
                            >
                              <span className="di-jewel-glass" />
                              <span className="di-jewel-label">{shortLabel(row.lamp)}</span>
                            </button>
                          </li>
                        )
                      })}
                  </ul>
                </div>
              ),
            )}
          </div>
        ) : null}

        <footer className="di-screws di-screws-print-hide">
          <button
            className="di-text"
            type="button"
            onClick={() => {
              setHanging(true)
              setEditLamp(null)
              setHangMiss('')
              setOpenId('')
            }}
          >
            Hang a lamp
          </button>
          {onRead ? (
            <button className="di-text" type="button" onClick={onRead}>
              Read
            </button>
          ) : null}
          {onLeave ? (
            <button className="di-text" type="button" onClick={onLeave}>
              Door
            </button>
          ) : null}
          <button className="di-text" type="button" onClick={() => setTrayOpen((open) => !open)}>
            {trayOpen ? 'Close tray' : 'Tray'}
          </button>
        </footer>

        {trayOpen ? (
          <div className="di-tray di-screws-print-hide">
            <ul className="di-tray-lamps">
              {(value.lamps || []).map((lamp) => (
                <li key={lamp.id}>
                  <button className="di-text" type="button" onClick={() => setOpenId(lamp.id)}>
                    {shortLabel(lamp)}
                    {lamp.archived ? ' (down)' : ''}
                  </button>
                  <button className="di-text" type="button" onClick={() => removeLamp(lamp)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="di-tray-files">
              <button className="di-text" type="button" onClick={() => downloadBook(value)}>
                Download JSON
              </button>
              <button className="di-text" type="button" onClick={() => fileRef.current?.click()}>
                Load JSON
              </button>
              <button className="di-text" type="button" onClick={() => window.print()}>
                Print tonight
              </button>
              <button
                className="di-text"
                type="button"
                onClick={() => change({ ...value, quietMode: !value.quietMode })}
              >
                {value.quietMode ? 'Show pips' : 'Quiet mode'}
              </button>
              {onResetSample ? (
                <button className="di-text" type="button" onClick={onResetSample}>
                  Hayes Street sample
                </button>
              ) : null}
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={onLoadFile}
              />
            </div>
            {!value.quietMode ? (
              <ul className="di-pips" aria-label="Marks">
                {ACHIEVEMENTS.filter((item) => value.unlocked.includes(item.id)).map((item) => (
                  <li key={item.id} title={item.name}>
                    {item.name}
                  </li>
                ))}
              </ul>
            ) : null}
            {loadMiss ? (
              <p className="di-miss" role="alert">
                {loadMiss}
              </p>
            ) : null}
          </div>
        ) : null}

        {undo ? (
          <p className="di-undo di-screws-print-hide">
            {undo.label}{' '}
            <button className="di-text" type="button" onClick={applyUndo}>
              Undo
            </button>
          </p>
        ) : null}

        {holePick ? (
          <p className="di-undo di-screws-print-hide">
            {shortLabel(holePick.lamp)} that night.{' '}
            <button
              className="di-text"
              type="button"
              onClick={() => mark({ lamp: holePick.lamp, periodKey: holePick.periodKey }, 'late')}
            >
              late
            </button>{' '}
            <button
              className="di-text"
              type="button"
              onClick={() => mark({ lamp: holePick.lamp, periodKey: holePick.periodKey }, 'skip')}
            >
              skip
            </button>
          </p>
        ) : null}
      </div>

      <ol className="di-print-slip">
        <li className="di-print-title">{value.title} · {formatBoardDate(dateIso)}</li>
        {unanswered.length ? (
          unanswered.map((row) => (
            <li key={row.lamp.id}>
              <span className="di-print-box" />
              {row.lamp.question}
            </li>
          ))
        ) : (
          <li>Nothing left unanswered tonight.</li>
        )}
      </ol>
    </div>
  )
}
