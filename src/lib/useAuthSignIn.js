import { useCallback, useEffect, useRef, useState } from 'react'
import { accountMissText, checkCode, looksLikeEmail, sendCode, signInReviewer } from './account.js'
import { canShowAppleSignIn, signInWithApple } from './apple-sign-in'
import { canShowGoogleSignIn, signInWithGoogle } from './google-sign-in'
import { clearAuthSkip } from './auth-gate.js'
import { cloud } from './cloud.js'
import { armSyncForUser, pullAndMerge } from './cloud-sync.js'
import { t } from './i18n.js'

export function useAuthSignIn({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState('start')
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')
  // Which control the last error belongs to, so it prints next to that
  // button instead of always reading as the email field's problem.
  const [missSource, setMissSource] = useState('')
  const signedIn = useRef(onSignedIn)
  signedIn.current = onSignedIn

  const finish = useCallback(async () => {
    clearAuthSkip()
    armSyncForUser()
    await pullAndMerge()
    signedIn.current?.()
  }, [])

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
      setMissSource('email')
      return
    }
    setBusy(true)
    const { miss: bad } = await sendCode(email)
    setBusy(false)
    if (bad) {
      setMiss(accountMissText(bad))
      setMissSource('email')
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
      setMissSource('email')
      return
    }
    setMiss('')
    await finish()
  }

  async function openReviewer() {
    setBusy(true)
    const { miss: bad } = await signInReviewer(email, password)
    setBusy(false)
    if (bad) {
      setMiss(accountMissText(bad))
      setMissSource('email')
      return
    }
    setMiss('')
    setPassword('')
    await finish()
  }

  function showReviewer() {
    setStep('reviewer')
    setCode('')
    setMiss('')
    setMissSource('')
  }

  function useDifferentEmail() {
    setStep('start')
    setEmail('')
    setCode('')
    setPassword('')
    setMiss('')
    setMissSource('')
  }

  async function signInApple() {
    if (busy) return
    setBusy(true)
    setMiss('')
    setMissSource('')
    const { miss: bad } = await signInWithApple()
    setBusy(false)
    if (bad) {
      if (bad !== 'cancel') {
        setMiss(accountMissText(bad))
        setMissSource('apple')
      }
      return
    }
    await finish()
  }

  async function signInGoogle() {
    if (busy) return
    setBusy(true)
    setMiss('')
    setMissSource('')
    const { miss: bad } = await signInWithGoogle()
    setBusy(false)
    if (bad) {
      if (bad !== 'cancel') {
        setMiss(accountMissText(bad))
        setMissSource('google')
      }
      return
    }
    await finish()
  }

  return {
    email,
    setEmail,
    code,
    setCode,
    password,
    setPassword,
    openReviewer,
    showReviewer,
    step,
    setStep,
    busy,
    miss,
    setMiss,
    missSource,
    askEmail,
    openEmail,
    useDifferentEmail,
    signInApple,
    showApple: canShowAppleSignIn(),
    signInGoogle,
    showGoogle: canShowGoogleSignIn(),
  }
}
