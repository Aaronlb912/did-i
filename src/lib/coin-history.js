// The "how coins work" sheet: recent nights' coins, read from your answers
// with the same rules as coinsFor (did 2, late 1, nope 0, first PAID_TAPS
// paid answers a night, nothing for a question made that night). Every night
// since you started is listed, a 0 night too, with why it paid what it did.
import { addDaysIso, boardDate, stampMs } from './recurrence.js'
import { t } from './i18n.js'
import { gemWeekKey, PAID_TAPS } from './purse.js'

// reason: cap (more Dids than pay), late (a paid Did was late, so 1 coin),
// capLate (both), new (only new questions), nope (only
// nopes), none (nothing answered), open (tonight, not answered yet), '' (paid).
export function coinNights(shelf, now = new Date(), days = 7) {
  const boards = shelf?.boards || []
  const fold = (boards.find((b) => b.id === shelf?.currentId) || boards[0])?.dayFoldHour ?? 0
  const today = boardDate(now, fold)
  const oldest = addDaysIso(today, -(days - 1))
  const seen = new Map()
  const at = (night) => {
    let row = seen.get(night)
    if (!row) {
      row = { coins: 0, paid: 0, late: 0, extra: 0, nopes: 0 }
      seen.set(night, row)
    }
    return row
  }
  let first = ''
  for (const book of boards) {
    const born = new Map((book.lamps || []).map((lamp) => [lamp.id, String(lamp.createdOn || '')]))
    for (const made of born.values()) {
      const day = made.slice(0, 10)
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && (!first || day < first)) first = day
    }
    // Paid taps count per book, as coinsFor does.
    const taps = new Map()
    for (const answer of book.answers || []) {
      const night = String(answer.periodKey || '').slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) continue
      if (!first || night < first) first = night
      if (night < oldest || night > today) continue
      if (answer.status === 'skip') {
        at(night).nopes += 1
        continue
      }
      if (answer.status !== 'yes' && answer.status !== 'late') continue
      const list = taps.get(night)
      if (list) list.push(answer)
      else taps.set(night, [answer])
    }
    for (const [night, list] of taps) {
      list.sort((a, b) => stampMs(a.answeredAt) - stampMs(b.answeredAt))
      const paid = list.slice(0, PAID_TAPS)
      const row = at(night)
      row.coins += paid.reduce((sum, a) => sum + (a.status === 'yes' ? 2 : 1), 0)
      row.paid += paid.length
      row.late += paid.filter((a) => a.status === 'late').length
      row.extra += list.length - paid.length
    }
  }
  const out = []
  for (let i = 0; i < days; i += 1) {
    const night = addDaysIso(today, -i)
    if (!first || night < first) break
    const row = seen.get(night)
    let reason = ''
    if (!row || (!row.paid && !row.nopes)) reason = night === today ? 'open' : 'none'
    else if (row.extra) reason = row.late ? 'capLate' : 'cap'
    else if (row.late) reason = 'late'
    else if (!row.paid) reason = 'nope'
    out.push({ night, coins: row?.coins || 0, reason })
  }
  return out
}

// Signed in, the server's numbers win, but the list keeps every local night
// so a 0 night still shows. A reason stays only while the two agree.
// Tonight (today) always comes from your own answers, the same ones Home
// counts, so a server row that lags or leads them never shows a wrong number.
export function mergeCoinNights(local, server, today = '') {
  const paid = new Map((server || []).map((row) => [row.night, row.coins]))
  return (local || []).map((row) => {
    if (!paid.has(row.night) || row.night === today || row.reason === 'open') return row
    const coins = paid.get(row.night)
    return coins === row.coins ? row : { night: row.night, coins, reason: '' }
  })
}

export function coinNightLine(row, date) {
  const base = t('coins.nightLine', { date, n: row.coins })
  return row.reason ? `${base}. ${t(`coins.why.${row.reason}`, { n: PAID_TAPS })}` : `${base}.`
}

// Whether this week's gem is already earned.
export function gemThisWeek(gemWeek, now = new Date(), fold = 0) {
  return Boolean(gemWeek) && gemWeek === gemWeekKey(now, fold)
}
