import { putAnswer } from './board-ops.js'
import { shortLabel } from './board-json.js'
import { findBookHoldingLamp, readShelf, writeShelf } from './board-shelf.js'
import {
  rankWidgetOpen,
  readWidgetSettings,
  tonightRowsForAllBoards,
  waitingRowsForAllBoards,
  widgetColorBook,
  widgetTonightUri,
} from './widget-config.js'
import { t } from './i18n.js'
import { normalizePurse } from './purse.js'
import { readWeLine } from './we-widget.js'
import {
  answerFor,
  boardDate,
  countedTonightRows,
  didStatusForRow,
  dueClearTonight,
  dueTonight,
  finishStackCount,
  periodPassed,
  openFloorIso,
} from './recurrence.js'
import { nightEnd } from './daily.js'
import { clockWords } from './hall-pages.js'
import { SHELF_IN } from './cloud-sync.js'
import { pushShelfAfterWidgetAnswer } from './widget-cloud-sync.js'
import { readWidgetTonightProps, writeWidgetTonightProps } from './widget-store.js'

export function publishShelf(shelf) {
  try {
    globalThis.window?.dispatchEvent?.(new CustomEvent(SHELF_IN, { detail: shelf }))
  } catch {
    // ok
  }
}

const WIDGET_NAME = 'DidITonight'

export { WIDGET_NAME }

function rowStatus(row) {
  const status = row.answer?.status
  if (status === 'yes' || status === 'late') return 'yes'
  if (status === 'skip') return 'skip'
  return 'open'
}

function mapRow(row) {
  return {
    lampId: row.lamp.id,
    periodKey: row.periodKey,
    dateIso: row.dateIso,
    label: shortLabel(row.lamp),
    question: String(row.lamp.question || '').trim() || shortLabel(row.lamp),
    status: rowStatus(row),
    tag: String(row.book?.title || '').trim(),
  }
}

function applyItemStatus(book, item, status, clock = new Date()) {
  if (!item?.lampId || !status) return book
  const rows = dueTonight(book, clock)
  let row = rows.find((r) => {
    if (r.lamp.id !== item.lampId) return false
    if (item.periodKey) return r.periodKey === item.periodKey
    return true
  })
  // A tap from an earlier night (iOS: widget answered, app not opened before
  // midnight) is no longer due tonight. Keep it on its own night if still unset,
  // or turn the day-turn nope into a did, same as Android's stored tap.
  if (!row && item.periodKey) {
    const stored = rowForStoredNight(book, item.lampId, item.periodKey, clock)
    if (stored && (!stored.answer || (stored.answer.status === 'skip' && status === 'yes'))) row = stored
  }
  if (!row) return book
  if (rowStatus(row) === status) return book
  if (status === 'yes') return putAnswer(book, row, didStatusForRow(row), tapClock(row, clock))
  if (status === 'skip') return putAnswer(book, row, 'skip', tapClock(row, clock))
  return book
}

// The widget only ever shows the current night, so a tap stored for an
// earlier night was made on that night. It lands there, not as a late edit.
function tapClock(row, clock) {
  if (!row?.dateIso || !periodPassed(row.lamp, row.periodKey, openFloorIso(clock))) return clock
  return nightEnd(row.dateIso)
}

function widgetStackLeft(items) {
  const list = Array.isArray(items) ? items : []
  const open = list.filter((item) => item.status === 'open').length
  if (open) return open
  return list.filter((item) => item.status === 'skip').length
}

function widgetLeadFromItems(items, leadLampId = '') {
  const list = Array.isArray(items) ? items : []
  const hasOpen = list.some((item) => item.status === 'open')
  const id = String(leadLampId || '').trim()
  if (id) {
    const hit = list.find(
      (item) =>
        item.lampId === id && (item.status === 'open' || (!hasOpen && item.status === 'skip')),
    )
    if (hit) return hit
  }
  return list.find((item) => item.status === 'open') || list.find((item) => item.status === 'skip') || null
}

function widgetOpenCount(props) {
  return (props?.items || []).filter((item) => item.status === 'open').length
}

