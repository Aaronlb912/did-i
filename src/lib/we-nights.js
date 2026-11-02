// Your own Did we nights: each night a Did we was due for you and what you
// swiped (my_we_nights). Tonight's count and your streak read these next to
// your own questions. Your did is done, and so is a card someone else
// finished (an any card one of you swiped): nobody has to swipe it again.
// Nope or no answer on an unfinished card leaves the night open.
import { cloud, cloudSetUp } from './cloud.js'
import { readSavedAt } from './saved-at.js'
import { tagIdsOf } from './tags.js'

const KEY = 'did-i-we-nights'
const listeners = new Set()
let rows = readStored()
let byNight = null
let stamp = 0

// Bumps on every change, so a memo over Did we nights knows to redo itself.
export function weNightsStamp() {
  return stamp
}

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
  stamp += 1
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

// Card+night pairs seen finished, kept so a refresh from a server without
// my_we_nights.done does not reopen them. The last 60 days only.
const DONE_KEY = 'did-i-we-done'
function doneKept() {
  try {
    return new Set(JSON.parse(globalThis.localStorage?.getItem(DONE_KEY) || '[]'))
  } catch {
    return new Set()
  }
}
function keepDone(ids, night) {
  const cut = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10)
  const kept = [...doneKept()].filter((key) => key.slice(-10) >= cut)
  for (const id of ids) if (!kept.includes(`${id}|${night}`)) kept.push(`${id}|${night}`)
  try {
    globalThis.localStorage?.setItem(DONE_KEY, JSON.stringify(kept))
  } catch {
    // Kept for this run by the rows themselves.
  }
}

// A card finished tonight by someone else, from the live cards, so the day
// clears before my_we_nights says so. Only rows already there.
export function markWeDone(ids, night) {
  const want = new Set(ids)
  keepDone(ids, night)
  if (!rows.some((row) => want.has(row.card) && row.night === night && row.status !== 'did')) return
  setWeNightRows(rows.map((row) => (want.has(row.card) && row.night === night ? { ...row, status: 'did' } : row)))
}

export function weNightStatus(nightIso, card) {
  return (index().get(nightIso) || []).find((row) => row.card === card)?.status || ''
}

// Bumped on clear (sign out), so a refresh already out drops the old
// account's nights instead of storing them again.
let nightsRun = 0

export function clearWeNights() {
  nightsRun += 1
  try {
    globalThis.localStorage?.removeItem(DONE_KEY)
  } catch {
    // Nothing kept.
  }
  setWeNightRows([])
}

// Rows carry the folder's title (my_we_nights), the filter carries folder
// ids. Lowercase titles of the picked folders, or null for every folder.
// Cached on the shelf's saved stamp, which moves on every shelf write.
let titleCache = { key: '', titles: null }
function pickedTitles(tagId) {
  const ids = tagIdsOf(tagId)
  if (!ids.length) return null
  const key = `${readSavedAt()}|${ids.join(',')}`
  if (titleCache.key === key) return titleCache.titles
  let boards = []
  try {
    boards = JSON.parse(globalThis.localStorage?.getItem('did-i-shelf') || 'null')?.boards || []
  } catch {
    boards = []
  }
  const titles = boards
    .filter((book) => ids.includes(book?.id))
    .map((book) => String(book.title || '').trim().toLowerCase())
    .filter(Boolean)
  titleCache = { key, titles }
  return titles
}

function inPicked(row, titles) {
  return !titles || (!!row.folder && titles.includes(String(row.folder).trim().toLowerCase()))
}

function index() {
  if (byNight) return byNight
  byNight = new Map()
  for (const row of rows) {
    // A paused night (nobody answered 3 due nights) counts for nothing.
    if (row.paused) continue
    const list = byNight.get(row.night)
    if (list) list.push(row)
    else byNight.set(row.night, [row])
  }
  return byNight
}

// The oldest night with a Did we, or '' when there are none.
export function weFirstNight() {
  let first = ''
  for (const night of index().keys()) if (!first || night < first) first = night
  return first
}

// { due, done, clear } for a night. With a tag picked, only Did wes filed
// under it count; with none, all of them do.
export function weNight(nightIso, tagId = '') {
  const titles = pickedTitles(tagId)
  const list = (index().get(nightIso) || []).filter((row) => inPicked(row, titles))
  const due = list.length
  const done = list.filter((row) => row.status === 'did').length
  return { due, done, clear: due > 0 && done === due }
}

export async function refreshWeNights() {
  if (!cloudSetUp()) return
  const db = cloud()
  if (!db) return
  const run = nightsRun
  const { data, error } = await db.rpc('my_we_nights')
  if (run !== nightsRun || error || !Array.isArray(data)) return
  setWeNightRows(
    data.map((row) => ({
      card: String(row.card_id || ''),
      folder: String(row.folder || ''),
      night: String(row.night || '').slice(0, 10),
      status: row.done === true || doneKept().has(`${row.card_id}|${String(row.night || '').slice(0, 10)}`) ? 'did' : String(row.status || ''),
      paused: row.paused === true,
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

// Every Did we card due for you on any of these nights, same tag rule as
// weNight, in first-seen order. For the Seven nights grid's Did we rows.
export function weCardsOn(nightIsos, tagId = '') {
  const titles = pickedTitles(tagId)
  const out = []
  for (const iso of nightIsos || []) {
    for (const row of index().get(iso) || []) {
      if (!inPicked(row, titles)) continue
      if (!out.includes(row.card)) out.push(row.card)
    }
  }
  return out
}

// One Did we on one night: off (not due), did, nope, or '' (due, no answer).
export function weCardState(nightIso, card) {
  const row = (index().get(nightIso) || []).find((item) => item.card === card)
  if (!row) return 'off'
  return row.status === 'did' || row.status === 'nope' ? row.status : ''
}

// Did we card ids not yet did on a night, with the same tag rule as weNight.
export function weOpenIds(nightIso, tagId = '') {
  const titles = pickedTitles(tagId)
  return (index().get(nightIso) || [])
    .filter((row) => inPicked(row, titles))
    .filter((row) => row.status !== 'did')
    .map((row) => row.card)
}
