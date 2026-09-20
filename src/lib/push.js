import { cloud } from './cloud.js'
import { deviceKey } from './account.js'

// Web build. Native uses native/shim/push.js via Metro.

export function pushPossible() {
  return false
}

export async function startPush() {
  return 'not native'
}

export async function dropToken() {
  const db = cloud()
  if (!db) return
  const { data } = await db.auth.getSession()
  const user = data?.session?.user
  if (!user) return
  await db
    .from('devices')
    .update({ push_token: null })
    .eq('user_id', user.id)
    .eq('device_key', deviceKey())
}
