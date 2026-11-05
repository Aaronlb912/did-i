import { useMemo, useState } from 'react'
import {
  amountUnitOf,
  blankLamp,
  didQuestion,
  emptyBoard,
  lampNotifyOn,
  lampPriority,
  missLamp,
  shortLabel,
  slotFromAskAfter,
} from './board-json.js'
import { findBookByTitle } from './board-shelf.js'
import { applySchedulePick } from './hang-schedule.js'
import { answerFor, boardDate, keepPastSchedule, periodKeyFor } from './recurrence.js'
import { starterList } from './starters.js'

export function hasExtraFields(item) {
  return Boolean(
    item && (item.short || item.askAfter || item.notes || item.trackAmount || String(item.kind || '').trim()),
  )
}

export function bookForTag(boards, book, name) {
  const title = String(name || '').trim() || book.title
  const hit = findBookByTitle(boards, title)
  if (hit) return hit
  return { ...emptyBoard(), title, keeperName: book.keeperName }
}

// words: typed on Did we or Did you before switching to Did I (web).
function initialDraft({ clock, lamp, seed, start, words }) {
  if (lamp) return { ...lamp }
  if (seed) return { ...seed }
  const pick = starterList().find(
    (item) => item.short.toLowerCase() === String(start || '').toLowerCase(),
  )
  if (pick) {
    const { idea, ...fields } = pick
    return { ...blankLamp(clock), ...fields }
  }
  return words ? { ...blankLamp(clock), question: didQuestion(words) } : blankLamp(clock)
}

