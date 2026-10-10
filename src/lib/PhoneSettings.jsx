import { useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { t } from './i18n.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { SavableSetField } from './SavableSetField.jsx'
import { SetCap, SetCard } from './set-bits.jsx'

export function PhoneSettings({ book, onChange, now }) {
  const clock = now || new Date()
  const [keeperDraft, setKeeperDraft] = useState(book.keeperName || '')
  const [noteDraft, setNoteDraft] = useState(book.inkNote || '')

  useEffect(() => {
    setKeeperDraft(book.keeperName || '')
    setNoteDraft(book.inkNote || '')
  }, [book.keeperName, book.inkNote])

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
          <SavableSetField
            label={t('settings.name')}
            value={keeperDraft}
            savedValue={book.keeperName || ''}
            onChange={(event) => setKeeperDraft(event.target.value)}
            onSave={(keeperName) => {
              setKeeperDraft(keeperName)
              onChange({ ...book, keeperName })
            }}
          />
          <SavableSetField
            label={t('settings.note')}
            value={noteDraft}
            savedValue={book.inkNote || ''}
            placeholder={t('settings.notePh')}
            onChange={(event) => setNoteDraft(event.target.value)}
            onSave={(inkNote) => {
              setNoteDraft(inkNote)
              onChange({ ...book, inkNote })
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
