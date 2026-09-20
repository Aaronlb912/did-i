import { useEffect, useState } from 'react'
import { t } from '../lib/i18n.js'
import { fetchWaitlistCount, joinWaitlist, waitlistReady } from './waitlist.js'

export function WaitlistForm({ compact = false }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [dup, setDup] = useState(false)
  const [miss, setMiss] = useState('')
  const [count, setCount] = useState(null)

  useEffect(() => {
    if (!waitlistReady()) return undefined
    let alive = true
    fetchWaitlistCount().then((n) => {
      if (alive && n != null) setCount(n)
    })
    return () => {
      alive = false
    }
  }, [done])

  async function submit(event) {
    event.preventDefault()
    if (busy || done) return
    setMiss('')
    setBusy(true)
    const out = await joinWaitlist(email)
    setBusy(false)
    if (!out.ok) {
      setMiss(t(out.miss))
      return
    }
    setDup(Boolean(out.dup))
    setDone(true)
    if (waitlistReady()) {
      const n = await fetchWaitlistCount()
      if (n != null) setCount(n)
    }
  }

  const formClass = ['di-land-wait', compact ? 'is-compact' : ''].filter(Boolean).join(' ')

  if (done) {
    return (
      <div className={`${formClass} is-done`}>
        <p className="di-land-wait-ok" role="status">
          {dup ? t('web.waitlist.dup') : t('web.waitlist.ok')}
        </p>
        {count != null && count > 0 ? (
          <p className="di-land-wait-count">{t('web.waitlist.count', { n: count })}</p>
        ) : null}
      </div>
    )
  }

  return (
    <form className={formClass} onSubmit={submit}>
      <label className="di-site-field di-land-wait-field">
        <span className="di-site-label">{t('web.waitlist.label')}</span>
        <input
          className="di-site-input"
          type="email"
          name="email"
          autoComplete="email"
          placeholder={t('web.waitlist.placeholder')}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          disabled={busy || !waitlistReady()}
        />
      </label>
      <button className="di-did di-land-wait-btn" type="submit" disabled={busy || !waitlistReady()}>
        {busy ? t('web.waitlist.sending') : t('web.waitlist.submit')}
      </button>
      {miss ? (
        <p className="di-miss" role="alert">
          {miss}
        </p>
      ) : null}
      {!waitlistReady() ? <p className="di-set-note">{t('web.waitlist.offline')}</p> : null}
      {count != null && count > 0 ? (
        <p className="di-land-wait-count">{t('web.waitlist.count', { n: count })}</p>
      ) : null}
    </form>
  )
}
