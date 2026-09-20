import { Capacitor } from '@capacitor/core'

/** Native builds always get the app shell. Web serves /app only when allowed. */
export function webAppPublic() {
  if (Capacitor.isNativePlatform()) return true
  const flag = String(import.meta.env.VITE_WEB_APP_PUBLIC ?? '').trim().toLowerCase()
  if (import.meta.env.DEV) return flag !== 'false'
  return flag === 'true'
}