/** Headless Android can rebuild before the shelf is warm; keep the fresher open stack. */
export function preferStoredTonightProps(built, stored) {
  if (!stored?.items?.length) return built
  // A saved card that still shows a question the shelf has answered is stale
  // (answered in the app, or by an earlier tap). Never bring it back.
  const builtStatus = new Map(
    (built.items || []).map((item) => [`${item.lampId}|${item.periodKey}`, item.status]),
  )
  const stale = stored.items.some((item) => {
    const now = builtStatus.get(`${item.lampId}|${item.periodKey}`)
    return item.status === 'open' && now && now !== 'open'
  })
  if (stale || widgetOpenCount(stored) <= widgetOpenCount(built)) {
    // Keep the question the person browsed to with Next while it is still open.
    const kept = String(stored.leadLampId || '').trim()
    const hit = kept && kept !== built.leadLampId
      ? browsableItems(built.items).find((item) => item.lampId === kept)
      : null
    if (!hit) return built
    return {
      ...built,
      leadLampId: hit.lampId,
      question: hit.question || hit.label || built.question,
      tagTitle: hit.tag || built.tagTitle,
    }
  }
  return {
    ...built,
    items: stored.items,
    leadLampId: stored.leadLampId || built.leadLampId,
    question: stored.question || built.question,
    tagTitle: stored.tagTitle || built.tagTitle,
    left: stored.left ?? built.left,
    footer: stored.footer || built.footer,
    openUri: stored.openUri || built.openUri,
    buddyId: stored.buddyId || built.buddyId,
    buddyWorn: built.buddyWorn,
  }
}

export function buildTonightWidgetProps(shelf, now = new Date()) {
  const settings = readWidgetSettings()
  const boards = (shelf?.boards || []).filter((b) => !b.archived)
  const rows = tonightRowsForAllBoards(boards, now, settings.openOnly)
  const openRows = rows.filter((row) => !row.answer)
  const rankedOpen = rankWidgetOpen(openRows, now)
  const doneRows = rows.filter((row) => row.answer)
  const items = [...rankedOpen, ...doneRows].map(mapRow)
  const lead = rankedOpen[0] || rows.find((row) => row.answer?.status === 'skip') || null
  const question = lead
    ? String(lead.lamp.question || '').trim() || shortLabel(lead.lamp)
    : ''
  // Count like Tonight's meter: an optional question (put on your tonight
  // for you) stays on the widget to answer, but is not "left" until you did it.
  const left = finishStackCount(countedTonightRows(rows))
  // Same test as Tonight's done card, across every tag, so the widget never
  // says "no questions" while the app says done (the open-only setting hides
  // answered rows).
  const allClear = dueClearTonight(boards.flatMap((book) => dueTonight(book, now)))
  let footer = ''
  if (allClear) {
    footer = t('widget.tonight.clear')
  } else if (!rows.length) {
    footer = t('widget.tonight.empty')
  } else if (left === 1) {
    footer = t('widget.tonight.oneLeft')
  } else if (left > 1) {
    footer = t('widget.tonight.left', { n: left })
  } else {
    footer = t('widget.tonight.empty')
  }
  // Nothing to answer yet, but a question comes up later tonight.
  const next = waitingRowsForAllBoards(boards, now)[0]
  const nextLine = next ? t('widget.tonight.nextAt', { time: clockWords(next.lamp.askAfter) }) : ''
  if (nextLine && !openRows.length) footer = nextLine
  const colorBook = widgetColorBook(shelf)
  return {
    tagTitle: String(lead?.book?.title || '').trim() || t('widget.tonight.openApp'),
    question,
    leadLampId: lead?.lamp.id || '',
    items,
    left,
    footer,
    didLabel: t('widget.tonight.did'),
    nopeLabel: t('widget.tonight.nope'),
    nextLabel: t('widget.tonight.next'),
    openLabel: t('widget.tonight.openApp'),
    emptyLabel: nextLine || t('widget.tonight.empty'),
    clearLabel: nextLine || t('widget.tonight.clear'),
    openUri: widgetTonightUri(null, lead?.lamp.id || ''),
    buddyId: colorBook ? normalizePurse(colorBook).buddyOn || '' : '',
    buddyWorn: colorBook ? normalizePurse(colorBook).worn : {},
    weLine: readWeLine(boardDate(now)),
    updatedAt: now.getTime(),
  }
}

// What Next steps through: open questions, or once none are open, the ones
// marked did not (the Tonight stack asks those again too).
export function browsableItems(items) {
  const list = Array.isArray(items) ? items : []
  const open = list.filter((item) => item.status === 'open')
  return open.length ? open : list.filter((item) => item.status === 'skip')
}

function leadCardItem(props) {
  return widgetLeadFromItems(props?.items, props?.leadLampId)
}

