import { useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { t } from './i18n.js'
import { LOCALE_IDS, THEME_IDS, usePrefs, writePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { clearPin, closeSession, hasPin, setPin } from './session.js'
import { SetCap, SetCard, SetField, SetPick, SetRow, SetSheet, SetSwitch } from './set-bits.jsx'
import { useReduceMotion } from './useReduceMotion.js'

function foldLabel(hour) {
  return hour === 0 ? t('settings.midnight') : `${hour}:00 AM`
}

export function Profile({
  book,
  onChange,
  now,
  installLabel,
  onInstall,
  onStartEmpty,
  onLoadDemo,
}) {
  const clock = now || new Date()
  const prefs = usePrefs()
  const still = useReduceMotion()
  const account = useAccount()
  const [keeperDraft, setKeeperDraft] = useState(book.keeperName || '')
  const [noteDraft, setNoteDraft] = useState(book.inkNote || '')
  const [pinDraft, setPinDraft] = useState('')
  const [pinMiss, setPinMiss] = useState('')
  const [pinOn, setPinOn] = useState(hasPin)
  const [confirm, setConfirm] = useState(null)
  const [sheet, setSheet] = useState(null)
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
                const go = confirm.go
                setConfirm(null)
                if (typeof go === 'function') go()
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

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className={sheet ? 'di-page di-fuse di-set is-sheet' : 'di-page di-fuse di-set'}>
        <h2 className="di-page-title">{t('settings.kicker')}</h2>

        <SetCap>{t('account.kicker')}</SetCap>
        <SetCard>
          <SetRow
            label={t('settings.account')}
            sub={account.email ? t('settings.accountSub') : t('settings.accountOffSub')}
            value={account.email || t('settings.accountOff')}
            chevron
            onClick={() => goHash('/account')}
          />
        </SetCard>

        <SetCap>{t('settings.look')}</SetCap>
        <SetCard>
          <SetRow
            label={t('settings.theme')}
            value={t(`theme.${prefs.theme}`)}
            chevron
            onClick={() => setSheet('theme')}
          />
          <SetRow
            label={t('settings.language')}
            value={t(`lang.${prefs.locale}`)}
            chevron
            onClick={() => setSheet('lang')}
          />
          <SetSwitch
            label={t('settings.lessMotion')}
            on={prefs.lessMotion}
            onClick={() => writePrefs({ lessMotion: !prefs.lessMotion })}
          />
        </SetCard>

        <SetCap>{t('settings.title')}</SetCap>
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
          {onInstall && installLabel ? (
            <SetRow label={t('settings.install')} onClick={onInstall} />
          ) : null}
        </SetCard>
        {pinMiss ? (
          <p className="di-miss" role="alert">
            {pinMiss}
          </p>
        ) : null}

        <SetCap>{t('settings.tonight')}</SetCap>
        <SetCard>
          <SetRow
            label={t('settings.fold')}
            value={foldLabel(book.dayFoldHour)}
            chevron
            onClick={() => setSheet('fold')}
          />
          <SetRow label={t('settings.reminders')} chevron onClick={() => goHash('/pings')} />
          <SetSwitch
            label={t('settings.soundOn')}
            on={Boolean(book.clickSound)}
            onClick={() => onChange({ ...book, clickSound: !book.clickSound })}
          />
          <SetSwitch
            label={t('settings.hideMarks')}
            on={Boolean(book.quietMode)}
            onClick={() => onChange({ ...book, quietMode: !book.quietMode })}
          />
        </SetCard>

        <SetCap>{t('tags.aria')}</SetCap>
        <SetCard>
          <SetRow
            label={t('tags.aria')}
            sub={t('tags.openHint')}
            chevron
            onClick={() => goHash('/me')}
          />
        </SetCard>

        <SetCap>{t('settings.help')}</SetCap>
        <SetCard>
          {onLoadDemo ? (
            <SetRow
              label={t('settings.demo')}
              onClick={() =>
                setConfirm({
                  kicker: t('settings.demo'),
                  title: t('settings.demoTitle'),
                  body: t('settings.demoBody'),
                  yes: t('settings.demoYes'),
                  go: onLoadDemo,
                })
              }
            />
          ) : null}
          <SetRow label={t('settings.how')} chevron onClick={() => goHash('/help')} />
          <SetRow label={t('settings.ideas')} chevron onClick={() => goHash('/ideas')} />
          <SetRow label={t('settings.what')} chevron onClick={() => goHash('/about')} />
          <SetRow label={t('settings.intro')} chevron onClick={() => goHash('/welcome')} />
        </SetCard>

        <SetCap>{t('settings.danger')}</SetCap>
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
          <SetRow
            label={t('settings.leaveBoard')}
            danger
            onClick={() => {
              closeSession()
              goHash('/enter')
            }}
          />
        </SetCard>

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
