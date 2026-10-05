import { useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useBackDismiss } from '../site/nav.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { t } from './i18n.js'
import { setShareDiagnostics } from './diagnostics.js'
import { CLOCK_IDS, LOCALE_IDS, THEME_IDS, usePrefs, writePrefs } from './prefs.js'
import { ownedLookIds, readWidgetSettings } from './widget-config.js'
import { applyWidgetPrefs } from './widget-settings.js'
import { readShelf } from './board-shelf.js'
import { answersCsv } from './answers-csv.js'
import { shareCsv } from './native.js'
import { mergeShelves } from './shelf-merge.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { zoneWords } from './zone.js'
import { openFeedback } from './feedback.js'
import { legalEmail } from './legal.js'
import { SetCap, SetCard, SetPick, SetRow, SetSheet, SetSwitch } from './set-bits.jsx'
import { useReduceMotion } from './useReduceMotion.js'

export function Profile({
  book,
  onChange,
  now,
  onStartEmpty,
  onImport,
  onSendCopy,
}) {
  const clock = now || new Date()
  const prefs = usePrefs()
  const still = useReduceMotion()
  const account = useAccount()
  const [confirm, setConfirm] = useState(null)
  const [sheet, setSheet] = useState(null)
  const [loadNote, setLoadNote] = useState('')
  const widget = readWidgetSettings()
  const widgetLooks = [...ownedLookIds(readShelf())].sort()

  function widgetLookWords() {
    if (widget.lookMode === 'tag') return t('widget.settings.lookTag')
    return t(`look.${widget.lookId}.name`)
  }

  useBackDismiss(Boolean(confirm), () => setConfirm(null))

  useEffect(() => {
    if (!sheet) return undefined
    function onKey(event) {
      if (event.key === 'Escape') setSheet(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheet])

  function pickFile() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const parsed = JSON.parse(await file.text())
        const shelf = parsed?.shelf?.boards ? parsed.shelf : parsed?.boards ? parsed : null
        const one = !shelf && parsed?.lamps ? { currentId: parsed.id, boards: [parsed] } : null
        const coming = shelf || one
        if (!coming) {
          setLoadNote(t('settings.loadMiss'))
          return
        }
        const before = readShelf()
        const merged = mergeShelves(before, coming, '', new Date().toISOString())
        onImport(merged)
        const was = before.boards.reduce((n, b) => n + (b.lamps || []).length, 0)
        const nowCount = merged.boards.reduce((n, b) => n + (b.lamps || []).length, 0)
        setLoadNote(t('settings.loadOk', { n: Math.max(0, nowCount - was) }))
      } catch {
        setLoadNote(t('settings.loadMiss'))
      }
    }
    input.click()
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
          <SetRow
            label={t('people.kicker')}
            sub={t('people.rowSub')}
            chevron
            onClick={() => goHash('/people')}
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
            label={t('settings.clock')}
            value={t(`clock.${prefs.clock}`)}
            chevron
            onClick={() => setSheet('clock')}
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

        <SetCap>{t('widget.settings.cap')}</SetCap>
        <SetCard>
          <SetRow
            label={t('widget.settings.look')}
            sub={t('widget.settings.lookSub')}
            value={widgetLookWords()}
            chevron
            onClick={() => setSheet('widgetLook')}
          />
          <SetSwitch
            label={t('widget.settings.openOnly')}
            sub={t('widget.settings.openOnlySub')}
            on={widget.openOnly}
            onClick={() => applyWidgetPrefs({ widgetOpenOnly: !widget.openOnly })}
          />
        </SetCard>

        <SetCap>{t('settings.tonight')}</SetCap>
        <SetCard>
          <SetRow
            label={t('settings.fold')}
            sub={t('settings.foldSub', { zone: zoneWords() })}
            value={t('settings.foldAt')}
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

        <SetCard>
          <SetRow
            label={t('settings.title')}
            sub={t('settings.phoneSub')}
            chevron
            onClick={() => goHash('/settings/phone')}
          />
        </SetCard>

        <SetCap>{t('settings.help')}</SetCap>
        <SetCard>
          {onSendCopy ? (
            <SetRow
              label={t('settings.sendCopy')}
              sub={t('settings.sendCopySub')}
              onClick={onSendCopy}
            />
          ) : null}
          <SetRow
            label={t('settings.sendCsv')}
            sub={t('settings.sendCsvSub')}
            onClick={() => shareCsv(answersCsv(readShelf())).catch(() => {})}
          />
          <SetRow label={t('settings.loadCopy')} sub={t('settings.loadCopySub')} onClick={pickFile} />
          <SetRow label={t('settings.how')} chevron onClick={() => goHash('/help')} />
          <SetRow label={t('feedback.send')} sub={t('feedback.sub')} onClick={openFeedback} />
          <SetRow label={t('settings.ideas')} chevron onClick={() => goHash('/ideas')} />
          <SetRow label={t('settings.what')} chevron onClick={() => goHash('/about')} />
          <SetRow label={t('settings.intro')} chevron onClick={() => goHash('/welcome')} />
        </SetCard>
        {loadNote ? <p className="di-set-note">{loadNote}</p> : null}

        <SetCap>{t('settings.privacyChoices')}</SetCap>
        <SetCard>
          <SetSwitch
            label={t('settings.diagnostics')}
            sub={t('settings.diagnosticsSub')}
            on={Boolean(prefs.shareDiagnostics)}
            onClick={() => setShareDiagnostics(!prefs.shareDiagnostics)}
          />
        </SetCard>

        <SetCap>{t('settings.legal')}</SetCap>
        <SetCard>
          <SetRow label={t('settings.privacy')} chevron onClick={() => goHash('/privacy')} />
          <SetRow label={t('settings.terms')} chevron onClick={() => goHash('/terms')} />
        </SetCard>
        {!legalEmail() ? (
          <p className="di-miss" role="status">
            {t('legal.operatorWarn')}
          </p>
        ) : null}

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

        {sheet === 'clock' ? (
          <SetSheet title={t('settings.clock')} still={still} onClose={() => setSheet(null)}>
            {CLOCK_IDS.map((id) => (
              <SetPick
                key={id}
                label={t(`clock.${id}`)}
                on={prefs.clock === id}
                onClick={() => {
                  writePrefs({ clock: id })
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

        {sheet === 'widgetLook' ? (
          <SetSheet title={t('widget.settings.look')} still={still} onClose={() => setSheet(null)}>
            <SetPick
              label={t('widget.settings.lookTag')}
              on={widget.lookMode === 'tag'}
              onClick={() => {
                applyWidgetPrefs({ widgetLookMode: 'tag' })
                setSheet(null)
              }}
            />
            {widgetLooks.map((id) => (
              <SetPick
                key={id}
                label={t(`look.${id}.name`)}
                on={widget.lookMode === 'pick' && widget.lookId === id}
                onClick={() => {
                  applyWidgetPrefs({ widgetLookMode: 'pick', widgetLookId: id })
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
