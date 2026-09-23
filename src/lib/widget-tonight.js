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
import { faceReadyTonight } from './recurrence.js'
import { SHELF_IN } from './cloud-sync.js'
import { pushShelfAfterWidgetAnswer } from './widget-cloud-sync.js'
import { readWidgetTonightProps, writeWidgetTonightProps } from './widget-store.js'

function notifyShelf(shelf) {
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
  if (status === 'yes') return putAnswer(book, row, 'yes', clock)
  if (status === 'skip') return putAnswer(book, row, 'skip', clock)
  return book
}

export function buildTonightWidgetProps(shelf, now = new Date()) {
  const settings = readWidgetSettings()
  const book = widgetBook(shelf)
  const { rows, open } = tonightRowsForWidget(book, now, settings.openOnly)
  const openRows = rows.filter((row) => !row.answer)
  const rankedOpen = byPriority(openRows)
  const doneRows = rows.filter((row) => row.answer)
  const items = [...rankedOpen, ...doneRows].map(mapRow)
  const lead = rankedOpen[0] || leadTonightRowForWidget(book, now, settings.openOnly)
  const question = lead
    ? String(lead.lamp.question || '').trim() || shortLabel(lead.lamp)
    : ''
  const left = open.length
  let footer = ''
  if (!items.length) {
    footer = t('widget.tonight.empty')
  } else if (left === 0) {
    footer = t('widget.tonight.clear')
  } else if (left === 1) {
    footer = t('widget.tonight.oneLeft')
  } else {
    footer = t('widget.tonight.left', { n: left })
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
    openUri: widgetTonightUri(book),
    buddyId: normalizePurse(book).buddyOn || '',
    updatedAt: now.getTime(),
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

export function recordWidgetAnswer(lampId, kind, clock = new Date()) {
  const status = kind === 'did' || kind === 'yes' ? 'yes' : kind === 'nope' || kind === 'skip' ? 'skip' : ''
  if (!status || !lampId) return null
  const shelf = readShelf()
  const book = widgetBook(shelf)
  const rows = faceReadyTonight(book, clock)
  const row = rows.find((r) => r.lamp.id === lampId)
  if (!row) return null
  const nextBook = putAnswer(book, row, status, clock)
  if (nextBook === book) return null
  const boards = shelf.boards.map((b) => (b.id === nextBook.id ? nextBook : b))
  const nextShelf = writeShelf({ ...shelf, boards })
  const props = buildTonightWidgetProps(nextShelf, clock)
  const items = props.items.map((item) =>
    item.lampId === lampId ? { ...item, status } : item,
  )
  writeWidgetTonightProps({ ...props, items })
  notifyShelf(nextShelf)
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
  if (!lampId || (kind !== 'did' && kind !== 'nope')) return null
  return recordWidgetAnswer(lampId, kind)
}
