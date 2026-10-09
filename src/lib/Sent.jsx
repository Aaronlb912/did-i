import { useCallback, useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { cloudSetUp } from './cloud.js'
import { canEditSent, cleanSentEdit, endDidYouLink, myDidYouLinks } from './did-you-links.js'
import { t, tMiss } from './i18n.js'
import { editSend, listSent, personName, takeBack } from './people.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { sendLastLine } from './every-copy.js'
import { repeatLabel } from './send-repeat.js'
import { SetCard } from './set-bits.jsx'
import { useOnline } from './useOnline.js'

function howItWent(state) {
  if (state === 'kept') return t('sent.kept')
  if (state === 'passed') return t('sent.passed')
  return t('sent.waiting')
}

export function Sent({ book, now }) {
  const clock = now || new Date()
  const account = useAccount()
  const online = useOnline()
  const [rows, setRows] = useState([])
  const [links, setLinks] = useState([])
  const [ready, setReady] = useState(false)
  const [miss, setMiss] = useState('')
  const [editing, setEditing] = useState(null)
  const [stopping, setStopping] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    const [sent, made] = await Promise.all([listSent(), myDidYouLinks().catch(() => [])])
    setRows(sent)
    setLinks(made)
    setReady(true)
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])

  async function saveEdit() {
    if (busy || !editing) return
    const { text, miss: why } = cleanSentEdit(editing.text)
    if (why) {
      setMiss(why)
      return
    }
    setBusy(true)
    setMiss('')
    setNote('')
    const out = await editSend(editing.id, text)
    setBusy(false)
    if (out.miss) setMiss(out.miss)
    else {
      setEditing(null)
      setNote(t('sent.edited'))
    }
    load()
  }

  async function stopLink() {
    if (busy || !stopping) return
    setBusy(true)
    setMiss('')
    setNote('')
    const out = await endDidYouLink(stopping)
    setBusy(false)
    setStopping('')
    if (out.miss) setMiss(out.miss)
    else setNote(t('sent.linkStopped'))
    load()
  }

  const shell = (children) => (
    <BoardShell
      book={book}
      now={clock}
      title={t('sent.kicker')}
      date={formatBoardDate(boardDate(clock))}
    >
      <section className="di-page di-set di-people">
        <p className="di-face-plate">{t('sent.kicker')}</p>
        {online ? null : <p className="di-set-note di-off-line">{t('people.offline')}</p>}
        {children}
      </section>
    </BoardShell>
  )

  if (!cloudSetUp() || !account.user) {
    return shell(
      <>
        <h2 className="di-page-title">{t('people.outTitle')}</h2>
        <p className="di-set-note">{t('people.outBody')}</p>
      </>,
    )
  }

  if (!ready) return shell(<p className="di-set-note">{t('family.loading')}</p>)

  if (!rows.length && !links.length) {
    return shell(
      <>
        <h2 className="di-page-title">{t('sent.emptyTitle')}</h2>
        <p className="di-set-note">{t('sent.emptyBody')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/friends')}>
            {t('sent.goFriends')}
          </button>
        </div>
      </>,
    )
  }

  return shell(
    <>
      <h2 className="di-page-title">{t('sent.title')}</h2>
      <p className="di-set-note">{t('sent.hint')}</p>
      {rows.length ? (
      <SetCard>
        {rows.map((row) => (
          <div className="di-people-row di-family-row" key={row.id}>
            <span className="di-people-who">
              <strong>{row.kind === 'cheer' ? t('inbox.aCheer') : row.question}</strong>
              <em>
                {[t('sent.to', { name: personName(row.person) || t('people.someone') }), repeatLabel(row.repeat), sendLastLine(row.repeat, row.last_did_on, boardDate())]
                  .filter(Boolean)
                  .join(' · ')}
                {' · '}
                {howItWent(row.state)}
              </em>
            </span>
            {canEditSent(row) ? (
              <button className="di-key" type="button" onClick={() => setEditing({ id: row.id, text: row.question })}>
                {t('sent.edit')}
              </button>
            ) : null}
            {row.state === 'sent' ? (
              <button
                className="di-key"
                type="button"
                onClick={async () => {
                  const { miss: why } = await takeBack(row.id)
                  if (why) setMiss(why)
                  load()
                }}
              >
                {t('sent.takeBack')}
              </button>
            ) : null}
          </div>
        ))}
      </SetCard>
      ) : null}
      {links.length ? (
        <>
          <p className="di-set-cap">{t('sent.linksCap')}</p>
          <SetCard>
            {links.map((link) => (
              <div className="di-people-row di-family-row" key={link.code}>
                <span className="di-people-who">
                  <strong>{link.question}</strong>
                  <em>
                    {link.kept.length
                      ? t('sent.keptBy', { names: link.kept.map((row) => row.name || t('sent.keptAnon')).join(', ') })
                      : t('sent.keptNone')}
                    {link.ended ? ` · ${t('sent.stoppedNote')}` : ''}
                  </em>
                </span>
                {link.ended ? null : (
                  <button className="di-key" type="button" onClick={() => setStopping(link.code)}>
                    {t('sent.stopLink')}
                  </button>
                )}
              </div>
            ))}
          </SetCard>
        </>
      ) : null}
      {editing ? (
        <div className="di-we-sure" role="dialog" aria-label={t('sent.editTitle')}>
          <label className="di-field">
            <span>{t('sent.editTitle')}</span>
            <input
              value={editing.text}
              maxLength={200}
              onChange={(event) => setEditing({ ...editing, text: event.target.value })}
            />
          </label>
          <div className="di-hang-actions">
            <button className="di-did di-did-small" type="button" disabled={busy} onClick={saveEdit}>
              {t('sent.editSave')}
            </button>
            <button className="di-key" type="button" onClick={() => setEditing(null)}>
              {t('settings.neverMind')}
            </button>
          </div>
        </div>
      ) : null}
      {stopping ? (
        <div className="di-we-sure" role="alertdialog" aria-label={t('sent.stopTitle')}>
          <p>
            <strong>{t('sent.stopTitle')}</strong>
          </p>
          <p className="di-set-note">{t('sent.stopBody')}</p>
          <div className="di-hang-actions">
            <button className="di-did di-did-small" type="button" disabled={busy} onClick={stopLink}>
              {t('sent.stopLink')}
            </button>
            <button className="di-key" type="button" onClick={() => setStopping('')}>
              {t('settings.neverMind')}
            </button>
          </div>
        </div>
      ) : null}
      {note && !miss ? (
        <p className="di-set-note" role="status">
          {note}
        </p>
      ) : null}
      {miss ? (
        <p className="di-miss" role="alert">
          {tMiss(miss)}
        </p>
      ) : null}
    </>,
  )
}
