import { useState } from 'react'
import { goHash } from '../site/hash.js'
import { enterLand } from './board-shelf.js'
import { BoardShell } from './BoardShell.jsx'
import { markWelcomeSeen } from './hall-pages.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { accountMissText, checkCode, sendCode, useAccount } from './account.js'
import { emptyBoard, newBoardId } from './board-json.js'
import { checkPin, clearPin, hasPin, keeperNamed, openSession } from './session.js'

export function Enter({ book, onSaveKeeper, onEraseHere, returnTo = '/', returnFace = '' }) {
  usePrefs()
  const named = keeperNamed(book)
  const locked = hasPin()
  const [person, setPerson] = useState(book.keeperName || '')
  const [title, setTitle] = useState(
    book.title && book.title !== 'My hall' && book.title !== 'My board' ? book.title : '',
  )
  const [pin, setPinDraft] = useState('')
  const [miss, setMiss] = useState('')
  const account = useAccount()
  const email = account.user?.email || ''
  // Forgot PIN: 'code' (signed in, a code to the account email) or 'erase'
  // (signed out, the PIN only lives here so the way past is a fresh start).
  const [forgot, setForgot] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function sendForgotCode() {
    setBusy(true)
    const { miss: bad } = await sendCode(email)
    setBusy(false)
    setMiss(bad ? accountMissText(bad) : '')
  }

  function askForgot() {
    setMiss('')
    if (email) {
      setForgot('code')
      setCode('')
      sendForgotCode()
    } else {
      setForgot('erase')
    }
  }

  async function removeWithCode() {
    setBusy(true)
    const { miss: bad } = await checkCode(email, code)
    setBusy(false)
    if (bad) {
      setMiss(accountMissText(bad))
      return
    }
    clearPin()
    finish()
  }

  function eraseHere() {
    clearPin()
    const fresh = { ...emptyBoard(), id: newBoardId() }
    onEraseHere?.({ currentId: fresh.id, boards: [fresh] })
    openSession()
    goHash('/first')
  }

  function finish() {
    openSession()
    markWelcomeSeen()
    if (returnFace) {
      goHash('/tonight', { face: returnFace })
      return
    }
    goHash(returnTo ?? enterLand('/'))
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
          {locked && !forgot ? (
            <button className="di-key" type="button" onClick={askForgot}>
              {t('enter.forgot')}
            </button>
          ) : null}
        </div>

        {forgot === 'code' ? (
          <div className="di-enter-forgot">
            <p className="di-detail-meta">{t('enter.forgotSent', { email })}</p>
            <label className="di-field">
              <span>{t('account.code')}</span>
              <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} />
            </label>
            <div className="di-hang-actions">
              <button className="di-did di-did-small" type="button" disabled={busy} onClick={removeWithCode}>
                {t('enter.forgotGo')}
              </button>
              <button className="di-key" type="button" disabled={busy} onClick={sendForgotCode}>
                {t('enter.forgotResend')}
              </button>
              <button className="di-key" type="button" onClick={() => setForgot('')}>
                {t('nav.back')}
              </button>
            </div>
          </div>
        ) : null}

        {forgot === 'erase' ? (
          <div className="di-enter-forgot">
            <p className="di-face-plate">{t('enter.forgotTitle')}</p>
            <p className="di-detail-meta">{t('enter.eraseBody')}</p>
            <div className="di-hang-actions">
              <button className="di-key di-key-danger" type="button" onClick={eraseHere}>
                {t('enter.eraseGo')}
              </button>
              <button className="di-key" type="button" onClick={() => setForgot('')}>
                {t('settings.neverMind')}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </BoardShell>
  )
}
