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
