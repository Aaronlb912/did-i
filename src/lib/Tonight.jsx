import { useEffect, useRef, useState } from 'react'
import { LampFace } from './LampFace.jsx'
import { HangLamp } from './HangLamp.jsx'
import { LampDetail } from './LampDetail.jsx'
import { NightStrip } from './NightStrip.jsx'
import {
  addUnlock,
  answeredAtIso,
  blankLamp,
  downloadBook,
  missLamp,
  newAnswerId,
  parseBookText,
  shortLabel,
} from './board-json.js'
import {
  allClearTonight,
  boardDate,
  dueTonight,
  formatBoardDate,
  recentPeriodKeys,
  unansweredTonight,
} from './recurrence.js'
import './did-i.css'

export function Tonight({ value, onChange, now, onResetSample }) {
  const clock = now || new Date()
  const fileRef = useRef(null)
  const undoTimer = useRef(null)
  const [hanging, setHanging] = useState(false)
  const [hangMiss, setHangMiss] = useState('')
  const [faceId, setFaceId] = useState('')
  const [openId, setOpenId] = useState('')
  const [trayOpen, setTrayOpen] = useState(false)
  const [titleEdit, setTitleEdit] = useState(false)
  const [titleDraft, setTitleDraft] = useState(value.title)
  const [loadMiss, setLoadMiss] = useState('')
  const [undo, setUndo] = useState(null)

  const dateIso = boardDate(clock, value.dayFoldHour)
  const due = dueTonight(value, clock)
  const unanswered = unansweredTonight(value, clock)
  const hallOn = allClearTonight(value, clock)
  const empty = (value.lamps || []).filter((lamp) => !lamp.archived).length === 0

  const faceRow =
    unanswered.find((row) => row.lamp.id === faceId) || unanswered[0] || null
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
        setHangMiss('')
        setOpenId('')
        setTitleEdit(false)
        return
      }
      if (event.key === 'u' && undo) {
        event.preventDefault()
        applyUndo()
        return
      }
      if (hanging || openLamp) return
      if (event.key === 'n') {
        event.preventDefault()
        setHanging(true)
        setHangMiss('')
        return
      }
      if (!faceRow) return
      if (event.key === 'y' || event.key === ' ') {
        event.preventDefault()
        mark('yes')
        return
      }
      if (event.key === 's') {
        event.preventDefault()
        mark('skip')
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
    onChange(next)
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

  function mark(status) {
    if (!faceRow) return
    const answer = {
      id: newAnswerId(),
      lampId: faceRow.lamp.id,
      periodKey: faceRow.periodKey,
      status,
      answeredAt: answeredAtIso(clock),
      note: '',
    }
    let next = {
      ...value,
      answers: [...value.answers, answer],
    }
    if (status === 'yes') next = addUnlock(next, 'first-did')
    if (status === 'skip') next = addUnlock(next, 'honest-skip')
    change(next)
    setFaceId('')
    armUndo({ book: value, label: 'Tap saved.' })
  }

  function moveFace(step) {
    if (!unanswered.length) return
    const ids = unanswered.map((row) => row.lamp.id)
    const current = faceRow ? ids.indexOf(faceRow.lamp.id) : 0
    const next = (current + step + ids.length) % ids.length
    setFaceId(ids[next])
  }

  function hangSave(lamp, problem) {
    if (problem || !lamp) {
      setHangMiss(problem || missLamp(blankLamp(clock)))
      return
    }
    const next = { ...value, lamps: [...value.lamps, lamp] }
    change(next)
    setHanging(false)
    setHangMiss('')
    armUndo({ book: value, label: 'Lamp hung.' })
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
    setFaceId(row.lamp.id)
    setOpenId('')
  }

  let body = null
  if (hanging) {
    body = (
      <HangLamp
        now={clock}
        miss={hangMiss}
        onSave={hangSave}
        onCancel={() => {
          setHanging(false)
          setHangMiss('')
        }}
      />
    )
  } else if (openLamp) {
    body = (
      <LampDetail lamp={openLamp} onClose={() => setOpenId('')} onRemove={removeLamp} />
    )
  } else if (empty) {
    body = (
      <section className="di-empty">
        <p className="di-empty-plate">Blank plate</p>
        <h2>Nothing is hanging yet.</h2>
        <p>Hang a lamp for the thing you keep asking yourself.</p>
        <button
          className="di-did di-did-small"
          type="button"
          onClick={() => setHanging(true)}
        >
          Hang a lamp
        </button>
      </section>
    )
  } else if (!faceRow && due.length === 0) {
    body = (
      <section className="di-clear">
        <p className="di-face-plate">Tonight</p>
        <h2 className="di-question">Nothing is due.</h2>
        <p>Hang a daily lamp if you need a question on the board tonight.</p>
      </section>
    )
  } else if (hallOn || !faceRow) {
    body = (
      <section className="di-clear">
        <p className="di-face-plate">Tonight</p>
        <h2 className="di-question">The hall is on.</h2>
        <p>Every lamp that needed a tap got one.</p>
      </section>
    )
  } else {
    body = (
      <>
        <LampFace row={faceRow} onYes={() => mark('yes')} onSkip={() => mark('skip')} />
        <NightStrip
          book={value}
          lamp={faceRow.lamp}
          keys={recentPeriodKeys(faceRow.lamp, dateIso, 7)}
        />
      </>
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

        {due.length ? (
          <ul className="di-edge" aria-label="Tonight's lamps">
            {due.map((row) => {
              const on = row.answer && (row.answer.status === 'yes' || row.answer.status === 'late')
              const skip = row.answer?.status === 'skip'
              const late = row.answer?.status === 'late'
              const isFace = faceRow && row.lamp.id === faceRow.lamp.id && !hanging && !openLamp
              return (
                <li key={row.lamp.id}>
                  <button
                    type="button"
                    className={[
                      'di-jewel',
                      on ? 'is-on' : '',
                      skip ? 'is-skip' : '',
                      late ? 'is-late' : '',
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
        ) : null}

        <footer className="di-screws">
          <button
            className="di-text"
            type="button"
            onClick={() => {
              setHanging(true)
              setHangMiss('')
              setOpenId('')
            }}
          >
            Hang a lamp
          </button>
          <button className="di-text" type="button" onClick={() => setTrayOpen((open) => !open)}>
            {trayOpen ? 'Close tray' : 'Tray'}
          </button>
        </footer>

        {trayOpen ? (
          <div className="di-tray">
            <ul className="di-tray-lamps">
              {(value.lamps || []).map((lamp) => (
                <li key={lamp.id}>
                  <button className="di-text" type="button" onClick={() => setOpenId(lamp.id)}>
                    {shortLabel(lamp)}
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
            {loadMiss ? (
              <p className="di-miss" role="alert">
                {loadMiss}
              </p>
            ) : null}
          </div>
        ) : null}

        {undo ? (
          <p className="di-undo">
            {undo.label}{' '}
            <button className="di-text" type="button" onClick={applyUndo}>
              Undo
            </button>
          </p>
        ) : null}
      </div>
    </div>
  )
}
