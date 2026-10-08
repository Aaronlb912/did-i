import { useEffect, useState } from 'react'
import { goHash } from '../site/hash.js'
import {
  deleteAccount,
  deviceKey,
  signOutEverywhere,
  signOutHere,
  useAccount,
} from './account.js'
import { BoardShell } from './BoardShell.jsx'
import {
  exportAll,
  forgetDevice,
  listDevices,
  keptProfileName,
  loadProfile,
  pullAndMerge,
  saveProfile,
  signedOutSync,
  useSync,
} from './cloud-sync.js'
import { t, tMiss } from './i18n.js'
import { uses24h } from './prefs.js'
import { CHEERS, LOOKS, normalizePurse } from './purse.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { LegalLinks } from './LegalLinks.jsx'
import { AuthAppleSignIn } from './AuthAppleSignIn.jsx'
import { AuthGoogleSignIn } from './AuthGoogleSignIn.jsx'
import { useAuthSignIn } from './useAuthSignIn.js'
import { clearPin, hasPin, setPin } from './session.js'
import { SavableSetField } from './SavableSetField.jsx'
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
    hour12: !uses24h(),
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

function PhoneLockCard() {
  const [pinDraft, setPinDraft] = useState('')
  const [pinMiss, setPinMiss] = useState('')
  const [pinSaved, setPinSaved] = useState(false)
  const [pinOn, setPinOn] = useState(hasPin)
  const locked = pinOn

  function saveLock() {
    if (!setPin(pinDraft)) {
      setPinMiss(t('settings.pinDigits'))
      setPinSaved(false)
      return
    }
    setPinMiss('')
    setPinDraft('')
    setPinOn(true)
    setPinSaved(true)
    window.setTimeout(() => setPinSaved(false), 2000)
  }

  return (
    <>
      <SetCap>{t('account.lockCap')}</SetCap>
      <SetCard>
        <p className="di-set-note">{locked ? t('settings.lockOn') : t('settings.lockOff')}</p>
        <SetField
          label={locked ? t('settings.newNumber') : t('settings.number')}
          inputMode="numeric"
          autoComplete="off"
          value={pinDraft}
          onChange={(event) => setPinDraft(event.target.value)}
        />
        <SetRow label={locked ? t('settings.changeNumber') : t('settings.lockPhone')} onClick={saveLock} />
        {locked ? (
          <SetRow
            label={t('settings.removeLock')}
            danger
            onClick={() => {
              clearPin()
              setPinDraft('')
              setPinMiss('')
              setPinOn(false)
            }}
          />
        ) : null}
      </SetCard>
      {pinMiss ? (
        <p className="di-miss" role="alert">
          {pinMiss}
        </p>
      ) : null}
      {pinSaved ? <p className="di-savable-field-saved">{t('settings.saved')}</p> : null}
    </>
  )
}

