import { activeLook } from './dit-board.js'
import { byPriority } from './board-json.js'
import { currentBook } from './board-shelf.js'
import { normalizePurse } from './purse.js'
import { readPrefs, resolveTheme } from './prefs.js'
import { askAfterPassed, faceSwipeTonight, waitingTonight } from './recurrence.js'
import { mustSwipeDeadline } from './lamp-deadline.js'

const LOOK_IDS = new Set([
  'lime',
  'ink',
  'brass',
  'night',
  'moss',
  'plum',
  'rose',
  'steel',
  'wine',
  'glow',
  'ember',
  'frost',
  'pulse',
])

export function readWidgetSettings() {
  const raw = readPrefs()
  const lookMode = raw.widgetLookMode === 'pick' ? 'pick' : 'tag'
  let lookId = String(raw.widgetLookId || 'lime').trim()
  if (!LOOK_IDS.has(lookId)) lookId = 'lime'
  return {
    lookMode,
    lookId,
    openOnly: raw.widgetOpenOnly === true,
  }
}

// The widget lists every tag's tonight work now, not one picked tag. This is
// only for the ring color and the buddy's look, when "Look" is set to follow
// a tag: the phone's current tag, or the first tag with lamps if none is
// current.
export function widgetColorBook(shelf) {
  const boards = (shelf?.boards || []).filter((b) => !b.archived)
  const live = currentBook(shelf)
  if (live && !live.archived) return live
  return boards[0] || currentBook(shelf)
}

export function ownedLookIds(shelf) {
  const out = new Set(['lime'])
  for (const book of shelf?.boards || []) {
    const purse = normalizePurse(book)
    for (const id of purse.looks || []) {
      if (LOOK_IDS.has(id)) out.add(id)
    }
  }
  return out
}

export function widgetLookId(shelf, book) {
  const settings = readWidgetSettings()
  const owned = ownedLookIds(shelf)
  if (settings.lookMode === 'pick' && owned.has(settings.lookId)) return settings.lookId
  const onTag = activeLook(book)
  if (owned.has(onTag)) return onTag
  return 'lime'
}

export function widgetTheme() {
  return resolveTheme(readPrefs().theme)
}

export function widgetTonightUri(book, leadLampId = '') {
  const face = String(leadLampId || '').trim()
  if (face) return `didi://tonight?face=${encodeURIComponent(face)}`
  return 'didi://tonight'
}

// Every tag's tonight work, merged. Ready questions first, then ones still
// waiting on their ask time (the app lets you answer those early too, so
// the widget must, or it says "No questions yet" all afternoon). Each row
// carries the tag it came from, since the card no longer belongs to one tag.
export function tonightRowsForAllBoards(boards, now, openOnly) {
  const rows = []
  for (const book of boards || []) {
    if (book.archived) continue
    const ready = faceSwipeTonight(book, now)
    const waiting = waitingTonight(book, now).filter((row) => mustSwipeDeadline(row.lamp, row.dateIso))
    for (const row of [...ready, ...waiting]) rows.push({ ...row, book })
  }
  if (openOnly) return rows.filter((row) => !row.answer)
  return rows
}

/** Open rows ready to ask now come before waiting ones; priority orders each group. */
export function rankWidgetOpen(open, now) {
  const ready = open.filter((row) => askAfterPassed(row.lamp, now))
  const waiting = open.filter((row) => !askAfterPassed(row.lamp, now))
  return [...byPriority(ready), ...byPriority(waiting)]
}
