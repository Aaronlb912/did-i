import { useEffect, useRef, useState } from 'react'
import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { downloadBook, parseBookText } from './board-json.js'
import { statsCounts } from './hall-pages.js'
import { t } from './i18n.js'
import { LOCALE_IDS, THEME_IDS, usePrefs, writePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { clearPin, closeSession, hasPin, setPin } from './session.js'
import { useReduceMotion } from './useReduceMotion.js'

function foldLabel(hour) {
  return hour === 0 ? t('settings.midnight') : `${hour}:00 AM`
}

function SetCard({ children }) {
  return <div className="di-set-card">{children}</div>
}

function SetCap({ children }) {
  return <p className="di-set-cap">{children}</p>
}

function SetRow({ label, value, sub, onClick, chevron, danger }) {
  return (
    <button
      className={danger ? 'di-set-row is-miss' : 'di-set-row'}
      type="button"
      onClick={onClick}
    >
      <span className="di-set-copy">
        <span>{label}</span>
        {sub ? <small>{sub}</small> : null}
      </span>
      <span className="di-set-end">
        {value ? <span className="di-set-val">{value}</span> : null}
        {chevron ? <i className="di-set-chev" aria-hidden="true" /> : null}
      </span>
    </button>
  )
}

function SetSwitch({ label, sub, on, onClick }) {
  return (
    <button
      className="di-set-row"
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
    >
      <span className="di-set-copy">
        <span>{label}</span>
        {sub ? <small>{sub}</small> : null}
      </span>
      <span className={on ? 'di-set-switch is-on' : 'di-set-switch'} aria-hidden="true">
        <i />
      </span>
    </button>
  )
}

function SetField({ label, ...inputProps }) {
  return (
    <label className="di-set-row di-set-field">
      <span>{label}</span>
      <input {...inputProps} />
    </label>
  )
}

function SetPick({ label, on, onClick }) {
  return (
    <button
      className={on ? 'di-set-row is-on' : 'di-set-row'}
      type="button"
      aria-pressed={on}
      onClick={onClick}
    >
      <span>{label}</span>
      {on ? (
        <span className="di-set-check" aria-hidden="true">
          ✓
        </span>
      ) : null}
    </button>
  )
}

function SetSheet({ title, onClose, still, children }) {
  return (
    <div className="di-set-veil" role="presentation" onClick={onClose}>
      <div
        className={still ? 'di-set-sheet is-still' : 'di-set-sheet'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="di-set-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="di-set-sheet-bar">
          <p id="di-set-sheet-title" className="di-set-sheet-title">
            {title}
          </p>
          <button className="di-set-x" type="button" onClick={onClose} aria-label={t('settings.close')}>
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Profile({
  book,
  onChange,
  now,
  installLabel,
  onInstall,
  onShare,
  onStartEmpty,
  onResetSample,
  onAddTestBoards,
}) {
  const clock = now || new Date()
  const prefs = usePrefs()
  const still = useReduceMotion()
  const fileRef = useRef(null)
  const [keeperDraft, setKeeperDraft] = useState(book.keeperName || '')
  const [noteDraft, setNoteDraft] = useState(book.inkNote || '')
  const [pinDraft, setPinDraft] = useState('')
  const [pinMiss, setPinMiss] = useState('')
  const [pinOn, setPinOn] = useState(hasPin)
  const [loadMiss, setLoadMiss] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [sheet, setSheet] = useState(null)
  const counts = statsCounts(book, clock)
  const locked = pinOn

  useEffect(() => {
    if (!sheet) return undefined
    function onKey(event) {
      if (event.key === 'Escape') setSheet(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet])

  function saveKeeper() {
    const keeperName = keeperDraft.trim()
    setKeeperDraft(keeperName)
    onChange({ ...book, keeperName })
  }

  function saveNote() {
    const inkNote = noteDraft.trim()
    setNoteDraft(inkNote)
    onChange({ ...book, inkNote })
  }

  function saveLock() {
    if (!setPin(pinDraft)) {
      setPinMiss(t('settings.pinDigits'))
      return
    }
    setPinMiss('')
    setPinDraft('')
    setPinOn(true)
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
      onChange(parsed.book)
    }
    reader.readAsText(file)
  }

  if (confirm) {
    return (
      <BoardShell
        book={book}
        now={clock}
        title={book.title}
        date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
      >
        <section className="di-face">
          <p className="di-face-plate">{confirm.kicker}</p>
          <h2 className="di-question">{confirm.title}</h2>
          <p className="di-detail-meta">{confirm.body}</p>
          <div className="di-hang-actions">
            <button
              className="di-did di-did-small"
              type="button"
              onClick={() => {
                confirm.go()
                setConfirm(null)
              }}
            >
              {confirm.yes}
            </button>
            <button className="di-key" type="button" onClick={() => setConfirm(null)}>
              {t('settings.neverMind')}
            </button>
          </div>
        </section>
      </BoardShell>
    )
  }

  const boardCount = t('settings.boardCount', {
    hung: counts.hung,
    questionWord: counts.hung === 1 ? t('settings.questionOne') : t('settings.questionMany'),
    taps: counts.did + counts.late + counts.skip,
  })

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className={sheet ? 'di-page di-fuse di-set is-sheet' : 'di-page di-fuse di-set'}>
        <p className="di-face-plate">{t('settings.kicker')}</p>
        <h2 className="di-page-title">{t('settings.title')}</h2>
        <p className="di-detail-meta">{boardCount}</p>

        <SetCap>{t('settings.follow')}</SetCap>
        <SetCard>
          <SetRow
            label={t('settings.language')}
            value={t(`lang.${prefs.locale}`)}
            chevron
            onClick={() => setSheet('lang')}
          />
          <SetRow
            label={t('settings.theme')}
            value={t(`theme.${prefs.theme}`)}
            chevron
            onClick={() => setSheet('theme')}
          />
          <SetSwitch
            label={t('settings.lessMotion')}
            sub={t('settings.motionHint')}
            on={prefs.lessMotion}
            onClick={() => writePrefs({ lessMotion: !prefs.lessMotion })}
          />
        </SetCard>

        <SetCard>
          <SetField
            label={t('settings.name')}
            value={keeperDraft}
            onChange={(event) => setKeeperDraft(event.target.value)}
            onBlur={saveKeeper}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                saveKeeper()
              }
            }}
          />
          <SetField
            label={t('settings.note')}
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            onBlur={saveNote}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                saveNote()
              }
            }}
            placeholder={t('settings.notePh')}
          />
          <SetRow
            label={t('settings.fold')}
            value={foldLabel(book.dayFoldHour)}
            chevron
            onClick={() => setSheet('fold')}
          />
        </SetCard>

        <SetCap>{t('settings.feel')}</SetCap>
        <SetCard>
          <SetRow label={t('settings.pings')} chevron onClick={() => goHash('/pings')} />
          <SetSwitch
            label={t('settings.sound')}
            on={Boolean(book.clickSound)}
            onClick={() => onChange({ ...book, clickSound: !book.clickSound })}
          />
          <SetSwitch
            label={t('settings.hideMarks')}
            on={Boolean(book.quietMode)}
            onClick={() => onChange({ ...book, quietMode: !book.quietMode })}
          />
          {onInstall && installLabel ? (
            <SetRow label={t('settings.install')} onClick={onInstall} />
          ) : null}
        </SetCard>

        <SetCap>{t('settings.lock')}</SetCap>
        <p className="di-set-note">{locked ? t('settings.lockOn') : t('settings.lockOff')}</p>
        <SetCard>
          <SetField
            label={locked ? t('settings.newNumber') : t('settings.number')}
            inputMode="numeric"
            autoComplete="off"
            value={pinDraft}
            onChange={(event) => setPinDraft(event.target.value)}
          />
          <SetRow
            label={locked ? t('settings.changeNumber') : t('settings.lockPhone')}
            onClick={saveLock}
          />
          {locked ? (
            <SetRow
              label={t('settings.removeLock')}
              danger
              onClick={() => {
                clearPin()
                setPinDraft('')
                setPinMiss('')
                setPinOn(false)
              }}
            />
          ) : null}
        </SetCard>
        {pinMiss ? (
          <p className="di-miss" role="alert">
            {pinMiss}
          </p>
        ) : null}

        <SetCap>{t('settings.copy')}</SetCap>
        <SetCard>
          <SetRow label={t('settings.saveCopy')} onClick={() => downloadBook(book)} />
          <SetRow label={t('settings.loadCopy')} onClick={() => fileRef.current?.click()} />
          {onShare ? <SetRow label={t('settings.sendCopy')} onClick={onShare} /> : null}
          <SetRow label={t('settings.print')} onClick={() => window.print()} />
        </SetCard>
        {loadMiss ? (
          <p className="di-miss" role="alert">
            {loadMiss}
          </p>
        ) : null}

        <SetCap>{t('settings.startOver')}</SetCap>
        <SetCard>
          {onStartEmpty ? (
            <SetRow
              label={t('settings.emptyBoard')}
              danger
              onClick={() =>
                setConfirm({
                  kicker: t('settings.startOver'),
                  title: t('settings.clearTitle'),
                  body: t('settings.clearBody'),
                  yes: t('settings.clearYes'),
                  go: onStartEmpty,
                })
              }
            />
          ) : null}
          {onResetSample ? (
            <SetRow
              label={t('settings.hayes')}
              onClick={() =>
                setConfirm({
                  kicker: t('settings.sample'),
                  title: t('settings.sampleTitle'),
                  body: t('settings.sampleBody'),
                  yes: t('settings.sampleYes'),
                  go: onResetSample,
                })
              }
            />
          ) : null}
          {onAddTestBoards ? (
            <SetRow
              label={t('settings.addTests')}
              onClick={() =>
                setConfirm({
                  kicker: t('settings.try'),
                  title: t('settings.tryTitle'),
                  body: t('settings.tryBody'),
                  yes: t('settings.tryYes'),
                  go: onAddTestBoards,
                })
              }
            />
          ) : null}
        </SetCard>

        <SetCap>{t('settings.about')}</SetCap>
        <SetCard>
          <SetRow label={t('nav.boards')} chevron onClick={() => goHash('/me')} />
          <SetRow label={t('settings.how')} chevron onClick={() => goHash('/help')} />
          <SetRow label={t('settings.ideas')} chevron onClick={() => goHash('/ideas')} />
          <SetRow label={t('settings.what')} chevron onClick={() => goHash('/about')} />
          <SetRow label={t('settings.intro')} chevron onClick={() => goHash('/welcome')} />
        </SetCard>

        <SetCap>{t('settings.leave')}</SetCap>
        <p className="di-set-note">{locked ? t('settings.leaveHintOn') : t('settings.leaveHintOff')}</p>
        <SetCard>
          <SetRow
            label={t('settings.leaveBoard')}
            danger
            onClick={() => {
              closeSession()
              goHash('/enter')
            }}
          />
        </SetCard>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={onLoadFile}
        />

        {sheet === 'theme' ? (
          <SetSheet title={t('settings.theme')} still={still} onClose={() => setSheet(null)}>
            {THEME_IDS.map((id) => (
              <SetPick
                key={id}
                label={t(`theme.${id}`)}
                on={prefs.theme === id}
                onClick={() => {
                  writePrefs({ theme: id })
                  setSheet(null)
                }}
              />
            ))}
          </SetSheet>
        ) : null}

        {sheet === 'lang' ? (
          <SetSheet title={t('settings.language')} still={still} onClose={() => setSheet(null)}>
            {LOCALE_IDS.map((id) => (
              <SetPick
                key={id}
                label={t(`lang.${id}`)}
                on={prefs.locale === id}
                onClick={() => {
                  writePrefs({ locale: id })
                  setSheet(null)
                }}
              />
            ))}
          </SetSheet>
        ) : null}

        {sheet === 'fold' ? (
          <SetSheet title={t('settings.fold')} still={still} onClose={() => setSheet(null)}>
            {[0, 1, 2, 3, 4, 5, 6].map((hour) => (
              <SetPick
                key={hour}
                label={foldLabel(hour)}
                on={Number(book.dayFoldHour) === hour}
                onClick={() => {
                  onChange({ ...book, dayFoldHour: hour })
                  setSheet(null)
                }}
              />
            ))}
          </SetSheet>
        ) : null}
      </section>
    </BoardShell>
  )
}
