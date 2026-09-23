import { cloud } from './cloud.js'
import { env } from './env.js'

/** Show the Apple button only when Supabase Apple auth is wired (see docs/apple-sign-in.md). */
export function appleSignInEnabled() {
  return env('VITE_APPLE_AUTH') === '1'
}

export function canShowAppleSignIn() {
  return appleSignInEnabled() && typeof document !== 'undefined'
}

export async function signInWithApple() {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const base = (env('VITE_WEB_APP_URL') || 'https://did-i.app').replace(/\/$/, '')
  const { error } = await db.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${base}/app`,
      skipBrowserRedirect: false,
    },
  })
  if (!error) return { miss: '' }
  const msg = String(error.message || error).toLowerCase()
  if (/cancel/i.test(msg)) return { miss: 'cancel' }
  return { miss: 'appleFail' }
}
