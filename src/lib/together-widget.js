// The Together widget: your friends and family, and who has finished
// tonight. The widget cannot reach the server, so the app keeps the last
// list it loaded. Only done_on is kept, so a check from last night never
// shows as done today. Kept apart from people.js so the widget task does
// not load the network code.
import { t } from './i18n.js'
import { isoDate } from './recurrence.js'

const KEY = 'did-i-together-widget'
export const TOGETHER_WIDGET_NAME = 'DidITogether'
export const TOGETHER_OPEN_URI = 'didi://open/friends'

const watchers = new Set()

// Called with nothing when the saved list changes, so native can redraw.
export function onTogetherSaved(fn) {
  watchers.add(fn)
  return () => watchers.delete(fn)
}

// people: [{ id, name, initials, shared, doneOn }]. Returns true when it changed.
export function saveTogetherPeople(people) {
  try {
    const next = JSON.stringify((people || []).slice(0, 40))
    if (localStorage.getItem(KEY) === next) return false
    localStorage.setItem(KEY, next)
  } catch {
    return false
  }
  for (const fn of watchers) {
    try {
      fn()
    } catch {
      // A widget redraw failing must not break the people load.
    }
  }
  return true
}

export function readTogetherPeople() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function say(key, english, vars) {
  const text = t(key, vars)
  if (text !== key) return text
  return english.replace(/\{(\w+)\}/g, (_, name) => (vars?.[name] == null ? '' : String(vars[name])))
}

export function buildTogetherWidgetProps(people = readTogetherPeople(), dateIso = isoDate(new Date())) {
  const rows = (people || []).map((p) => ({
    id: String(p.id || ''),
    name: String(p.name || ''),
    initials: String(p.initials || '?'),
    shared: p.shared !== false,
    done: p.shared !== false && Boolean(p.doneOn) && p.doneOn === dateIso,
  }))
  // Not done first, then by name: when the list is cut short, the people
  // still going are the ones worth seeing.
  rows.sort((a, b) => Number(a.done) - Number(b.done) || a.name.localeCompare(b.name))
  const done = rows.filter((r) => r.done).length
  return {
    people: rows,
    title: say('together.widgetTitle', 'Together today'),
    // Same words as the Friends page when nobody is done yet.
    countLine: !rows.length
      ? ''
      : done
        ? say('together.widgetCount', '{n} of {total} done', { n: done, total: rows.length })
        : say('together.noneYet', 'Nobody done yet'),
    emptyLabel: say('together.widgetEmpty', 'Add friends or family in Did I.'),
    openUri: TOGETHER_OPEN_URI,
  }
}
