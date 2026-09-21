import { emptyBoard, normalizeBook } from './board-json.js'

// Sample boards that used to load from the app. They must not ride along after
// sign-in. Marketing-only landing-demo.js never writes here.

export const DEMO_KEEPER = 'Jordan Hale'

const DEMO_BOARD_IDS = new Set([
  'board-hayes',
  'board-practice',
  'board-shop-try',
  'board-try-now',
  'board-landing-demo',
])

const DEMO_LAMP_IDS = new Set([
  'di-pills',
  'di-door',
  'di-bins',
  'di-water',
  'di-fern',
  'di-lease',
  'di-try-plants',
  'di-try-keys',
  'di-try-door',
  'di-now-pills',
  'di-now-trash',
  'di-now-landlord',
  'di-land-pills',
  'di-land-trash',
  'di-land-landlord',
])

const DEMO_TITLES = new Set(['Hayes Street', 'Practice night', 'Shop try', 'Try now'])

const DEMO_INK = new Set([
  'Tap DID. Watch the cheer. Then open Shop.',
  'Tonight is done. Spend coins on a look. Spend gems on a cheer.',
  'Three due tonight. Swipe DID or did not.',
])

export function isDemoLampId(id) {
  return DEMO_LAMP_IDS.has(String(id || '').trim())
}

export function isDemoBoard(book) {
  if (!book) return false
  if (DEMO_BOARD_IDS.has(book.id)) return true
  const title = String(book.title || '').trim()
  const keeper = String(book.keeperName || '').trim()
  if (DEMO_TITLES.has(title) && keeper === DEMO_KEEPER) return true
  const lamps = (book.lamps || []).filter((lamp) => !lamp.archived)
  return lamps.length > 0 && lamps.every((lamp) => isDemoLampId(lamp.id))
}

export function stripDemoBook(book) {
  if (isDemoBoard(book)) return null
  const lamps = (book.lamps || []).filter((lamp) => !isDemoLampId(lamp.id))
  const answers = (book.answers || []).filter((answer) => !isDemoLampId(answer.lampId))
  if (!lamps.length && (book.lamps || []).length) return null
  const ink = String(book.inkNote || '').trim()
  return normalizeBook({
    ...book,
    lamps,
    answers,
    inkNote: DEMO_INK.has(ink) ? '' : book.inkNote,
  })
}

export function stripDemoShelf(shelf) {
  if (!shelf) return shelf
  const boards = []
  let keeper = ''
  for (const book of shelf.boards || []) {
    const next = stripDemoBook(book)
    if (!next) {
      if (book.keeperName && book.keeperName !== DEMO_KEEPER) keeper = book.keeperName
      continue
    }
    boards.push(next)
    if (next.keeperName && next.keeperName !== DEMO_KEEPER) keeper = next.keeperName
  }
  if (!boards.length) {
    const book = emptyBoard()
    if (keeper) book.keeperName = keeper
    return { currentId: book.id, boards: [book], gemWeek: shelf.gemWeek || '' }
  }
  const currentId = boards.some((book) => book.id === shelf.currentId) ? shelf.currentId : boards[0].id
  return { ...shelf, currentId, boards }
}

export function demoLampIds() {
  return [...DEMO_LAMP_IDS]
}
