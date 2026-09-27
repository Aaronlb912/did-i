import { useCallback, useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { cloudSetUp } from './cloud.js'
import { t, tMiss } from './i18n.js'
import { answerSend, listInbox, personName, refreshPeople } from './people.js'
import { fireCheer } from './purse.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { SetCard } from './set-bits.jsx'
import { useOnline } from './useOnline.js'

export function Inbox({ book, now, onKeep }) {
  const clock = now || new Date()
  const account = useAccount()
  const [rows, setRows] = useState([])
  const [ready, setReady] = useState(false)
  const [miss, setMiss] = useState('')
  const online = useOnline()

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    // Family did yous and allowed friends go onto tonight first.
    await refreshPeople()
    setRows(await listInbox())
    setReady(true)
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])

  async function answer(row, keep) {
    const { miss: why } = await answerSend(row.id, keep)
    if (why) return setMiss(why)
    if (keep && row.kind === 'cheer' && row.cheer_id) fireCheer(row.cheer_id, 1)
    if (keep && row.kind === 'todo' && onKeep) onKeep(row.question)
    return load()
  }

  const shell = (children) => (
    <BoardShell
      book={book}
      now={clock}
      title={t('inbox.kicker')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-set di-people">
        <p className="di-face-plate">{t('inbox.kicker')}</p>
        {online ? null : <p className="di-set-note di-off-line">{t('people.offline')}</p>}
        {children}
      </section>
    </BoardShell>
  )

  if (!cloudSetUp() || !account.user) {
    return shell(
      <>
        <h2 className="di-page-title">{t('inbox.outTitle')}</h2>
        <p className="di-set-note">{t('people.outBody')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/account')}>
            {t('people.goAccount')}
          </button>
        </div>
      </>,
    )
  }

  if (!ready) return shell(<p className="di-set-note">{t('family.loading')}</p>)

  if (!rows.length) {
    return shell(
      <>
        <h2 className="di-page-title">{t('inbox.emptyTitle')}</h2>
        <p className="di-set-note">{t('inbox.emptyBody')}</p>
        <p className="di-set-note">{t('inbox.autoNote')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/people')}>
            {t('inbox.goPeople')}
          </button>
        </div>
      </>,
    )
  }

  return shell(
    <>
      <h2 className="di-page-title">{t('inbox.title')}</h2>
      <p className="di-set-note">{t('inbox.hint')}</p>
      <p className="di-set-note">{t('inbox.autoNote')}</p>
      <SetCard>
        {rows.map((row) => (
          <div className="di-people-row di-family-row" key={row.id}>
            <span className="di-people-who">
              <strong>{row.kind === 'cheer' ? t('inbox.aCheer') : row.question}</strong>
              <em>
                {t('inbox.from', { name: personName(row.person) || t('people.someone') })}
                {row.note ? ` · ${row.note}` : ''}
              </em>
            </span>
            <button className="di-did di-did-small" type="button" onClick={() => answer(row, true)}>
              {row.kind === 'cheer' ? t('inbox.thanks') : t('inbox.keep')}
            </button>
            {row.kind === 'todo' ? (
              <button className="di-key" type="button" onClick={() => answer(row, false)}>
                {t('inbox.pass')}
              </button>
            ) : null}
          </div>
        ))}
      </SetCard>
      {miss ? (
        <p className="di-miss" role="alert">
          {tMiss(miss)}
        </p>
      ) : null}
    </>,
  )
}
