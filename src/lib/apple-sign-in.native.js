import * as AppleAuthentication from 'expo-apple-authentication'
import { Platform } from 'react-native'
import { cloud } from './cloud.js'
import { env } from './env.js'

export function appleSignInEnabled() {
  return env('VITE_APPLE_AUTH') === '1'
}

export function canShowAppleSignIn() {
  return appleSignInEnabled() && Platform.OS === 'ios'
}

// Account delete: Apple lists Did I under Sign in with Apple until its token is
// revoked (App Store rule 5.1.1(v)). A fresh code is asked for here, with the
// Apple sheet, and apple-revoke trades it for a token and revokes it. Only for
// an account that has an Apple identity. A miss never blocks the delete.
export async function revokeAppleSignIn() {
  const db = cloud()
  if (!db || Platform.OS !== 'ios') return { miss: '' }
  try {
    const { data } = await db.auth.getUser()
    if (!data?.user?.identities?.some((one) => one.provider === 'apple')) return { miss: '' }
    if (!(await AppleAuthentication.isAvailableAsync())) return { miss: 'appleUnavailable' }
    const credential = await AppleAuthentication.signInAsync({ requestedScopes: [] })
    if (!credential.authorizationCode) return { miss: 'appleFail' }
    const { error } = await db.functions.invoke('apple-revoke', { body: { code: credential.authorizationCode }, timeout: 10000 })
    return { miss: error ? 'appleFail' : '' }
  } catch (err) {
    return { miss: err?.code === 'ERR_REQUEST_CANCELED' ? 'cancel' : 'appleFail' }
  }
}

export async function signInWithApple() {
  const db = cloud()
  if (!db) return { miss: 'off' }
  const available = await AppleAuthentication.isAvailableAsync()
  if (!available) return { miss: 'appleUnavailable' }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })
    const token = credential.identityToken
    if (!token) return { miss: 'appleFail' }
    const { error } = await db.auth.signInWithIdToken({
      provider: 'apple',
      token,
    })
    if (!error) return { miss: '' }
    const msg = String(error.message || error).toLowerCase()
    if (/cancel/i.test(msg)) return { miss: 'cancel' }
    return { miss: 'appleFail' }
  } catch (err) {
    if (err?.code === 'ERR_REQUEST_CANCELED') return { miss: 'cancel' }
    return { miss: 'appleFail' }
  }
}
