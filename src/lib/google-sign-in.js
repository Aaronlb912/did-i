import { cloud } from './cloud.js'
import { env } from './env.js'

/** Show the Google button only when Supabase Google auth is wired (see docs/google-sign-in.md). */
export function googleSignInEnabled() {
  return env('VITE_GOOGLE_AUTH') === '1'
}

export function canShowGoogleSignIn() {
  return googleSignInEnabled() && typeof document !== 'undefined'
}

export async function signInWithGoogle() {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const base = (env('VITE_WEB_APP_URL') || 'https://did-i.app').replace(/\/$/, '')
  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${base}/app` },
  })
  if (!error) return { miss: '' }
  return { miss: 'googleFail' }
}
