// A proof photo on a Did. The server side is supabase/proof-photos.sql: one
// photo per answer, 400 KB JPEG, private bucket, seen only by the people the
// Did was for. Phone only; the web app does not add or show them.
import { cloud } from './cloud.js'
import { listKnownPeople, personName } from './people.js'
import { knownWeCard } from './did-we.js'
import { boardDate, periodNight } from './recurrence.js'

export const PROOF_MAX_BYTES = 409600
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SIGNED_SECONDS = 3600

export const proofPath = (ownerId, id) => `${ownerId}/${id}.jpg`

// The night a Did answer belongs to, the same way send-answers.js dates it:
// a one time question by the day it was answered.
export function proofNight(lamp, periodKey, answeredAt) {
  if (String(periodKey || '').startsWith('once:')) {
    const when = answeredAt ? Date.parse(answeredAt) : NaN
    return boardDate(Number.isNaN(when) ? new Date() : new Date(when))
  }
  const night = periodNight(lamp, periodKey)
  return /^\d{4}-\d{2}-\d{2}$/.test(night) ? night : boardDate(new Date())
}

function missFor(error) {
  const text = String(error?.message || '')
  if (/network request failed|failed to fetch|load failed|networkerror/i.test(text)) return 'proof.offline'
  if (/too many photos/i.test(text)) return 'proof.limit'
  if (/family only/i.test(text)) return 'proof.family'
  if (/no Did|not your|not on this card/i.test(text)) return 'proof.noDid'
  if (/bad night/i.test(text)) return 'proof.old'
  if (/duplicate key|proofs_send_night_key|proofs_card_owner_night_key/i.test(text)) return 'proof.already'
  return 'proof.fail'
}

// A photo row with no push yet is one whose upload never finished. Clear it
// (row and any file) before a new try, so a failed upload can be retried and
// does not count against the 5 a day or the one photo per answer.
async function clearHalfDone(db, uid, target, night) {
  const query = db.from('proofs').select('id').eq('owner_id', uid).eq('night', night).is('pushed_at', null)
  const { data, error } = await (target.sendId ? query.eq('send_id', target.sendId) : query.eq('card_id', target.cardId))
  const seen = (data || []).map((row) => row.id).filter((id) => UUID.test(String(id)))
  // A row whose file did land (the done call never got through) is a real
  // photo: proof_uploaded marks it pushed, and only rows still unmarked go.
  for (const id of seen) {
    const marked = await db.rpc('proof_uploaded', { pid: id })
    if (marked.error) return
  }
  const left = seen.length ? await db.from('proofs').select('id').in('id', seen).is('pushed_at', null) : { data: [] }
  if (left.error) return
  const ids = (left.data || []).map((row) => row.id)
  // Before the push column is on the server the read fails: nothing to clear.
  if (error || !ids.length) return
  await db.storage.from('proofs').remove(ids.map((id) => proofPath(uid, id)))
  await db.from('proofs').delete().in('id', ids)
}

// Makes the row, then the file. A failed upload takes the row back, so the
// answer stays and no empty photo is left. `ready` runs first (the phone
// uses it to save the Did you answer to the server).
// target: { sendId } or { cardId }, plus night. bytes: the JPEG.
export async function addProof(target, night, bytes, ready) {
  const db = cloud()
  if (!db) return { miss: 'proof.fail' }
  const { data: got } = await db.auth.getSession()
  const uid = got?.session?.user?.id
  if (!uid) return { miss: 'proof.fail' }
  if (!bytes || bytes.byteLength > PROOF_MAX_BYTES) return { miss: 'proof.tooBig' }
  try {
    if (ready) await ready()
  } catch {
    // The server says if the Did is not there.
  }
  await clearHalfDone(db, uid, target, night).catch(() => {})
  const made = await db.rpc('add_proof', {
    p_send: target.sendId || null,
    p_card: target.cardId || null,
    p_night: night,
  })
  if (made.error || !UUID.test(String(made.data || ''))) return { miss: missFor(made.error) }
  const id = made.data
  clearLibrary()
  const up = await db.storage.from('proofs').upload(proofPath(uid, id), bytes, { contentType: 'image/jpeg' })
  if (up.error) {
    // If the row stays, the next try clears it (no push yet), so one more go is enough.
    const undone = await db.from('proofs').delete().eq('id', id)
    if (undone.error) await db.from('proofs').delete().eq('id', id)
    return { miss: /size|large/i.test(up.error.message || '') ? 'proof.tooBig' : 'proof.fail' }
  }
  // The push to the other person waits for the file. A miss here only loses the push.
  await db.rpc('proof_uploaded', { pid: id }).catch(() => {})
  return { id, miss: '' }
}