export function useHangDraft({
  book,
  boards = [],
  now,
  lamp = null,
  seed = null,
  start = '',
  words = '',
  tagTitle: controlledTag = '',
  onTagTitle,
}) {
  const clock = now || new Date()
  const editing = Boolean(lamp)
  const [draft, setDraft] = useState(() =>
    initialDraft({ clock, lamp, seed, start, words }),
  )
  const [tagTitleLocal, setTagTitleLocal] = useState(controlledTag)
  const tagTitle = onTagTitle ? controlledTag : tagTitleLocal
  const setTagTitle = onTagTitle || setTagTitleLocal
  const [more, setMore] = useState(() => hasExtraFields(lamp) || hasExtraFields(seed))
  const [miss, setMiss] = useState('')

  const liveTags = useMemo(() => (boards || []).filter((item) => !item.archived), [boards])
  const parkedTags = useMemo(() => (boards || []).filter((item) => item.archived), [boards])
  const tagPick = useMemo(() => String(tagTitle || '').trim(), [tagTitle])
  const knownTag = useMemo(() => Boolean(findBookByTitle(boards, tagPick)), [boards, tagPick])
  const priority = lampPriority(draft)
  const notifyOn = lampNotifyOn(draft)

  function change(field, value) {
    setDraft((prev) => {
      const today = boardDate(clock, book.dayFoldHour)
      if (field === 'cadence') {
        return applySchedulePick(prev, value, today)
      }
      const next = { ...prev, [field]: value }
      return next
    })
    if (miss) setMiss('')
  }

  function changeSchedule(pick) {
    const today = boardDate(clock, book.dayFoldHour)
    setDraft((prev) => applySchedulePick(prev, pick, today))
    if (miss) setMiss('')
  }

  // An idea brings its own schedule, time and name along with the question.
  function applyStarter(starter) {
    const { idea, ...fields } = starter
    setDraft((prev) => ({ ...prev, ...fields }))
    if (miss) setMiss('')
  }

  function changeAskAfter(value) {
    setDraft((prev) => {
      const next = { ...prev, askAfter: value, slot: slotFromAskAfter(value) }
      // The second reminder needs a first one, and a different time.
      if (!value || prev.askAfter2 === value) delete next.askAfter2
      return next
    })
    if (miss) setMiss('')
  }

  function toggleDay(day) {
    setDraft((prev) => {
      const has = (prev.weekdays || []).includes(day)
      const weekdays = has
        ? (prev.weekdays || []).filter((item) => item !== day)
        : [...(prev.weekdays || []), day].sort((a, b) => a - b)
      return { ...prev, weekdays }
    })
    if (miss) setMiss('')
  }

  function buildLamp() {
    const next = {
      ...draft,
      question: draft.question.trim(),
      short: String(draft.short || '').trim() || shortLabel(draft),
      monthDay: draft.cadence === 'monthly' ? draft.monthDay : '',
      onceWhen: draft.cadence === 'once' ? (draft.onceWhen === 'by' ? 'by' : 'on') : '',
      onceOn: draft.cadence === 'once' && draft.onceWhen !== 'by' ? draft.onceOn : '',
      dueBy: draft.cadence === 'once' && draft.onceWhen === 'by' ? draft.dueBy : '',
      everyN: draft.cadence === 'every_n' ? Number(draft.everyN) || draft.everyN : '',
      everyNAnchor: draft.cadence === 'every_n' ? draft.everyNAnchor : '',
      everyDays: draft.cadence === 'every' ? Number(draft.everyDays) || draft.everyDays : '',
      perWeek: draft.cadence === 'daily' && Number(draft.perWeek) >= 1 ? Number(draft.perWeek) : '',
      weekdays: draft.cadence === 'weekly' ? draft.weekdays || [] : [],
      notes: String(draft.notes || '').trim().slice(0, 500),
      priority,
      notify: notifyOn,
    }
    // Track an amount: only stored when on, with its unit cut to UNIT_MAX.
    delete next.trackAmount
    delete next.amountUnit
    if (draft.trackAmount) {
      next.trackAmount = true
      const unit = amountUnitOf(draft)
      if (unit) next.amountUnit = unit
    }
    if (!next.askAfter || !next.askAfter2 || next.askAfter2 === next.askAfter) delete next.askAfter2
    // A one-time question has its own day; an end date would only hide it.
    if (!next.endsOn || next.cadence === 'once') delete next.endsOn
    // Stopped or asked again elsewhere while the form was open: that stays.
    // So do the pause records, or the paused days come back as misses.
    if (editing) {
      for (const key of ['archived', 'pausedOn', 'pauses']) {
        if (lamp[key]) next[key] = lamp[key]
        else delete next[key]
      }
    }
    // Past days keep the schedule they had, so a schedule edit never ends a streak.
    const today = boardDate(clock, book.dayFoldHour)
    const was = editing ? keepPastSchedule(lamp, next, today, !!answerFor(book, lamp.id, periodKeyFor(lamp, today))) : []
    if (was.length) next.was = was
    else delete next.was
    return { lamp: next, problem: missLamp(next) || passedDay(next) || endPassed(next) }
  }

  // A once-only day moved into the past would close as Not yet on save.
  function passedDay(next) {
    if (!editing || next.cadence !== 'once') return ''
    const day = next.onceWhen === 'by' ? next.dueBy : next.onceOn
    const was = lamp?.cadence === 'once' ? (lamp.onceWhen === 'by' ? lamp.dueBy : lamp.onceOn) : ''
    return day !== was && day < boardDate(clock, book.dayFoldHour) ? 'hang.miss.dayPassed' : ''
  }

  // An end date already behind us would end the question on save.
  function endPassed(next) {
    return next.endsOn && next.endsOn !== lamp?.endsOn && next.endsOn < boardDate(clock, book.dayFoldHour) ? 'hang.miss.endPassed' : ''
  }

  function validate() {
    const { lamp: next, problem } = buildLamp()
    if (problem) {
      setMiss(problem)
      return null
    }
    return next
  }

  function isTagSelected(title) {
    return tagPick === String(title || '').trim()
  }

  return {
    clock,
    draft,
    tagTitle,
    setTagTitle,
    more,
    setMore,
    miss,
    setMiss,
    editing,
    liveTags,
    parkedTags,
    knownTag,
    priority,
    notifyOn,
    change,
    changeSchedule,
    applyStarter,
    changeAskAfter,
    toggleDay,
    buildLamp,
    validate,
    isTagSelected,
  }
}
