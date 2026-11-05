// A proof photo on a Did. The server side is supabase/proof-photos.sql: one
// photo per answer, 400 KB JPEG, private bucket, seen only by the people the
// Did was for. Phone only; the web app does not add or show them.
import { cloud } from './cloud.js'
import { listKnownPeople, personName } from './people.js'
import { boardDate, periodNight } from './recurrence.js'

export const PROOF_MAX_BYTES = 409600
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SIGNED_SECONDS = 3600

export const proofPath = (ownerId, id) => `${ownerId}/${id}.jpg`

// The night a Did answer belongs to, the same way send-answers.js dates it.
export function proofNight(lamp, periodKey) {
  if (String(periodKey || '').startsWith('once:')) return boardDate(new Date())
  const night = periodNight(lamp, periodKey)
  return /^\d{4}-\d{2}-\d{2}$/.test(night) ? night : boardDate(new Date())
}

function missFor(error) {
  const text = String(error?.message || '')
  if (/too many photos/i.test(text)) return 'proof.limit'
  if (/family only/i.test(text)) return 'proof.family'
  if (/no Did|not your|not on this card/i.test(text)) return 'proof.noDid'
  return 'proof.fail'
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
  const made = await db.rpc('add_proof', {
    p_send: target.sendId || null,
    p_card: target.cardId || null,
    p_night: night,
  })
  if (made.error || !UUID.test(String(made.data || ''))) return { miss: missFor(made.error) }
  const id = made.data
  const up = await db.storage.from('proofs').upload(proofPath(uid, id), bytes, { contentType: 'image/jpeg' })
  if (up.error) {
    await db.from('proofs').delete().eq('id', id)
    return { miss: /size|large/i.test(up.error.message || '') ? 'proof.tooBig' : 'proof.fail' }
  }
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

// The whole library: every photo you may see, newest day first, each with
// its question and a signed link. The photo rows, then the sends, cards and
// people at once, with one batch of links. The server hides blocked and
// reported photos.
export async function loadLibrary() {
  const db = cloud()
  if (!db) return { rows: [], miss: '' }
  const { data, error } = await db
    .from('proofs')
    .select('id, owner_id, send_id, card_id, night, made_at')
    .order('night', { ascending: false })
    .order('made_at', { ascending: false })
    .limit(200)
  if (error) return { rows: [], miss: /relation|does not exist|schema cache/i.test(error.message || '') ? '' : 'people.reach' }
  const found = data || []
  if (!found.length) return { rows: [], miss: '' }
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
  return {
    rows: found
      .map((row) => ({
        ...row,
        kind: row.card_id ? 'we' : 'you',
        question: questionOf.get(row.send_id || row.card_id) || '',
        name: nameOf.get(row.owner_id) || '',
        url: urls.get(proofPath(row.owner_id, row.id)) || '',
      }))
      .filter((row) => row.url),
    miss: '',
  }
}

// Owner removes their photo: the file, then the row.
export async function removeProof(row) {
  const db = cloud()
  if (!db) return { miss: 'proof.fail' }
  await db.storage.from('proofs').remove([proofPath(row.owner_id, row.id)]).catch(() => {})
  const { error } = await db.from('proofs').delete().eq('id', row.id)
  return { miss: error ? 'proof.fail' : '' }
}

export async function reportProof(id, why = '') {
  const db = cloud()
  if (!db) return { miss: 'proof.fail' }
  const { error } = await db.rpc('report_proof', { p_proof: id, why })
  if (error) return { miss: /too many reports/i.test(error.message || '') ? 'we.missReports' : 'proof.fail' }
  return { miss: '' }
}