// Every photo you may see for these sends and cards, newest night first,
// with a signed link each. Two reads in all: one for the rows (the server
// hides what you may not see), one batch for the links.
export async function loadProofs({ sendIds = [], cardIds = [] }) {
  const db = cloud()
  const sends = [...new Set(sendIds.filter((id) => UUID.test(String(id))))].slice(0, 100)
  const cards = [...new Set(cardIds.filter((id) => UUID.test(String(id))))].slice(0, 100)
  if (!db || (!sends.length && !cards.length)) return { rows: [], miss: '' }
  const parts = []
  if (sends.length) parts.push(`send_id.in.(${sends.join(',')})`)
  if (cards.length) parts.push(`card_id.in.(${cards.join(',')})`)
  const { data, error } = await db
    .from('proofs')
    .select('id, owner_id, send_id, card_id, night')
    .or(parts.join(','))
    .order('night', { ascending: false })
    .limit(200)
  // Before the server file is applied the table is not there: no photos.
  if (error) return { rows: [], miss: /relation|does not exist|schema cache/i.test(error.message || '') ? '' : 'people.reach' }
  const found = data || []
  if (!found.length) return { rows: [], miss: '' }
  const signed = await db.storage.from('proofs').createSignedUrls(found.map((row) => proofPath(row.owner_id, row.id)), SIGNED_SECONDS)
  const urls = new Map()
  for (const item of signed.data || []) if (item.signedUrl && !item.error) urls.set(item.path, item.signedUrl)
  return {
    rows: found.map((row) => ({ ...row, url: urls.get(proofPath(row.owner_id, row.id)) || '' })).filter((row) => row.url),
    miss: '',
  }
}

// The whole library, a page at a time: every photo you may see, newest day
// first, each with its question and a signed link. Each page is the photo
// rows, then the sends, cards and people at once, with one batch of links. The
// server hides blocked and reported photos. `next` is where the next page
// starts; `more` says there may be one.
const LIBRARY_PAGE = 100
const LIBRARY_COLUMNS = 'id, owner_id, send_id, card_id, night, made_at'

async function libraryRows(db, found) {
  const sendIds = [...new Set(found.map((row) => row.send_id).filter(Boolean))]
  const cardIds = [...new Set(found.map((row) => row.card_id).filter(Boolean))]
  const [sends, cards, people, signed] = await Promise.all([
    sendIds.length ? db.from('sends').select('id, question').in('id', sendIds) : { data: [] },
    cardIds.length ? db.from('we_cards').select('id, question').in('id', cardIds) : { data: [] },
    listKnownPeople().catch(() => []),
    db.storage.from('proofs').createSignedUrls(found.map((row) => proofPath(row.owner_id, row.id)), SIGNED_SECONDS),
  ])
  const questionOf = new Map([...(sends.data || []), ...(cards.data || [])].map((row) => [row.id, row.question || '']))
  const nameOf = new Map(people.map((person) => [person.user_id, personName(person)]))
  const urls = new Map()
  for (const item of signed.data || []) if (item.signedUrl && !item.error) urls.set(item.path, item.signedUrl)
  return found
    .map((row) => ({
      ...row,
      kind: row.card_id ? 'we' : 'you',
      question: questionOf.get(row.send_id || row.card_id) || '',
      // A Did we member who is not a friend: the name from the card.
      name: nameOf.get(row.owner_id) || (knownWeCard(row.card_id)?.people || []).find((p) => p.id === row.owner_id)?.name || '',
      url: urls.get(proofPath(row.owner_id, row.id)) || '',
    }))
    .filter((row) => row.url)
}

