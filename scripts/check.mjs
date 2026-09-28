// The checks that do not need a server. Run with: npm test
//
// Everything here is something that broke once, or would break quietly
// if someone changed the wrong line.

import { strict as assert } from 'node:assert'
import { createRequire, registerHooks } from 'node:module'
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  addDaysIso,
  answerFor,
  boardDate,
  faceReadyTonight,
  faceSwipeTonight,
  isDueOn,
  isoDate,
  periodPassed,
} from '../src/lib/recurrence.js'
import { closePastNights } from '../src/lib/daily.js'
import { putAnswer } from '../src/lib/board-ops.js'
import {
  activeDeadline,
  byPriority,
  didQuestion,
  dueByUrgency,
  lampBuzzes,
  lampNudgesLate,
  prepQuestionRows,
} from '../src/lib/board-json.js'
import { STARTERS, starterBlank } from '../src/lib/starters.js'
import { mergeShelves } from '../src/lib/shelf-merge.js'
import { devServerUrl, makeLocation } from '../native/location-shim.js'
import { lintStore } from './lint-store.mjs'
import { isDemoBoard, stripDemoShelf } from '../src/lib/demo-strip.js'
import { emptyShake, shakeStep } from '../src/lib/shake-undo.js'
import { bulkLamps, undoBulkLamps } from '../src/lib/board-ops.js'

import { applyAnswers, shelfWithoutAnswers } from '../src/lib/answer-log.js'
import {
  INVITE_CODE_LEN,
  INVITE_GEMS_CAP,
  cleanCode,
  cleanInvite,
  inviteGemsDue,
} from '../src/lib/people.js'
import { inviteNextFriendGems, inviteRewardProgress } from '../src/lib/invite-reward.js'
import { cleanPhone, looksLikePhone } from '../src/lib/people.js'
import { inviteClip, inviteFromText, inviteLink, playLinkFor } from '../src/lib/invite-link.js'
import { validateCoinItem } from '../src/lib/wallet.js'
import { BUDDIES, FREE_BUDDY, LOOKS, SHOP_CALENDAR, isLive, isTeased, normalizePurse } from '../src/lib/purse.js'
import { hasAnyTopic, joinTopics, shelfTopics, topicsOf } from '../src/lib/board-json.js'
import { GEM_PACKS, GEM_UNIT_CENTS } from '../src/lib/gem-packs.js'
import { cheerKinds, holdFor, popsFor } from '../src/lib/cheer-pops.js'
import {
  clearLocalShelf,
  enterLand,
  hallEmpty,
  mergeSameTitles,
  normalizeShelf,
  parkEmptyTags,
  readShelf,
  writeShelf,
} from '../src/lib/board-shelf.js'
import { sessionMissing, signedOutSync } from '../src/lib/cloud-sync.js'
import {
  buyCheer,
  buyFriendCheers,
  FRIEND_CHEER_CAP,
  FRIEND_CHEERS_PER_GEM,
  gemWeekKey,
  spendGems,
  takeFriendCheer,
  weeklyGemBump,
} from '../src/lib/purse.js'
import { authGated, clearAuthSkip, needsAuth, skipAuth } from '../src/lib/auth-gate.js'
import { allClearTonight, didStatusForRow, shouldFinishAfterNope } from '../src/lib/recurrence.js'
import { DAY_FOLD } from '../src/lib/zone.js'
import { en } from '../src/locales/en.js'
import { es } from '../src/locales/es.js'
import { fr } from '../src/locales/fr.js'
import { de } from '../src/locales/de.js'
import { pt } from '../src/locales/pt.js'
import { it } from '../src/locales/it.js'
import { zh } from '../src/locales/zh.js'
import { ja } from '../src/locales/ja.js'
import { ko } from '../src/locales/ko.js'
import { additionsEn, additionsEs } from './i18n-additions.mjs'
import { isLegalKey, mayMatchEnglish } from './locale-shared.mjs'
import { writePrefs } from '../src/lib/prefs.js'
import { nightProgress } from '../src/lib/night-progress.js'
import { cardTilt, depthLook, flyPath, grabSide, releaseWay } from '../native/lib/swipe-motion.js'
import { joinTagIds, leftoverOn, scopedBooks, tagIdsOf, taggedDue } from '../src/lib/tags.js'
import { ownedLookIds, widgetLookId, widgetTonightUri } from '../src/lib/widget-config.js'
import { writeAccountUserId } from '../src/lib/session-id.js'
import { clockWords, stampWhen, tomorrowPreview } from '../src/lib/hall-pages.js'
import { joinTime, timeParts } from '../src/lib/hang-time.js'
import { searchRows, tonightStates } from '../src/lib/question-list.js'
import { holdSpoken, spokenQuestion, takeSpoken } from '../src/lib/voice-add.js'
import {
  advanceTonightCard,
  applyWidgetTapOnce,
  applyWidgetTapsOnce,
  buildTonightWidgetProps,
  mergeWidgetPropsIntoShelf,
  parseWidgetTapQueue,
  peekNextTonightCard,
  preferStoredTonightProps,
} from '../src/lib/widget-tonight.js'

const require = createRequire(import.meta.url)

const shelfStore = new Map()
globalThis.localStorage = {
  getItem: (key) => (shelfStore.has(key) ? shelfStore.get(key) : null),
  setItem: (key, value) => shelfStore.set(key, String(value)),
  removeItem: (key) => shelfStore.delete(key),
}
if (!globalThis.window) {
  globalThis.window = { dispatchEvent() {} }
}

let ran = 0
let failed = 0

function test(name, fn) {
  ran += 1
  try {
    fn()
    console.log(`ok   ${name}`)
  } catch (error) {
    failed += 1
    console.error(`FAIL ${name}\n     ${error.message}`)
  }
}

function lamp(id, extra = {}) {
  return { id, question: id, cadence: 'daily', archived: false, createdOn: '2024-01-01', ...extra }
}

test('a bulk delete across folders comes back whole on undo', () => {
  const home = { id: 'home', lamps: [{ id: 'a' }, { id: 'b' }], answers: [{ lampId: 'b', periodKey: '2026-09-25', status: 'yes' }] }
  const work = { id: 'work', lamps: [{ id: 'c' }], answers: [] }
  const picks = [{ boardId: 'home', lampId: 'b' }, { boardId: 'work', lampId: 'c' }]
  const gone = bulkLamps([home, work], picks, 'delete')
  assert.deepEqual(gone.map((book) => book.lamps.map((item) => item.id)), [['a'], []])
  assert.equal(gone[0].answers.length, 0)
  // Something added in between stays after the undo.
  const later = gone.map((book) => (book.id === 'home' ? { ...book, lamps: [...book.lamps, { id: 'new' }] } : book))
  const back = undoBulkLamps(later, [home, work], picks)
  assert.deepEqual(back.map((book) => book.lamps.map((item) => item.id)), [['a', 'b', 'new'], ['c']])
  assert.equal(back[0].answers.length, 1)
  const stopped = bulkLamps([home, work], picks, 'stop')
  assert.equal(stopped[0].lamps.find((item) => item.id === 'b').archived, true)
  assert.equal(stopped[0].lamps.find((item) => item.id === 'a').archived, undefined)
})

test('the night turns over at midnight, not at four', () => {
  assert.equal(DAY_FOLD, 0)
  const justAfter = new Date()
  justAfter.setHours(1, 0, 0, 0)
  assert.equal(boardDate(justAfter), isoDate(justAfter))
})

test('an unanswered night closes as nope when the day turns', () => {
  const today = boardDate(new Date())
  const book = {
    dayFoldHour: 0,
    lamps: [lamp('door', { createdOn: '2024-01-01' })],
    answers: [],
  }
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(10, 0, 0, 0)
  const closed = closePastNights(book, tomorrow)
  assert.equal(answerFor(closed, 'door', today)?.status, 'skip')
  assert.equal(closePastNights(closed, tomorrow), closed)
})

test('question search matches every word, and tonight states come from one pass per tag', () => {
  const lamp = (id, question, extra = {}) => ({ id, question, cadence: 'daily', archived: false, createdOn: '2020-01-01', ...extra })
  const book = {
    id: 'b1',
    title: 'Home',
    lamps: [lamp('door', 'Did I lock the back door?', { notes: 'the one by the garage' }), lamp('pills', 'Did I take the pills?')],
    answers: [],
  }
  const rows = book.lamps.map((item) => ({ boardId: 'b1', book, tag: 'Home', lamp: item }))
  assert.equal(searchRows(rows, '').length, 2, 'no query keeps every row')
  assert.deepEqual(searchRows(rows, 'back door').map((row) => row.lamp.id), ['door'])
  assert.deepEqual(searchRows(rows, 'GARAGE').map((row) => row.lamp.id), ['door'], 'notes count, any case')
  assert.deepEqual(searchRows(rows, 'home pills').map((row) => row.lamp.id), ['pills'], 'tag counts')
  assert.equal(searchRows(rows, 'door pills').length, 0, 'every word has to match')
  const clock = new Date(2026, 8, 21, 20, 0)
  const night = boardDate(clock)
  book.answers = [{ id: 'a', lampId: 'door', periodKey: night, status: 'yes', answeredAt: clock.toISOString() }]
  const states = tonightStates(rows, clock)
  assert.equal(states.get('b1:door'), 'did')
  assert.equal(states.get('b1:pills'), 'open')
})

test('words from a voice assistant become the blank after "Did I", once', () => {
  assert.equal(spokenQuestion('lock the back door'), 'lock the back door')
  assert.equal(spokenQuestion('Did I lock the back door?'), 'lock the back door')
  assert.equal(spokenQuestion('add a question did I take my pills'), 'take my pills')
  assert.equal(spokenQuestion('Please create feed the cat.'), 'feed the cat')
  assert.equal(spokenQuestion('   '), '')
  assert.ok(spokenQuestion('x'.repeat(300)).length <= 110, 'long speech is cut to fit a question')
  holdSpoken('water the plants')
  assert.equal(takeSpoken(), 'water the plants')
  assert.equal(takeSpoken(), '', 'handed over only once')
})

test('times follow the clock setting, 12 or 24 hour', () => {
  try {
    writePrefs({ clock: '12' })
    assert.equal(clockWords('20:05'), '8:05 PM')
    assert.equal(clockWords('00:30'), '12:30 AM')
    writePrefs({ clock: '24' })
    assert.equal(clockWords('20:05'), '20:05')
    assert.equal(clockWords('7:30'), '07:30')
    assert.deepEqual(timeParts('07:05', true).hour, '07', '24 hour picker keeps the stored hour')
    assert.equal(joinTime({ hour: '21', minute: '15' }, true), '21:15')
    assert.equal(joinTime({ hour: '9', minute: '15', meridiem: 'pm' }, false), '21:15')
  } finally {
    writePrefs({ clock: 'phone' })
  }
})

test('the first question finishes "Did I ___" once', () => {
  assert.equal(didQuestion('lock the back door'), 'Did I lock the back door?')
  assert.equal(didQuestion('  Lock the   back door??  '), 'Did I lock the back door?')
  assert.equal(didQuestion('did i lock the back door?'), 'Did I lock the back door?')
  assert.equal(didQuestion('Did I'), '')
  assert.equal(didQuestion('   '), '')
  assert.equal(didQuestion('TV off'), 'Did I TV off?')
  for (const starter of STARTERS) {
    assert.equal(didQuestion(starterBlank(starter)), starter.question, starter.short)
  }
})

test('once by deadline shows every night until due', () => {
  const item = lamp('tax', {
    cadence: 'once',
    onceWhen: 'by',
    dueBy: '2024-01-05',
    createdOn: '2024-01-01',
  })
  assert.equal(isDueOn(item, '2023-12-31'), false)
  assert.equal(isDueOn(item, '2024-01-01'), true)
  assert.equal(isDueOn(item, '2024-01-05'), true)
  assert.equal(isDueOn(item, '2024-01-06'), false)
})

test('deadline questions skip the swipe stack until the due night', () => {
  const item = lamp('tax', {
    cadence: 'once',
    onceWhen: 'by',
    dueBy: '2024-01-10',
    createdOn: '2024-01-01',
  })
  const book = { dayFoldHour: 0, lamps: [item], answers: [] }
  const early = faceSwipeTonight(book, new Date('2024-01-05T12:00:00'))
  assert.equal(early.length, 0)
  assert.equal(faceReadyTonight(book, new Date('2024-01-05T12:00:00')).length, 1)
  const due = faceSwipeTonight(book, new Date('2024-01-10T12:00:00'))
  assert.equal(due.length, 1)
})

test('deadline urgency is today or tomorrow only', () => {
  const item = lamp('tax', {
    cadence: 'once',
    onceWhen: 'by',
    dueBy: '2024-01-05',
    createdOn: '2024-01-01',
  })
  assert.equal(dueByUrgency(item, '2024-01-05'), 'today')
  assert.equal(dueByUrgency(item, '2024-01-04'), 'soon')
  assert.equal(dueByUrgency(item, '2024-01-03'), '')
  assert.equal(activeDeadline(item, '2024-01-06'), '')
})

test('question rows sort deadlines first', () => {
  const soon = { lamp: lamp('a', { cadence: 'once', onceWhen: 'by', dueBy: '2024-01-03', createdOn: '2024-01-01' }) }
  const later = { lamp: lamp('b', { cadence: 'once', onceWhen: 'by', dueBy: '2024-01-05', createdOn: '2024-01-01' }) }
  const daily = { lamp: lamp('c', { cadence: 'daily', createdOn: '2024-01-01' }) }
  const sorted = prepQuestionRows([daily, later, soon], { dateIso: '2024-01-01' })
  assert.equal(sorted.map((row) => row.lamp.id).join(','), 'a,b,c')
})

test('once by deadline closes after the last night', () => {
  const book = {
    dayFoldHour: 0,
    lamps: [
      lamp('tax', {
        cadence: 'once',
        onceWhen: 'by',
        dueBy: '2024-01-05',
        createdOn: '2024-01-01',
      }),
    ],
    answers: [],
  }
  const after = new Date('2024-01-06T10:00:00')
  const closed = closePastNights(book, after)
  assert.equal(answerFor(closed, 'tax', 'once:tax')?.status, 'skip')
})