// The Android card steps forward from the snapshot it already has.
// A tap for a lamp that is no longer the open lead does not move it back.
export function advanceTonightCard(props, lampId, kind, night = '') {
  if (!props || !Array.isArray(props.items)) return null
  const id = String(lampId || '').trim()
  const mark = kind === 'did' ? 'yes' : kind === 'nope' ? 'skip' : ''
  if (!id || !mark) return null
  const nightKey = String(night || '').trim()
  const lead = leadCardItem(props)
  if (!lead || lead.lampId !== id) return null
  if (nightKey && String(lead.periodKey || '') !== nightKey) return null
  const items = props.items.map((item) => {
    const same =
      item.lampId === lead.lampId &&
      String(item.periodKey || '') === String(lead.periodKey || '') &&
      item.status === 'open'
    if (!same) return item
    return { ...item, status: mark }
  })
  const nextLead = widgetLeadFromItems(items)
  const left = widgetStackLeft(items)
  if (!nextLead) {
    const clear = String(props.clearLabel || '').trim()
    const empty = String(props.emptyLabel || '').trim()
    const open = String(props.openLabel || '').trim()
    const line = (items.length ? clear : empty) || open || String(props.footer || '').trim()
    if (!line) return null
    return {
      ...props,
      items,
      leadLampId: '',
      question: '',
      left,
      footer: line,
    }
  }
  const question = String(nextLead.question || nextLead.label || '').trim()
  if (!question) return null
  return {
    ...props,
    items,
    leadLampId: nextLead.lampId,
    question,
    tagTitle: nextLead.tag || props.tagTitle,
    left,
    footer: props.footer,
  }
}

// Manual browse through tonight's open questions from the widget's next
// button — unlike advanceTonightCard, this never answers one, it only moves
// which open item is shown. Wraps around. Null when there is nothing to
// browse to (0 or 1 open questions).
export function peekNextTonightCard(props, dir = 1) {
  if (!props || !Array.isArray(props.items)) return null
  const pool = browsableItems(props.items)
  if (pool.length < 2) return null
  const lead = leadCardItem(props)
  const at = lead
    ? pool.findIndex((item) => item.lampId === lead.lampId && item.periodKey === lead.periodKey)
    : -1
  const from = at === -1 ? 0 : at
  const step = dir < 0 ? -1 : 1
  const next = pool[(from + step + pool.length) % pool.length]
  const question = String(next.question || next.label || '').trim()
  if (!question) return null
  return { ...props, leadLampId: next.lampId, question, tagTitle: next.tag || props.tagTitle }
}

// Each item answers on whichever tag its own lamp lives on, since the card
// mixes questions from every tag now.
export function mergeWidgetPropsIntoShelf(shelf, props, clock = new Date()) {
  if (!props?.items?.length) return shelf
  let boards = shelf.boards
  let changed = false
  for (const item of props.items) {
    if (item.status === 'open') continue
    const book = findBookHoldingLamp(boards, item.lampId)
    if (!book) continue
    const nextBook = applyItemStatus(book, item, item.status, clock)
    if (nextBook === book) continue
    boards = boards.map((b) => (b.id === nextBook.id ? nextBook : b))
    changed = true
  }
  if (!changed) return shelf
  return { ...shelf, boards }
}

function widgetStatus(kind) {
  if (kind === 'did' || kind === 'yes') return 'yes'
  if (kind === 'nope' || kind === 'skip') return 'skip'
  return ''
}

function rowForStoredNight(book, lampId, night, clock) {
  const lamp = (book.lamps || []).find((item) => item.id === lampId && !item.archived)
  if (!lamp) return null
  const stored = String(night || '').trim()
  if (!stored) {
    return dueTonight(book, clock).find((row) => row.lamp.id === lampId) || null
  }
  const dateIso = /^\d{4}-\d{2}-\d{2}$/.test(stored) ? stored : boardDate(clock)
  return {
    lamp,
    dateIso,
    periodKey: stored,
    answer: answerFor(book, lamp.id, stored) || null,
  }
}

