import { useCallback, useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import { useAccount } from './account.js'
import { BoardShell } from './BoardShell.jsx'
import { cloudSetUp } from './cloud.js'
import { myDidYouLinks } from './did-you-links.js'
import { t, tMiss } from './i18n.js'
import { listSent, personName, takeBack } from './people.js'
import { boardDate, formatBoardDate } from './recurrence.js'
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
                {t('sent.to', { name: personName(row.person) || t('people.someone') })}
                {' · '}
                {howItWent(row.state)}
              </em>
            </span>
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
                  </em>
                </span>
              </div>
            ))}
          </SetCard>
        </>
      ) : null}
      {miss ? (
        <p className="di-miss" role="alert">
          {tMiss(miss)}
        </p>
      ) : null}
    </>,
  )
}