test('today still open does not close before the night ends', () => {
  const today = boardDate(new Date())
  const book = {
    dayFoldHour: 0,
    lamps: [lamp('door', { createdOn: today })],
    answers: [],
  }
  const noon = new Date()
  noon.setHours(12, 0, 0, 0)
  assert.equal(closePastNights(book, noon), book)
  assert.equal(answerFor(book, 'door', today), undefined)
})

test('a finish card appears when open questions remain after a nope', () => {
  const skip = { status: 'skip' }

  // Another question is still open, so the nope just moves the stack along.
  const more = [
    { lamp: { id: 'a' }, answer: null },
    { lamp: { id: 'b' }, answer: null },
    { lamp: { id: 'c' }, answer: skip },
  ]
  assert.equal(shouldFinishAfterNope(more, more[0], 0), false)

  // Last open one, with nopes sat behind it. End of the lap.
  const lap = [
    { lamp: { id: 'b' }, answer: null },
    { lamp: { id: 'a' }, answer: skip },
    { lamp: { id: 'c' }, answer: skip },
  ]
  assert.equal(shouldFinishAfterNope(lap, lap[0], 0), true)

  // A one-question night still gets asked.
  const one = [{ lamp: { id: 'a' }, answer: null }]
  assert.equal(shouldFinishAfterNope(one, one[0], 0), true)

  // Second look at nopes cycles through them, then asks on the wrap.
  const review = [
    { lamp: { id: 'a' }, answer: skip },
    { lamp: { id: 'b' }, answer: skip },
    { lamp: { id: 'c' }, answer: skip },
  ]
  assert.equal(shouldFinishAfterNope(review, review[0], 0), false)
  assert.equal(shouldFinishAfterNope(review, review[1], 1), false)
  assert.equal(shouldFinishAfterNope(review, review[2], 2), true)

  // Nothing to go back to.
  assert.equal(shouldFinishAfterNope([], { lamp: { id: 'a' } }, -1), false)
})

test('a second look at a nope counts as late, not a fresh did', () => {
  assert.equal(didStatusForRow({ answer: { status: 'skip' } }), 'late')
  assert.equal(didStatusForRow({ answer: null }), 'yes')
  assert.equal(didStatusForRow({ answer: { status: 'yes' } }), 'yes')
})

test('sign-out clears the shelf for the next person', () => {
  const book = {
    id: 'board-a',
    title: 'House',
    keeperName: 'Aaron',
    lamps: [{ id: 'di-door', question: 'Did I lock up?', cadence: 'daily', archived: false }],
    answers: [],
  }
  writeShelf({ currentId: book.id, boards: [book] })
  localStorage.setItem('did-i-last-user', 'user-a')
  signedOutSync()
  assert.equal(localStorage.getItem('did-i-last-user'), null)
  assert.equal(hallEmpty(readShelf()), true)
})

test('a phone-only shelf survives a sync that finds no session', () => {
  const book = {
    id: 'board-local',
    title: 'House',
    keeperName: '',
    lamps: [{ id: 'di-cat', question: 'Did I feed the cat?', cadence: 'daily', archived: false }],
    answers: [],
  }
  writeShelf({ currentId: book.id, boards: [book] })
  localStorage.removeItem('did-i-last-user')
  localStorage.setItem('did-i-auth-skip', '1')
  sessionMissing()
  assert.equal(hallEmpty(readShelf()), false, 'questions stay')
  assert.equal(localStorage.getItem('did-i-auth-skip'), '1', 'phone-only choice stays')

  localStorage.setItem('did-i-last-user', 'user-a')
  sessionMissing()
  assert.equal(hallEmpty(readShelf()), true, 'a signed-out account phone still starts clean')
})

test('enter lands on tonight when the shelf already has questions', () => {
  const book = {
    id: 'board-b',
    title: 'House',
    keeperName: 'Aaron',
    lamps: [{ id: 'di-pills', question: 'Did I take the pills?', cadence: 'daily', archived: false }],
    answers: [],
  }
  writeShelf({ currentId: book.id, boards: [book] })
  assert.equal(enterLand('/tonight'), '/tonight')
  assert.equal(enterLand('/'), '/')
})

test('referral gems scale but stop at ten total', () => {
  assert.equal(inviteGemsDue(4, 0, 0), 10)
  assert.equal(inviteGemsDue(10, 0, 0), 10)
  assert.equal(inviteGemsDue(10, 4, 10), 0)
  assert.equal(inviteGemsDue(2, 0, 8), 2)
  assert.equal(INVITE_GEMS_CAP, 10)
})

test('referral reward bar tracks paid gems toward the cap', () => {
  assert.deepEqual(inviteRewardProgress(0), { paid: 0, cap: 10, pct: 0, full: false, left: 10 })
  assert.deepEqual(inviteRewardProgress(6), { paid: 6, cap: 10, pct: 60, full: false, left: 4 })
  assert.deepEqual(inviteRewardProgress(10), { paid: 10, cap: 10, pct: 100, full: true, left: 0 })
  assert.equal(inviteNextFriendGems(0, 0), 1)
  assert.equal(inviteNextFriendGems(3, 6), 4)
  assert.equal(inviteNextFriendGems(5, 10), 0)
})

test('every sql file in db:apply:all is on disk', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const src = readFileSync(path.join(root, 'scripts/apply-all-sql.mjs'), 'utf8')
  const files = [...src.matchAll(/'([^']+\.sql)'/g)].map((match) => match[1])
  assert.ok(files.length >= 10)
  for (const file of files) {
    assert.ok(existsSync(path.join(root, file)), file)
  }
})

test('a referral code is ten characters after cleaning', () => {
  assert.equal(cleanInvite('d93-aq5 lbs4'), 'D93AQ5LBS4')
  assert.equal(cleanInvite('D93AQ5LBS4').length, INVITE_CODE_LEN)
  assert.equal(cleanInvite('short').length, 5)
})

test('native flip cheer runs at 960ms', () => {
  const src = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../native/components/CheerBurst.jsx'), 'utf8')
  assert.match(src, /const FLIP_MS = 960/)
})

// RN 0.86 dropped StyleSheet.absoluteFillObject. Spreading it spread nothing,
// so the cheer layer laid out 0px tall and never showed on the phone.
test('native styles do not spread the removed absoluteFillObject', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const hits = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(jsx?|tsx?)$/.test(name) && readFileSync(full, 'utf8').includes('absoluteFillObject')) hits.push(full)
    }
  }
  walk(path.join(root, 'native'))
  walk(path.join(root, 'widgets'))
  assert.deepEqual(hits, [])
})

test('native cheer draws every bit the pop model makes', () => {
  const src = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../native/components/CheerBurst.jsx'), 'utf8')
  const meta = new Set(['id', 'delay', 'size', 'rot', 'len', 'tone', 'side', 'y', 'x', 'fat', 'reach', 'tall', 'screen', 'fall', 'width', 'drift', 'rise', 'scale', 'hop', 'hops', 'from', 'span'])
  const flags = new Set()
  for (const kind of cheerKinds()) {
    for (const stage of [1, 5]) {
      for (const pop of popsFor(kind, stage)) {
        for (const bit of pop.bits) {
          for (const key of Object.keys(bit)) if (!meta.has(key)) flags.add(key)
        }
      }
    }
  }
  for (const flag of flags) assert.match(src, new RegExp(`if \\(bit\\.${flag}\\)`), flag)
})

test('every cheer adds a burst per stage', () => {
  for (const kind of cheerKinds()) {
    assert.equal(popsFor(kind, 1).length, 1)
    assert.equal(popsFor(kind, 3).length, 3)
    assert.equal(popsFor(kind, 5).length, 5)
  }
})

test('cheer bursts scale up with stage', () => {
  const low = popsFor('lime', 1)[0].bits.find((bit) => bit.bloom)
  const high = popsFor('lime', 5)[0].bits.find((bit) => bit.bloom)
  assert.ok(Number.parseFloat(high.size) > Number.parseFloat(low.size))
})

test('later cheer bursts scale harder than the first', () => {
  const first = popsFor('spark', 5)[0].bits.filter((bit) => bit.spark).length
  const last = popsFor('spark', 5)[4].bits.filter((bit) => bit.spark).length
  assert.ok(last > first)
  assert.ok(holdFor('rain', 5, 5) > holdFor('rain', 1, 1))
})

test('demo boards do not ride along after sign-in', () => {
  const polluted = {
    currentId: 'board-try-now',
    boards: [
      {
        id: 'board-try-now',
        title: 'Try now',
        keeperName: 'Jordan Hale',
        lamps: [{ id: 'di-now-pills', question: 'Pills?', cadence: 'daily', archived: false }],
        answers: [{ lampId: 'di-now-pills', periodKey: '2026-01-01', status: 'yes', answeredAt: '1' }],
        coins: 80,
      },
      {
        id: 'board-real',
        title: 'Mine',
        keeperName: 'Aaron',
        lamps: [{ id: 'di-abc123', question: 'Did I feed the dog?', cadence: 'daily', archived: false }],
        answers: [],
      },
    ],
  }
  const clean = stripDemoShelf(polluted)
  assert.equal(clean.boards.length, 1)
  assert.equal(clean.boards[0].id, 'board-real')
  assert.equal(isDemoBoard(polluted.boards[0]), true)
})

test('a nope stays on the face stack at the back', () => {
  const today = boardDate(new Date())
  const book = {
    dayFoldHour: 0,
    lamps: [
      lamp('door', { createdOn: '2024-01-01' }),
      lamp('pills', { createdOn: '2024-01-01', short: 'Pills' }),
    ],
    answers: [{ lampId: 'door', periodKey: today, status: 'skip', answeredAt: '2026-01-01T10:00:00' }],
  }
  const stack = faceReadyTonight(book, new Date())
  assert.equal(stack.length, 2)
  assert.equal(stack[0].lamp.id, 'pills')
  assert.equal(stack[1].lamp.id, 'door')
  assert.equal(stack[1].answer.status, 'skip')
})

test('an answer is found by lamp and night', () => {
  const book = {
    answers: [
      { lampId: 'a', periodKey: '2026-01-01', status: 'yes', answeredAt: '2026-01-01T10:00:00' },
      { lampId: 'b', periodKey: '2026-01-01', status: 'skip', answeredAt: '2026-01-01T11:00:00' },
    ],
  }
  assert.equal(answerFor(book, 'b', '2026-01-01').status, 'skip')
  assert.equal(answerFor(book, 'c', '2026-01-01'), undefined)
  assert.equal(answerFor({ answers: [] }, 'a', 'x'), undefined)
})

test('the index keeps the first of a duplicate pair, like find did', () => {
  const book = {
    answers: [
      { lampId: 'a', periodKey: 'p', status: 'yes', answeredAt: '1' },
      { lampId: 'a', periodKey: 'p', status: 'skip', answeredAt: '2' },
    ],
  }
  assert.equal(answerFor(book, 'a', 'p').status, 'yes')
})

test('high goes first, low goes last, the rest hold their order', () => {
  const rows = [
    { lamp: lamp('low', { priority: 'low' }) },
    { lamp: lamp('one') },
    { lamp: lamp('high', { priority: 'high' }) },
    { lamp: lamp('two') },
  ]
  assert.deepEqual(
    byPriority(rows).map((row) => row.lamp.id),
    ['high', 'one', 'two', 'low'],
  )
})

test('low never buzzes, only high nudges late', () => {
  assert.equal(lampBuzzes(lamp('a', { priority: 'low' })), false)
  assert.equal(lampBuzzes(lamp('a', { priority: 'normal' })), true)
  assert.equal(lampBuzzes(lamp('a', { notify: false })), false)
  assert.equal(lampNudgesLate(lamp('a', { priority: 'high' })), true)
  assert.equal(lampNudgesLate(lamp('a', { priority: 'normal' })), false)
})

test('two phones combine instead of overwriting', () => {
  const left = {
    currentId: 'b1',
    boards: [{ id: 'b1', title: 'Tag', lamps: [lamp('x')], answers: [], coins: 9, gems: 1 }],
  }
  const right = {
    currentId: 'b1',
    boards: [{ id: 'b1', title: 'Tag', lamps: [lamp('y')], answers: [], coins: 3, gems: 7 }],
  }
  const merged = mergeShelves(left, right, '2026-01-02', '2026-01-01')
  const book = merged.boards[0]
  assert.deepEqual(book.lamps.map((one) => one.id).sort(), ['x', 'y'])
  assert.equal(book.coins, 9, 'the bigger purse wins')
  assert.equal(book.gems, 7, 'and per column, not per phone')
})

test('the document that goes up carries no answers', () => {
  const shelf = { boards: [{ id: 'b', lamps: [], answers: [{ lampId: 'a' }] }] }
  const sent = shelfWithoutAnswers(shelf)
  assert.equal('answers' in sent.boards[0], false)
  assert.equal(shelf.boards[0].answers.length, 1, 'and the local one is untouched')
})

test('a later answer wins, an older one is ignored', () => {
  const shelf = {
    boards: [
      {
        id: 'b',
        lamps: [lamp('a')],
        answers: [{ lampId: 'a', periodKey: 'p', status: 'yes', answeredAt: '2026-01-02T10:00:00' }],
      },
    ],
  }
  const older = applyAnswers(shelf, [
    { lamp_id: 'a', period_key: 'p', board_id: 'b', status: 'skip', answered_at: '2026-01-01T10:00:00' },
  ])
  assert.equal(older.changed, 0)
  assert.equal(older.shelf.boards[0].answers[0].status, 'yes')

  const newer = applyAnswers(shelf, [
    { lamp_id: 'a', period_key: 'p', board_id: 'b', status: 'skip', answered_at: '2026-01-03T10:00:00' },
  ])
  assert.equal(newer.changed, 1)
  assert.equal(newer.shelf.boards[0].answers[0].status, 'skip')
})

