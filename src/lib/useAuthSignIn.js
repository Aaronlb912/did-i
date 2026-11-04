import { useCallback, useEffect, useRef, useState } from 'react'
import { accountMissText, checkCode, looksLikeEmail, sendCode, signInReviewer } from './account.js'
import { canShowAppleSignIn, signInWithApple } from './apple-sign-in'
import { canShowGoogleSignIn, signInWithGoogle } from './google-sign-in'
import { clearAuthSkip } from './auth-gate.js'
import { cloud } from './cloud.js'
import { armSyncForUser, pullAndMerge } from './cloud-sync.js'
import { t } from './i18n.js'
import { watchReviewerFlag } from './reviewer-flag.js'

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
  // Reviewer sign-in exists only while the server switch is on.
  const [reviewerOn, setReviewerOn] = useState(false)
  const signedIn = useRef(onSignedIn)
  signedIn.current = onSignedIn
  // One sign-in step at a time, through the pull after it: a second tap
  // re-sent a used code and showed "wrong code" while sign-in went through.
  const going = useRef(false)
  const once = (fn) => async () => {
    if (going.current) return
    going.current = true
    try {
      await fn()
    } finally {
      going.current = false
    }
  }

  const finish = useCallback(async () => {
    clearAuthSkip()
    armSyncForUser()
    // Signed in either way: a pull that throws must not leave them on this screen.
    let pullMiss = ''
    try {
      await pullAndMerge()
    } catch {
      pullMiss = t('tonight.syncMiss')
      setMiss(pullMiss)
    }
    signedIn.current?.(pullMiss)
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
    if (busy) return
    if (!looksLikeEmail(email)) {
      setMiss(String(email || '').trim() ? t('account.missEmail') : t('account.needEmail'))
      setMissSource('email')
      return
    }
    setBusy(true)
    const { miss: bad } = await sendCode(email)
    setBusy(false)
    if (bad) {
      setMiss(accountMissText(bad))
      setMissSource('email')
      // Too many sends still leaves an earlier code that works; show the box for it.
      if (bad === 'often') setStep('code')
      return
    }
    setMiss('')
    setStep('code')
  }

  async function openEmail() {
    if (busy) return
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
    if (busy) return
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

  useEffect(() => watchReviewerFlag(setReviewerOn), [])

  function showReviewer() {
    if (!reviewerOn) return
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
    openReviewer: once(openReviewer),
    showReviewer,
    reviewerOn,
    step,
    setStep,
    busy,
    miss,
    setMiss,
    missSource,
    askEmail: once(askEmail),
    openEmail: once(openEmail),
    useDifferentEmail,
    signInApple: once(signInApple),
    showApple: canShowAppleSignIn(),
    signInGoogle: once(signInGoogle),
    showGoogle: canShowGoogleSignIn(),
  }
}
