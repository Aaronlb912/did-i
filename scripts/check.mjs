// The checks that do not need a server. Run with: npm test
//
// Everything here is something that broke once, or would break quietly
// if someone changed the wrong line.

import { strict as assert } from 'node:assert'
import { addDaysIso, answerFor, boardDate, faceReadyTonight, isoDate } from '../src/lib/recurrence.js'
import { closePastNights } from '../src/lib/daily.js'
import { byPriority, lampBuzzes, lampNudgesLate } from '../src/lib/board-json.js'
import { mergeShelves } from '../src/lib/shelf-merge.js'
import { isDemoBoard, stripDemoShelf } from '../src/lib/demo-strip.js'

import { applyAnswers, shelfWithoutAnswers } from '../src/lib/answer-log.js'
import { cleanCode, cleanInvite, cleanHandle, cleanLine } from '../src/lib/people.js'
import { HANDLE_WORDS, isHandleSafe } from '../src/lib/handle-safe.js'
import { GEM_PACKS, GEM_UNIT_CENTS } from '../src/lib/gem-packs.js'
import { gemWeekKey, spendGems, weeklyGemBump } from '../src/lib/purse.js'
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

test('a handle is folded the same way the database folds it', () => {
  assert.equal(cleanHandle('  @Maple_4417 '), 'maple_4417')
  assert.equal(cleanHandle('no spaces here'), 'nospaceshere')
})

test('a generated handle word never lands on hate text or codes', () => {
  for (const word of HANDLE_WORDS) {
    assert.ok(isHandleSafe(`${word}1234`), `${word}1234 should pass`)
    assert.ok(!isHandleSafe(`${word}1488`), `${word}1488 should fail`)
    assert.ok(isHandleSafe(word), `${word} should pass alone`)
  }
  assert.ok(!isHandleSafe('maple1488'))
  assert.ok(!isHandleSafe('badnigger123'))
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

test('a cheer cannot be sent on gems you do not have', () => {
  const broke = spendGems({ gems: 0 }, 1)
  assert.equal(broke.miss, 'gems')
  assert.equal(broke.book.gems, 0)

  const paid = spendGems({ gems: 3 }, 1)
  assert.equal(paid.miss, '')
  assert.equal(paid.book.gems, 2)
})

console.log(`\n${ran - failed} of ${ran} passed`)
if (failed) process.exit(1)
