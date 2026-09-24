// The checks that do not need a server. Run with: npm test
//
// Everything here is something that broke once, or would break quietly
// if someone changed the wrong line.

import { strict as assert } from 'node:assert'
import { createRequire } from 'node:module'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
} from '../src/lib/recurrence.js'
import { closePastNights } from '../src/lib/daily.js'
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

import { applyAnswers, shelfWithoutAnswers } from '../src/lib/answer-log.js'
import {
  INVITE_CODE_LEN,
  INVITE_GEMS_CAP,
  cleanCode,
  cleanInvite,
  cleanLine,
  inviteGemsDue,
} from '../src/lib/people.js'
import { inviteNextFriendGems, inviteRewardProgress } from '../src/lib/invite-reward.js'
import { cleanPhone, looksLikePhone } from '../src/lib/people.js'
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
import { taggedDue } from '../src/lib/tags.js'
import { ownedLookIds, widgetBook, widgetLookId, widgetTonightUri } from '../src/lib/widget-config.js'
import { advanceTonightCard, applyWidgetTapOnce, buildTonightWidgetProps, mergeWidgetPropsIntoShelf } from '../src/lib/widget-tonight.js'

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

test('a line on Did I tonight is trimmed to what the column allows', () => {
  assert.equal(cleanLine('  lock   the back door  '), 'lock the back door')
  assert.equal(cleanLine('x'.repeat(200)).length, 60)
  assert.equal(cleanLine(''), '')
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

test('bigger gem packs cost less per gem', () => {
  const one = GEM_PACKS.find((pack) => pack.id === 'gems_1')
  const big = GEM_PACKS.find((pack) => pack.id === 'gems_25')
  assert.equal(one.cents, GEM_UNIT_CENTS)
  assert.ok(big.cents / big.gems < one.cents / one.gems)
  assert.ok(big.save >= 30)
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

test('widget props merge answers onto the pinned tag', () => {
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
  writePrefs({ widgetTagMode: 'pick', widgetTagId: 'tag-b' })
  const props = buildTonightWidgetProps(shelf)
  assert.ok(props.items.some((item) => item.lampId === 'l2'), 'tag B question should be due tonight')
  const merged = mergeWidgetPropsIntoShelf(shelf, {
    tagId: 'tag-b',
    items: props.items.map((item) => (item.lampId === 'l2' ? { ...item, status: 'yes' } : item)),
  })
  const answered = merged.boards.find((row) => row.id === 'tag-b')?.answers?.[0]
  assert.equal(answered?.lampId, 'l2')
  assert.equal(answered?.status, 'yes')
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
})

test('an android widget tap for one lamp and night applies once', () => {
  writePrefs({ widgetTagMode: 'active', widgetTagId: '' })
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

test('widget settings pick a tag and open tonight without changing the app filter', () => {
  const a = { id: 'tag-a', title: 'Home', lamps: [{ id: 'l1', question: 'Door?', cadence: 'daily', archived: false }], answers: [] }
  const b = { id: 'tag-b', title: 'Work', lamps: [{ id: 'l2', question: 'Email?', cadence: 'daily', archived: false }], answers: [] }
  const shelf = writeShelf({ currentId: 'tag-a', boards: [a, b] })
  writePrefs({ widgetTagMode: 'pick', widgetTagId: 'tag-b' })
  const book = widgetBook(shelf)
  assert.equal(book.id, 'tag-b')
  const uri = widgetTonightUri(book, 'l2')
  assert.ok(uri.includes('face=l2'))
  assert.ok(!uri.includes('tag='))
  const props = buildTonightWidgetProps(shelf)
  assert.equal(props.tagId, 'tag-b')
  assert.equal(props.tagTitle, 'Work')
  assert.ok(props.openUri.includes('face=l2'))
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
  assert.equal(swipeCard.includes('Pressable'), false, 'the face is a swipe, not buttons')
  assert.equal(swipeStub.includes('Pressable'), false, 'the face fallback has no answer buttons')
  assert.ok(swipeCard.includes('PanResponder'), 'the face swipes without the gesture module')
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
    assert.equal(needsAuth({ ready: false, user: null }), true)
    assert.equal(needsAuth({ ready: true, user: null }), true)
    assert.equal(needsAuth({ ready: true, user: { id: 'u' } }), false)
    assert.equal(authGated('/tonight', { ready: false, user: null }), true)
    assert.equal(authGated('/privacy', { ready: false, user: null }), false)
    assert.ok(shell.indexOf('if (gated)') < shell.indexOf('<ScreenRouter'), 'sign-in replaces the hall')
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
  const swipe = readFileSync(path.join(root, 'native/components/SwipeBackShell.jsx'), 'utf8')
  assert.ok(swipe.includes('lifted ? { transform'), 'the swipe layer stays flat until a drag')
  assert.ok(shell.includes('<SheetHost />'), 'a buy confirm paints above the screen')
  assert.ok(!shop.includes('<Modal'), 'a buy confirm is not an iOS modal')
  assert.ok(shop.includes('gemNotice'), 'a gem buy says what happened')
  assert.ok(shop.includes('offerMoreGems'), 'a short gem balance offers the gem page')
  const gems = readFileSync(path.join(root, 'native/iap/gem-store.js'), 'utf8')
  assert.ok(gems.includes('liveSku.get(pack.id) || pack.storeId'), 'an empty catalog still asks the store')
  const sheet = readFileSync(path.join(root, 'native/components/SheetHost.jsx'), 'utf8')
  assert.ok(sheet.includes("goHash('/gems')"), 'the short-gems popup opens the gem page')
  assert.ok(menu.includes("pointerEvents={live ? 'auto' : 'none'}"), 'the opening tap does not close the menu')
  assert.ok(cheer.includes('cheerName'), 'a cheer preview shows its name')
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

console.log(`\n${ran - failed} of ${ran} passed`)
if (failed) process.exit(1)
