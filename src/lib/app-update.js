import { cloud } from './cloud.js'

// The banner comes back a day after "Not now".
export const UPDATE_SNOOZE_MS = 24 * 60 * 60 * 1000

function versionParts(value) {
  const match = String(value || '').trim().match(/^(\d+)\.(\d+)\.(\d+)$/)
  return match ? match.slice(1).map(Number) : null
}

// True when `current` is an older x.y.z than `target`. Anything unreadable is
// never "older", so a bad row can not lock anyone out.
export function versionBelow(current, target) {
  const a = versionParts(current)
  const b = versionParts(target)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i]
  }
  return false
}

// 'must' below the minimum, 'offer' below the latest, '' when up to date.
export function updateState(current, row) {
  if (!row) return ''
  if (versionBelow(current, row.minimum)) return 'must'
  if (versionBelow(current, row.latest)) return 'offer'
  return ''
}

export async function readAppVersion(platform) {
  const db = cloud()
  if (!db || (platform !== 'ios' && platform !== 'android')) return null
  const { data, error } = await db
    .from('app_versions')
    .select('latest, minimum')
    .eq('platform', platform)
    .maybeSingle()
  if (error || !data) return null
  return data
}