test('an answer for a question this phone knows lands on the right tag', () => {
  const shelf = {
    boards: [
      { id: 'b1', lamps: [lamp('x')], answers: [] },
      { id: 'b2', lamps: [lamp('y')], answers: [] },
    ],
  }
  const out = applyAnswers(shelf, [
    { lamp_id: 'y', period_key: 'p', board_id: '', status: 'yes', answered_at: '2026-01-01T10:00:00' },
  ])
  assert.equal(out.shelf.boards[0].answers.length, 0)
  assert.equal(out.shelf.boards[1].answers.length, 1)
})

test('a family code is six and an invite code is ten', () => {
  assert.equal(cleanCode('abc-234 xx'), 'ABC234')
  assert.equal(cleanInvite('d93aq5lbs4zzz'), 'D93AQ5LBS4')
  assert.equal(cleanInvite('D93AQ5LBS4').length, 10)
})

test('a phone number folds to e164 the same way the database folds it', () => {
  assert.equal(cleanPhone('(555) 123-4567'), '+15551234567')
  assert.equal(cleanPhone('1 555 123 4567'), '+15551234567')
  assert.equal(cleanPhone('123'), '')
  assert.ok(looksLikePhone('5551234567'))
})

test('a gem lands once per week when a night clears', () => {
  const clock = new Date('2026-09-20T12:00:00')
  const week = gemWeekKey(clock)
  assert.match(week, /^\d{4}-W\d{2}$/)

  const book = {
    id: 'b1',
    dayFoldHour: 0,
    gems: 0,
    lamps: [lamp('a')],
    answers: [],
    cheers: ['lime'],
    looks: ['lime'],
  }
  const row = { lamp: book.lamps[0], periodKey: '2026-09-20' }
  const cleared = {
    ...book,
    answers: [{ lampId: 'a', periodKey: '2026-09-20', status: 'yes', answeredAt: '2026-09-20T12:00:00' }],
  }
  assert.equal(allClearTonight(cleared, clock), true)

  const noped = {
    ...book,
    answers: [{ lampId: 'a', periodKey: '2026-09-20', status: 'skip', answeredAt: '2026-09-20T12:00:00' }],
  }
  assert.equal(allClearTonight(noped, clock), false)

  const shelf = { currentId: 'b1', boards: [cleared], gemWeek: '' }
  const prev = { currentId: 'b1', boards: [book], gemWeek: '' }
  const once = weeklyGemBump(shelf, prev, clock)
  assert.equal(once.gemWeek, week)
  assert.equal(once.boards[0].gems, 1)

  const twice = weeklyGemBump(once, once, clock)
  assert.equal(twice.boards[0].gems, 1)
})

test('gem week survives shelf writes', () => {
  const clock = new Date('2026-09-20T12:00:00')
  const week = gemWeekKey(clock)
  const book = {
    id: 'b1',
    title: 'Home',
    dayFoldHour: 0,
    gems: 0,
    lamps: [lamp('a')],
    answers: [],
    cheers: ['lime'],
    looks: ['lime'],
  }
  const cleared = {
    ...book,
    answers: [{ lampId: 'a', periodKey: '2026-09-20', status: 'yes', answeredAt: '2026-09-20T12:00:00' }],
  }
  const shelf = { currentId: 'b1', boards: [cleared], gemWeek: '' }
  const prev = { currentId: 'b1', boards: [book], gemWeek: '' }
  const bumped = weeklyGemBump(shelf, prev, clock)
  assert.equal(bumped.gemWeek, week)

  const drafted = parkEmptyTags(mergeSameTitles({ ...bumped, boards: bumped.boards }))
  assert.equal(drafted.gemWeek, week)

  const normalized = normalizeShelf(drafted)
  assert.equal(normalized.gemWeek, week)
  assert.equal(normalized.boards[0].gems, 1)

  const again = weeklyGemBump(normalized, normalized, clock)
  assert.equal(again.boards[0].gems, 1)
})

test('every gem pack is $1 a gem, and bigger packs add bonus gems', () => {
  for (const pack of GEM_PACKS) {
    assert.equal(pack.cents, pack.base * GEM_UNIT_CENTS, `${pack.id} keeps the $1 price`)
    assert.equal(pack.gems, pack.base + pack.bonus)
    assert.ok(pack.gems <= 100, 'fits the gem_purchases cap')
  }
  const bonuses = GEM_PACKS.map((pack) => pack.bonus)
  assert.deepEqual([...bonuses].sort((a, b) => a - b), bonuses, 'bonus grows with the pack')
  assert.ok(GEM_PACKS.find((pack) => pack.id === 'gems_50').bonus > 0)
  // The server credits from its own table; it has to match.
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const iap = readFileSync(path.join(root, 'supabase/functions/gem-iap/index.ts'), 'utf8')
  for (const pack of GEM_PACKS) {
    assert.ok(
      iap.includes(`${pack.id}: { gems: ${pack.gems}, cents: ${pack.cents} }`),
      `gem-iap matches ${pack.id}`,
    )
  }
})

test('every supported locale has the same keys as English', () => {
  const enKeys = Object.keys(en)
  for (const [code, pack] of Object.entries({ es, fr, de, pt, it, zh, ja, ko })) {
    const keys = Object.keys(pack)
    assert.equal(keys.length, enKeys.length, `${code} key count`)
    for (const key of enKeys) {
      assert.ok(key in pack, `${code} missing ${key}`)
      assert.ok(String(pack[key]).trim(), `${code} empty ${key}`)
    }
  }
})

test('i18n additions ship with Spanish', () => {
  for (const key of Object.keys(additionsEn)) {
    assert.ok(key in additionsEs, `additionsEs missing ${key}`)
    if (mayMatchEnglish(key)) continue
    assert.notEqual(
      additionsEs[key],
      additionsEn[key],
      `additionsEs same as English: ${key}`,
    )
  }
})

test('Spanish ship locale does not copy English by mistake', () => {
  for (const key of Object.keys(en)) {
    if (mayMatchEnglish(key)) continue
    if (isLegalKey(key)) {
      assert.notEqual(es[key], en[key], `es legal same as English: ${key}`)
      continue
    }
    assert.notEqual(es[key], en[key], `es same as English: ${key}`)
  }
})

test('a gem buy with an empty purse asks for more gems', () => {
  const next = buyCheer({ gems: 0 }, 'tape')
  assert.equal(next.miss, 'shop.miss.needGems')
  assert.equal(next.book.gems, 0)
})

test('a cheer cannot be sent on gems you do not have', () => {
  const broke = spendGems({ gems: 0 }, 1)
  assert.equal(broke.miss, 'gems')
  assert.equal(broke.book.gems, 0)

  const paid = spendGems({ gems: 3 }, 1)
  assert.equal(paid.miss, '')
  assert.equal(paid.book.gems, 2)
})

test('one gem buys five stored cheers and a cheer spends one', () => {
  const broke = buyFriendCheers({ gems: 0, friendCheers: 0 })
  assert.equal(broke.miss, 'gems')
  assert.equal(broke.book.friendCheers, 0)

  const bought = buyFriendCheers({ gems: 1, friendCheers: 0 })
  assert.equal(bought.miss, '')
  assert.equal(bought.book.gems, 0)
  assert.equal(bought.book.friendCheers, FRIEND_CHEERS_PER_GEM)

  let book = bought.book
  for (let n = 0; n < FRIEND_CHEERS_PER_GEM; n += 1) {
    const spent = takeFriendCheer(book)
    assert.equal(spent.miss, '')
    book = spent.book
  }
  assert.equal(book.friendCheers, 0)
  assert.equal(takeFriendCheer(book).miss, 'cheers')
  assert.equal(takeFriendCheer(book).book.friendCheers, 0)

  const full = buyFriendCheers({ gems: 2, friendCheers: FRIEND_CHEER_CAP - 4 })
  assert.equal(full.miss, 'cap')
  assert.equal(full.book.gems, 2)
  assert.equal(full.book.friendCheers, FRIEND_CHEER_CAP - 4)
})

test('widget look picker only uses owned looks', () => {
  const book = {
    id: 't1',
    title: 'Home',
    lookOn: 'brass',
    looks: ['lime', 'brass'],
    lamps: [{ id: 'l1', question: 'Door?', cadence: 'daily', archived: false }],
    answers: [],
  }
  const shelf = writeShelf({ currentId: 't1', boards: [book] })
  writePrefs({ widgetLookMode: 'pick', widgetLookId: 'pulse' })
  assert.equal(widgetLookId(shelf, book), 'brass')
  writePrefs({ widgetLookMode: 'pick', widgetLookId: 'brass' })
  assert.equal(widgetLookId(shelf, book), 'brass')
  assert.ok(ownedLookIds(shelf).has('brass'))
})

test('a noped tonight question still counts as open on the widget', () => {
  const clock = new Date('2026-09-23T20:00:00')
  const book = {
    id: 't1',
    title: 'Home',
    dayFoldHour: 0,
    lamps: [
      { id: 'a', question: 'A?', cadence: 'daily', archived: false, createdOn: '2020-01-01' },
      { id: 'b', question: 'B?', cadence: 'daily', archived: false, createdOn: '2020-01-01' },
    ],
    answers: [
      { lampId: 'a', periodKey: '2026-09-23', status: 'skip', answeredAt: '2026-09-23T12:00:00' },
      { lampId: 'b', periodKey: '2026-09-23', status: 'skip', answeredAt: '2026-09-23T12:00:00' },
    ],
  }
  const props = buildTonightWidgetProps(writeShelf({ currentId: 't1', boards: [book] }), clock)
  assert.equal(props.left, 2)
  assert.equal(props.leadLampId, 'a')
  assert.ok(!props.footer.toLowerCase().includes('clear'))
  assert.equal(props.question, 'A?')
})

test('widget snapshot leads with the highest-priority open question', () => {
  const book = {
    id: 't1',
    title: 'Home',
    lamps: [
      { id: 'low', question: 'Low one?', cadence: 'daily', archived: false, priority: 'low' },
      { id: 'high', question: 'High one?', cadence: 'daily', archived: false, priority: 'high' },
    ],
    answers: [],
  }
  const shelf = writeShelf({ currentId: 't1', boards: [book] })
  const props = buildTonightWidgetProps(shelf)
  assert.equal(props.leadLampId, 'high')
  assert.equal(props.question, 'High one?')
  assert.equal(props.items[0].lampId, 'high')
  assert.equal(props.buddyId, '')
})

test('a worn buddy rides on the tonight widget', () => {
  const book = {
    id: 't1',
    title: 'Home',
    buddyOn: 'owl',
    buddies: ['owl'],
    lamps: [{ id: 'door', question: 'Door?', cadence: 'daily', archived: false }],
    answers: [],
  }
  const worn = buildTonightWidgetProps(writeShelf({ currentId: 't1', boards: [book] }))
  assert.equal(worn.buddyId, 'owl')
  const bare = { ...book, buddyOn: 'owl', buddies: [] }
  assert.equal(buildTonightWidgetProps(writeShelf({ currentId: 't1', boards: [bare] })).buddyId, '')
})

test('widget props list every tag and merge answers onto the right one', () => {
  const a = {
    id: 'tag-a',
    title: 'A',
    lamps: [{ id: 'l1', question: 'One?', cadence: 'daily', archived: false }],
    answers: [],
  }
  const b = {
    id: 'tag-b',
    title: 'B',
    lamps: [{ id: 'l2', question: 'Two?', cadence: 'daily', archived: false }],
    answers: [],
  }
  const shelf = writeShelf({ currentId: 'tag-a', boards: [a, b] })
  const props = buildTonightWidgetProps(shelf)
  assert.ok(props.items.some((item) => item.lampId === 'l1'), 'tag A question is due tonight')
  assert.ok(props.items.some((item) => item.lampId === 'l2'), 'tag B question is due tonight, no pinning needed')
  const merged = mergeWidgetPropsIntoShelf(shelf, {
    items: props.items.map((item) =>
      item.lampId === 'l2' || item.lampId === 'l1' ? { ...item, status: 'yes' } : item,
    ),
  })
  assert.equal(merged.boards.find((row) => row.id === 'tag-a')?.answers?.[0]?.lampId, 'l1')
  assert.equal(merged.boards.find((row) => row.id === 'tag-b')?.answers?.[0]?.lampId, 'l2')
})

test('every coin look on sale passes the client check before the buy is sent', () => {
  const coinLooks = LOOKS.filter((item) => item.coins > 0)
  assert.ok(coinLooks.length > 0, 'there are coin looks to buy')
  for (const look of coinLooks) {
    assert.ok(validateCoinItem('look', look.id), 'coin look ' + look.id + ' can be bought')
  }
  assert.ok(!validateCoinItem('look', 'moss'), 'a gem look is not sold for coins')
  assert.ok(!validateCoinItem('look', 'nope-look'), 'an unknown look is refused')
  assert.ok(validateCoinItem('cheer_stage', 'tape'), 'a cheer stage passes')
})

test('a question can have several topics and the list filters by them', () => {
  assert.deepEqual(topicsOf({ kind: 'Pets, morning ,pets,, Pills' }), ['Pets', 'morning', 'Pills'], 'trimmed, no repeats')
  assert.equal(joinTopics(['Pets', 'Morning', 'pets']), 'Pets, Morning')
  const a = { kind: 'Pets, Morning' }
  const b = { kind: 'House' }
  assert.ok(hasAnyTopic(a, []), 'no pick shows everything')
  assert.ok(hasAnyTopic(a, ['morning']), 'match ignores case')
  assert.ok(!hasAnyTopic(b, ['Pets']))
  assert.ok(hasAnyTopic(b, ['Pets', 'House']), 'any picked topic matches')
  assert.deepEqual(shelfTopics([{ lamps: [a, b, { kind: 'pets' }] }]), ['House', 'Morning', 'Pets'])
})

test('everyone owns the ant for free and the possum costs gems', () => {
  assert.equal(FREE_BUDDY, 'ant')
  assert.ok(normalizePurse({}).buddies.includes('ant'), 'a new shelf has the ant')
  assert.ok(normalizePurse({ buddies: ['cat'] }).buddies.includes('ant'), 'an old shelf gets the ant too')
  assert.ok(!normalizePurse({}).buddies.includes('possum'), 'nobody starts with the possum')
  assert.equal(BUDDIES.find((item) => item.id === 'ant').gems, 0)
  assert.ok(BUDDIES.find((item) => item.id === 'possum').gems > 0, 'the possum is paid')
  assert.equal(normalizePurse({}).buddyOn, '', 'no buddy is worn until you pick one')
})