function SignedOut({ on }) {
  const auth = useAuthSignIn({})

  if (!on) {
    return (
      <>
        <h2 className="di-page-title">{t('account.offTitle')}</h2>
        <p className="di-detail-meta">{t('account.offBody')}</p>
        <p className="di-detail-meta">{t('account.offTester')}</p>
      </>
    )
  }

  return (
    <>
      <h2 className="di-page-title">{t('account.outTitle')}</h2>
      <p className="di-detail-meta di-account-lead">{t('account.outBody')}</p>

      <div className="di-auth-card">
        <p className="di-set-cap">{t('account.kicker')}</p>
        <h3 className="di-auth-card-title">{t('auth.title')}</h3>
        {auth.step === 'start' ? <p className="di-auth-card-note">{t('auth.newHere')}</p> : null}

        <SetField
          label={t('account.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t('account.emailHint')}
          value={auth.email}
          disabled={auth.step === 'code'}
          onChange={(event) => auth.setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              auth.askEmail()
            }
          }}
        />
        {auth.step === 'code' ? (
          <SetField
            label={t('account.code')}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={auth.code}
            onChange={(event) => auth.setCode(event.target.value.replace(/\D/g, ''))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                auth.openEmail()
              }
            }}
          />
        ) : null}

        {auth.step === 'code' && !auth.miss ? (
          <p className="di-auth-card-note">{t('account.sent', { email: auth.email })}</p>
        ) : null}
        {auth.step === 'reviewer' ? (
          <SetField
            label={t('auth.password')}
            type="password"
            autoComplete="current-password"
            value={auth.password}
            onChange={(event) => auth.setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                auth.openReviewer()
              }
            }}
          />
        ) : null}

        {auth.miss ? (
          <p className="di-miss" role="alert">
            {auth.miss}
          </p>
        ) : null}

        <AuthAppleSignIn auth={auth} />
        <AuthGoogleSignIn auth={auth} />

        <div className="di-hang-actions di-auth-card-actions">
          {auth.step === 'start' ? (
            <button className="di-did di-did-small" type="button" disabled={auth.busy} onClick={auth.askEmail}>
              {t('account.send')}
            </button>
          ) : auth.step === 'reviewer' ? (
            <>
              <button className="di-did di-did-small" type="button" disabled={auth.busy} onClick={auth.openReviewer}>
                {t('account.signIn')}
              </button>
              <button className="di-key" type="button" onClick={auth.useDifferentEmail}>
                {t('account.other')}
              </button>
            </>
          ) : (
            <>
              <button className="di-did di-did-small" type="button" disabled={auth.busy} onClick={auth.openEmail}>
                {t('account.signIn')}
              </button>
              <button className="di-key" type="button" disabled={auth.busy} onClick={auth.askEmail}>
                {t('account.again')}
              </button>
              <button className="di-key" type="button" onClick={auth.useDifferentEmail}>
                {t('account.other')}
              </button>
            </>
          )}
          <button className="di-key" type="button" onClick={() => goHash('/settings')}>
            {t('account.stay')}
          </button>
        </div>

        <LegalLinks leadKey="legal.signInLead" subtle />
        {auth.step === 'start' ? (
          <button className="di-auth-reviewer" type="button" onClick={auth.showReviewer}>
            {t('auth.reviewer')}
          </button>
        ) : null}
      </div>

      <div className="di-auth-lock">
        <PhoneLockCard />
      </div>
    </>
  )
}

function SignedIn({ book, email, onChange }) {
  const sync = useSync()
  const purse = normalizePurse(book)
  const [nameDraft, setNameDraft] = useState(book.keeperName || keptProfileName())
  const [nameMiss, setNameMiss] = useState('')
  const [devices, setDevices] = useState([])
  // Until the list comes back, say nothing rather than "only this phone".
  const [devicesIn, setDevicesIn] = useState(false)
  const [note, setNote] = useState(null)
  const here = deviceKey()

  useEffect(() => {
    let alive = true
    listDevices().then((rows) => {
      if (!alive) return
      setDevices(rows)
      setDevicesIn(true)
    })
    loadProfile().then((row) => {
      if (alive && row?.display_name && !book.keeperName) setNameDraft(row.display_name)
    })
    return () => {
      alive = false
    }
  }, [book.keeperName, sync.at])

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
        <p className="di-detail-meta">{t('account.syncNote')}</p>
      </SetCard>
      {sync.how === 'miss' && sync.miss ? (
        <p className="di-miss" role="alert">
          {tMiss(sync.miss)}
        </p>
      ) : null}

      <SetCap>{t('account.you')}</SetCap>
      <SetCard>
        <SavableSetField
          label={t('account.name')}
          value={nameDraft}
          savedValue={book.keeperName || ''}
          onChange={(event) => setNameDraft(event.target.value)}
          onSave={async (keeperName) => {
            setNameDraft(keeperName)
            setNameMiss('')
            onChange({ ...book, keeperName })
            try {
              const out = await saveProfile({ display_name: keeperName, look_on: purse.lookOn, badge_cheer: purse.cheerOn })
              if (out?.miss && out.miss !== 'out' && out.miss !== 'off') {
                setNameMiss(tMiss(out.miss))
                return false
              }
            } catch {
              setNameMiss(t('confirm.miss'))
              return false
            }
          }}
        />
        {nameMiss ? (
          <p className="di-miss" role="alert">
            {nameMiss}
          </p>
        ) : null}
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
          devicesIn ? <p className="di-set-note">{t('account.noDevices')}</p> : null
        )}
      </SetCard>

      <PhoneLockCard />

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
                try {
                  await signOutEverywhere()
                  signedOutSync()
                } catch {
                  // Still signed in here; say so instead of looking done.
                  setNote({ kicker: t('account.kicker'), title: t('confirm.miss'), yes: t('linkGuide.ok'), go: () => {} })
                }
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
