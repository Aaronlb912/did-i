import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin'
import { cloud } from './cloud.js'
import { env } from './env.js'

// Client IDs come from Google Cloud (docs/google-sign-in.md). The button stays
// hidden until they are in env.client.js.
export function googleSignInEnabled() {
  return env('VITE_GOOGLE_AUTH') === '1' && Boolean(env('VITE_GOOGLE_WEB_CLIENT_ID'))
}

export function canShowGoogleSignIn() {
  return googleSignInEnabled()
}

let configured = false

function configure() {
  if (configured) return
  GoogleSignin.configure({
    // The web client ID is the audience Supabase checks the ID token against.
    webClientId: env('VITE_GOOGLE_WEB_CLIENT_ID'),
    iosClientId: env('VITE_GOOGLE_IOS_CLIENT_ID') || undefined,
  })
  configured = true
}

export async function signInWithGoogle() {
  const db = cloud()
  if (!db) return { miss: 'off' }
  try {
    configure()
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const result = await GoogleSignin.signIn()
    if (result?.type === 'cancelled') return { miss: 'cancel' }
    const token = result?.data?.idToken
    if (!token) return { miss: 'googleFail' }
    const { error } = await db.auth.signInWithIdToken({ provider: 'google', token })
    if (!error) return { miss: '' }
    return { miss: 'googleFail' }
  } catch (err) {
    if (err?.code === statusCodes.SIGN_IN_CANCELLED) return { miss: 'cancel' }
    if (err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return { miss: 'googleUnavailable' }
    return { miss: 'googleFail' }
  }
}