test('the tag filter can hold several tags', () => {
  const boards = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  assert.deepEqual(scopedBooks(boards, '').map((b) => b.id), ['a', 'b', 'c'], 'empty is every tag')
  assert.deepEqual(scopedBooks(boards, 'b').map((b) => b.id), ['b'], 'one tag')
  assert.deepEqual(scopedBooks(boards, 'a,c').map((b) => b.id), ['a', 'c'], 'two tags')
  assert.deepEqual(tagIdsOf(' a, ,b '), ['a', 'b'])
  assert.equal(joinTagIds(['a', 'b', 'a', '']), 'a,b')
})

test('shop drops wait for their day and the server sells the same coin items', () => {
  assert.ok(isLive({ id: 'a' }), 'no date means always in')
  assert.ok(!isLive({ id: 'a', from: '2026-10-09' }, '2026-10-08'), 'a future drop stays out')
  assert.ok(isLive({ id: 'a', from: '2026-10-09' }, '2026-10-09'), 'it opens on its day')
  const drop = { id: 'a', from: '2026-10-09' }
  assert.ok(!isTeased(drop, '2026-10-01'), 'eight days out it is hidden')
  assert.ok(isTeased(drop, '2026-10-02'), 'a week out it shows as coming')
  assert.ok(isTeased(drop, '2026-10-08'), 'still coming the day before')
  assert.ok(!isTeased(drop, '2026-10-09'), 'on the day it is for sale, not coming')
  assert.ok(!isTeased({ id: 'b' }, '2026-10-05'), 'undated items are never coming')
  const sql = readFileSync(new URL('../supabase/shop-catalog.sql', import.meta.url), 'utf8')
  for (const look of SHOP_CALENDAR.looks.filter((item) => item.coins > 0)) {
    assert.ok(sql.includes("('look', '" + look.id + "'"), 'coin look ' + look.id + ' is in shop_catalog')
  }
  for (const cheer of SHOP_CALENDAR.cheers) {
    assert.ok(sql.includes("('cheer_stage', '" + cheer.id + "'"), 'cheer ' + cheer.id + ' stages are in shop_catalog')
  }
  const ids = (list) => list.map((item) => item.id)
  for (const list of Object.values(SHOP_CALENDAR)) {
    assert.equal(new Set(ids(list)).size, list.length, 'no repeated ids')
    for (const item of list) {
      if (item.from) assert.match(item.from, /^\d{4}-\d{2}-\d{2}$/)
    }
  }
})

test('an invite link carries its code to the app on both phones', () => {
  assert.equal(inviteLink('abcde12345'), 'https://did-i.app/i/ABCDE12345')
  assert.equal(inviteFromText(inviteClip('ABCDE12345')), 'ABCDE12345', 'the iPhone clipboard text')
  assert.equal(inviteFromText('Join me: https://did-i.app/i/ABCDE12345 (code)'), 'ABCDE12345', 'a pasted share line')
  const referrer = decodeURIComponent(playLinkFor('ABCDE12345').split('&referrer=')[1])
  assert.equal(inviteFromText(referrer), 'ABCDE12345', 'the Play install referrer')
  assert.equal(inviteFromText('utm_source=google-play&utm_medium=organic'), '', 'a plain install has no code')
  assert.equal(inviteFromText('call me at 5551234567'), '', 'random clipboard text is ignored')
})

test('a past night is final: it closes as nope and cannot be marked later', () => {
  const lamp = { id: 'l1', question: 'One?', cadence: 'daily', archived: false }
  const book = { id: 'tag-a', title: 'A', lamps: [lamp], answers: [] }
  const today = new Date(2026, 8, 21, 20, 0)
  const todayIso = boardDate(today)
  const pastKey = addDaysIso(todayIso, -1)
  assert.ok(periodPassed(lamp, pastKey, todayIso), 'yesterday has passed')
  assert.ok(!periodPassed(lamp, todayIso, todayIso), 'tonight has not')
  assert.ok(!periodPassed({ ...lamp, cadence: 'monthly' }, todayIso.slice(0, 7), todayIso), 'this month is still open')
  const row = { lamp, periodKey: pastKey }
  assert.equal(putAnswer(book, row, 'late', today), book, 'no late did on a past night')
  assert.equal(putAnswer(book, row, 'yes', today), book, 'no did on a past night')
  const closed = putAnswer(book, row, 'skip', today)
  assert.equal(answerFor(closed, 'l1', pastKey)?.status, 'skip', 'an empty past night closes as nope')
  assert.equal(putAnswer(closed, row, 'late', today), closed, 'the nope stays')
  const tonight = putAnswer(putAnswer(book, { lamp, periodKey: todayIso }, 'skip', today), { lamp, periodKey: todayIso }, 'late', today)
  assert.equal(answerFor(tonight, 'l1', todayIso)?.status, 'late', 'a nope tonight can still become a late did tonight')
})

test('a widget answer from last night still lands after midnight', () => {
  const book = {
    id: 'tag-a',
    title: 'A',
    lamps: [{ id: 'l1', question: 'One?', cadence: 'daily', archived: false }],
    answers: [],
  }
  const shelf = writeShelf({ currentId: 'tag-a', boards: [book] })
  const lastNight = new Date(2026, 8, 20, 21, 0)
  const props = buildTonightWidgetProps(shelf, lastNight)
  const tapped = { items: props.items.map((item) => ({ ...item, status: 'yes' })) }
  const nextDay = new Date(2026, 8, 21, 20, 0)
  const merged = mergeWidgetPropsIntoShelf(shelf, tapped, nextDay)
  const answer = merged.boards[0].answers.find((row) => row.lampId === 'l1')
  assert.ok(answer, 'the answer is kept')
  assert.equal(answer.periodKey || answer.dateIso, props.items[0].periodKey, 'on the night it was tapped')
  const again = mergeWidgetPropsIntoShelf(merged, { items: tapped.items.map((item) => ({ ...item, status: 'skip' })) }, nextDay)
  assert.equal(again, merged, 'an old tap never overwrites a set answer')
  const closed = { ...shelf, boards: [closePastNights(book, nextDay)] }
  const late = mergeWidgetPropsIntoShelf(closed, tapped, nextDay)
  assert.equal(late.boards[0].answers.find((row) => row.lampId === 'l1')?.status, 'late', 'a did beats the day-turn nope')
})

test('the tonight widget can draw a question without the app', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const bridge = readFileSync(path.join(root, 'native/widget-bridge.js'), 'utf8')
  assert.ok(bridge.includes("import('./widget-setup')"), 'ios setup is not the empty web stub')
  const require = createRequire(import.meta.url)
  const { transformFileSync } = require('@babel/core')
  const result = transformFileSync(path.join(root, 'widgets/DidITonightWidget.tsx'), {
    filename: path.join(root, 'widgets/DidITonightWidget.tsx'),
    caller: { name: 'metro', platform: 'ios' },
  })
  const code = result?.code || ''
  const start = code.indexOf('DidITonightWidget=`')
  const end = code.lastIndexOf('`;var widget')
  assert.ok(start > 0 && end > start, 'widget layout is a self-contained string')
  const source = code.slice(start + 'DidITonightWidget=`'.length, end)
  assert.ok(source.includes('function leadItem'), 'lead lookup stays inside the widget')
  assert.ok(source.includes('FALLBACK='), 'colors stay inside the widget')
  const fn = eval(`(${source})`)
  function view(type) {
    return (props) => ({ type, props: props || {} })
  }
  function Text(props) {
    const children = props.children
    const list = children == null ? [] : Array.isArray(children) ? children.flat(Infinity) : [children]
    const text = list.filter((child) => typeof child === 'string' || typeof child === 'number').join('')
    return view('TextView')({ ...props, text })
  }
  Object.assign(globalThis, {
    Text,
    VStack: view('VStackView'),
    HStack: view('HStackView'),
    Spacer: view('SpacerView'),
    ZStack: view('ZStackView'),
    Circle: view('CircleView'),
    Ellipse: view('EllipseView'),
    Capsule: view('CapsuleView'),
    Button: (props) => view('Button')(props),
    font: (params) => params,
    foregroundStyle: (style) => style,
    padding: (params) => params,
    background: (style) => style,
    containerBackground: (style) => style,
    containerRelativeFrame: () => ({ fill: 'widget' }),
    clipShape: (shape, radius) => ({ shape, radius }),
    containerShape: (shape) => shape,
    strokeBorder: (params) => params,
    layoutPriority: (n) => ({ layoutPriority: n }),
    clipped: () => ({ clipped: true }),
    buttonStyle: (style) => style,
    buttonBorderShape: (shape, radius) => ({ shape, radius }),
    tint: (color) => color,
    frame: (params) => params,
    kerning: (value) => value,
    textCase: (value) => value,
    multilineTextAlignment: (value) => value,
    widgetURL: (url) => url,
    offset: (params) => params,
    Rectangle: view('RectangleView'),
    lineLimit: (n) => ({ lineLimit: n }),
    minimumScaleFactor: (f) => ({ minimumScaleFactor: f }),
    controlSize: (s) => ({ controlSize: s }),
    allowsTightening: (on) => ({ allowsTightening: on }),
    opacity: (value) => ({ opacity: value }),
    rotationEffect: (deg) => ({ rotationEffect: deg }),
    scaleEffect: (params) => ({ scaleEffect: params }),
    _jsx: (type, props) => (typeof type === 'function' ? type(props) : { type, props }),
    _jsxs: (type, props) => (typeof type === 'function' ? type(props) : { type, props }),
  })
  const tree = fn(
    {
      tagTitle: 'Home',
      question: 'Did I lock the door?',
      leadLampId: 'door',
      items: [
        { lampId: 'door', label: 'Door', status: 'open' },
        { lampId: 'keys', label: 'Keys', status: 'open' },
      ],
      left: 2,
      footer: 'One left tonight.',
      didLabel: 'Did',
      nopeLabel: 'Did not',
    },
    { widgetFamily: 'systemMedium', widgetRenderingMode: 'fullColor' },
  )
  const drawn = JSON.stringify(tree)
  assert.ok(drawn.includes('Did I lock the door?'), drawn.slice(0, 400))
  assert.ok(drawn.includes('Home'))
  assert.ok(drawn.includes('widget'), 'the card fills the widget')
  assert.ok(drawn.includes('containerRelativeShape'), 'the ring follows the system widget corner')
  assert.ok(drawn.includes('"clipped":true'), 'the widget clips to its container')
  assert.equal((drawn.match(/"fill":"widget"/g) || []).length, 1, 'only the outer stack uses the widget frame')
  assert.ok(drawn.includes('center'), 'the question is centered')
  assert.ok(drawn.includes('did:door') && drawn.includes('nope:door'), 'the widget can mark did and did not')
  assert.ok(drawn.indexOf('nope:door') < drawn.indexOf('did:door'), 'did not sits left of did')
  assert.ok(drawn.includes('#7d8694'), 'did not uses the skip color')
  assert.ok(!drawn.includes('#8b6b4a'), 'a widget with no buddy stays clear')
  const owl = JSON.stringify(
    fn(
      {
        tagTitle: 'Home',
        question: 'Did I lock the door?',
        leadLampId: 'door',
        items: [{ lampId: 'door', label: 'Door', status: 'open' }],
        left: 1,
        footer: 'One left tonight.',
        didLabel: 'Did',
        nopeLabel: 'Did not',
        buddyId: 'owl',
      },
      { widgetFamily: 'systemMedium', widgetRenderingMode: 'fullColor' },
    ),
  )
  assert.ok(owl.includes('topTrailing') && owl.includes('#8b6b4a'), 'a worn owl sits in the top right')
  function findPress(node, target) {
    if (!node || typeof node !== 'object') return null
    if (node.props?.target === target && typeof node.props.onPress === 'function') return node.props.onPress
    const kids = node.props?.children
    const list = Array.isArray(kids) ? kids : kids ? [kids] : []
    for (const child of list) {
      const hit = findPress(child, target)
      if (hit) return hit
    }
    return null
  }
  const marked = findPress(tree, 'did:door')()
  assert.equal(marked.question, 'Keys')
  assert.equal(marked.items.find((item) => item.lampId === 'door').status, 'yes')
  const empty = JSON.stringify(fn(undefined, { widgetFamily: 'systemSmall', widgetRenderingMode: 'fullColor' }))
  assert.ok(empty.includes('No questions yet.'))
  const glow = JSON.stringify(
    fn(
      {
        tagTitle: 'Home',
        question: 'Did I lock the door?',
        items: [{ lampId: 'door', label: 'Door', status: 'open' }],
        left: 1,
        footer: 'One left tonight.',
        colors: { bg: '#0a0e14', panel: '#111820', ink: '#e0e4f0', on: '#5ee8ff', gem: true, look: 'glow' },
      },
      { widgetFamily: 'systemMedium', widgetRenderingMode: 'fullColor' },
    ),
  )
  assert.ok(glow.includes('#5ee8ff'), 'a glow look rings the card')
  assert.ok(glow.includes('#111820'))

  // Every tag on one card: the header follows the question, Next browses.
  const mixed = {
    tagTitle: 'Home',
    question: 'Did I lock the door?',
    leadLampId: 'door',
    items: [
      { lampId: 'door', periodKey: 'n', question: 'Did I lock the door?', label: 'Door', status: 'open', tag: 'Home' },
      { lampId: 'memo', periodKey: 'n', question: 'Did I send the memo?', label: 'Memo', status: 'open', tag: 'Work' },
    ],
    left: 2,
    footer: '2 left tonight.',
    didLabel: 'Did',
    nopeLabel: 'Did not',
    nextLabel: 'Next',
  }
  const env = { widgetFamily: 'systemMedium', widgetRenderingMode: 'fullColor' }
  const mixedTree = fn(mixed, env)
  const mixedDrawn = JSON.stringify(mixedTree)
  assert.ok(mixedDrawn.includes('"text":"Home"'), 'header is the showing question tag')
  assert.ok(mixedDrawn.includes('"size":13'), 'the tag is larger on the medium widget')
  const smallTag = JSON.stringify(fn(mixed, { widgetFamily: 'systemSmall', widgetRenderingMode: 'fullColor' }))
  assert.ok(smallTag.includes('"text":"Home"'), 'the tag shows on the small widget')
  assert.ok(smallTag.includes('"size":11'), 'the tag is smaller on the small widget')
  assert.ok(!mixedDrawn.includes('react.fragment'), 'no fragments in the widget tree')
  assert.ok(mixedDrawn.includes('"minimumScaleFactor"'), 'the question shrinks to fit instead of clipping')
  const peek = findPress(mixedTree, 'next:door')
  assert.ok(peek, 'Next is an interactive button')
  const peeked = peek()
  assert.equal(peeked.leadLampId, 'memo')
  assert.equal(peeked.question, 'Did I send the memo?')
  assert.equal(peeked.tagTitle, 'Work')
  assert.ok(peeked.items.every((item) => item.status === 'open'), 'Next never answers')
  const peekedDrawn = JSON.stringify(fn(peeked, env))
  assert.ok(peekedDrawn.includes('"text":"Work"') && peekedDrawn.includes('Did I send the memo?'))
  assert.equal(findPress(fn(peeked, env), 'next:memo')().leadLampId, 'door', 'Next wraps around')
  const answered = findPress(mixedTree, 'did:door')()
  assert.equal(answered.tagTitle, 'Work', 'the header follows the next question after a tap')
  assert.ok(!JSON.stringify(fn(answered, env)).includes('next:'), 'no Next with one question left')

  // The buddy is drawn from the app SVG's own shapes.
  const owlTree = JSON.stringify(fn({ ...mixed, buddyId: 'owl' }, env))
  for (const fill of ['#6b5038', '#8b6b4a', '#d4c4a8', '#f0e080', '#2d241c', '#d4a040', '#c4a882']) {
    assert.ok(owlTree.includes(fill), `owl ${fill}`)
  }
  const catTree = JSON.stringify(fn({ ...mixed, buddyId: 'cat' }, env))
  assert.ok(catTree.includes('#5c4a3a') && catTree.includes('#ffd4a8'), 'cat whiskers and inner ears')
})

