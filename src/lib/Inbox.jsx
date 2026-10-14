import { useCallback, useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { cloudSetUp } from './cloud.js'
import { WeAsks } from './DidWe.jsx'
import { t, tMiss } from './i18n.js'
import { sendLastLine } from './every-copy.js'
import { repeatLabel } from './send-repeat.js'
import { answerSend, cheerTitle, listInbox, personName, refreshPeople, reportSend } from './people.js'
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
  const [reportId, setReportId] = useState('')
  const online = useOnline()

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    // Family did yous and allowed friends go onto tonight first.
    await refreshPeople()
    const inbox = await listInbox()
    // A failed read keeps the rows we had and says so.
    if (inbox.miss) setMiss('people.reach')
    else setRows(inbox)
    setReady(true)
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])

  async function answer(row, keep) {
    const { miss: why } = await answerSend(row.id, keep)
    if (why) {
      setMiss(why)
      return why === 'sent.gone' ? load() : undefined
    }
    if (keep && row.kind === 'cheer' && row.cheer_id) fireCheer(row.cheer_id, 1)
    if (keep && row.kind === 'todo' && onKeep) onKeep(row)
    return load()
  }

  // Two taps: Report, then Report it? Filed with the question and taken out
  // of the inbox.
  async function report(row) {
    if (reportId !== row.id) return setReportId(row.id)
    setReportId('')
    const { miss: why } = await reportSend(row.id)
    setMiss(why || 'we.reported')
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
        <WeAsks />
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
      <WeAsks />
      <p className="di-set-note">{t('inbox.hint')}</p>
      <p className="di-set-note">{t('inbox.autoNote')}</p>
      <SetCard>
        {rows.map((row) => (
          <div className="di-people-row di-family-row" key={row.id}>
            <span className="di-people-who">
              <strong>{row.kind === 'cheer' ? cheerTitle(row) : row.question}</strong>
              <em>
                {t('inbox.from', { name: personName(row.person) || t('people.someone') })}
                {repeatLabel(row.repeat) ? ` · ${repeatLabel(row.repeat)}` : ''}
                {sendLastLine(row.repeat, row.last_did_on, boardDate()) ? ` · ${sendLastLine(row.repeat, row.last_did_on, boardDate())}` : ''}
                {row.note ? ` · ${row.note}` : ''}
              </em>
            </span>
            <button className="di-did di-did-small" type="button" onClick={() => answer(row, true)}>
              {row.kind === 'cheer' ? t('inbox.thanks') : t('inbox.keep')}
            </button>
            {row.kind === 'todo' ? (
              <>
                <button className="di-key" type="button" onClick={() => answer(row, false)}>
                  {t('inbox.pass')}
                </button>
                {row.appSend ? null : (
                  <button className="di-key" type="button" onClick={() => report(row)}>
                    {reportId === row.id ? t('we.reportSure') : t('we.report')}
                  </button>
                )}
              </>
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
