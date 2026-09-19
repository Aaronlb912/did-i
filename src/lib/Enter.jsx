import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { markWelcomeSeen } from './hall-pages.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { checkPin, hasPin, keeperNamed, openSession } from './session.js'

export function Enter({
  book,
  onOpenSample,
  onSaveKeeper,
  returnTo = '/',
  returnFace = '',
}) {
  usePrefs()
  const named = keeperNamed(book)
  const locked = named && hasPin()
  const [person, setPerson] = useState(book.keeperName || '')
  const [title, setTitle] = useState(
    book.title && book.title !== 'My hall' && book.title !== 'My board' ? book.title : '',
  )
  const [pin, setPinDraft] = useState('')
  const [miss, setMiss] = useState('')

  function finish() {
    openSession()
    markWelcomeSeen()
    if (returnFace) {
      goHash('/tonight', { face: returnFace })
      return
    }
    goHash(returnTo || '/')
  }

  function openNamed() {
    if (locked) {
      if (!checkPin(pin)) {
        setMiss(t('enter.missPin'))
        return
      }
      setMiss('')
      finish()
      return
    }

    const keeperName = person.trim()
    const boardTitle = title.trim() || book.title || 'Did I'
    setMiss('')
    onSaveKeeper({ keeperName, title: boardTitle })
    finish()
  }

  function later() {
    setMiss('')
    finish()
  }

  function sample() {
    setMiss('')
    if (onOpenSample) onOpenSample()
  }

  return (
    <BoardShell book={book} title={t('welcome.plate')} nav={false} cog={false}>
      <section className="di-page di-enter">
        <p className="di-face-plate">{locked ? t('enter.locked') : t('enter.thisPhone')}</p>
        <h2 className="di-page-title">
          {locked
            ? t('enter.openTitle', { board: book.title })
            : named
              ? t('enter.backTitle')
              : t('enter.whoTitle')}
        </h2>
        <p className="di-detail-meta">{t('enter.body')}</p>

        {locked ? (
          <label className="di-field">
            <span>{t('enter.pin')}</span>
            <input
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(event) => setPinDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  openNamed()
                }
              }}
            />
          </label>
        ) : (
          <>
            <label className="di-field">
              <span>{t('enter.name')}</span>
              <input
                value={person}
                onChange={(event) => setPerson(event.target.value)}
                autoComplete="name"
                placeholder={t('enter.nameHint')}
              />
            </label>
            <label className="di-field">
              <span>{t('enter.board')}</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('enter.boardHint')}
              />
            </label>
          </>
        )}

        {miss ? (
          <p className="di-miss" role="alert">
            {miss}
          </p>
        ) : null}

        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={openNamed}>
            {locked
              ? t('enter.open')
              : named
                ? t('enter.openBoard', { board: book.title })
                : t('enter.openMine')}
          </button>
          {!locked ? (
            <button className="di-key" type="button" onClick={later}>
              {t('enter.later')}
            </button>
          ) : null}
          {!named ? (
            <button className="di-key" type="button" onClick={sample}>
              {t('enter.demo')}
            </button>
          ) : null}
        </div>
      </section>
    </BoardShell>
  )
}
