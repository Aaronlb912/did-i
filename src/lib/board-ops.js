import { answeredAtIso, duplicateLamp, newAnswerId } from './board-json.js'
import { activeLook } from './dit-board.js'
import { fireCheer, noteCheer, normalizePurse, cheerPlayOf, payTap } from './purse.js'

export function putAnswer(book, row, status, clock = new Date()) {
  if (!row || !row.lamp) return book
  const answer = {
    id: newAnswerId(),
    lampId: row.lamp.id,
    periodKey: row.periodKey,
    status,
    answeredAt: answeredAtIso(clock),
    note: '',
  }
  const next = {
    ...book,
    answers: [
      ...(book.answers || []).filter(
        (item) => !(item.lampId === row.lamp.id && item.periodKey === row.periodKey),
      ),
      answer,
    ],
  }
  const paid = payTap(book, next, row, status, clock)
  if (status !== 'yes' && status !== 'late') return paid
  const cheered = noteCheer(paid)
  const purse = normalizePurse(cheered)
  if (purse.cheerOn) {
    fireCheer(purse.cheerOn, cheerPlayOf(cheered, purse.cheerOn), activeLook(cheered))
  }
  return cheered
}

export function hangInto(book, lamp, editing) {
  if (!lamp) return book
  if (editing) {
    return {
      ...book,
      lamps: (book.lamps || []).map((item) => (item.id === lamp.id ? lamp : item)),
    }
  }
  return { ...book, lamps: [...(book.lamps || []), lamp] }
}

export function takeDown(book, lamp) {
  if (!lamp) return book
  return {
    ...book,
    lamps: (book.lamps || []).filter((item) => item.id !== lamp.id),
    answers: (book.answers || []).filter((item) => item.lampId !== lamp.id),
  }
}

export function toggleArchive(book, lamp) {
  if (!lamp) return book
  return {
    ...book,
    lamps: (book.lamps || []).map((item) =>
      item.id === lamp.id ? { ...item, archived: !item.archived } : item,
    ),
  }
}

export function hangCopy(book, lamp, clock = new Date()) {
  const copy = duplicateLamp(lamp, clock)
  return {
    book: { ...book, lamps: [...(book.lamps || []), copy] },
    copy,
  }
}