// Android only. The receiver and the widget task can both see one tap.
// A second apply for the same lamp and night does not write again.
// `tapAt` is when the tap happened (ms). A tap made after its night turned
// came from a stale card and is dropped; taps queued by older builds carry
// no time and land on their night as before.
export function applyWidgetTapOnce(lampId, kind, night = '', clock = new Date(), tapAt = 0) {
  const status = widgetStatus(kind)
  const id = String(lampId || '').trim()
  if (!status || !id) return null
  const shelf = readShelf()
  const book = findBookHoldingLamp(shelf.boards, id)
  if (!book) return null
  const row = rowForStoredNight(book, id, night, clock)
  if (!row) return null
  // A nope can still turn into a did, same as the Tonight stack. Anything else is already set.
  if (row.answer && !(row.answer.status === 'skip' && status === 'yes')) return null
  const tappedAt = tapAt > 0 ? new Date(tapAt) : null
  if (tappedAt && periodPassed(row.lamp, row.periodKey, openFloorIso(tappedAt))) return null
  const nextBook = putAnswer(book, row, status, tappedAt || tapClock(row, clock))
  if (nextBook === book) return null
  const boards = shelf.boards.map((item) => (item.id === nextBook.id ? nextBook : item))
  const nextShelf = writeShelf({ ...shelf, boards })
  const previous = readWidgetTonightProps()
  const props = buildTonightWidgetProps(nextShelf, clock)
  const items = props.items.map((item) =>
    item.lampId === id && (!night || item.periodKey === row.periodKey) ? { ...item, status } : item,
  )
  const nextProps = { ...props, items }
  if (previous?.colors) nextProps.colors = previous.colors
  writeWidgetTonightProps(nextProps)
  publishShelf(nextShelf)
  pushShelfAfterWidgetAnswer(nextShelf, { now: true }).catch(() => {})
  return nextShelf
}

// Android queues every Did / Did not tapped before JS runs, oldest first.
// Builds before the queue stored one object; read that as a queue of one.
export function parseWidgetTapQueue(raw) {
  const text = String(raw || '').trim()
  if (!text) return []
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return []
  }
  const rows = Array.isArray(parsed) ? parsed : [parsed]
  return rows
    .filter((row) => row && typeof row === 'object')
    .map((row) => {
      const tap = {
        lampId: String(row.lampId || '').trim(),
        kind: String(row.kind || '').trim(),
        night: String(row.night || '').trim(),
      }
      const at = Math.floor(Number(row.at) || 0)
      return at > 0 ? { ...tap, at } : tap
    })
    .filter((row) => row.lampId && (row.kind === 'did' || row.kind === 'nope'))
}

// Applies each queued tap once. Rows that throw come back in `failed` so the
// caller can put them back for the next open.
export function applyWidgetTapsOnce(taps, clock = new Date()) {
  let shelf = null
  const failed = []
  for (const tap of taps || []) {
    try {
      shelf = applyWidgetTapOnce(tap.lampId, tap.kind, tap.night, clock, tap.at) || shelf
    } catch {
      failed.push(tap)
    }
  }
  return { shelf, failed }
}

export function recordWidgetAnswer(lampId, kind, clock = new Date()) {
  const status = kind === 'did' || kind === 'yes' ? 'yes' : kind === 'nope' || kind === 'skip' ? 'skip' : ''
  if (!status || !lampId) return null
  const shelf = readShelf()
  const book = findBookHoldingLamp(shelf.boards, lampId)
  if (!book) return null
  const stored = readWidgetTonightProps()
  const storedLead = stored?.items?.find(
    (item) => item.lampId === lampId && item.status === 'open',
  )
  const rows = dueTonight(book, clock)
  const row =
    rows.find(
      (r) =>
        r.lamp.id === lampId &&
        (!storedLead?.periodKey || r.periodKey === storedLead.periodKey),
    ) || rows.find((r) => r.lamp.id === lampId)
  if (!row) return null
  const finalStatus = status === 'yes' ? didStatusForRow(row) : status
  const nextBook = putAnswer(book, row, finalStatus, clock)
  if (nextBook === book) return null
  const boards = shelf.boards.map((b) => (b.id === nextBook.id ? nextBook : b))
  const nextShelf = writeShelf({ ...shelf, boards })
  const props = buildTonightWidgetProps(nextShelf, clock)
  const items = props.items.map((item) =>
    item.lampId === lampId ? { ...item, status } : item,
  )
  writeWidgetTonightProps({ ...props, items })
  publishShelf(nextShelf)
  pushShelfAfterWidgetAnswer(nextShelf, { now: true }).catch(() => {})
  return nextShelf
}

export function absorbStoredWidgetProps(shelf, clock = new Date()) {
  const props = readWidgetTonightProps()
  if (!props) return shelf
  return mergeWidgetPropsIntoShelf(shelf, props, clock)
}

export function handleAndroidWidgetClick(clickAction, clickActionData) {
  if (clickAction === 'OPEN_APP' || clickAction === 'OPEN_URI') return null
  const lampId = String(clickActionData?.lampId || '').trim()
  const kind = String(clickActionData?.kind || '').trim()
  const night = String(clickActionData?.night || '').trim()
  if (!lampId || (kind !== 'did' && kind !== 'nope')) return null
  return applyWidgetTapOnce(lampId, kind, night, new Date(), Date.now())
}
