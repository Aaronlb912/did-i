import { useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import {
  checkCode,
  deleteAccount,
  deviceKey,
  looksLikeEmail,
  sendCode,
  signOutEverywhere,
  signOutHere,
  useAccount,
} from './account.js'
import { BoardShell } from './BoardShell.jsx'
import {
  exportAll,
  forgetDevice,
  listDevices,
  loadProfile,
  pullAndMerge,
  saveProfile,
  signedOutSync,
  useSync,
} from './cloud-sync.js'
import { t, tMiss } from './i18n.js'
import { CHEERS, LOOKS, normalizePurse } from './purse.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { LegalLinks } from './LegalLinks.jsx'
import { SetCap, SetCard, SetField, SetRow } from './set-bits.jsx'

function clockWords(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function syncWords(sync) {
  if (sync.how === 'busy') return t('account.syncBusy')
  if (sync.how === 'miss') return t('account.syncMiss')
  if (sync.how === 'saved') return t('account.syncSaved', { time: clockWords(sync.at) })
  return t('account.syncIdle')
}

function Pop({ note, onClose }) {
  if (!note) return null
  return (
    <div className="di-buy-veil" role="presentation" onClick={onClose}>
      <div
        className="di-buy-pop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="di-account-pop"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="di-face-plate">{note.kicker}</p>
        <h2 id="di-account-pop" className="di-buy-title">
          {note.title}
        </h2>
        <p className="di-detail-meta">{note.body}</p>
        <div className="di-hang-actions">
          <button
            className="di-did di-did-small"
            type="button"
            onClick={() => {
              const go = note.go
              onClose()
              if (typeof go === 'function') go()
            }}
          >
            {note.yes}
          </button>
          <button className="di-key" type="button" onClick={onClose}>
            {t('settings.neverMind')}
          </button>
        </div>
      </div>
    </div>
  )
}

function SignedOut({ on }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email')
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')

  async function ask() {
    if (!looksLikeEmail(email)) {
      setMiss(t('account.missEmail'))
      return
    }
    setBusy(true)
    const { miss: bad } = await sendCode(email)
    setBusy(false)
    if (bad) {
      if (bad === 'off') setMiss(t('account.offBody'))
      else if (bad === 'often') setMiss(t('account.tooOften'))
      else setMiss(bad)
      return
    }
    setMiss('')
    setStep('code')
  }

  async function open() {
    setBusy(true)
    const { miss: bad } = await checkCode(email, code)
    setBusy(false)
    if (bad) {
      setMiss(t('account.missCode'))
      return
    }
    setMiss('')
    await pullAndMerge()
  }

  if (!on) {
    return (
      <>
        <h2 className="di-page-title">{t('account.offTitle')}</h2>
        <p className="di-detail-meta">{t('account.offBody')}</p>
      </>
    )
  }

  return (
    <>
      <h2 className="di-page-title">{t('account.outTitle')}</h2>
      <p className="di-detail-meta">{t('account.outBody')}</p>

      <SetCard>
        <SetField
          label={t('account.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t('account.emailHint')}
          value={email}
          disabled={step === 'code'}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              ask()
            }
          }}
        />
        {step === 'code' ? (
          <SetField
            label={t('account.code')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                open()
              }
            }}
          />
        ) : null}
      </SetCard>

      {step === 'code' ? (
        <p className="di-detail-meta">{t('account.sent', { email })}</p>
      ) : null}

      {miss ? (
        <p className="di-miss" role="alert">
          {miss}
        </p>
      ) : null}

      <LegalLinks leadKey="legal.signInLead" />

      <div className="di-hang-actions">
        {step === 'email' ? (
          <button className="di-did di-did-small" type="button" disabled={busy} onClick={ask}>
            {t('account.send')}
          </button>
        ) : (
          <>
            <button className="di-did di-did-small" type="button" disabled={busy} onClick={open}>
              {t('account.signIn')}
            </button>
            <button className="di-key" type="button" disabled={busy} onClick={ask}>
              {t('account.again')}
            </button>
            <button
              className="di-key"
              type="button"
              onClick={() => {
                setStep('email')
                setCode('')
                setMiss('')
              }}
            >
              {t('account.other')}
            </button>
          </>
        )}
        <button className="di-key" type="button" onClick={() => goHash('/settings')}>
          {t('account.stay')}
        </button>
      </div>
    </>
  )
}