test('a widget tap made after its night turned is dropped, one made on the night lands', () => {
  const book = {
    id: 'tap-late',
    title: 'Home',
    lamps: [{ id: 'door', question: 'Door?', cadence: 'daily', archived: false, createdOn: '2020-01-01' }],
    answers: [],
  }
  writeShelf({ currentId: 'tap-late', boards: [book] })
  const night = '2026-09-23'
  const morning = new Date(2026, 8, 24, 9, 0).getTime()
  assert.equal(applyWidgetTapOnce('door', 'did', night, new Date(morning), morning), null, 'stale card tapped next morning')
  const onTime = new Date(2026, 8, 23, 22, 30).getTime()
  const landed = applyWidgetTapOnce('door', 'did', night, new Date(morning), onTime)
  assert.ok(landed, 'tapped that night, applied the next morning')
  const answer = landed.boards.find((row) => row.id === 'tap-late').answers[0]
  assert.equal(answer.periodKey, night)
  assert.equal(new Date(answer.answeredAt).getTime(), onTime, 'stamped with the tap time')
})

test('an android widget tap for one lamp and night applies once', () => {
  const book = {
    id: 'tap-1',
    title: 'Home',
    lamps: [{ id: 'door', question: 'Door?', cadence: 'daily', archived: false, createdOn: '2020-01-01' }],
    answers: [],
  }
  writeShelf({ currentId: 'tap-1', boards: [book] })
  const night = '2026-09-23'
  const first = applyWidgetTapOnce('door', 'did', night)
  assert.ok(first)
  const answer = first.boards.find((row) => row.id === 'tap-1').answers[0]
  assert.equal(answer.lampId, 'door')
  assert.equal(answer.periodKey, night)
  assert.equal(answer.status, 'yes')
  const again = applyWidgetTapOnce('door', 'did', night)
  assert.equal(again, null)
  const flipped = applyWidgetTapOnce('door', 'nope', night)
  assert.equal(flipped, null)
  const stored = readShelf().boards.find((row) => row.id === 'tap-1')
  assert.equal(stored.answers.length, 1)
  assert.equal(stored.answers[0].id, answer.id)
  assert.equal(stored.answers[0].status, 'yes')
  assert.equal(stored.coins, first.boards.find((row) => row.id === 'tap-1').coins)
  assert.equal(stored.cheerUses, first.boards.find((row) => row.id === 'tap-1').cheerUses)
  const otherNight = applyWidgetTapOnce('door', 'did', '2026-09-22')
  assert.ok(otherNight)
  assert.equal(readShelf().boards.find((row) => row.id === 'tap-1').answers.length, 2)
})

test('android widget taps made before JS runs are all applied, once each', () => {
  const book = {
    id: 'tap-q',
    title: 'Home',
    lamps: [
      { id: 'door', question: 'Door?', cadence: 'daily', archived: false, createdOn: '2020-01-01' },
      { id: 'meds', question: 'Meds?', cadence: 'daily', archived: false, createdOn: '2020-01-01' },
    ],
    answers: [],
  }
  writeShelf({ currentId: 'tap-q', boards: [book] })
  const night = '2026-09-23'
  const raw = JSON.stringify([
    { lampId: 'door', kind: 'did', night },
    { lampId: 'meds', kind: 'nope', night },
    { lampId: '', kind: 'did', night },
    { lampId: 'door', kind: 'skip', night },
  ])
  const taps = parseWidgetTapQueue(raw)
  assert.equal(taps.length, 2, 'bad rows are dropped')
  const { shelf, failed } = applyWidgetTapsOnce(taps)
  assert.ok(shelf)
  assert.equal(failed.length, 0)
  const answers = readShelf().boards.find((row) => row.id === 'tap-q').answers
  assert.equal(answers.length, 2, 'both questions keep their tap')
  assert.equal(answers.find((row) => row.lampId === 'door').status, 'yes')
  assert.equal(answers.find((row) => row.lampId === 'meds').status, 'skip')
  const again = applyWidgetTapsOnce(taps)
  assert.equal(again.shelf, null, 'a queue seen twice writes nothing new')
  assert.equal(readShelf().boards.find((row) => row.id === 'tap-q').answers.length, 2)

  // A row left by a build before the queue is one object, not a list.
  assert.deepEqual(parseWidgetTapQueue(JSON.stringify({ lampId: 'door', kind: 'did', night })), [
    { lampId: 'door', kind: 'did', night },
  ])
  assert.deepEqual(parseWidgetTapQueue(''), [])
  assert.deepEqual(parseWidgetTapQueue('not json'), [])

  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const store = readFileSync(
    path.join(root, 'android/app/src/main/java/com/aaronbryant/didi/widget/WidgetTapStore.java'),
    'utf8',
  )
  assert.ok(store.includes('JSONArray') && store.includes('MAX_ROWS'), 'native keeps a capped queue')
  const tap = readFileSync(path.join(root, 'native/widget-tap.android.js'), 'utf8')
  assert.ok(tap.includes('applyWidgetTapsOnce') && tap.includes('JSON.stringify(failed)'))
})

test('over-the-air updates only reach a build with the same app version', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const version = JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8')).expo.version
  const gradle = readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8')
  assert.equal(gradle.match(/versionName "([^"]+)"/)?.[1], version, 'android versionName matches app.json')
  const strings = readFileSync(path.join(root, 'android/app/src/main/res/values/strings.xml'), 'utf8')
  assert.equal(
    strings.match(/name="expo_runtime_version">([^<]+)</)?.[1],
    version,
    'android runtime version matches app.json (committed android/ is not prebuilt)',
  )
  const manifest = readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8')
  assert.ok(manifest.includes('expo.modules.updates.ENABLED" android:value="true"'))
  const config = readFileSync(path.join(root, 'app.config.js'), 'utf8')
  assert.ok(config.includes('runtimeVersion: config.version'))
  const projectId = JSON.parse(readFileSync(path.join(root, 'app.json'), 'utf8')).expo.extra.eas.projectId
  assert.ok(config.includes(`u.expo.dev/${projectId}`) && manifest.includes(`u.expo.dev/${projectId}`))
  const eas = JSON.parse(readFileSync(path.join(root, 'eas.json'), 'utf8'))
  assert.equal(eas.build.production.channel, 'production')
})

test('the native widget tap paint keeps the buddy', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const card = readFileSync(
    path.join(root, 'android/app/src/main/java/com/aaronbryant/didi/widget/WidgetCardStore.java'),
    'utf8',
  )
  assert.ok(card.includes('buddySvg') && card.includes('widget_card_buddy'), 'the tap paint draws the buddy')
  const layout = readFileSync(path.join(root, 'android/app/src/main/res/layout/widget_tonight_card.xml'), 'utf8')
  assert.ok(layout.includes('@+id/widget_card_buddy'))
  const tap = readFileSync(path.join(root, 'native/widget-tap.android.js'), 'utf8')
  assert.ok(tap.includes('buddySvgFor(props.buddyId)'), 'the saved card carries the buddy markup')
  const widget = readFileSync(path.join(root, 'widgets/android/DidITonightAndroidWidget.jsx'), 'utf8')
  assert.ok(widget.includes('export function buddySvgFor'))
})

test('an android widget card steps to the next question already on it', () => {
  const props = {
    question: 'Door?',
    leadLampId: 'door',
    items: [
      { lampId: 'door', periodKey: '2026-09-23', question: 'Door?', label: 'Door', status: 'open' },
      { lampId: 'cat', periodKey: '2026-09-23', question: 'Feed the cat?', label: 'Cat', status: 'open' },
    ],
    left: 2,
    footer: '2 left tonight.',
    clearLabel: 'All clear for tonight.',
    emptyLabel: 'No questions yet.',
    openLabel: 'Tonight',
  }
  const next = advanceTonightCard(props, 'door', 'did', '2026-09-23')
  assert.equal(next.question, 'Feed the cat?')
  assert.equal(next.leadLampId, 'cat')
  assert.equal(props.items[0].status, 'open')
  const back = advanceTonightCard(next, 'door', 'nope', '2026-09-23')
  assert.equal(back, null)
  assert.equal(next.items[0].status, 'yes')
  const done = advanceTonightCard(next, 'cat', 'nope', '2026-09-23')
  assert.equal(done.leadLampId, 'cat')
  assert.equal(done.question, 'Feed the cat?')
  assert.equal(done.left, 1)
  assert.equal(done.footer, '2 left tonight.')
  assert.equal(advanceTonightCard(props, 'door', 'did', '2026-09-22'), null)
  assert.equal(
    advanceTonightCard(
      {
        leadLampId: 'door',
        items: [{ lampId: 'door', periodKey: 'n', status: 'open', question: '', label: '' }],
        footer: '',
      },
      'door',
      'did',
      'n',
    ),
    null,
  )
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const receiver = readFileSync(
    path.join(root, 'android/app/src/main/java/com/aaronbryant/didi/widget/WidgetTapReceiver.java'),
    'utf8',
  )
  const advanceAt = receiver.indexOf('WidgetCardStore.advance')
  const updateAt = receiver.indexOf('requestWidgetUpdate')
  assert.ok(advanceAt > 0 && advanceAt < updateAt, 'the tap advances the card before the headless redraw')
  const card = readFileSync(
    path.join(root, 'android/app/src/main/java/com/aaronbryant/didi/widget/WidgetCardStore.java'),
    'utf8',
  )
  assert.ok(card.includes('clearLabel') && card.includes('emptyLabel'))
  assert.ok(!card.includes('No questions yet') && !card.includes('All clear'))
  const iosWidget = readFileSync(path.join(root, 'widgets/DidITonightWidget.tsx'), 'utf8')
  assert.ok(!iosWidget.includes('WidgetCardStore') && !iosWidget.includes('advanceTonightCard'))
})

test('a saved widget card never brings back a question the shelf already answered', () => {
  const built = {
    leadLampId: 'b',
    question: 'B?',
    tagTitle: 'Work',
    items: [
      { lampId: 'b', periodKey: 'n', question: 'B?', status: 'open', tag: 'Work' },
      { lampId: 'a', periodKey: 'n', question: 'A?', status: 'skip', tag: 'Home' },
    ],
  }
  const stored = {
    leadLampId: 'a',
    question: 'A?',
    tagTitle: 'Home',
    items: [
      { lampId: 'a', periodKey: 'n', question: 'A?', status: 'open', tag: 'Home' },
      { lampId: 'b', periodKey: 'n', question: 'B?', status: 'open', tag: 'Work' },
      { lampId: 'c', periodKey: 'n', question: 'C?', status: 'open', tag: 'Home' },
    ],
  }
  const out = preferStoredTonightProps(built, stored)
  assert.equal(out.leadLampId, 'b')
  assert.equal(out.tagTitle, 'Work', 'the card keeps browsing to the item it moved to, tag and all')
  assert.equal(out.items, built.items)
})

