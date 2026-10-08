// The quiet line under "Sync now". Pure, so check.mjs can test it.
// A failed sync still has everything saved on this phone; say that.
const JUST_NOW_MS = 60 * 1000

export function syncLine(sync, now = Date.now()) {
  const how = sync?.how || 'off'
  if (how === 'busy') return { key: 'account.syncBusy' }
  if (how === 'miss') return { key: 'account.syncLocal' }
  if (how === 'saved' && sync.at) {
    const at = Date.parse(sync.at)
    if (Number.isFinite(at) && now - at < JUST_NOW_MS) return { key: 'account.syncJust' }
    return { key: 'account.syncSaved', at: sync.at }
  }
  return { key: 'account.syncIdle' }
}

export function syncFailed(sync) {
  return sync?.how === 'miss'
}
