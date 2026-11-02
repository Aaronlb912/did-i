import { emptyBoard, normalizeBook, normalizeGone } from './board-json.js'
import { alignShelfPurse, mergePurses, stampPurse } from './purse.js'
import { stripDemoShelf } from './demo-strip.js'
import { t } from './i18n.js'
import { saveBoardForSw } from './board-store.js'
import { readSavedAt, stampSavedAt } from './saved-at.js'
import { noteShelfMilestones } from './milestones.js'

export { readSavedAt, stampSavedAt }

const SHELF_KEY = 'did-i-shelf'
const OLD_KEY = 'did-i-board'
let oldKeyCleared = false

// normalizeBook's empty-title fallback used to be the literal 'Did I' before
// it became the localized General folder. A folder still carrying that old
// default (typed then, or landed there via the old fallback) converges to
// General so it folds into today's General folder on next mergeSameTitles.
const OLD_DEFAULT_TITLE = 'Did I'

// The General folder in every language the app speaks ('tags.general').
// A folder made in one language reads in the language in use now.
const DEFAULT_TITLES = new Set([OLD_DEFAULT_TITLE, 'General', 'Allgemein', 'Général', 'Generale', 'Geral', '一般', '일반', '常规'])

function migrateDefaultTitle(book) {
  if (!DEFAULT_TITLES.has(book.title)) return book
  const title = t('tags.general')
  return book.title === title ? book : { ...book, title }
}

// How a folder name compares: any General name in any language is General,
// since normalizeShelf would fold that folder into General.
export function folderNameKey(title) {
  const name = String(title || '').trim()
  return (DEFAULT_TITLES.has(name) ? t('tags.general') : name).toLowerCase()
}

export function currentBook(shelf) {
  if (!shelf || !shelf.boards || !shelf.boards.length) return emptyBoard()
  return shelf.boards.find((book) => book.id === shelf.currentId) || shelf.boards[0]
}

export function normalizeShelf(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const boards = Array.isArray(source.boards)
    ? source.boards.map((book) => migrateDefaultTitle(normalizeBook(book)))
    : []
  if (!boards.length) {
    const book = emptyBoard()
    return { currentId: book.id, boards: [book] }
  }
  const currentId = boards.some((book) => book.id === source.currentId)
    ? source.currentId
    : boards[0].id
  const gemWeek = String(source.gemWeek || '').trim()
  // Tags deleted on this phone, so a sync with an older phone keeps them deleted.
  const goneTags = normalizeGone(source.goneTags)
  return parkEmptyTags(mergeSameTitles(alignShelfPurse({ currentId, boards, gemWeek, goneTags })))
}

export function liveLampCount(book) {
  return (book?.lamps || []).filter((lamp) => !lamp.archived).length
}

export function hallEmpty(shelf) {
  return (shelf?.boards || []).every((item) => liveLampCount(item) === 0)
}

export function enterLand(home = '/') {
  return hallEmpty(readShelf()) ? '/first' : home
}

// Past this many folders the list is crowded, and empty ones step aside.
export const CROWDED_FOLDERS = 6

// Empty folders stay listed until the list gets crowded. Then empty ones go,
// except the current folder and the newest one (a folder you just made).
export function parkEmptyTags(shelf) {
  const all = shelf.boards || []
  const crowded = all.length > CROWDED_FOLDERS
  const newest = all[all.length - 1]?.id
  const empty = (book) => !(book.lamps || []).some((lamp) => !lamp.archived)
  const boards = all.map((book) => ({
    ...book,
    archived: crowded && empty(book) && book.id !== shelf.currentId && book.id !== newest,
  }))
  const live = boards.filter((book) => !book.archived)
  if (!boards.length) return shelf
  if (!live.length) {
    const keep = boards.find((book) => book.id === shelf.currentId) || boards[0]
    return {
      ...shelf,
      currentId: keep.id,
      boards: boards.map((book) => (book.id === keep.id ? { ...book, archived: false } : book)),
    }
  }
  const currentId = live.some((book) => book.id === shelf.currentId) ? shelf.currentId : live[0].id
  return { ...shelf, currentId, boards }
}

export function clearLocalShelf() {
  try {
    localStorage.removeItem(SHELF_KEY)
    localStorage.removeItem(OLD_KEY)
    localStorage.removeItem('did-i-saved')
  } catch {
    // Board still runs if storage is blocked.
  }
  const book = emptyBoard()
  return writeShelf({ currentId: book.id, boards: [book] })
}

