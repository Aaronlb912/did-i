import { activeLook } from './dit-board.js'
import { byPriority } from './board-json.js'
import { currentBook, liveLampCount } from './board-shelf.js'
import { normalizePurse } from './purse.js'
import { readPrefs, resolveTheme } from './prefs.js'
import { faceSwipeTonight, unansweredTonight } from './recurrence.js'

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
  const tagMode = raw.widgetTagMode === 'pick' ? 'pick' : 'active'
  const lookMode = raw.widgetLookMode === 'pick' ? 'pick' : 'tag'
  let lookId = String(raw.widgetLookId || 'lime').trim()
  if (!LOOK_IDS.has(lookId)) lookId = 'lime'
  return {
    tagMode,
    tagId: String(raw.widgetTagId || '').trim(),
    lookMode,
    lookId,
    openOnly: raw.widgetOpenOnly === true,
  }
}

export function widgetBook(shelf) {
  const settings = readWidgetSettings()
  const boards = (shelf?.boards || []).filter((b) => !b.archived)
  if (settings.tagMode === 'pick' && settings.tagId) {
    const picked = boards.find((b) => b.id === settings.tagId)
    if (picked) return picked
  }
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

export function widgetTonightUri(book) {
  const id = book?.id ? `?tag=${encodeURIComponent(book.id)}` : ''
  return `didi://tonight${id}`
}

export function widgetTagChoices(shelf) {
  return (shelf?.boards || [])
    .filter((b) => !b.archived && liveLampCount(b) > 0)
    .map((b) => ({ id: b.id, title: String(b.title || '').trim() }))
}

export function tonightRowsForWidget(book, now, openOnly) {
  let rows = faceSwipeTonight(book, now)
  if (openOnly) rows = rows.filter((row) => !row.answer)
  return { rows, open: unansweredTonight(book, now) }
}

/** Highest-priority open question on the widget tag, same order as Tonight swipe stack. */
export function leadTonightRowForWidget(book, now, openOnly) {
  const { rows } = tonightRowsForWidget(book, now, openOnly)
  const open = rows.filter((row) => !row.answer)
  if (open.length) return byPriority(open)[0]
  const noped = rows.filter((row) => row.answer?.status === 'skip')
  if (!openOnly && noped.length) return byPriority(noped)[0]
  return null
}
