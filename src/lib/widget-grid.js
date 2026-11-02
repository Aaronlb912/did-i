// The Grid widget: the last 12 weeks as day squares, Did / Not yet / none,
// across the whole shelf. Built in one pass over 84 days and kept until the
// shelf, the day or the language changes, so a redraw costs nothing.
import { addDaysIso, boardDate } from './recurrence.js'
import { nightMarksMany } from './hall-pages.js'
import { firstWeekday, t } from './i18n.js'
import { gentleOn, readPrefs } from './prefs.js'

export const GRID_WIDGET_NAME = 'DidIGrid'
export const GRID_OPEN_URI = 'didi://open/calendar'
export const GRID_WEEKS = 12

function say(key, english, vars) {
  const text = t(key, vars)
  if (text !== key) return text
  return english.replace(/\{(\w+)\}/g, (_, name) => (vars?.[name] == null ? '' : String(vars[name])))
}

let memo = { shelf: null, today: '', locale: '', gentle: false, props: null }

// weeks: 12 strings of 7 characters, oldest week first, one per column.
// y = Did, n = Not yet, . = no mark, space = a day still ahead.
export function buildGridWidgetProps(shelf, now = new Date()) {
  const boards = (shelf?.boards || []).filter((b) => !b.archived)
  const today = boardDate(now)
  const locale = readPrefs().locale
  const gentle = gentleOn()
  if (memo.props && memo.shelf === shelf && memo.today === today && memo.locale === locale && memo.gentle === gentle) {
    return memo.props
  }
  const first = firstWeekday(locale)
  const dow = new Date(`${today}T12:00:00`).getDay()
  const row = (dow - first + 7) % 7
  const start = addDaysIso(today, -row - 7 * (GRID_WEEKS - 1))
  const isos = Array.from({ length: GRID_WEEKS * 7 }, (_, at) => addDaysIso(start, at))
  const marks = boards.length ? nightMarksMany(boards, isos, today) : new Map()
  let did = 0
  const weeks = []
  for (let w = 0; w < GRID_WEEKS; w += 1) {
    let line = ''
    for (let d = 0; d < 7; d += 1) {
      const iso = isos[w * 7 + d]
      const mark = marks.get(iso)
      if (iso > today) line += ' '
      else if (mark?.on) {
        line += 'y'
        did += 1
      } else if (mark?.miss && !gentle) line += 'n'
      else line += '.'
    }
    weeks.push(line)
  }
  const props = {
    weeks,
    todayWeek: GRID_WEEKS - 1,
    todayRow: row,
    title: say('widget.grid.title', 'Last 12 weeks'),
    countLine: did ? say('widget.grid.count', '{n} Did days', { n: did }) : '',
    emptyLabel: say('widget.grid.empty', 'Your days fill in here as you answer.'),
    openUri: GRID_OPEN_URI,
  }
  memo = { shelf, today, locale, gentle, props }
  return props
}