function SignedIn({ book, email, onChange }) {
  const sync = useSync()
  const purse = normalizePurse(book)
  const [nameDraft, setNameDraft] = useState(book.keeperName || '')
  const [devices, setDevices] = useState([])
  const [note, setNote] = useState(null)
  const here = deviceKey()

  useEffect(() => {
    let alive = true
    listDevices().then((rows) => {
      if (alive) setDevices(rows)
    })
    loadProfile().then((row) => {
      if (alive && row?.display_name && !book.keeperName) setNameDraft(row.display_name)
    })
    return () => {
      alive = false
    }
  }, [book.keeperName, sync.at])

  function saveName() {
    const keeperName = nameDraft.trim()
    setNameDraft(keeperName)
    onChange({ ...book, keeperName })
    saveProfile({ display_name: keeperName, look_on: purse.lookOn, badge_cheer: purse.cheerOn })
  }

  const lookName = LOOKS.find((item) => item.id === purse.lookOn)?.name || purse.lookOn
  const cheerName = CHEERS.find((item) => item.id === purse.cheerOn)?.name || purse.cheerOn

  async function download() {
    const all = await exportAll()
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'did-i-account.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <h2 className="di-page-title">{t('account.inTitle')}</h2>

      <SetCap>{t('account.sync')}</SetCap>
      <SetCard>
        <SetRow label={t('account.who')} value={email} />
        <SetRow label={t('account.syncNow')} value={syncWords(sync)} onClick={() => pullAndMerge()} />
      </SetCard>
      {sync.how === 'miss' && sync.miss ? (
        <p className="di-miss" role="alert">
          {tMiss(sync.miss)}
        </p>
      ) : null}

      <SetCap>{t('account.you')}</SetCap>
      <SetCard>
        <SetField
          label={t('account.name')}
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={saveName}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              saveName()
            }
          }}
        />
        <SetRow label={t('account.look')} value={lookName} chevron onClick={() => goHash('/kit')} />
        <SetRow label={t('account.cheer')} value={cheerName} chevron onClick={() => goHash('/kit')} />
      </SetCard>

      <SetCap>{t('account.devices')}</SetCap>
      <SetCard>
        {devices.length ? (
          devices.map((row) => (
            <SetRow
              key={row.device_key}
              label={row.device_key === here ? t('account.thisPhone') : row.label || t('account.aPhone')}
              sub={t('account.seen', { date: clockWords(row.last_seen_at) })}
              value={row.device_key === here ? '' : t('account.forget')}
              onClick={
                row.device_key === here
                  ? undefined
                  : async () => {
                      await forgetDevice(row.device_key)
                      setDevices(await listDevices())
                    }
              }
            />
          ))
        ) : (
          <p className="di-set-note">{t('account.noDevices')}</p>
        )}
      </SetCard>

      <SetCap>{t('account.data')}</SetCap>
      <SetCard>
        <SetRow label={t('account.export')} onClick={download} />
      </SetCard>

      <SetCap>{t('settings.danger')}</SetCap>
      <SetCard>
        <SetRow
          label={t('account.out')}
          onClick={async () => {
            await signOutHere()
            signedOutSync()
          }}
        />
        <SetRow
          label={t('account.outAll')}
          danger
          onClick={() =>
            setNote({
              kicker: t('account.kicker'),
              title: t('account.outAllTitle'),
              body: t('account.outAllBody'),
              yes: t('account.outAllYes'),
              go: async () => {
                await signOutEverywhere()
                signedOutSync()
              },
            })
          }
        />
        <SetRow
          label={t('account.delete')}
          danger
          onClick={() =>
            setNote({
              kicker: t('account.kicker'),
              title: t('account.deleteTitle'),
              body: t('account.deleteBody'),
              yes: t('account.deleteYes'),
              go: async () => {
                await deleteAccount()
                signedOutSync()
              },
            })
          }
        />
      </SetCard>

      <Pop note={note} onClose={() => setNote(null)} />
    </>
  )
}

export function Account({ book, onChange, now }) {
  const clock = now || new Date()
  const account = useAccount()

  return (
    <BoardShell
      book={book}
      now={clock}
      title={t('account.kicker')}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <section className="di-page di-set di-account">
        <p className="di-face-plate">{t('account.kicker')}</p>
        {account.user ? (
          <SignedIn book={book} email={account.email} onChange={onChange} />
        ) : (
          <SignedOut on={account.on} />
        )}
      </section>
    </BoardShell>
  )
}
