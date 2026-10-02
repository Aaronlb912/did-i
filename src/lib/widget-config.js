import { activeLook } from './active-look.js'
import { byAskTime } from './board-json.js'
import { currentBook } from './board-shelf.js'
import { normalizePurse } from './purse.js'
import { readPrefs, resolveTheme } from './prefs.js'
import { askAfterPassed, boardDate, faceSwipeTonight, waitingTonight } from './recurrence.js'
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
  'jade',
  'indigo',
  'clay',
  'sky',
  'orchid',
  'chalk',
  'maple',
  'fig',
  'oat',
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

// Every tag's tonight work, merged. Only questions whose ask time has come,
// same as the stack; the widget is refreshed at each ask time instead. Each
// row carries the tag it came from, since the card no longer belongs to one tag.
export function tonightRowsForAllBoards(boards, now, openOnly) {
  const rows = []
  for (const book of boards || []) {
    if (book.archived) continue
    const ready = faceSwipeTonight(book, now)
    for (const row of ready) rows.push({ ...row, book })
  }
  if (openOnly) return rows.filter((row) => !row.answer)
  return rows
}

// Tonight's open questions still waiting on their ask time, soonest first.
export function waitingRowsForAllBoards(boards, now) {
  const rows = []
  for (const book of boards || []) {
    if (book.archived) continue
    for (const row of waitingTonight(book, now)) {
      if (!row.answer && mustSwipeDeadline(row.lamp, row.dateIso)) rows.push({ ...row, book })
    }
  }
  return rows.sort((a, b) => a.lamp.askAfter.localeCompare(b.lamp.askAfter))
}

// When the widget has to redraw tonight: each ask time still to come.
export function widgetAskTimes(boards, now) {
  const [year, month, day] = boardDate(now).split('-').map(Number)
  const times = new Set()
  for (const row of waitingRowsForAllBoards(boards, now)) {
    const match = row.lamp.askAfter.match(/^(\d{2}):(\d{2})$/)
    if (!match) continue
    const at = new Date(year, month - 1, day, Number(match[1]), Number(match[2])).getTime()
    if (at > now.getTime()) times.add(at)
  }
  return [...times].sort((a, b) => a - b).map((at) => new Date(at))
}

/** Open rows ready to ask now come before waiting ones; priority orders each group. */
export function rankWidgetOpen(open, now) {
  const ready = open.filter((row) => askAfterPassed(row.lamp, now))
  const waiting = open.filter((row) => !askAfterPassed(row.lamp, now))
  return [...byAskTime(ready), ...byAskTime(waiting)]
}
