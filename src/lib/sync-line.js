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

// What a sync error means for the person, as a locale key. Offline, a timeout
// or anything unknown stays people.reach (a retry can work). An expired
// session, a refusal and a shelf the server finds too big will not pass on a
// retry, so each says what to do instead.
export function syncMissKey(error) {
  const text = String(error?.message ?? error ?? '')
  const code = String(error?.code ?? '')
  const status = Number(error?.status ?? error?.statusCode ?? 0)
  const name = String(error?.name ?? '')
  if (text === 'sync.capMiss' || /question cap/i.test(text)) return 'sync.capMiss'
  // A check violation is the shelf size only when it names the shelf; any other one is a refusal.
  if (code === '22001' || status === 413 || /too (large|big)|payload|doc_size/i.test(text) || (code === '23514' && /shelves/i.test(text))) return 'sync.tooBig'
  if (
    name === 'AuthSessionMissingError' ||
    status === 401 ||
    /refresh token|auth session missing|not authenticated|invalid api key/i.test(text) ||
    (name === 'AuthApiError' && status >= 400 && status < 500 && status !== 429)
  ) return 'sync.signIn'
  if (code === '42501' || code === '23514' || status === 403 || /permission denied|row-level security|not allowed/i.test(text)) return 'sync.refused'
  // Keys and short codes from our own code pass through; they show as is.
  if (/^[\w.-]+$/.test(text) && text !== 'account.syncMiss') return text
  return 'people.reach'
}

// What the Today toast and the Settings row do about a sync miss.
// retry: try again; account: sign in; lamps: remove questions; feedback: write to us.
export function syncMissAct(miss) {
  if (miss === 'sync.signIn') return 'account'
  if (miss === 'sync.capMiss' || miss === 'sync.tooBig') return 'lamps'
  if (miss === 'sync.refused') return 'feedback'
  return 'retry'
}

// A miss saved by an older build can be account.syncMiss, which has no subject.
export function syncMissShown(miss) {
  return miss === 'account.syncMiss' ? 'people.reach' : miss
}
