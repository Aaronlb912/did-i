import { emptyBoard, normalizeBook } from './board-json.js'
import { saveBoardForSw } from './board-store.js'

const SHELF_KEY = 'did-i-shelf'
const OLD_KEY = 'did-i-board'

export function currentBook(shelf) {
  if (!shelf || !shelf.boards || !shelf.boards.length) return emptyBoard()
  return shelf.boards.find((book) => book.id === shelf.currentId) || shelf.boards[0]
}

export function normalizeShelf(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const boards = Array.isArray(source.boards) ? source.boards.map((book) => normalizeBook(book)) : []
  if (!boards.length) {
    const book = emptyBoard()
    return { currentId: book.id, boards: [book] }
  }
  const currentId = boards.some((book) => book.id === source.currentId)
    ? source.currentId
    : boards[0].id
  return { currentId, boards }
}

export function writeShelf(shelf) {
  const next = normalizeShelf(shelf)
  try {
    localStorage.setItem(SHELF_KEY, JSON.stringify(next))
    localStorage.setItem(OLD_KEY, JSON.stringify(currentBook(next)))
  } catch {
    // Board still runs if storage is blocked.
  }
  saveBoardForSw(currentBook(next))
  return next
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

export function putBook(shelf, book) {
  const next = normalizeBook(book)
  const boards = shelf.boards.some((item) => item.id === next.id)
    ? shelf.boards.map((item) => (item.id === next.id ? next : item))
    : [...shelf.boards, next]
  return { currentId: next.id, boards }
}

export function selectBook(shelf, id) {
  if (!shelf.boards.some((book) => book.id === id)) return shelf
  return { ...shelf, currentId: id }
}

export function dropBook(shelf, id) {
  if (shelf.boards.length < 2) return shelf
  const boards = shelf.boards.filter((book) => book.id !== id)
  const currentId = shelf.currentId === id ? boards[0].id : shelf.currentId
  return { currentId, boards }
}

export function nextBoardTitle(boards) {
  const used = new Set((boards || []).map((book) => book.title))
  if (!used.has('Tag')) return 'Tag'
  let n = 2
  while (used.has(`Tag ${n}`)) n += 1
  return `Tag ${n}`
}
