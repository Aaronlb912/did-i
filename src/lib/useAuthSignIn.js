import { useCallback, useEffect, useState } from 'react'
import { accountMissText, checkCode, looksLikeEmail, sendCode } from './account.js'
import { clearAuthSkip } from './auth-gate.js'
import { cloud } from './cloud.js'
import { armSyncForUser, pullAndMerge } from './cloud-sync.js'
import { t } from './i18n.js'

export function useAuthSignIn({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('start')
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')

  const finish = useCallback(async () => {
    clearAuthSkip()
    armSyncForUser()
    await pullAndMerge()
    onSignedIn?.()
  }, [onSignedIn])

  useEffect(() => {
    const db = cloud()
    if (!db) return undefined
    let alive = true
    db.auth.getSession().then(({ data }) => {
      if (!alive || !data?.session) return
      finish().catch(() => {})
    })
    return () => {
      alive = false
    }
  }, [finish])

  async function askEmail() {
    if (!looksLikeEmail(email)) {
      setMiss(t('account.missEmail'))
      return
    }
    setBusy(true)
    const { miss: bad } = await sendCode(email)
    setBusy(false)
    if (bad) {
      setMiss(accountMissText(bad))
      return
    }
    setMiss('')
    setStep('code')
  }

  async function openEmail() {
    setBusy(true)
    const { miss: bad } = await checkCode(email, code)
    setBusy(false)
    if (bad) {
      setMiss(accountMissText(bad))
      return
    }
    setMiss('')
    await finish()
  }

  function useDifferentEmail() {
    setStep('start')
    setEmail('')
    setCode('')
    setMiss('')
  }

  return {
    email,
    setEmail,
    code,
    setCode,
    step,
    setStep,
    busy,
    miss,
    setMiss,
    askEmail,
    openEmail,
    useDifferentEmail,
  }
}