test('the android widget next button browses open questions without answering them', () => {
  const props = {
    leadLampId: 'door',
    question: 'Door?',
    items: [
      { lampId: 'door', periodKey: 'n', question: 'Door?', label: 'Door', status: 'open' },
      { lampId: 'cat', periodKey: 'n', question: 'Feed the cat?', label: 'Cat', status: 'open' },
      { lampId: 'bins', periodKey: 'n', question: 'Bins out?', label: 'Bins', status: 'open' },
      { lampId: 'stamp', periodKey: 'n', question: 'Already stamped', label: 'Old', status: 'yes' },
    ],
    left: 3,
    footer: '3 left tonight.',
  }
  const one = peekNextTonightCard(props, 1)
  assert.equal(one.leadLampId, 'cat')
  assert.equal(one.question, 'Feed the cat?')
  // Nothing about status or how many are left changes — this is a look, not an answer.
  assert.equal(one.items, props.items)
  assert.equal(one.left, 3)

  const two = peekNextTonightCard(one, 1)
  assert.equal(two.leadLampId, 'bins')

  const wrapped = peekNextTonightCard(two, 1)
  assert.equal(wrapped.leadLampId, 'door', 'wraps back to the first open question')

  const back = peekNextTonightCard(wrapped, -1)
  assert.equal(back.leadLampId, 'bins', 'prev direction wraps the other way')

  const nopes = {
    leadLampId: 'a',
    items: [
      { lampId: 'a', periodKey: 'n', question: 'A?', status: 'skip', tag: 'Home' },
      { lampId: 'b', periodKey: 'n', question: 'B?', status: 'skip', tag: 'Work' },
      { lampId: 'c', periodKey: 'n', question: 'C?', status: 'yes', tag: 'Work' },
    ],
  }
  const nopeNext = peekNextTonightCard(nopes, 1)
  assert.equal(nopeNext.leadLampId, 'b', 'with nothing open, Next browses the did-nots')
  assert.equal(nopeNext.tagTitle, 'Work', 'the header follows the question shown')
  const rebuilt = { ...nopes, tagTitle: 'Home' }
  assert.equal(
    preferStoredTonightProps(rebuilt, nopeNext).leadLampId,
    'b',
    'a redraw keeps the did-not you browsed to',
  )
  assert.equal(peekNextTonightCard(nopeNext, 1).leadLampId, 'a', 'and Next wraps back')

  const single = { leadLampId: 'door', items: [{ lampId: 'door', periodKey: 'n', status: 'open' }] }
  assert.equal(peekNextTonightCard(single, 1), null, 'nothing to browse to with one open question')
  assert.equal(peekNextTonightCard(null, 1), null)
})

test('the android tonight widget stays inside its frame', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const widget = readFileSync(path.join(root, 'widgets/android/DidITonightAndroidWidget.jsx'), 'utf8')
  const heights = widget.match(/height: 'match_parent'/g) || []
  assert.equal(heights.length, 1, 'only the outer frame uses the widget height')
  assert.ok(widget.includes("overflow: 'hidden'"), 'the card clips to the rounded rect')
  assert.ok(widget.includes("kind: 'nope'") && widget.includes("kind: 'did'"), 'the widget can mark did and did not')
  assert.ok(widget.includes('night:'), 'did and did not send the night with the tap')
  assert.ok(widget.indexOf("kind: 'nope'") < widget.indexOf("kind: 'did'"), 'did not sits left of did')
  assert.ok(widget.includes('question'), 'the widget shows the question')
  assert.ok(widget.includes('questionLine'), 'the widget resolves question from the lead row')
  assert.ok(widget.includes('OverlapWidget'), 'the buddy overlays the card like iOS')
  const providerXml = readFileSync(
    path.join(root, 'android/app/src/main/res/xml/widgetprovider_diditonight.xml'),
    'utf8',
  )
  assert.ok(providerXml.includes('android:minHeight="110dp"'), 'android widget min height fits 2 rows')
  assert.ok(providerXml.includes('android:targetCellWidth="4"'), 'android widget defaults to a wide row')
  const appConfig = readFileSync(path.join(root, 'app.config.js'), 'utf8')
  assert.ok(appConfig.includes("minHeight: '110dp'"), 'expo android widget plugin matches min height')
  const setup = readFileSync(path.join(root, 'native/widget-setup.android.js'), 'utf8')
  const registerAt = setup.indexOf('registerWidgetTaskHandler(')
  const installAt = setup.indexOf('export function installWidgetSetup')
  assert.ok(registerAt > 0 && registerAt < installAt, 'the click task registers when the module loads')
  const entry = readFileSync(path.join(root, 'index.js'), 'utf8')
  assert.ok(entry.includes("require('./native/widget-setup.android.js')"))
  assert.ok(entry.includes("require('./native/widget-setup.ios.js')"))
  assert.ok(
    entry.indexOf('widget-setup.android.js') < entry.indexOf('registerRootComponent(Boot)'),
    'the task is registered before the app mounts',
  )
  assert.ok(
    entry.indexOf('widget-setup.ios.js') < entry.indexOf('registerRootComponent(Boot)'),
    'the ios tap listener is registered before the app mounts',
  )
  const taskBody = setup.slice(setup.indexOf('async function handleDidITonightWidgetTask'))
  const pendingAt = taskBody.indexOf('await applyPendingAndroidWidgetTap')
  const clickAt = taskBody.indexOf('handleAndroidWidgetClick')
  assert.ok(pendingAt > 0 && clickAt > pendingAt, 'the widget task applies a stored tap before the click')
  const renderAt = taskBody.indexOf('renderWidget(')
  const syncAt = taskBody.indexOf('syncTonightWidget(')
  assert.ok(renderAt > 0 && renderAt < syncAt, 'the widget task draws the question before another widget sync')
  const setupAll = readFileSync(path.join(root, 'native/widget-setup.android.js'), 'utf8')
  assert.ok(
    setupAll.includes('buildTonightWidgetProps(shelf)'),
    'the widget task rebuilds tonight from the shelf',
  )
  assert.ok(setupAll.includes('preferStoredTonightProps'), 'headless widget keeps open questions from the card')
  assert.ok(setupAll.includes('loadAndroidWidgetCard'), 'headless widget reads the native card snapshot')
  assert.ok(
    !setupAll.includes('stored || buildTonightWidgetProps'),
    'the widget task does not prefer a stale snapshot over the shelf',
  )
  assert.ok(
    taskBody.indexOf('renderWidget(') < taskBody.indexOf('later !== stamp'),
    'the widget task still draws after a native card advance',
  )
  const manifest = readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8')
  assert.ok(manifest.includes('.widget.WidgetTapReceiver'), 'the tap receiver is registered')
  const provider = readFileSync(
    path.join(root, 'android/app/src/main/java/com/aaronbryant/didi/widget/DidITonight.java'),
    'utf8',
  )
  const store = readFileSync(
    path.join(root, 'android/app/src/main/java/com/aaronbryant/didi/widget/WidgetTapStore.java'),
    'utf8',
  )
  assert.ok(provider.indexOf('WidgetTapReceiver.deliver') < provider.indexOf('super.onReceive'))
  assert.ok(store.includes('.commit()'), 'the tap is committed before the receiver returns')
  const ios = readFileSync(path.join(root, 'native/widget-setup.ios.js'), 'utf8')
  assert.ok(ios.includes('recordWidgetAnswer'))
  assert.ok(!ios.includes('WidgetTap') && !ios.includes('applyPendingAndroidWidgetTap'))
  const open = readFileSync(path.join(root, 'native/hooks/useAppShelf.js'), 'utf8')
  assert.ok(open.includes("Platform.OS === 'android'"))
  assert.ok(open.includes('applyPendingAndroidWidgetTap'))
})

test('the widget lists every tag\'s tonight work, not one picked tag', () => {
  const a = { id: 'tag-a', title: 'Home', lamps: [{ id: 'l1', question: 'Door?', cadence: 'daily', archived: false }], answers: [] }
  const b = { id: 'tag-b', title: 'Work', lamps: [{ id: 'l2', question: 'Email?', cadence: 'daily', archived: false }], answers: [] }
  const shelf = writeShelf({ currentId: 'tag-a', boards: [a, b] })
  const props = buildTonightWidgetProps(shelf)
  assert.equal(props.items.length, 2, 'both tags\' questions are on the card')
  assert.ok(props.items.some((item) => item.lampId === 'l1' && item.tag === 'Home'))
  assert.ok(props.items.some((item) => item.lampId === 'l2' && item.tag === 'Work'))
  const uri = widgetTonightUri(null, 'l2')
  assert.ok(uri.includes('face=l2'))
  assert.ok(!uri.includes('tag='))
})

test('an empty tag does not block another tag\'s question from showing', () => {
  const empty = { id: 'tag-empty', title: 'MapleStory', lamps: [], answers: [] }
  const withWork = {
    id: 'tag-work',
    title: 'Home',
    lamps: [{ id: 'l1', question: 'Door?', cadence: 'daily', archived: false }],
    answers: [],
  }
  const shelf = writeShelf({ currentId: 'tag-empty', boards: [empty, withWork] })
  const props = buildTonightWidgetProps(shelf)
  assert.equal(props.leadLampId, 'l1')
  assert.equal(props.tagTitle, 'Home')
})

test('every component a screen draws is defined or imported', () => {
  // "What to ask" crashed on a Kicker that lost its import. Metro only
  // finds that when the screen opens, so check every file here.
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const require = createRequire(import.meta.url)
  const babel = require('@babel/core')
  const traverse = require('@babel/traverse').default
  const files = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(jsx|tsx)$/.test(name)) files.push(full)
    }
  }
  for (const dir of ['native', 'src/lib', 'src/site', 'widgets']) walk(path.join(root, dir))
  const missing = []
  for (const file of files) {
    const ast = babel.parseSync(readFileSync(file, 'utf8'), {
      filename: file,
      babelrc: false,
      configFile: false,
      parserOpts: { sourceType: 'module', plugins: ['jsx', 'typescript'] },
    })
    traverse(ast, {
      JSXOpeningElement(p) {
        const name = p.node.name
        if (name.type !== 'JSXIdentifier' || !/^[A-Z]/.test(name.name)) return
        if (!p.scope.hasBinding(name.name)) {
          missing.push(`${path.relative(root, file)}:${name.loc.start.line} ${name.name}`)
        }
      },
    })
  }
  assert.deepEqual(missing, [])
})

test('adding friends needs your own phone number, one per account, and the legal text says so', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const read = (file) => readFileSync(path.join(root, file), 'utf8')
  const sql = read('supabase/phone-friends.sql')
  assert.ok(sql.includes('create unique index if not exists profiles_phone_key'), 'one number per account')
  assert.ok(sql.includes("raise exception 'phone taken'"), 'a taken number says so')
  assert.ok(sql.includes('create trigger need_phone_to_ask'), 'the server refuses a request without a number')
  assert.match(sql, /find_phone[\s\S]*?raise exception 'need phone'/, 'lookup needs your number too')
  for (const file of ['native/screens/social.jsx', 'src/lib/PeopleConnect.jsx']) {
    const src = read(file)
    assert.ok(src.includes("t('people.phoneFirstBody')"), `${file} explains why`)
    assert.ok(src.includes("myPhone ? ("), `${file} shows the add field only with a number`)
  }
  assert.ok(/phone number, if you add one/.test(en['legal.privacy.account.body']))
  assert.ok(/find each other by phone number/.test(en['legal.privacy.social.body']))
  assert.ok(/Only add a number that is yours/.test(en['legal.terms.account.body']))
  assert.ok(/teléfono/.test(es['legal.privacy.social.body']))
})

test('the last cloud save reads as a local time, not a raw timestamp', () => {
  const saved = new Date(2026, 8, 24, 22, 8)
  const words = stampWhen(saved.toISOString(), new Date(2026, 8, 24, 23, 0))
  assert.ok(words.includes('10:08 PM'), words)
  assert.ok(!/\d{4}-\d{2}-\d{2}T/.test(words), words)
  assert.equal(stampWhen('not a date'), '')
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const more = readFileSync(path.join(root, 'native/screens/more.jsx'), 'utf8')
  assert.ok(more.includes("t('account.syncSaved', { time: stampWhen(sync.at) })"))
})

test('deadline questions before the due night do not count on the tonight meter', () => {
  const item = lamp('tax', {
    cadence: 'once',
    onceWhen: 'by',
    dueBy: '2024-01-10',
    createdOn: '2024-01-01',
  })
  const book = { dayFoldHour: 0, lamps: [item], answers: [] }
  const early = taggedDue([book], new Date('2024-01-05T12:00:00'), '')
  assert.equal(early.length, 1)
  const meter = nightProgress(early)
  assert.equal(meter.total, 0)
  assert.equal(meter.answered, 0)
  const due = taggedDue([book], new Date('2024-01-10T12:00:00'), '')
  assert.equal(nightProgress(due).total, 1)

  // Ten nightly questions and one deadline not due yet: 0 of 10, 10 left.
  const nightly = Array.from({ length: 10 }, (_, i) => lamp(`n${i}`, { createdOn: '2024-01-01' }))
  const mixed = { id: 'mix', title: 'Mix', dayFoldHour: 0, lamps: [item, ...nightly], answers: [] }
  const clock = new Date('2024-01-05T12:00:00')
  assert.equal(nightProgress(taggedDue([mixed], clock, '')).total, 10)
  assert.equal(leftoverOn([mixed], clock, ''), 10)
  assert.equal(leftoverOn([mixed], new Date('2024-01-10T12:00:00'), ''), 11, 'it counts on its due night')

  const stack = readFileSync(
    path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'src/lib/useTonightStack.js'),
    'utf8',
  )
  assert.ok(stack.includes('slotted.filter(notDueYet)'), 'deadlines not due yet sit at the end of the pills')
})

