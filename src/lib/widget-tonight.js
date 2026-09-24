import { putAnswer } from './board-ops.js'
import { byPriority, shortLabel } from './board-json.js'
import { readShelf, writeShelf } from './board-shelf.js'
import {
  leadTonightRowForWidget,
  readWidgetSettings,
  tonightRowsForWidget,
  widgetBook,
  widgetTonightUri,
} from './widget-config.js'
import { t } from './i18n.js'
import { normalizePurse } from './purse.js'
import {
  allClearTonight,
  answerFor,
  boardDate,
  didStatusForRow,
  faceReadyTonight,
  finishStackCount,
} from './recurrence.js'
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
  }
}

function applyItemStatus(book, item, status, clock = new Date()) {
  if (!item?.lampId || !status) return book
  const rows = faceReadyTonight(book, clock)
  const row = rows.find((r) => {
    if (r.lamp.id !== item.lampId) return false
    if (item.periodKey) return r.periodKey === item.periodKey
    return true
  })
  if (!row) return book
  if (rowStatus(row) === status) return book
  if (status === 'yes') return putAnswer(book, row, didStatusForRow(row), clock)
  if (status === 'skip') return putAnswer(book, row, 'skip', clock)
  return book
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
  if (widgetOpenCount(stored) <= widgetOpenCount(built)) return built
  return {
    ...built,
    items: stored.items,
    leadLampId: stored.leadLampId || built.leadLampId,
    question: stored.question || built.question,
    left: stored.left ?? built.left,
    footer: stored.footer || built.footer,
    openUri: stored.openUri || built.openUri,
    buddyId: stored.buddyId || built.buddyId,
  }
}

export function buildTonightWidgetProps(shelf, now = new Date()) {
  const settings = readWidgetSettings()
  const book = widgetBook(shelf)
  const { rows } = tonightRowsForWidget(book, now, settings.openOnly)
  const openRows = rows.filter((row) => !row.answer)
  const rankedOpen = byPriority(openRows)
  const doneRows = rows.filter((row) => row.answer)
  const items = [...rankedOpen, ...doneRows].map(mapRow)
  const lead = leadTonightRowForWidget(book, now, settings.openOnly)
  const question = lead
    ? String(lead.lamp.question || '').trim() || shortLabel(lead.lamp)
    : ''
  const left = finishStackCount(rows)
  let footer = ''
  if (!rows.length) {
    footer = t('widget.tonight.empty')
  } else if (allClearTonight(book, now)) {
    footer = t('widget.tonight.clear')
  } else if (left === 1) {
    footer = t('widget.tonight.oneLeft')
  } else if (left > 1) {
    footer = t('widget.tonight.left', { n: left })
  } else {
    footer = t('widget.tonight.empty')
  }
  return {
    tagTitle: String(book.title || '').trim() || t('widget.tonight.tagFallback'),
    tagId: book.id,
    question,
    leadLampId: lead?.lamp.id || '',
    items,
    left,
    footer,
    didLabel: t('widget.tonight.did'),
    nopeLabel: t('widget.tonight.nope'),
    openLabel: t('widget.tonight.openApp'),
    emptyLabel: t('widget.tonight.empty'),
    clearLabel: t('widget.tonight.clear'),
    openUri: widgetTonightUri(book, lead?.lamp.id || ''),
    buddyId: normalizePurse(book).buddyOn || '',
    updatedAt: now.getTime(),
  }
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
    left,
    footer: props.footer,
  }
}

function bookForWidgetProps(shelf, props) {
  const id = String(props?.tagId || '').trim()
  if (id) {
    const picked = (shelf?.boards || []).find((b) => b.id === id)
    if (picked) return picked
  }
  return widgetBook(shelf)
}

export function mergeWidgetPropsIntoShelf(shelf, props, clock = new Date()) {
  if (!props?.items?.length) return shelf
  const book = bookForWidgetProps(shelf, props)
  let nextBook = book
  for (const item of props.items) {
    if (item.status === 'open') continue
    nextBook = applyItemStatus(nextBook, item, item.status, clock)
  }
  if (nextBook === book) return shelf
  const boards = shelf.boards.map((b) => (b.id === nextBook.id ? nextBook : b))
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
    return faceReadyTonight(book, clock).find((row) => row.lamp.id === lampId) || null
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
export function applyWidgetTapOnce(lampId, kind, night = '', clock = new Date()) {
  const status = widgetStatus(kind)
  const id = String(lampId || '').trim()
  if (!status || !id) return null
  const shelf = readShelf()
  const book = widgetBook(shelf)
  const row = rowForStoredNight(book, id, night, clock)
  if (!row || row.answer) return null
  const nextBook = putAnswer(book, row, status, clock)
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

export function recordWidgetAnswer(lampId, kind, clock = new Date()) {
  const status = kind === 'did' || kind === 'yes' ? 'yes' : kind === 'nope' || kind === 'skip' ? 'skip' : ''
  if (!status || !lampId) return null
  const shelf = readShelf()
  const book = widgetBook(shelf)
  const stored = readWidgetTonightProps()
  const storedLead = stored?.items?.find(
    (item) => item.lampId === lampId && item.status === 'open',
  )
  const rows = faceReadyTonight(book, clock)
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
  return applyWidgetTapOnce(lampId, kind, night)
}
