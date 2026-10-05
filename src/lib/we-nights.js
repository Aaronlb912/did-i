// Your own Did we nights: each night a Did we was due for you and what you
// swiped (my_we_nights). Tonight's count and your streak read these next to
// your own questions. Only your swipe counts: did is done; nope or no answer
// leaves the night open, the same as one of your own questions.
import { cloud, cloudSetUp } from './cloud.js'
import { tagIdsOf } from './tags.js'

const KEY = 'did-i-we-nights'
const listeners = new Set()
let rows = readStored()
let byNight = null

function readStored() {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(KEY) || 'null')
    return Array.isArray(raw?.rows) ? raw.rows : []
  } catch {
    return []
  }
}

function store(next) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify({ rows: next }))
  } catch {
    // Kept in memory for this run.
  }
}

export function setWeNightRows(next) {
  rows = Array.isArray(next) ? next : []
  byNight = null
  store(rows)
  listeners.forEach((fn) => {
    try {
      fn()
    } catch {
      // One listener failing does not stop the rest.
    }
  })
}

// What you said on a Did we from the widget, before the cloud answers back.
export function markWeNight(card, night, status) {
  const hit = rows.some((row) => row.card === card && row.night === night)
  setWeNightRows(
    hit
      ? rows.map((row) => (row.card === card && row.night === night ? { ...row, status } : row))
      : [...rows, { card, folder: '', night, status }],
  )
}

export function weNightStatus(nightIso, card) {
  return (index().get(nightIso) || []).find((row) => row.card === card)?.status || ''
}

export function clearWeNights() {
  setWeNightRows([])
}

function index() {
  if (byNight) return byNight
  byNight = new Map()
  for (const row of rows) {
    const list = byNight.get(row.night)
    if (list) list.push(row)
    else byNight.set(row.night, [row])
  }
  return byNight
}

// { due, done, clear } for a night. With a tag picked, only Did wes filed
// under it count; with none, all of them do.
export function weNight(nightIso, tagId = '') {
  const ids = tagIdsOf(tagId)
  const list = (index().get(nightIso) || []).filter((row) => !ids.length || (row.folder && ids.includes(row.folder)))
  const due = list.length
  const done = list.filter((row) => row.status === 'did').length
  return { due, done, clear: due > 0 && done === due }
}

export async function refreshWeNights() {
  if (!cloudSetUp()) return
  const db = cloud()
  if (!db) return
  const { data, error } = await db.rpc('my_we_nights')
  if (error || !Array.isArray(data)) return
  setWeNightRows(
    data.map((row) => ({
      card: String(row.card_id || ''),
      folder: String(row.folder || ''),
      night: String(row.night || '').slice(0, 10),
      status: String(row.status || ''),
    })),
  )
}


export function onWeNights(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Did we cards still open for you on a night (due, and no did from you yet).
export function weOpenOn(nightIso) {
  return new Set((index().get(nightIso) || []).filter((row) => row.status !== 'did').map((row) => row.card))
}

// Did we card ids not yet did on a night, with the same tag rule as weNight.
export function weOpenIds(nightIso, tagId = '') {
  const ids = tagIdsOf(tagId)
  return (index().get(nightIso) || [])
    .filter((row) => !ids.length || (row.folder && ids.includes(row.folder)))
    .filter((row) => row.status !== 'did')
    .map((row) => row.card)
}