test('native metro shims are wired and pin default exports', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const lint = spawnSync(process.execPath, [path.join(root, 'scripts/lint-store.mjs')], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(lint.status, 0, lint.stderr || lint.stdout || 'store lint failed')
  const metro = readFileSync(path.join(root, 'metro.config.cjs'), 'utf8')
  const packages = [
    'react-native-worklets',
    'react-native-reanimated',
    'react-native-gesture-handler',
    'react-native-svg',
    'react-native-safe-area-context',
    'expo-constants',
    '@react-native-community/netinfo',
    'expo-sensors',
    'expo-clipboard',
    'expo-haptics',
    'expo-linking',
    'expo-splash-screen',
    'expo-document-picker',
    'expo-apple-authentication',
    '@react-native-google-signin/google-signin',
    'expo-application',
    'expo-font',
    'expo-status-bar',
    'expo-blur',
    'expo-widgets',
    'expo-notifications',
    'react-native-screens',
    'react-native-nitro-modules',
    'react-native-mmkv',
    'expo-iap',
    'react-native-android-widget',
    '@expo/ui/swift-ui',
    '@expo/ui/swift-ui/modifiers',
    '@expo/ui/jetpack-compose',
  ]
  for (const pkg of packages) {
    assert.ok(metro.includes(`'${pkg}'`), `metro should shim ${pkg}`)
  }
  const { pinEsModule, loadPinned } = require(path.join(root, 'native/shim/pin-module.cjs'))
  const pinned = pinEsModule({ Gesture: {} }, () => {})
  assert.notEqual(pinned.default, undefined, 'pinEsModule should set default')

  const threw = new TypeError("Cannot read property 'default' of undefined")
  const hostile = loadPinned(
    () => ({
      default: function Svg() {},
      get Path() {
        throw threw
      },
      Circle() {},
      Line() {},
    }),
    (mod) => Boolean(mod && mod.Path && mod.Circle && mod.Line),
    () => ({
      __esModule: true,
      default: function Svg() {},
      Path() {},
      Circle() {},
      Line() {},
    }),
    '__didIPinTest',
  )
  assert.equal(typeof hostile.default, 'function')
  assert.doesNotThrow(() => hostile.Path)
  assert.equal(typeof hostile.Path, 'function')

  const missing = loadPinned(
    () => {
      throw threw
    },
    () => true,
    () => ({ Accelerometer: { addListener() {} } }),
    '__didIPinTest',
  )
  assert.notEqual(missing, undefined)
  assert.notEqual(missing.default, undefined)
  assert.doesNotThrow(() => missing.default)

  const nativeMod = {}
  Object.defineProperty(nativeMod, 'createWidget', {
    enumerable: false,
    value() {
      return { updateSnapshot() {} }
    },
  })
  const kept = pinEsModule(nativeMod)
  const swipeCard = readFileSync(path.join(root, 'native/components/SwipeCard.jsx'), 'utf8')
  const swipeStub = readFileSync(path.join(root, 'native/components/SwipeCardStub.jsx'), 'utf8')
  assert.ok(swipeCard.includes('accessibilityActions'), 'Did and nope are actions a screen reader can take')
  assert.ok(swipeCard.includes('nopeLabel') && swipeCard.includes('didLabel'), 'the face swipes and has Nope and Did buttons')
  assert.equal(swipeStub.includes('Pressable'), false, 'the face fallback has no answer buttons')
  assert.equal(swipeCard.includes('PanResponder'), false, 'the face drags on the UI thread, not the JS thread')
  assert.ok(swipeCard.includes('usePanGesture') && swipeCard.includes('useAnimatedStyle'), 'the face swipes with Gesture Handler and Reanimated')
  assert.ok(swipeCard.includes('releaseWay'), 'a flick answers by where it was headed')
  assert.ok(swipeCard.includes('borderWidth: 1'), 'the face keeps its border')

  assert.equal(typeof kept.createWidget, 'function', 'seal should keep createWidget')
  const made = kept.createWidget()
  assert.equal(typeof made.updateSnapshot, 'function')

  const empty = loadPinned(
    () => undefined,
    () => true,
    () => ({ Path() {} }),
    '__didIPinTest',
  )
  assert.doesNotThrow(() => empty.default)
  assert.notEqual(empty.default, undefined)
})

test('native look ids match did-i.css', () => {
  const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
  const syncScript = path.join(scriptsDir, 'sync-theme-tokens.mjs')
  const result = spawnSync(process.execPath, [syncScript], {
    cwd: path.dirname(scriptsDir),
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr || result.stdout || 'theme:sync failed')
})

test('a fresh phone shows sign-in before the session check finishes', () => {
  const prev = globalThis.__didIPlatform
  globalThis.__didIPlatform = 'ios'
  clearAuthSkip()
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const shell = readFileSync(path.join(root, 'native/AppShell.jsx'), 'utf8')
  const sign = readFileSync(path.join(root, 'native/screens/SignInScreen.jsx'), 'utf8')
  const actions = readFileSync(path.join(root, 'native/components/AuthSignInActions.jsx'), 'utf8')
  try {
    writeAccountUserId('')
    assert.equal(needsAuth({ ready: false, user: null }), true)
    writeAccountUserId('user-a')
    assert.equal(needsAuth({ ready: false, user: null }), false, 'a signed-in phone does not flash sign-in while the session loads')
    assert.equal(needsAuth({ ready: true, user: null }), true, 'no session after the check still gates')
    writeAccountUserId('')
    assert.equal(needsAuth({ ready: true, user: null }), true)
    assert.equal(needsAuth({ ready: true, user: { id: 'u' } }), false)
    assert.equal(authGated('/tonight', { ready: false, user: null }), true)
    assert.equal(authGated('/privacy', { ready: false, user: null }), false)
    assert.ok(shell.includes('<SignInScreen'), 'the gate renders the sign-in screen')
    assert.ok(sign.includes("t('auth.title')"), 'the sign-in screen has a title')
    assert.ok(sign.includes("t('account.email')"), 'the sign-in screen has an email field')
    assert.ok(sign.includes('<AuthSignInActions'), 'the sign-in screen has the sign-in actions')
    assert.ok(actions.includes("t('account.send')"), 'the sign-in screen can send a code')
    assert.ok(actions.includes("t('account.signIn')"), 'a code can be confirmed')
    assert.ok(sign.includes("t('auth.local')"), 'the sign-in screen can stay on this phone')
    assert.ok(sign.includes('skipAuth()'), 'staying on this phone records the skip')
    assert.ok(sign.includes('onDone?.()'), 'staying on this phone opens the app')
    skipAuth()
    assert.equal(needsAuth({ ready: false, user: null }), false)
    assert.equal(authGated('/tonight', { ready: true, user: null }), false)
  } finally {
    clearAuthSkip()
    if (prev == null) delete globalThis.__didIPlatform
    else globalThis.__didIPlatform = prev
  }
})

test('a still phone does not undo, a shake does', () => {
  let state = emptyShake()
  state = shakeStep(state, { x: 0, y: 0, z: 1 }, 1000)
  state = shakeStep(state, { x: 0.02, y: 0, z: 1 }, 1080)
  assert.equal(state.hit, false)
  state = shakeStep(state, { x: 0, y: 0, z: 1.7 }, 1160)
  assert.equal(state.hit, false)
  state = shakeStep(state, { x: 0, y: 0, z: 1 }, 1240)
  assert.equal(state.hit, true)
  const whip = shakeStep(shakeStep(emptyShake(), { x: 0, y: 0, z: 1 }, 3000), { x: 2, y: 0, z: 1 }, 3080)
  assert.equal(whip.hit, true)
})

// React Navigation's core is the navigator without the React Native views.
registerHooks({
  resolve: (specifier, context, next) =>
    next(specifier === '@react-navigation/native' ? '@react-navigation/core' : specifier, context),
})
const nav = await import('../native/navigation/hash.js')

// A stand-in for the mounted stack: the hall with its two tabs, screens pushed over it.
// Like the real container it reports a change once the stack has settled, not per action.
function fakeStack() {
  const tabs = ['/tonight', '/lamps']
  const stack = { routes: [{ name: nav.HALL, params: undefined }], tab: 0, actions: [] }
  const settle = () => nav.syncFromNavigation()
  const container = {
    isReady: () => true,
    getRootState: () => ({ index: stack.routes.length - 1, routes: stack.routes }),
    getCurrentRoute: () =>
      stack.routes.length > 1 ? stack.routes.at(-1) : { name: tabs[stack.tab], params: stack.tabParams },
    canGoBack: () => stack.routes.length > 1 || stack.tab > 0,
    goBack: () => {
      if (stack.routes.length > 1) stack.routes.pop()
      else stack.tab = 0
      settle()
    },
    dispatch: (action) => {
      stack.actions.push(action)
      const { type, payload } = action
      if (type === 'PUSH') stack.routes.push({ name: payload.name, params: payload.params })
      else if (type === 'POP') stack.routes.splice(stack.routes.length - payload.count)
      else if (type === 'POP_TO_TOP') stack.routes.splice(1)
      else if (type === 'NAVIGATE' && payload.name === nav.HALL) {
        stack.tab = tabs.indexOf(payload.params.screen)
        stack.tabParams = payload.params.params
      }
      else throw new Error(`unexpected ${type}`)
    },
  }
  nav.navigationRef.current = container
  nav.goHash('/tonight')
  stack.actions.length = 0
  return {
    top: () => (stack.routes.length > 1 ? stack.routes.at(-1).name : tabs[stack.tab]),
    depth: () => stack.routes.length,
    types: () => stack.actions.map((action) => action.type),
    settle,
  }
}

test('every route is its own native-stack screen pushed over the hall', () => {
  const stack = fakeStack()
  for (const hall of nav.HALL_PATHS) assert.ok(!nav.STACK_PATHS.includes(hall), `${hall} is the hall, not a pushed screen`)
  for (const path of nav.STACK_PATHS) {
    nav.goHash('/tonight')
    nav.goHash(path)
    assert.equal(stack.top(), path, `${path} is pushed`)
    assert.equal(stack.depth(), 2)
  }
  nav.goHash('/nowhere')
  assert.equal(stack.top(), '/tonight', 'an unknown route lands in the hall')
  assert.equal(stack.depth(), 1)
})

test('goHash pushes, pops back to a screen it has, and switches the hall tab', () => {
  const stack = fakeStack()
  nav.goHash('/settings')
  nav.goHash('/shop')
  assert.deepEqual(stack.types(), ['PUSH', 'PUSH'])
  nav.goHash('/lamp', { id: 'a' })
  nav.goHash('/lamp', { id: 'b' })
  assert.equal(stack.depth(), 5, 'the same screen for another question is its own push')
  nav.goHash('/settings')
  assert.equal(stack.top(), '/settings', 'a screen already in the stack is popped back to, not pushed again')
  assert.equal(stack.depth(), 2)
  assert.equal(stack.types().at(-1), 'POP')
  nav.goHash('/lamps')
  assert.equal(stack.depth(), 1, 'a tab pops everything pushed over the hall')
  assert.equal(stack.top(), '/lamps')
  assert.deepEqual(stack.types().slice(-2), ['POP_TO_TOP', 'NAVIGATE'])
  assert.equal(nav.readRoute().path, '/lamps')
})

test('back pops a pushed screen, returns to Tonight, and leaves the app from the hall', () => {
  const stack = fakeStack()
  assert.equal(nav.canGoBack(), false)
  assert.equal(nav.goBack(), false, 'back from Tonight at the root lets Android leave the app')
  nav.goHash('/stats')
  assert.equal(nav.canGoBack(), true)
  assert.equal(nav.goBack(), true)
  assert.equal(stack.top(), '/tonight')
  assert.equal(nav.readRoute().path, '/tonight', 'the route follows the stack when it moves by itself')
  nav.goHash('/lamps')
  assert.equal(nav.canGoBack(), false, 'switching tabs is not history to go back through')
  assert.equal(nav.goBack(), true, 'back from Questions goes to Tonight')
  assert.equal(stack.top(), '/tonight')
})

test('welcome, the first question, and the name screen keep their own back', () => {
  const stack = fakeStack()
  localStorage.removeItem('did-i-welcome')
  nav.goHash('/welcome')
  assert.equal(nav.goBack({ emptyHall: true }), true)
  assert.equal(localStorage.getItem('did-i-welcome'), '1', 'leaving welcome marks it seen')
  assert.equal(stack.top(), '/first', 'an empty hall sends welcome on to the first question')
  assert.equal(nav.goBack(), true)
  assert.equal(stack.top(), '/first', 'the first question has to be added before anything else opens')
  nav.goHash('/enter')
  assert.equal(nav.goBack({ needsEnter: true }), true)
  assert.equal(stack.top(), '/enter', 'a name still needed keeps the name screen')
  assert.equal(nav.goBack({ needsEnter: false }), true)
  assert.equal(stack.top(), '/tonight')
  for (const path of ['/first', '/welcome', '/enter']) assert.ok(nav.OWN_BACK.has(path), `${path} has no edge swipe`)
  localStorage.removeItem('did-i-welcome')
})

test('a fresh install is sent to the first question, and only while it is still fresh', () => {
  let emptyShelf = true
  const fresh = () => emptyShelf && localStorage.getItem('did-i-welcome') !== '1'
  localStorage.removeItem('did-i-welcome')
  const stops = []
  try {
    let stack = fakeStack()
    const go = (where, extras) => {
      nav.goHash(where, extras)
      stack.settle()
    }
    stops.push(nav.redirectFrom('/tonight', '/first', fresh))
    assert.equal(stack.top(), '/first', 'a fresh hall opens on the first question')
    go('/')
    assert.equal(stack.top(), '/first', 'any name for Tonight still counts as the fresh hall')
    go('/lamps')
    assert.equal(stack.top(), '/lamps', 'Questions is not Tonight')
    go('/first')
    // Adding the first question marks welcome seen, saves the shelf, then heads home.
    nav.goHash('/lamp', { id: 'x' })
    localStorage.setItem('did-i-welcome', '1')
    emptyShelf = false
    go('/', { face: 'did' })
    assert.equal(stack.top(), '/tonight', 'finishing the first question lands on the hall')
    assert.equal(stack.depth(), 1)
    assert.equal(nav.readRoute().face, 'did', 'the face the first question asked for survives')
    stops.splice(0).forEach((stop) => stop())

    // A cold start from a shortcut opens Add over the hall before the hall is ever on top.
    localStorage.removeItem('did-i-welcome')
    emptyShelf = true
    stack = fakeStack()
    go('/add')
    stops.push(nav.redirectFrom('/tonight', '/first', fresh))
    assert.equal(stack.top(), '/add', 'a screen that is not on top does not redirect')
    nav.goBack()
    assert.equal(stack.top(), '/first', 'back to an empty hall lands on the first question, not a blank page')
    stops.splice(0).forEach((stop) => stop())
    go('/tonight')
    assert.equal(stack.top(), '/tonight', 'no redirect once it is unmounted')
  } finally {
    stops.forEach((stop) => stop())
    localStorage.removeItem('did-i-welcome')
  }
})

test('the menu, a buy confirm, and a cheer preview can show on the phone', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const shell = readFileSync(path.join(root, 'native/AppShell.jsx'), 'utf8')
  const menu = readFileSync(path.join(root, 'native/components/MastMenu.jsx'), 'utf8')
  const shop = readFileSync(path.join(root, 'native/screens/shop.jsx'), 'utf8')
  const cheer = readFileSync(path.join(root, 'native/components/CheerBurst.jsx'), 'utf8')
  const purse = readFileSync(path.join(root, 'src/lib/purse.js'), 'utf8')
  const boot = readFileSync(path.join(root, 'native/bootstrap.js'), 'utf8')
  const cal = readFileSync(path.join(root, 'native/components/HangMonthCal.jsx'), 'utf8')
  assert.ok(menu.includes('<Modal'), 'the menu opens above the tonight screen')
  assert.ok(menu.includes('open ? ('), 'the menu modal is not mounted while it is closed')
  assert.ok(shell.includes('<CheerBurstHost />'), 'a cheer preview paints above the screen')
  assert.ok(shell.includes('<SheetHost />'), 'a buy confirm paints above the screen')
  assert.ok(!shop.includes('<Modal'), 'a buy confirm is not an iOS modal')
  assert.ok(shop.includes('gemNotice'), 'a gem buy says what happened')
  assert.ok(shop.includes('offerMoreGems'), 'a short gem balance offers the gem page')
  const gems = readFileSync(path.join(root, 'native/iap/gem-store.js'), 'utf8')
  assert.ok(gems.includes('liveSku.get(pack.id) || pack.storeId'), 'an empty catalog still asks the store')
  const sheet = readFileSync(path.join(root, 'native/components/SheetHost.jsx'), 'utf8')
  assert.ok(sheet.includes("goHash('/gems')"), 'the short-gems popup opens the gem page')
  assert.ok(menu.includes("pointerEvents={live ? 'auto' : 'none'}"), 'the opening tap does not close the menu')
  assert.ok(!cheer.includes('cheerName') && !cheer.includes('.name`)'), 'a cheer shows only the cheer, no name')
  assert.ok(purse.includes('__didIEmit'), 'a cheer keeps its kind')
  assert.ok(boot.includes('win.__didIEmit = emit'), 'the phone bus keeps event detail')
  assert.ok(!cal.includes('aspectRatio'), 'calendar days are not screen-tall')
  assert.ok(cal.includes('onLayout'), 'calendar days use the row width')
})