export async function loadLibrary({ from = 0 } = {}) {
  const db = cloud()
  if (!db) return { rows: [], miss: '', next: from, more: false }
  const { data, error } = await db
    .from('proofs')
    .select(LIBRARY_COLUMNS)
    .order('night', { ascending: false })
    .order('made_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + LIBRARY_PAGE - 1)
  if (error) return { rows: [], miss: /relation|does not exist|schema cache/i.test(error.message || '') ? '' : 'people.reach', next: from, more: false }
  const found = data || []
  if (!found.length) return { rows: [], miss: '', next: from, more: false }
  return { rows: await libraryRows(db, found), miss: '', next: from + found.length, more: found.length === LIBRARY_PAGE }
}

// One photo by id, for a push that points past the pages read so far. null
// when it is gone, hidden from you, or cannot be read.
export async function loadLibraryRow(id) {
  const db = cloud()
  if (!db || !UUID.test(String(id))) return null
  const { data, error } = await db.from('proofs').select(LIBRARY_COLUMNS).eq('id', id).maybeSingle()
  if (error || !data) return null
  return (await libraryRows(db, [data]))[0] || null
}

// The last library read, kept so leaving the screen and coming back does not
// download every image again (new signed links miss the image cache). Keyed by
// account, reused for 5 minutes so a photo someone just added still shows
// soon, cleared when a photo is removed or reported. Links last an hour.
export const PROOF_STALE_MS = 50 * 60 * 1000
const LIBRARY_REUSE_MS = 5 * 60 * 1000
let library = null

export function clearLibrary() {
  library = null
}

export function cachedLibrary(uid) {
  if (library && (library.uid !== uid || Date.now() - library.at >= LIBRARY_REUSE_MS)) library = null
  return library
}

export function keepLibrary(uid, state) {
  library = uid ? { uid, ...state } : null
}

// A fresh signed link for one photo, or '' when it cannot be made.
export async function freshProofUrl(row) {
  const db = cloud()
  if (!db) return ''
  const { data, error } = await db.storage.from('proofs').createSignedUrl(proofPath(row.owner_id, row.id), SIGNED_SECONDS)
  return error ? '' : data?.signedUrl || ''
}

// Owner removes their photo: the row, then the file through the Storage API
// (SQL cannot delete storage files). Row first: a row left without its file
// would vanish from the library yet still block a new photo on that answer.
// A file left without its row stays private and goes with the account.
export async function removeProof(row) {
  const db = cloud()
  if (!db) return { miss: 'proof.fail' }
  const { error } = await db.from('proofs').delete().eq('id', row.id)
  if (error) return { miss: 'proof.fail' }
  clearLibrary()
  await db.storage.from('proofs').remove([proofPath(row.owner_id, row.id)]).catch(() => {})
  return { miss: '' }
}

// Every file in your own proofs folder, a page at a time. Removing shifts the
// list, so each round reads the first page again. Stops on an error, or when
// a round removes nothing, so it cannot loop. Before the bucket exists there
// is nothing to remove.
export async function removeAllProofFiles(uid) {
  const db = cloud()
  if (!db) return { miss: 'proof.fail' }
  let me = uid
  if (!me) {
    const { data } = await db.auth.getSession()
    me = data?.session?.user?.id
  }
  if (!me) return { miss: 'proof.fail' }
  const bucket = db.storage.from('proofs')
  for (let round = 0; round < 50; round += 1) {
    const listed = await bucket.list(me, { limit: 100 })
    if (listed.error) return { miss: /not found|does not exist/i.test(listed.error.message || '') ? '' : 'proof.fail' }
    const names = (listed.data || []).map((item) => item.name).filter(Boolean)
    if (!names.length) return { miss: '' }
    const gone = await bucket.remove(names.map((name) => `${me}/${name}`))
    if (gone.error || !(gone.data || []).length) return { miss: 'proof.fail' }
  }
  return { miss: 'proof.fail' }
}

// Delete all my photos: the rows first (same reason as removeProof), then
// the files. Dids stay.
export async function removeAllProofs() {
  const db = cloud()
  if (!db) return { miss: 'proof.fail' }
  const { data } = await db.auth.getSession()
  const uid = data?.session?.user?.id
  if (!uid) return { miss: 'proof.fail' }
  const { error } = await db.from('proofs').delete().eq('owner_id', uid)
  if (error) return { miss: 'proof.fail' }
  clearLibrary()
  return removeAllProofFiles(uid)
}

export async function reportProof(id, why = '') {
  const db = cloud()
  if (!db) return { miss: 'proof.fail' }
  const { error } = await db.rpc('report_proof', { p_proof: id, why })
  if (error) return { miss: /too many reports/i.test(error.message || '') ? 'we.missReports' : 'proof.fail' }
  clearLibrary()
  return { miss: '' }
}
