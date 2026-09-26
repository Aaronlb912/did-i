import * as Linking from 'expo-linking'
import { savePendingInvite } from '../src/lib/invite-link.js'
import { goHash } from './navigation/hash.js'

export const TONIGHT_WIDGET_URI = 'didi://tonight'

export function routeFromDeepLink(url) {
  if (!url) return null
  try {
    const parsed = Linking.parse(url)
    const host = String(parsed.hostname || '').toLowerCase()
    let path = String(parsed.path || '').replace(/^\/+/, '').toLowerCase()
    if (!path && host && host !== 'localhost') path = host
    // didi://invite/CODE from the invite page when the app is already installed.
    const invite = /^invite\/?([a-z0-9]{10})$/i.exec(host === 'invite' ? `invite/${path}` : path)
    if (invite) return { invite: invite[1] }
    if (path === 'tonight') {
      const face = String(parsed.queryParams?.face || parsed.queryParams?.id || '')
      const tag = String(parsed.queryParams?.tag || '')
      return { path: '/tonight', face, tag }
    }
    const lampId = String(parsed.queryParams?.face || parsed.queryParams?.id || '')
    if (lampId) return { path: '/tonight', face: lampId }
  } catch {
    // ok
  }
  return null
}

export function goFromDeepLink(url) {
  const route = routeFromDeepLink(url)
  if (!route) return false
  if (route.invite) {
    savePendingInvite(route.invite)
    return true
  }
  const extra = {}
  if (route.face) extra.face = route.face
  if (route.tag) extra.tag = route.tag
  goHash(route.path, extra)
  return true
}