test('the honest did not line sits above the bottom bar', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const mark = readFileSync(path.join(root, 'native/components/MarkToast.jsx'), 'utf8')
  assert.ok(mark.includes('useAppInsets'), 'the line clears the bar')
  assert.ok(mark.includes("zIndex: 90"), 'the line paints above the bar')
  const plist = readFileSync(path.join(root, 'app.config.js'), 'utf8')
  assert.ok(plist.includes('NSMotionUsageDescription'), 'iOS can read a shake')
})

test('the phone location has an origin, so import() chunk urls can be built', () => {
  // Same join Expo's buildUrlForBundle does once a global location exists.
  const chunkUrl = (loc, bundle) =>
    loc.origin.replace(/\/+$/, '') + '/' + bundle.replace(/^\/+/, '')
  assert.equal(typeof makeLocation().origin, 'string')
  assert.equal(makeLocation().hash, '#/')
  assert.equal(makeLocation('http://192.168.1.90:8081/').origin, 'http://192.168.1.90:8081')
  assert.equal(
    chunkUrl(makeLocation('http://192.168.1.90:8081/'), '/ExpoApp.bundle?platform=ios'),
    'http://192.168.1.90:8081/ExpoApp.bundle?platform=ios',
  )
  for (const bad of [undefined, null, 42, {}]) {
    assert.doesNotThrow(() => chunkUrl(makeLocation(bad), '/x.bundle'), `origin survives ${bad}`)
  }
  assert.equal(devServerUrl(), '', 'no dev server outside a dev build')
})

test('the boot screen and phone bootstrap keep the location guard', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const problems = lintStore(root)
  assert.deepEqual(problems, [])
  const bad = (name, text) => {
    const dir = mkdtempSync(path.join(tmpdir(), 'did-i-lint-'))
    try {
      cpSync(path.join(root, 'metro.config.cjs'), path.join(dir, 'metro.config.cjs'))
      cpSync(path.join(root, 'native'), path.join(dir, 'native'), { recursive: true })
      writeFileSync(path.join(dir, name), text)
      return lintStore(dir)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }
  const boot = readFileSync(path.join(root, 'native/Boot.jsx'), 'utf8')
  const bootstrap = readFileSync(path.join(root, 'native/bootstrap.js'), 'utf8')
  const lazyBoot = boot.replace("require('../ExpoApp.jsx')", "await import('../ExpoApp.jsx')")
  assert.ok(bad('native/Boot.jsx', lazyBoot).some((p) => p.includes('Boot.jsx loads the app')))
  const bareLoc = bootstrap.replace('makeLocation(devServerUrl())', "{ hash: '#/' }")
  assert.ok(bad('native/bootstrap.js', bareLoc).some((p) => p.includes('makeLocation')))
})

// Phone modules that only exist on a device, stood in for so the native shim
// runs here. A stub is read when its module first loads.
const phoneStubs = {
  'react-native': {
    AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
    BackHandler: { addEventListener: () => ({ remove() {} }) },
    Platform: { OS: 'ios' },
    Share: { share: async () => ({}) },
  },
  'expo-clipboard': { setStringAsync: async () => {} },
  'expo-linking': { addEventListener: () => ({ remove() {} }), getInitialURL: async () => null, parse: () => ({}) },
  'expo-splash-screen': {},
  'expo-haptics': {},
  'expo-notifications': {},
}
globalThis.__didIPhoneStubs = phoneStubs
registerHooks({
  resolve: (specifier, context, next) =>
    specifier in phoneStubs ? { url: `phone-stub:${specifier}`, shortCircuit: true } : next(specifier, context),
  load: (url, context, next) => {
    if (!url.startsWith('phone-stub:')) return next(url, context)
    const name = url.slice('phone-stub:'.length)
    const keys = Object.keys(phoneStubs[name])
    const source = [
      `const mod = globalThis.__didIPhoneStubs[${JSON.stringify(name)}]`,
      'export default mod',
      ...keys.map((key) => `export const ${key} = mod[${JSON.stringify(key)}]`),
    ].join('\n')
    return { format: 'module', source, shortCircuit: true }
  },
})

const felt = []
Object.assign(phoneStubs['expo-haptics'], {
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  impactAsync: async (style) => felt.push(`impact:${style}`),
  notificationAsync: async (type) => felt.push(`notify:${type}`),
  selectionAsync: async () => felt.push('selection'),
})
const phone = await import('../native/shim/native.js')

test('a flick answers by where it was headed and flies off along its path', () => {
  // Let go short of the line with no speed: back to the middle.
  assert.equal(releaseWay(60, 0), 0)
  // Past the line, held still: answered.
  assert.equal(releaseWay(130, 0), 1)
  assert.equal(releaseWay(-130, 0), -1)
  // A short, fast flick counts.
  assert.equal(releaseWay(40, 900), 1)
  assert.equal(releaseWay(-40, -900), -1)
  // Past the line but thrown back: not answered.
  assert.equal(releaseWay(130, -600), 0)
  // A side that is closed never answers.
  assert.equal(releaseWay(200, 900, true, false), 0)
  assert.equal(releaseWay(-200, -900, false, true), 0)

  // Grabbing low turns the card the other way.
  assert.equal(grabSide(20, 200), 1)
  assert.equal(grabSide(180, 200), -1)
  assert.ok(cardTilt(100, 400, 1) > 0)
  assert.ok(cardTilt(100, 400, -1) < 0)
  assert.equal(cardTilt(0, 400, 1), 0)

  // Thrown right and down: it leaves the screen on the right, lower, fast.
  const path = flyPath(150, 10, 2400, 500, 1, 400)
  assert.ok(path.x > 400, 'clears the right edge')
  assert.ok(path.y > 10, 'keeps falling the way it was moving')
  assert.ok(path.duration >= 180 && path.duration <= 340)
  const slow = flyPath(0, 0, 0, 0, -1, 400)
  assert.ok(slow.x < -400, 'a tap throws it off the left edge')

  // The stack: the face at full size, the next two smaller and lower.
  assert.deepEqual(depthLook(0), { scale: 1, translateY: 0, opacity: 1 })
  assert.equal(depthLook(1).scale, 0.96)
  assert.equal(depthLook(2).scale, 0.92)
  assert.ok(depthLook(0.5).scale < 1 && depthLook(0.5).scale > 0.96, 'a card growing up is in between')
  assert.equal(depthLook(3).opacity, 0)
})

test('haptics speak one language on Tonight and do not switch off with Reduce Motion', () => {
  writePrefs({ lessMotion: true })
  felt.length = 0
  phone.feelTap('did')
  phone.feelTap('skip')
  phone.feelTap('undo')
  phone.feelTap('tick')
  phone.playClick()
  assert.deepEqual(felt, ['notify:success', 'impact:soft', 'impact:rigid', 'selection', 'selection'])
  writePrefs({ lessMotion: false })
})

const { deliverStreakHit, takePendingStreakMoment } = await import('../src/lib/streak-moments.js')
const { setAppForeground } = await import('../src/lib/app-foreground.js')
const sessionBox = new Map()
globalThis.sessionStorage = {
  getItem: (key) => (sessionBox.has(key) ? sessionBox.get(key) : null),
  setItem: (key, value) => sessionBox.set(key, String(value)),
  removeItem: (key) => sessionBox.delete(key),
}

async function testAsync(name, fn) {
  ran += 1
  try {
    await fn()
    console.log(`ok   ${name}`)
  } catch (error) {
    failed += 1
    console.error(`FAIL ${name}\n     ${error.message}`)
  }
}

await testAsync('a streak push that throws right after a Did waits for the app instead of rejecting', async () => {
  setAppForeground(false)
  const broken = async () => {
    throw new TypeError('undefined is not a function')
  }
  await deliverStreakHit({ kind: 'hit', n: 2 }, '2026-09-28', broken)
  const waiting = takePendingStreakMoment()
  assert.equal(waiting?.kind, 'hit', 'the moment is kept for when the app is open')
  assert.equal(waiting.n, 2)
  setAppForeground(true)
})

const { streakHitCopy, streakNights } = await import('../src/lib/streak-copy.js')
const { shelfHeat, shelfStreak } = await import('../src/lib/hall-feel.js')
const { isAppForeground } = await import('../src/lib/app-foreground.js')

test('a first cleared night is not "1 nights" and is not on fire yet', () => {
  const one = streakHitCopy(1)
  assert.equal(one.title, en['streak.hitTitleClear'])
  assert.equal(one.body, en['streak.hitBodyOne'])
  assert.equal(streakHitCopy(2).title, en['streak.hitTitleClear'], 'two nights is not a fire yet')
  assert.ok(streakHitCopy(2).body.startsWith('2 nights'))
  assert.equal(streakHitCopy(3).title, en['streak.hitTitle'], 'three nights is')
  assert.equal(streakNights(1), '1 night in a row')
  assert.equal(streakNights(7), '7 nights in a row')
})

test('the streak keeps counting past the five the room shows', () => {
  const clock = new Date(2026, 8, 28, 21, 0)
  const nights = []
  for (let back = 0; back < 8; back += 1) {
    const day = new Date(clock)
    day.setDate(day.getDate() - back)
    nights.push(boardDate(day))
  }
  const book = {
    id: 'b1',
    dayFoldHour: 0,
    lamps: [{ id: 'door', question: 'Did I lock the door?', cadence: 'daily', archived: false, createdOn: '2026-01-01' }],
    answers: nights.map((night) => ({ lampId: 'door', periodKey: night, status: 'yes', answeredAt: `${night}T21:00:00` })),
  }
  assert.equal(shelfHeat([book], clock), 5, 'the room stays at five')
  assert.equal(shelfStreak([book], clock), 8)
  const tonightOpen = { ...book, answers: book.answers.slice(1) }
  assert.equal(shelfStreak([tonightOpen], clock), 0, 'tonight counts only once it is clear')
})

test('the done card says what tomorrow night holds and from when', () => {
  const clock = new Date(2026, 8, 28, 21, 0)
  const lamp = (id, extra = {}) => ({ id, question: `Did I ${id}?`, cadence: 'daily', archived: false, createdOn: '2026-01-01', ...extra })
  const tomorrowDay = new Date(2026, 8, 29).getDay()
  const book = {
    id: 'b1',
    dayFoldHour: 0,
    lamps: [
      lamp('pills', { askAfter: '20:00' }),
      lamp('door', { askAfter: '21:30' }),
      lamp('bins', { cadence: 'weekly', weekdays: [(tomorrowDay + 1) % 7], askAfter: '19:00' }),
    ],
    answers: [],
  }
  assert.deepEqual(tomorrowPreview([book], clock), { count: 2, from: '20:00' }, 'counts what is due tomorrow, earliest first')
  const anytime = { ...book, lamps: [...book.lamps, lamp('phone')] }
  assert.deepEqual(tomorrowPreview([anytime], clock), { count: 3, from: '' }, 'no "from" when one is open all evening')
  assert.deepEqual(tomorrowPreview([{ ...book, lamps: [book.lamps[2]] }], clock), { count: 0, from: '' })
})

await testAsync('with the app open on the phone, a cleared night is not pushed to the phone itself', async () => {
  // The phone bootstrap stands in a document with no visibilityState.
  const hadDocument = 'document' in globalThis
  const before = globalThis.document
  globalThis.document = {}
  setAppForeground(true)
  try {
    assert.equal(isAppForeground(), true)
    let pushed = 0
    await deliverStreakHit({ kind: 'hit', n: 1 }, '2026-09-27', async () => {
      pushed += 1
      return true
    })
    assert.equal(pushed, 0, 'no system push while the app is in front')
    setAppForeground(false)
    assert.equal(isAppForeground(), false)
  } finally {
    setAppForeground(true)
    if (hadDocument) globalThis.document = before
    else delete globalThis.document
  }
})

console.log(`\n${ran - failed} of ${ran} passed`)
if (failed) process.exit(1)
