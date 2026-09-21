import { useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { t } from './i18n.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { closeSession, hasPin } from './session.js'
import { SetCap, SetCard, SetField, SetRow } from './set-bits.jsx'

export function PhoneSettings({ book, onChange, now }) {
  const clock = now || new Date()
  const [keeperDraft, setKeeperDraft] = useState(book.keeperName || '')
  const [noteDraft, setNoteDraft] = useState(book.inkNote || '')

  useEffect(() => {
    setKeeperDraft(book.keeperName || '')
    setNoteDraft(book.inkNote || '')
  }, [book.keeperName, book.inkNote])

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

  return (
    <BoardShell
      book={book}
      now={clock}
      title={t('settings.title')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-set">
        <h2 className="di-page-title">{t('settings.title')}</h2>
        <p className="di-set-note">{t('settings.phoneBody')}</p>

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
            placeholder={t('settings.notePh')}
            onChange={(event) => setNoteDraft(event.target.value)}
            onBlur={saveNote}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                saveNote()
              }
            }}
          />
        </SetCard>

        <SetCap>{t('settings.danger')}</SetCap>
        <SetCard>
          <SetRow
            label={t('settings.signOut')}
            sub={hasPin() ? t('settings.signOutSubPin') : t('settings.signOutSub')}
            danger
            onClick={() => {
              closeSession()
              goHash('/enter')
            }}
          />
        </SetCard>

        <div className="di-hang-actions">
          <button className="di-key" type="button" onClick={() => goHash('/settings')}>
            {t('settings.back')}
          </button>
        </div>
      </section>
    </BoardShell>
  )
}
