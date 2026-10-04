import { emptyBoard, normalizeBook, normalizeGone } from './board-json.js'
import { alignShelfPurse, mergePurses, stampPurse } from './purse.js'
import { stripDemoShelf } from './demo-strip.js'
import { t } from './i18n.js'
import { saveBoardForSw } from './board-store.js'
import { readSavedAt, stampSavedAt } from './saved-at.js'

export { readSavedAt, stampSavedAt }

const SHELF_KEY = 'did-i-shelf'
const OLD_KEY = 'did-i-board'

// normalizeBook's empty-title fallback used to be the literal 'Did I' before
// it became the localized General folder. A folder still carrying that old
// default (typed then, or landed there via the old fallback) converges to
// General so it folds into today's General folder on next mergeSameTitles.
const OLD_DEFAULT_TITLE = 'Did I'

function migrateDefaultTitle(book) {
  return book.title === OLD_DEFAULT_TITLE ? { ...book, title: t('tags.general') } : book
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

// Empty folders hide, except the one you're on: a folder you just made
// stays until you add to it or move away.
export function parkEmptyTags(shelf) {
  const boards = (shelf.boards || []).map((book) => ({
    ...book,
    archived: liveLampCount(book) === 0 && book.id !== shelf.currentId,
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
    localStorage.setItem(SHELF_KEY, text)
    localStorage.setItem(OLD_KEY, JSON.stringify(currentBook(next)))
  } catch {
    // Board still runs if storage is blocked.
  }
  if (savedAt) stampSavedAt(savedAt)
  else if (changed || !readSavedAt()) stampSavedAt()
  saveBoardForSw(currentBook(next))
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

export function readShelf() {
  try {
    const raw = localStorage.getItem(SHELF_KEY)
    if (raw) return writeShelf(normalizeShelf(JSON.parse(raw)))
  } catch {
    // fall through
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

function foldBook(into, extra) {
  if (!extra || extra.id === into.id) return extra || into
  const ids = new Set((into.lamps || []).map((lamp) => lamp.id))
  const lamps = [...(into.lamps || [])]
  for (const lamp of extra.lamps || []) {
    if (!ids.has(lamp.id)) lamps.push(lamp)
  }
  const seen = new Set((into.answers || []).map((answer) => `${answer.lampId}:${answer.periodKey}`))
  const answers = [...(into.answers || [])]
  for (const answer of extra.answers || []) {
    const key = `${answer.lampId}:${answer.periodKey}`
    if (seen.has(key)) continue
    seen.add(key)
    answers.push(answer)
  }
  return { ...into, lamps, answers }
}

export function mergeSameTitles(shelf) {
  const boards = []
  const byKey = new Map()
  for (const book of shelf.boards || []) {
    const key = tagKey(book.title)
    const prev = key ? byKey.get(key) : null
    if (!prev) {
      boards.push(book)
      if (key) byKey.set(key, book)
      continue
    }
    const merged = foldBook(prev, book)
    const index = boards.findIndex((item) => item.id === prev.id)
    boards[index] = merged
    byKey.set(key, merged)
  }
  if (!boards.length) return shelf
  const currentId = boards.some((book) => book.id === shelf.currentId) ? shelf.currentId : boards[0].id
  return { ...shelf, currentId, boards }
}

export function putBook(shelf, book) {
  const next = normalizeBook(book)
  if (shelf.boards.some((item) => item.id === next.id)) {
    const boards = shelf.boards.map((item) => (item.id === next.id ? next : item))
    return mergeSameTitles({ ...shelf, currentId: next.id, boards })
  }
  const same = findBookByTitle(shelf.boards, next.title)
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
  return { ...shelf, currentId: next.id, boards: [...shelf.boards, fresh] }
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