export function writeShelf(shelf, savedAt) {
  const next = normalizeShelf(shelf)
  const text = JSON.stringify(next)
  let changed = true
  try {
    changed = localStorage.getItem(SHELF_KEY) !== text
    if (changed) localStorage.setItem(SHELF_KEY, text)
    // The one-folder copy is only read when there is no shelf at all, and
    // writing it doubled every save on a big account. Cleared once instead,
    // so an old copy cannot come back over newer answers.
    if (!oldKeyCleared) {
      localStorage.removeItem(OLD_KEY)
      oldKeyCleared = true
    }
  } catch {
    // Board still runs if storage is blocked.
  }
  lastRaw = text
  lastShelf = next
  if (savedAt) stampSavedAt(savedAt)
  else if (changed || !readSavedAt()) stampSavedAt()
  saveBoardForSw(currentBook(next))
  noteShelfMilestones(next)
  return next
}

export function downloadShelf(shelf) {
  const blob = new Blob([JSON.stringify(shelf, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `did-i-${stamp}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
}

// The last shelf read, by the exact text it came from. readShelf runs on
// most screens and renders; parsing, normalizing and writing the whole shelf
// back each time held up screen opens. Same text in storage: same shelf
// (nothing changes a shelf in place; every edit makes a new one). Anything
// that writes storage, here or not, changes the text and so the answer.
let lastRaw = null
let lastShelf = null

export function readShelf() {
  let raw = null
  try {
    raw = localStorage.getItem(SHELF_KEY)
    if (raw && raw === lastRaw && lastShelf) return lastShelf
    if (raw) {
      const next = normalizeShelf(JSON.parse(raw))
      // Already in its saved shape: nothing to write back.
      const shelf = JSON.stringify(next) === raw ? next : writeShelf(next)
      lastRaw = localStorage.getItem(SHELF_KEY)
      lastShelf = shelf
      return shelf
    }
  } catch {
    // A cut-off or corrupt shelf is kept aside, never overwritten, and not
    // stamped as newer: the account copy wins on the next pull.
    if (raw) {
      try {
        localStorage.setItem(SHELF_KEY + '-bad', raw)
      } catch {
        // ok
      }
      const book = emptyBoard()
      return { currentId: book.id, boards: [book] }
    }
  }
  try {
    const raw = localStorage.getItem(OLD_KEY)
    if (raw) {
      const book = normalizeBook(JSON.parse(raw))
      return writeShelf({ currentId: book.id, boards: [book] })
    }
  } catch {
    // fall through
  }
  const book = emptyBoard()
  return writeShelf({ currentId: book.id, boards: [book] })
}

export function tagKey(title) {
  return String(title || '')
    .trim()
    .toLowerCase()
}

export function findBookByTitle(boards, title) {
  const key = tagKey(title)
  if (!key) return null
  return (boards || []).find((book) => tagKey(book.title) === key) || null
}

export function findBookHoldingLamp(boards, lampId) {
  if (!lampId) return null
  return (
    (boards || []).find((book) => (book.lamps || []).some((lamp) => lamp.id === lampId)) || null
  )
}

// Everything a twin must share: same words, same schedule, same ask time.
const TWIN_FIELDS = ['cadence', 'weekdays', 'monthDay', 'everyN', 'everyNAnchor', 'everyDays', 'perWeek', 'onceWhen', 'onceOn', 'dueBy', 'slot', 'askAfter']

function foldBook(into, extra) {
  if (!extra || extra.id === into.id) return extra || into
  const ids = new Set((into.lamps || []).map((lamp) => lamp.id))
  const lamps = [...(into.lamps || [])]
  // A never-answered twin (a starter picked on a new phone before sign-in,
  // same words and schedule as one already here) is not a second question.
  const twinOf = (lamp) =>
    JSON.stringify([String(lamp.question || '').trim().toLowerCase(), ...TWIN_FIELDS.map((key) => lamp[key] ?? '')])
  const twins = new Set(lamps.filter((lamp) => !lamp.archived).map(twinOf))
  const answered = new Set((extra.answers || []).map((answer) => answer.lampId))
  for (const lamp of extra.lamps || []) {
    if (ids.has(lamp.id)) continue
    if (!answered.has(lamp.id) && twins.has(twinOf(lamp))) continue
    lamps.push(lamp)
  }
  const seen = new Set((into.answers || []).map((answer) => `${answer.lampId}:${answer.periodKey}`))
  const answers = [...(into.answers || [])]
  for (const answer of extra.answers || []) {
    const key = `${answer.lampId}:${answer.periodKey}`
    if (seen.has(key)) continue
    seen.add(key)
    answers.push(answer)
  }
  // Keep both delete lists, or a removed question comes back on the next merge.
  const kept = new Set(lamps.map((lamp) => lamp.id))
  const gone = [...(into.gone || []), ...(extra.gone || []).filter((item) => !kept.has(item.id))]
  return { ...into, lamps, answers, ...(gone.length ? { gone } : {}) }
}

export function mergeSameTitles(shelf) {
  const boards = []
  const byKey = new Map()
  const into = new Map()
  for (const book of shelf.boards || []) {
    const key = tagKey(book.title)
    const prev = key ? byKey.get(key) : null
    if (!prev) {
      boards.push(book)
      if (key) byKey.set(key, book)
      continue
    }
    // Every phone keeps the same id (the smaller), or a delete of one id on
    // one phone leaves the other phone's id alive and the folder comes back.
    const id = book.id && book.id < prev.id ? book.id : prev.id
    const merged = { ...foldBook(prev, book), id }
    into.set(prev.id === id ? book.id : prev.id, id)
    const index = boards.findIndex((item) => item.id === prev.id)
    boards[index] = merged
    byKey.set(key, merged)
  }
  if (!boards.length) return shelf
  const current = into.get(shelf.currentId) || shelf.currentId
  const currentId = boards.some((book) => book.id === current) ? current : boards[0].id
  return { ...shelf, currentId, boards }
}

// Adding a folder keeps the default for new questions where it was (owner call).
export function addBook(shelf, book) {
  const next = putBook(shelf, book)
  const keep = next.boards.some((item) => item.id === shelf.currentId)
  return keep ? { ...next, currentId: shelf.currentId } : next
}

export function putBook(shelf, book) {
  const next = normalizeBook(book)
  if (shelf.boards.some((item) => item.id === next.id)) {
    const boards = shelf.boards.map((item) => (item.id === next.id ? next : item))
    return mergeSameTitles({ ...shelf, currentId: next.id, boards })
  }
  // A folder put back after a remove (undo) is no longer gone. It comes back
  // as itself, even if another folder took its name meanwhile.
  const gone = (shelf.goneTags || []).some((item) => item.id === next.id && !item.back)
  const same = gone ? null : findBookByTitle(shelf.boards, next.title)
  if (same) {
    const merged = foldBook(same, next)
    return {
      ...shelf,
      currentId: same.id,
      boards: shelf.boards.map((item) => (item.id === same.id ? merged : item)),
    }
  }
  // A new folder starts with the shelf's purse. Its empty default purse would
  // otherwise be copied onto every folder on save and wipe coins.
  const fresh = shelf.boards.length ? stampPurse(next, mergePurses(shelf.boards)) : next
  const goneTags = gone ? [{ id: next.id, at: new Date().toISOString(), back: true }, ...shelf.goneTags] : shelf.goneTags
  return { ...shelf, currentId: next.id, boards: [...shelf.boards, fresh], ...(goneTags ? { goneTags } : {}) }
}

export function selectBook(shelf, id) {
  if (!shelf.boards.some((book) => book.id === id)) return shelf
  return { ...shelf, currentId: id }
}

export function dropBook(shelf, id) {
  if (shelf.boards.length < 2) return shelf
  const boards = shelf.boards.filter((book) => book.id !== id)
  const currentId = shelf.currentId === id ? boards[0].id : shelf.currentId
  const goneTags = [{ id, at: new Date().toISOString() }, ...(shelf.goneTags || [])]
  return { ...shelf, currentId, boards, goneTags }
}

export function nextBoardTitle(boards) {
  const used = new Set((boards || []).map((book) => book.title))
  const base = t('tags.default')
  if (!used.has(base)) return base
  let n = 2
  while (used.has(t('tags.defaultN', { n }))) n += 1
  return t('tags.defaultN', { n })
}

// The shop preview card shows one of your own questions, with its folder name
// as the kicker the way the real card does. No questions yet: the sample.
export function previewSample() {
  for (const book of readShelf()?.boards || []) {
    const lamp = (book.lamps || []).find((item) => !item.archived && item.question)
    if (lamp) return { question: lamp.question, tag: book.title || t('shop.buddyPreviewTag') }
  }
  return { question: t('shop.buddyPreviewQ'), tag: t('shop.buddyPreviewTag') }
}
