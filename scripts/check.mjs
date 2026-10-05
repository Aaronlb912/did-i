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
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  addDaysIso,
  answerFor,
  boardDate,
  faceReadyTonight,
  faceSwipeTonight,
  isDueOn,
  isoDate,
  periodLabel,
  periodNight,
  periodPassed,
} from '../src/lib/recurrence.js'
import { bestQuestionStreak, lampNights, lampRecord, lampWeeks, questionStreak } from '../src/lib/lamp-record.js'
import { closePastNights } from '../src/lib/daily.js'
import { putAnswer } from '../src/lib/board-ops.js'
import {
  activeDeadline,
  byPriority,
  didQuestion,
  dueByUrgency,
  duplicateLamp,
  SHORT_MAX,
  lampBuzzes,
  lampNudgesLate,
  emptyBoard,
  prepQuestionRows,
} from '../src/lib/board-json.js'
import { PACKS, STARTERS, addPack, packList, starterBlank, starterList, undoPack } from '../src/lib/starters.js'
import {
  FIRST_PICKS_MAX,
  answeredNights,
  firstRunBook,
  isNewShelf,
  isNightOne,
  markNightOneSeen,
  markSignInNudgeSeen,
  nightOneSeen,
  pickPack,
  showSignInNudge,
  signInNudgeSeen,
  togglePick,
} from '../src/lib/first-run.js'
import { mergeShelves } from '../src/lib/shelf-merge.js'
import { devServerUrl, makeLocation } from '../native/location-shim.js'
import { lintStore } from './lint-store.mjs'
import { isDemoBoard, stripDemoShelf } from '../src/lib/demo-strip.js'
import { emptyShake, shakeStep } from '../src/lib/shake-undo.js'
import { NOTE_MAX, bulkLamps, hangInto, setAnswerNote, takeDown, undoBulkLamps } from '../src/lib/board-ops.js'

import { answersToSend, applyAnswers, shelfWithoutAnswers } from '../src/lib/answer-log.js'
import {
  INVITE_CODE_LEN,
  INVITE_GEMS_CAP,
  cleanCode,
  cleanInvite,
  inviteGemsDue,
} from '../src/lib/people.js'
import { inviteNextFriendGems, inviteRewardProgress } from '../src/lib/invite-reward.js'
import { inviteClip, inviteFromText, inviteLink, playLinkFor } from '../src/lib/invite-link.js'
import { applyGemOwnedToBook, validateCoinItem } from '../src/lib/wallet.js'
import { BUDDIES, FREE_BUDDY, LOOKS, SHOP_CALENDAR, isLive, isTeased, normalizePurse } from '../src/lib/purse.js'
import { hasAnyTopic, joinTopics, shelfTopics, topicsOf } from '../src/lib/board-json.js'
import '../src/lib/locales-all.js'
import { t } from '../src/lib/i18n.js'
import { forgetAccountCaches } from '../src/lib/account-cache.js'
import { answersCsv, csvCell } from '../src/lib/answers-csv.js'
import { GEM_PACKS, GEM_UNIT_CENTS } from '../src/lib/gem-packs.js'
import { cheerKinds, holdFor, popsFor } from '../src/lib/cheer-pops.js'
import {
  clearLocalShelf,
  dropBook,
  enterLand,
  hallEmpty,
  mergeSameTitles,
  normalizeShelf,
  parkEmptyTags,
  putBook,
  readShelf,
  writeShelf,
} from '../src/lib/board-shelf.js'
import { sessionMissing, signedOutSync } from '../src/lib/cloud-sync.js'
import {
  buyCheer,
  buyFriendCheers,
  coinsFor,
  FRIEND_CHEER_CAP,
  FRIEND_CHEERS_PER_GEM,
  gemWeekKey,
  spendGems,
  spreadPurseFrom,
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
import { englishLeft, isLegalKey, mayMatchEnglish, wrongScript } from './locale-shared.mjs'
import englishOk from './locale-english.json' with { type: 'json' }
import { writePrefs } from '../src/lib/prefs.js'
import { nightProgress } from '../src/lib/night-progress.js'
import { RISE_SPRING, cardTilt, depthLook, flyPath, grabSide, releaseWay } from '../native/lib/swipe-motion.js'
import { rollColumns, rollStops } from '../native/lib/roll-digits.js'
import { aimCheer, takeCheerAim } from '../native/lib/cheer-origin.js'
import { streakParts } from '../src/lib/streak-copy.js'
import { dropToast, showToast, toastQueue } from '../native/lib/toast-queue.js'
import { SKY_FPS, STARS, moonAt, moonPath, moonPhase, starAt } from '../native/lib/night-sky.js'
import { kitCount } from '../native/lib/kit-flight.js'
import { makeFeelTap } from '../native/lib/feel-tap.js'
import { phoneMatchMedia } from '../native/lib/reduce-media.js'
import { readReduceMotion } from '../src/lib/useReduceMotion.js'
import { joinTagIds, leftoverOn, scopedBooks, tagIdsOf, taggedDue } from '../src/lib/tags.js'
import { ownedLookIds, widgetLookId, widgetTonightUri } from '../src/lib/widget-config.js'
import { writeAccountUserId } from '../src/lib/session-id.js'
import { coinNightLine, coinNights, gemThisWeek, mergeCoinNights } from '../src/lib/coin-history.js'
import { clockWords, isRecapNight, monthStripNights, weekStripNights, nightWhy, nextStreakGoal, recapShareText, shelfFeedRows, shelfStatsCounts, stampWhen, tomorrowPreview, weekRecap } from '../src/lib/hall-pages.js'
import { setWeNightRows, weCardState, weCardsOn } from '../src/lib/we-nights.js'
import { streakLength } from '../src/lib/achievements.js'
import { joinTime, timeParts } from '../src/lib/hang-time.js'
import { searchRows, tonightStates } from '../src/lib/question-list.js'
import { holdSpoken, spokenQuestion, takeSpoken } from '../src/lib/voice-add.js'
import {
  handleSwipeCardAccessibilityAction,
  swipeCardAccessibilityActions,
  swipeCardAccessibilityLabel,
} from '../native/lib/swipe-card-a11y.js'
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

test('a night pays 2 a did, 1 late, nothing for new questions or past 3 taps', () => {
  const clock = new Date('2026-10-04T21:00:00')
  const old = lamp('a', { createdOn: '2026-10-01' })
  const fresh = lamp('n', { createdOn: '2026-10-04' })
  const book = (lamps, answers = []) => ({ id: 'b', dayFoldHour: 0, lamps, answers })
  assert.equal(coinsFor('yes', book([old]), { lamp: old }, clock), 2)
  assert.equal(coinsFor('late', book([old]), { lamp: old }, clock), 1)
  assert.equal(coinsFor('skip', book([old]), { lamp: old }, clock), 0)
  // Added today, even one just for tonight: coins start tomorrow night.
  assert.equal(coinsFor('yes', book([fresh]), { lamp: fresh }, clock), 0)
  const paid = ['x', 'y', 'z'].map((id) => lamp(id, { createdOn: '2026-10-01' }))
  const answers = paid.map((item) => ({ lampId: item.id, periodKey: '2026-10-04', status: 'yes', answeredAt: '2026-10-04T20:00:00' }))
  const fourth = lamp('w', { createdOn: '2026-10-01' })
  assert.equal(coinsFor('yes', book([...paid, fourth], answers), { lamp: fourth }, clock), 0)
})

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

test('a duplicate keeps " copy" inside the short name limit', () => {
  const copy = duplicateLamp({ id: 'a', question: 'Did I water the plants daily?', short: 'Water the plants daily' })
  assert.ok(copy.short.length <= SHORT_MAX, copy.short)
  assert.ok(copy.short.endsWith(' copy'), copy.short)
  assert.equal(duplicateLamp({ id: 'b', question: 'Did I read?', short: 'Read' }).short, 'Read copy')
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
  const meta = new Set(['id', 'delay', 'size', 'rot', 'len', 'tone', 'side', 'y', 'x', 'fat', 'reach', 'tall', 'screen', 'fall', 'width', 'drift', 'rise', 'scale', 'hop', 'hops', 'from', 'span', 'oy', 'swing', 'rays', 'turn'])
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

test('moving a question to a brand-new folder keeps coins', () => {
  const a = lamp('a')
  let shelf = { currentId: 'b1', boards: [{ id: 'b1', title: 'Tag', lamps: [a], answers: [], coins: 5, gems: 2 }] }
  // Same path as Edit question > Folder > new folder > Save: takeDown, then putBook the new folder.
  shelf = putBook(shelf, takeDown(shelf.boards[0], a))
  const fresh = hangInto({ ...emptyBoard(), title: 'New one' }, a, false)
  shelf = putBook(shelf, fresh)
  const current = shelf.boards.find((item) => item.id === shelf.currentId)
  const saved = spreadPurseFrom(shelf, current)
  assert.ok(saved.boards.every((item) => item.coins === 5), 'coins stay 5 on every folder')
  assert.ok(saved.boards.every((item) => item.gems === 2), 'gems too')
})

test('a folder you just made stays visible until you move away', () => {
  const shelf = { currentId: 'new', boards: [{ id: 'b1', title: 'Tag', lamps: [lamp('a')], answers: [] }, { id: 'new', title: 'Gym', lamps: [], answers: [] }] }
  assert.equal(parkEmptyTags(shelf).boards.find((item) => item.id === 'new').archived, false)
  assert.equal(parkEmptyTags({ ...shelf, currentId: 'b1' }).boards.find((item) => item.id === 'new').archived, true)
})

test('So far and Every answer count every folder', () => {
  const boards = [
    { id: 'b1', title: 'Tag', lamps: [lamp('a')], answers: [{ id: 'x', lampId: 'a', periodKey: '2026-10-01', status: 'yes', answeredAt: '2026-10-01T20:00' }] },
    { id: 'b2', title: 'Pills', lamps: [lamp('b')], answers: [{ id: 'y', lampId: 'b', periodKey: '2026-10-02', status: 'skip', answeredAt: '2026-10-02T20:00' }] },
  ]
  const counts = shelfStatsCounts(boards, new Date('2026-10-03T12:00:00'), '')
  assert.equal(counts.did, 1)
  assert.equal(counts.skip, 1)
  assert.equal(counts.hung, 2)
  assert.equal(shelfStatsCounts(boards, new Date('2026-10-03T12:00:00'), 'b2').did, 0)
  assert.deepEqual(shelfFeedRows(boards).map((row) => row.answer.id), ['y', 'x'])
  assert.equal(nextStreakGoal(1), 3)
  assert.equal(nextStreakGoal(5), 7)
})

test('the calendar leaves future nights and nights before you started blank', () => {
  const boards = [{ id: 'b1', title: 'Tag', lamps: [lamp('a', { createdOn: '2026-10-03' })], answers: [] }]
  const { nights } = monthStripNights(boards, new Date('2026-10-04T12:00:00'), '', 0)
  const day = (iso) => nights.find((night) => night.iso === iso)
  assert.equal(day('2026-10-01').miss, false, 'before the first question')
  assert.equal(day('2026-10-01').empty, true)
  assert.equal(day('2026-10-03').miss, true, 'a real missed night')
  assert.equal(day('2026-10-09').empty, true, 'future')
  // No made date at all: nothing before the first answer counts as missed.
  const bare = [{ id: 'b1', title: 'Tag', lamps: [{ ...lamp('a'), createdOn: '' }], answers: [{ lampId: 'a', periodKey: '2026-10-02', status: 'yes' }] }]
  const pack = monthStripNights(bare, new Date('2026-10-04T12:00:00'), '', 0).nights
  assert.equal(pack.find((night) => night.iso === '2026-10-01').miss, false)
  assert.equal(pack.find((night) => night.iso === '2026-10-02').on, true)
  // A nope night is not cleared, so it is not filled in, like the streak.
  const noped = [{ ...bare[0], answers: [{ lampId: 'a', periodKey: '2026-10-02', status: 'skip' }] }]
  const nope = monthStripNights(noped, new Date('2026-10-04T12:00:00'), '', 0).nights.find((night) => night.iso === '2026-10-02')
  assert.equal(nope.on, false)
  assert.equal(nope.miss, true)
  // A Did we you left open that night leaves it open too.
  setWeNightRows([{ card: 'w', folder: '', night: '2026-10-02', status: '' }])
  const weOpen = monthStripNights(bare, new Date('2026-10-04T12:00:00'), '', 0).nights.find((night) => night.iso === '2026-10-02')
  setWeNightRows([])
  assert.equal(weOpen.on, false)
  // A paused Did we (nobody answered 3 nights) does not hold the night open.
  setWeNightRows([{ card: 'w', folder: '', night: '2026-10-02', status: '', paused: true }])
  const wePaused = monthStripNights(bare, new Date('2026-10-04T12:00:00'), '', 0).nights.find((night) => night.iso === '2026-10-02')
  setWeNightRows([])
  assert.equal(wePaused.on, true)
})

await testAsync('a paused Did we is not asked, and "you both did it" needs two dids', async () => {
  const { weBothDid, wePausedCards, weReminders } = await import('../src/lib/did-we.js')
  const me = { id: 'm', me: true, state: 'in', status: 'did' }
  const pal = { id: 'p', state: 'in', status: 'did' }
  assert.equal(weBothDid({ done: true, people: [me, pal] }), true)
  assert.equal(weBothDid({ done: true, people: [me, { ...pal, status: null }] }), false)
  assert.equal(weBothDid({ done: false, people: [me, pal] }), false)
  const paused = { id: 'c', myState: 'in', paused: true, askAfter: '20:00', question: 'Did we walk?' }
  assert.deepEqual(wePausedCards([paused, { ...paused, id: 'd', paused: false }]).map((card) => card.id), ['c'])
  assert.equal(weReminders([paused]).length, 0, 'a paused card sets no reminder')
})

test('a night says why it broke, by the same rules as the dots', () => {
  const now = new Date('2026-10-04T12:00:00')
  const book = (answers, lamps = [lamp('a'), lamp('b')]) => [
    { id: 'b1', title: 'Tag', dayFoldHour: 0, lamps, answers },
  ]
  const shelf = book([
    { lampId: 'a', periodKey: '2026-10-02', status: 'skip' },
    { lampId: 'a', periodKey: '2026-10-03', status: 'yes' },
    { lampId: 'b', periodKey: '2026-10-03', status: 'late' },
  ])
  const broke = nightWhy(shelf, '2026-10-02', now)
  assert.equal(broke.state, 'missed')
  assert.deepEqual(broke.noped.map((row) => row.lamp.id), ['a'])
  assert.deepEqual(broke.unanswered.map((row) => row.lamp.id), ['b'])
  // A did and a late clear it.
  assert.equal(nightWhy(shelf, '2026-10-03', now).state, 'clear')
  assert.equal(nightWhy(shelf, '2026-10-04', now).state, 'open')
  assert.equal(nightWhy(shelf, '2026-10-05', now).state, 'ahead')
  assert.equal(nightWhy(book([], [lamp('a', { createdOn: '2026-10-03' })]), '2026-10-02', now).state, 'none')
  // A Did we left open breaks an otherwise clear night.
  setWeNightRows([{ card: 'w', folder: '', night: '2026-10-03', status: 'nope' }])
  const we = nightWhy(shelf, '2026-10-03', now)
  setWeNightRows([])
  assert.equal(we.state, 'missed')
  assert.deepEqual(we.weOpen, ['w'])
  // Every night in the month agrees with its dot.
  for (const night of monthStripNights(shelf, now, '', 0).nights.filter((item) => !item.pad)) {
    const why = nightWhy(shelf, night.iso, now)
    assert.equal(why.state === 'clear', night.on, night.iso)
    assert.equal(why.state === 'missed', night.miss, night.iso)
  }
})

test('coin history pays like coinsFor: 2, 1, 0, first 3, not on a new question', () => {
  const now = new Date('2026-10-04T21:00:00')
  const old = ['a', 'b', 'c', 'd'].map((id) => lamp(id, { createdOn: '2026-09-01' }))
  const answers = [
    { lampId: 'a', periodKey: '2026-10-03', status: 'yes', answeredAt: '2026-10-03T20:00:00' },
    { lampId: 'b', periodKey: '2026-10-03', status: 'late', answeredAt: '2026-10-03T20:01:00' },
    { lampId: 'c', periodKey: '2026-10-03', status: 'skip', answeredAt: '2026-10-03T20:02:00' },
    { lampId: 'c', periodKey: '2026-10-04', status: 'yes', answeredAt: '2026-10-04T20:00:00' },
    { lampId: 'a', periodKey: '2026-10-04', status: 'yes', answeredAt: '2026-10-04T20:01:00' },
    { lampId: 'b', periodKey: '2026-10-04', status: 'yes', answeredAt: '2026-10-04T20:02:00' },
    { lampId: 'd', periodKey: '2026-10-04', status: 'yes', answeredAt: '2026-10-04T20:03:00' },
    { lampId: 'n', periodKey: '2026-10-02', status: 'yes', answeredAt: '2026-10-02T20:00:00' },
  ]
  const shelf = { currentId: 'b1', boards: [{ id: 'b1', dayFoldHour: 0, lamps: [...old, lamp('n', { createdOn: '2026-10-02' })], answers }] }
  // Every night is listed, a 0 night too, with why.
  const nights = coinNights(shelf, now)
  assert.deepEqual(nights.slice(0, 4), [
    { night: '2026-10-04', coins: 6, reason: 'cap' },
    { night: '2026-10-03', coins: 3, reason: '' },
    { night: '2026-10-02', coins: 0, reason: 'new' },
    { night: '2026-10-01', coins: 0, reason: 'none' },
  ])
  assert.equal(nights.length, 7)
  // Signed in, the server's numbers win but its missing 0 nights stay listed.
  const merged = mergeCoinNights(nights, [{ night: '2026-10-04', coins: 6 }, { night: '2026-10-03', coins: 2 }])
  assert.equal(merged.length, 7)
  assert.deepEqual(merged[1], { night: '2026-10-03', coins: 2, reason: '' })
  assert.deepEqual(merged[2], { night: '2026-10-02', coins: 0, reason: 'new' })
  assert.match(coinNightLine(merged[2], 'Fri'), /tomorrow/)
  // Nothing before the first question or answer.
  const young = { currentId: 'b1', boards: [{ id: 'b1', dayFoldHour: 0, lamps: [lamp('y', { createdOn: '2026-10-03' })], answers: [] }] }
  assert.deepEqual(coinNights(young, now).map((row) => row.reason), ['open', 'none'])
  assert.equal(gemThisWeek(gemWeekKey(now), now), true)
  assert.equal(gemThisWeek('', now), false)
})

test('one streak rule per question: a nope breaks it, late keeps it, every screen agrees', () => {
  const now = new Date('2026-10-05T21:00:00')
  const q = lamp('q', { createdOn: '2026-09-25' })
  const say = (night, status) => ({ lampId: 'q', periodKey: night, status, answeredAt: `${night}T20:00:00` })
  const answers = [
    say('2026-09-26', 'yes'), say('2026-09-27', 'yes'), say('2026-09-28', 'late'), say('2026-09-29', 'yes'),
    say('2026-09-30', 'skip'),
    say('2026-10-01', 'yes'), say('2026-10-02', 'late'), say('2026-10-03', 'yes'), say('2026-10-04', 'yes'),
  ]
  const shelfBook = { id: 'b', dayFoldHour: 0, lamps: [q], answers }
  // Tonight not answered yet does not break it.
  assert.equal(questionStreak(shelfBook, q, '2026-10-05'), 4)
  assert.equal(streakLength(shelfBook, q, now), 4)
  assert.equal(lampRecord(shelfBook, q, '2026-10-05').streak, 4)
  assert.equal(bestQuestionStreak(shelfBook, q, '2026-10-05'), 4)
  // Tonight's nope ends it on every screen.
  const noped = { ...shelfBook, answers: [...answers, say('2026-10-05', 'skip')] }
  assert.equal(streakLength(noped, q, now), 0)
  assert.equal(lampRecord(noped, q, '2026-10-05').streak, 0)
  // A missed night ends it too; best remembers the longer run.
  const gap = { ...shelfBook, answers: answers.filter((answer) => answer.periodKey !== '2026-10-02' && answer.periodKey !== '2026-09-30') }
  assert.equal(questionStreak(gap, q, '2026-10-05'), 2)
  assert.equal(bestQuestionStreak(gap, q, '2026-10-05'), 4)
})

test('Seven nights counts a night like Home: a missed Did we leaves it red', () => {
  const now = new Date('2026-10-04T21:00:00')
  const q = lamp('q', { createdOn: '2026-09-25' })
  const answers = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map((night) => ({
    lampId: 'q', periodKey: night, status: 'yes', answeredAt: `${night}T20:00:00`,
  }))
  const shelf = [{ id: 'b', dayFoldHour: 0, lamps: [q], answers }]
  setWeNightRows([
    { card: 'w', folder: '', night: '2026-10-03', status: '' },
    { card: 'w', folder: '', night: '2026-10-04', status: 'did' },
  ])
  const strip = weekStripNights(shelf, now)
  assert.equal(strip.filter((night) => night.on).length, 6)
  assert.equal(strip.find((night) => night.iso === '2026-10-03').on, false)
  assert.deepEqual(weCardsOn(strip.map((night) => night.iso)), ['w'])
  assert.equal(weCardState('2026-10-03', 'w'), '')
  assert.equal(weCardState('2026-10-04', 'w'), 'did')
  assert.equal(weCardState('2026-10-02', 'w'), 'off')
  assert.deepEqual(nightWhy(shelf, '2026-10-03', now).weOpen, ['w'])
  setWeNightRows([])
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

test('an answer night reads as a date, never the raw key, once questions included', () => {
  const once = lamp('di-vqcaay81', { cadence: 'once', onceOn: '2026-10-01' })
  const by = lamp('b', { cadence: 'once', onceWhen: 'by', dueBy: '2026-10-03', onceOn: '2026-09-01' })
  assert.equal(periodNight(once, 'once:di-vqcaay81'), '2026-10-01')
  assert.equal(periodNight(by, 'once:b'), '2026-10-03', 'a by-date once uses its due day')
  assert.equal(periodNight(lamp('n', { cadence: 'once', createdOn: '' }), 'once:n'), '', 'no day, no guess')
  assert.equal(periodLabel(once, 'once:di-vqcaay81'), 'Thu, Oct 1')
  assert.equal(periodLabel(lamp('x'), '2026-10-01'), 'Thu, Oct 1')
  assert.equal(periodLabel(lamp('m', { cadence: 'monthly' }), '2026-10'), 'Oct 2026')
  assert.ok(!periodLabel(null, 'once:gone').includes('once:'), 'a deleted question still hides the key')
  // Notes list order: newest night first, the once answer on its own day.
  const book = {
    lamps: [once],
    answers: [{ lampId: 'di-vqcaay81', periodKey: 'once:di-vqcaay81', status: 'yes' }],
  }
  assert.deepEqual(lampNights(book, once).map((row) => row.night), ['2026-10-01'])
  const daily = lamp('d')
  const nights = lampNights({ answers: [
    { lampId: 'd', periodKey: '2026-09-30', status: 'yes' },
    { lampId: 'd', periodKey: '2026-10-02', status: 'skip' },
    { lampId: 'z', periodKey: '2026-10-03', status: 'yes' },
  ] }, daily)
  assert.deepEqual(nights.map((row) => row.night), ['2026-10-02', '2026-09-30'], 'only this question, newest first')
  // The Sunday recap counts a once Did on its day.
  const week = Array.from({ length: 7 }, (_, i) => ({ iso: addDaysIso('2026-09-28', i), on: false }))
  assert.equal(weekRecap([book], week).dids, 1)
})

test('a question page trend counts dids out of due per week, tonight only once answered', () => {
  const daily = lamp('d', { createdOn: '2026-09-01' })
  const answers = [
    { lampId: 'd', periodKey: '2026-10-05', status: 'yes' },
    { lampId: 'd', periodKey: '2026-10-04', status: 'late' },
    { lampId: 'd', periodKey: '2026-10-03', status: 'skip' },
  ]
  const weeks = lampWeeks({ answers }, daily, '2026-10-05', 8)
  assert.equal(weeks.length, 5, 'weeks before the question was made are left off')
  assert.deepEqual(weeks[4], { from: '2026-09-29', due: 7, did: 2 })
  assert.ok(weeks[0].due > 0)
  const open = lampWeeks({ answers: answers.slice(1) }, daily, '2026-10-05', 8)
  assert.equal(open[4].due, 6, 'an unanswered tonight is not counted yet')
  assert.deepEqual(lampWeeks({ answers }, lamp('o', { cadence: 'once' }), '2026-10-05'), [])
})

test('a note on one night rides the answer, is capped, and survives two phones syncing', () => {
  const answer = { id: 'a1', lampId: 'x', periodKey: '2026-10-01', status: 'yes', answeredAt: '2026-10-01T21:00:00', note: '' }
  const book = { id: 'b1', title: 'Tag', lamps: [lamp('x')], answers: [answer] }
  const noted = setAnswerNote(book, 'x', '2026-10-01', '  Charged it   at work ', new Date('2026-10-02T09:00:00'))
  assert.equal(noted.answers[0].note, 'Charged it at work')
  assert.equal(noted.answers[0].status, 'yes', 'the answer itself stays')
  assert.equal(noted.answers[0].answeredAt, answer.answeredAt, 'a note leaves the tap time alone')
  assert.ok(noted.answers[0].noteAt > answer.answeredAt, 'noteAt is what sync sees as newer')
  assert.equal(setAnswerNote(book, 'x', '2026-09-30', 'no answer', new Date()), book, 'no answer, no note')
  assert.equal(setAnswerNote(book, 'x', '2026-10-01', 'y'.repeat(500), new Date()).answers[0].note.length, NOTE_MAX)
  // A clock behind the answer still moves it forward.
  const behind = setAnswerNote(book, 'x', '2026-10-01', 'late clock', new Date('2026-09-01T09:00:00'))
  assert.ok(behind.answers[0].noteAt > answer.answeredAt)
  assert.equal(behind.answers[0].answeredAt, answer.answeredAt)
  // The phone that never saw the note does not wipe it, either way round.
  const older = { currentId: 'b1', boards: [book] }
  const fresh = { currentId: 'b1', boards: [noted] }
  for (const merged of [mergeShelves(fresh, older, '2026-10-02', '2026-10-01'), mergeShelves(older, fresh, '2026-10-03', '2026-10-02')]) {
    assert.equal(merged.boards[0].answers[0].note, 'Charged it at work')
    assert.equal(merged.boards[0].answers[0].answeredAt, answer.answeredAt, 'and the tap time does not move')
  }
  // The answer log folds it in too, by note_at, with the same tap time.
  const rows = [{ lamp_id: 'x', period_key: '2026-10-01', board_id: 'b1', status: 'yes', answered_at: answer.answeredAt, note: 'Charged it at work', note_at: noted.answers[0].noteAt }]
  const pulled = applyAnswers(older, rows).shelf.boards[0].answers[0]
  assert.equal(pulled.note, 'Charged it at work')
  assert.equal(pulled.answeredAt, answer.answeredAt)
  // An older row without the note does not wipe it.
  const stale = [{ ...rows[0], note: '', note_at: '' }]
  assert.equal(applyAnswers(fresh, stale).changed, 0)
  // The row sent up carries the note stamp.
  assert.equal(answersToSend(fresh, true)[0].e, noted.answers[0].noteAt)
  assert.equal(answersToSend(fresh, true)[0].a, answer.answeredAt)
})

test('a question pack adds only what is missing, and undo takes them off for good', () => {
  for (const pack of PACKS) {
    assert.equal(pack.items.length, 3, `${pack.id} adds 3`)
    for (const item of pack.items) {
      assert.ok(t(`starter.${item.idea}.blank`) !== `starter.${item.idea}.blank`, `${item.idea} has words`)
      assert.ok(t(`ideas.${item.idea}.start`) !== `ideas.${item.idea}.start`, `${item.idea} has a name`)
    }
  }
  const empty = { id: 'b1', title: 'Tag', lamps: [], answers: [] }
  const house = packList(empty).find((pack) => pack.id === 'house')
  const { book, ids } = addPack(empty, house, new Date('2026-10-05T10:00:00'))
  assert.equal(ids.length, 3)
  assert.equal(new Set(ids).size, 3)
  assert.equal(book.lamps.length, 3)
  assert.ok(!packList(book).some((pack) => pack.id === 'house'), 'a pack already on the tag is not offered again')
  const meds = packList({ ...empty, lamps: [{ ...lamp('p'), question: `Did I ${t('starter.pills.blank')}?` }] }).find((pack) => pack.id === 'meds')
  assert.equal(meds.items.length, 2, 'the evening pills already there are left out')
  const undone = undoPack(book, ids, new Date('2026-10-05T10:00:05'))
  assert.equal(undone.lamps.length, 0)
  // An older copy still holding them does not bring them back.
  const merged = mergeShelves({ currentId: 'b1', boards: [undone] }, { currentId: 'b1', boards: [book] }, '2026-10-05T11', '2026-10-05T10')
  assert.equal(merged.boards[0].lamps.length, 0)
})

test('the week recap counts cleared nights, dids and the best run', () => {
  const week = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'].map((iso, i) => ({
    iso,
    on: [true, true, false, true, true, true, false][i],
  }))
  const answers = [
    { lampId: 'x', periodKey: '2026-09-28', status: 'yes' },
    { lampId: 'x', periodKey: '2026-10-01', status: 'late' },
    { lampId: 'x', periodKey: '2026-10-02', status: 'skip' },
    { lampId: 'x', periodKey: '2026-09-27', status: 'yes' },
    { lampId: 'x', periodKey: '2026-10', status: 'yes' },
  ]
  const recap = weekRecap([{ id: 'b1', lamps: [lamp('x')], answers }], week)
  assert.deepEqual(recap, { cleared: 5, nights: 7, dids: 2, late: 1, nopes: 1, best: 3 })
  assert.equal(isRecapNight('2026-10-04'), true, 'Sunday')
  assert.equal(isRecapNight('2026-10-05'), false)
  assert.equal(isRecapNight(''), false)
  const text = recapShareText(recap)
  assert.ok(text.includes('5') && text.includes('3') && !text.includes('{'), 'share text is filled in')
})

test('a question deleted on one phone stays deleted when an older phone syncs', () => {
  const older = { currentId: 'b1', boards: [{ id: 'b1', title: 'Tag', lamps: [lamp('x'), lamp('y')], answers: [{ lampId: 'y', periodKey: '2026-09-29', status: 'yes' }] }] }
  // This phone deletes y, one alone and one in bulk, then syncs with the older copy, either way round.
  const one = { ...older, boards: [takeDown(older.boards[0], lamp('y'), new Date('2026-09-30T10:00:00Z'))] }
  const bulk = { ...older, boards: bulkLamps(older.boards, [{ boardId: 'b1', lampId: 'y' }], 'delete') }
  for (const fresh of [one, bulk]) {
    for (const merged of [mergeShelves(fresh, older, '2026-09-30', '2026-09-29'), mergeShelves(older, fresh, '2026-09-29', '2026-09-30')]) {
      assert.deepEqual(merged.boards[0].lamps.map((item) => item.id), ['x'])
      assert.equal(merged.boards[0].answers.length, 0)
    }
  }
  // Putting it back later wins over the earlier delete, even against a phone that only saw the delete.
  const back = { ...one, boards: [hangInto(one.boards[0], lamp('y'))] }
  const merged = mergeShelves(one, back, '2026-09-30T11:00', '2026-09-30T12:00')
  assert.deepEqual(merged.boards[0].lamps.map((item) => item.id).sort(), ['x', 'y'])
  // Moving a question to another tag only takes it off the first one.
  const moved = { currentId: 'b1', boards: [takeDown(older.boards[0], lamp('y')), { id: 'b2', title: 'Other', lamps: [lamp('y')], answers: [] }] }
  const both = mergeShelves(moved, older, '2026-09-30', '2026-09-29')
  assert.deepEqual(both.boards.map((book) => book.lamps.map((item) => item.id)), [['x'], ['y']])
})

test('a tag deleted on one phone stays deleted when an older phone syncs', () => {
  const older = {
    currentId: 'b1',
    boards: [
      { id: 'b1', title: 'Home', lamps: [lamp('x')], answers: [] },
      { id: 'b2', title: 'Work', lamps: [lamp('y')], answers: [] },
    ],
  }
  const fresh = normalizeShelf(dropBook(older, 'b2'))
  for (const merged of [mergeShelves(fresh, older, '2026-09-30', '2026-09-29'), mergeShelves(older, fresh, '2026-09-29', '2026-09-30')]) {
    assert.deepEqual(merged.boards.map((book) => book.id), ['b1'])
    assert.equal(merged.goneTags.length, 1, 'and the delete carries on to the next phone')
  }
})

test('every item the shop sells is in the server gift catalog at the same price and date', () => {
  // The server refuses a buy or gift of anything missing from gift_catalog, so a
  // drop added to purse.js but not gifts.sql would fail on release day.
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const purse = readFileSync(path.join(root, 'src/lib/purse.js'), 'utf8')
  const sql = readFileSync(path.join(root, 'supabase/gifts.sql'), 'utf8')
  const price = { CHEER_GEMS: 2, BUDDY_GEMS: 5, LOOK_GEM_PRICE: 2, LOOK_COIN_PRICE: 30 }
  for (const [name, n] of Object.entries(price)) {
    assert.match(purse, new RegExp(`export const ${name} = ${n}\\b`), `${name} changed; update this test and gifts.sql`)
  }
  const value = (raw) => (raw in price ? price[raw] : Number(raw))
  const rows = new Map()
  for (const m of sql.matchAll(/\('(cheer|buddy|look)', '([a-z]+)', (\d+), (\d+), '([\d-]+)'\)/g)) {
    rows.set(`${m[1]}:${m[2]}`, { gems: Number(m[3]), coins: Number(m[4]), from: m[5] })
  }
  for (const [list, kind] of [['ALL_CHEERS', 'cheer'], ['ALL_BUDDIES', 'buddy'], ['ALL_LOOKS', 'look']]) {
    const block = purse.match(new RegExp(`const ${list} = \\[([\\s\\S]*?)\\n\\]`))[1]
    for (const m of block.matchAll(/\{ id: '([a-z]+)'([^}]*)\}/g)) {
      const gems = value((m[2].match(/gems: (\w+)/) || [0, '0'])[1])
      const coins = value((m[2].match(/coins: (\w+)/) || [0, '0'])[1])
      if (!gems && !coins) continue
      const row = rows.get(`${kind}:${m[1]}`)
      assert.ok(row, `${kind} ${m[1]} is sold but missing from gift_catalog in gifts.sql`)
      assert.deepEqual(row, { gems, coins, from: (m[2].match(/from: '([\d-]+)'/) || [0, '2026-01-01'])[1] }, `${kind} ${m[1]}`)
    }
  }
})

test('every accessory can be given, at its shop price and dates', async () => {
  const { ACCESSORIES } = await import('../src/lib/accessories.js')
  const sql = readFileSync(new URL('../supabase/gifts.sql', import.meta.url), 'utf8')
  const rows = new Map(
    [...sql.matchAll(/\('accessory', '(\w+)', (\d+), (\d+), '([\d-]+)', (null|'[\d-]+')\)/g)].map((m) => [
      m[1],
      { gems: Number(m[2]), coins: Number(m[3]), from: m[4], until: m[5] === 'null' ? '' : m[5].slice(1, -1) },
    ]),
  )
  for (const item of ACCESSORIES) {
    assert.deepEqual(rows.get(item.id), { gems: 0, coins: item.coins, from: item.from || '2026-01-01', until: item.until || '' }, item.id)
  }
})

test('a seasonal accessory is sold only in its season, and kept after', async () => {
  const { accessoryOnSale, accessoryById } = await import('../src/lib/accessories.js')
  const { normalizePurse } = await import('../src/lib/purse.js')
  const witch = accessoryById('witch')
  assert.ok(accessoryOnSale(witch, '2026-10-15'))
  assert.ok(!accessoryOnSale(witch, '2026-11-01'))
  assert.ok(!accessoryOnSale(witch, '2026-09-30'))
  assert.deepEqual(normalizePurse({ accessories: ['witch'], worn: { head: 'witch' } }).worn, { head: 'witch' })
})

test('signed in, the server list is the whole accessory list, like coin looks', async () => {
  const { applyCoinCatalogToBook } = await import('../src/lib/wallet.js')
  const { normalizePurse } = await import('../src/lib/purse.js')
  const book = { coins: 5, accessories: ['crown', 'beanie'], worn: { head: 'crown' }, buddyOn: 'ant' }
  const next = normalizePurse(applyCoinCatalogToBook(book, { coins: 5, looks: [], cheerStages: {}, accessories: ['beanie'] }))
  assert.deepEqual(next.accessories, ['beanie'])
  assert.deepEqual(next.worn, {}, 'an accessory the server does not have comes off')
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

test('gem items added by editing the phone go away on sync; free and coin items stay', () => {
  const edited = {
    gems: 50,
    looks: ['lime', 'ink', 'plum', 'rose'],
    lookOn: 'rose',
    cheers: ['lime', 'rain', 'tape'],
    cheerOn: 'tape',
    buddies: ['ant', 'cat'],
    buddyOn: 'cat',
  }
  const book = normalizePurse(applyGemOwnedToBook(edited, { gems: 2, looks: ['plum'], cheers: ['rain'], buddies: [] }))
  assert.equal(book.gems, 2)
  assert.deepEqual([...book.looks].sort(), ['ink', 'lime', 'plum'])
  assert.deepEqual([...book.cheers].sort(), ['lime', 'rain'])
  assert.deepEqual(book.buddies, [FREE_BUDDY])
  assert.equal(book.lookOn, 'lime', 'a look you do not own is taken off')
  assert.equal(book.buddyOn, '')
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const sync = readFileSync(path.join(root, 'src/lib/cloud-sync.js'), 'utf8')
  assert.ok(sync.includes('applyGemOwnedToShelf(written, gemBag)'), 'sync copies the server list')
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

  // A deadline question days before its date never clears the night on its own.
  const pending = {
    ...book,
    lamps: [{ ...lamp('d'), cadence: 'once', onceWhen: 'by', dueBy: '2026-09-27' }],
  }
  assert.equal(allClearTonight(pending, clock), false)

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

test('a folder still called Did I from before the General rename lands as General on load', () => {
  const old = { id: 'b1', title: 'Did I', lamps: [lamp('a')], answers: [] }
  const shelf = normalizeShelf({ currentId: 'b1', boards: [old] })
  assert.equal(shelf.boards.length, 1)
  assert.equal(shelf.boards[0].title, t('tags.general'))
  assert.equal(shelf.boards[0].lamps.map((item) => item.id).join(','), 'a')

  const renamed = { id: 'b2', title: 'Chores', lamps: [lamp('b')], answers: [] }
  const untouched = normalizeShelf({ currentId: 'b2', boards: [renamed] })
  assert.equal(untouched.boards[0].title, 'Chores')
})

test('a leftover Did I folder folds into an already-renamed General folder on the same phone', () => {
  const stillOld = { id: 'b1', title: 'Did I', lamps: [lamp('a')], answers: [] }
  const alreadyGeneral = { id: 'b2', title: t('tags.general'), lamps: [lamp('b')], answers: [] }
  const shelf = normalizeShelf({ currentId: 'b1', boards: [stillOld, alreadyGeneral] })
  assert.equal(shelf.boards.length, 1)
  assert.equal(shelf.boards[0].title, t('tags.general'))
  assert.deepEqual(shelf.boards[0].lamps.map((item) => item.id).sort(), ['a', 'b'])
})

test('two phones converge on General for the old default folder when they sync', () => {
  const local = { currentId: 'b1', boards: [{ id: 'b1', title: 'Did I', lamps: [lamp('a')], answers: [] }] }
  const remote = { currentId: 'b1', boards: [{ id: 'b1', title: t('tags.general'), lamps: [lamp('b')], answers: [] }] }
  const merged = mergeShelves(local, remote, '2026-09-20T00:00:00', '2026-09-21T00:00:00')
  assert.equal(merged.boards.length, 1)
  assert.equal(merged.boards[0].title, t('tags.general'))
  assert.deepEqual(merged.boards[0].lamps.map((item) => item.id).sort(), ['a', 'b'])
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

// A new string must be translated in every language in the same change.
// scripts/locale-english.json lists the older ones still in English; it only
// shrinks (npm run locales:report -- --save after translating some).
test('no new strings are left in English in other languages', () => {
  const packs = { fr, de, pt, it, zh, ja, ko }
  for (const [code, pack] of Object.entries(packs)) {
    const allowed = new Set(englishOk[code] || [])
    const fresh = englishLeft(pack, en).filter((key) => !allowed.has(key))
    assert.deepEqual(fresh, [], `${code} has new English text; translate it in src/locales/${code}.js`)
  }
})

test('every locale is written in its own script', () => {
  for (const [code, pack] of Object.entries({ es, fr, de, pt, it, zh, ja, ko })) {
    for (const [key, value] of Object.entries(pack)) {
      const why = wrongScript(code, value, key)
      assert.equal(why, '', `${code} ${key} ${why}: ${String(value).slice(0, 60)}`)
    }
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

test('the widget holds back a question until its ask time, like the stack', async () => {
  const { widgetAskTimes } = await import('../src/lib/widget-config.js')
  const book = {
    id: 't1',
    title: 'Home',
    dayFoldHour: 0,
    lamps: [{ id: 'late', question: 'Late one?', cadence: 'daily', archived: false, createdOn: '2020-01-01', askAfter: '21:00' }],
    answers: [],
  }
  const shelf = writeShelf({ currentId: 't1', boards: [book] })
  const early = buildTonightWidgetProps(shelf, new Date('2026-09-23T19:00:00'))
  assert.equal(early.leadLampId, '')
  assert.equal(early.items.length, 0)
  assert.ok(early.footer.includes('9'), early.footer)
  const times = widgetAskTimes([book], new Date('2026-09-23T19:00:00'))
  assert.deepEqual(times.map((d) => d.getHours()), [21])
  const later = buildTonightWidgetProps(shelf, new Date('2026-09-23T21:00:00'))
  assert.equal(later.leadLampId, 'late')
})

test('the widget says all clear when tonight is done, even with open-only on', async () => {
  const { readPrefs, writePrefs } = await import('../src/lib/prefs.js')
  const before = readPrefs()
  const book = {
    id: 't1',
    title: 'Home',
    dayFoldHour: 0,
    lamps: [{ id: 'a', question: 'A?', cadence: 'daily', archived: false, createdOn: '2020-01-01' }],
    answers: [{ lampId: 'a', periodKey: '2026-09-23', status: 'yes', answeredAt: '2026-09-23T20:00:00' }],
  }
  const shelf = writeShelf({ currentId: 't1', boards: [book] })
  const at = new Date('2026-09-23T21:00:00')
  try {
    for (const openOnly of [false, true]) {
      writePrefs({ ...before, widgetOpenOnly: openOnly })
      const props = buildTonightWidgetProps(shelf, at)
      assert.equal(props.footer, t('widget.tonight.clear'), `openOnly ${openOnly}`)
    }
  } finally {
    writePrefs(before)
  }
})

test('a kept did you stays marked with who sent it, so Questions can show it apart', async () => {
  const { keptLamp } = await import('../src/lib/send-repeat.js')
  const { normalizeLamp } = await import('../src/lib/board-json.js')
  const kept = normalizeLamp(keptLamp({ question: 'Did you call grandma?', person: { display_name: '  Sam  ' } }))
  assert.equal(kept.fromDidYou, true)
  assert.equal(kept.fromName, 'Sam')
  const own = normalizeLamp(keptLamp('Did I stretch?'))
  assert.equal(own.fromDidYou, undefined)
  assert.equal(own.fromName, undefined)
})

test('a one-time question stops asking once its day is behind us', async () => {
  const { closePastNights } = await import('../src/lib/daily.js')
  const lamp = (id, extra) => ({ id, question: `${id}?`, archived: false, createdOn: '2026-09-20', ...extra })
  const book = {
    id: 't1',
    title: 'Home',
    dayFoldHour: 0,
    lamps: [
      lamp('past', { cadence: 'once', onceWhen: 'on', onceOn: '2026-09-22' }),
      lamp('today', { cadence: 'once', onceWhen: 'on', onceOn: '2026-09-23' }),
      lamp('dueGone', { cadence: 'once', onceWhen: 'by', dueBy: '2026-09-22' }),
      lamp('daily', { cadence: 'daily' }),
    ],
    answers: [],
  }
  const next = closePastNights(book, new Date('2026-09-23T20:00:00'))
  const off = Object.fromEntries(next.lamps.map((item) => [item.id, item.archived]))
  assert.deepEqual(off, { past: true, today: false, dueGone: true, daily: false })
})

test('a phone moves to its stable id once and hands back the old key', async () => {
  const { deviceKey, takeOldDeviceKey } = await import('../src/lib/account.js')
  const before = localStorage.getItem('did-i-device')
  try {
    localStorage.setItem('did-i-device', 'random-old-key')
    globalThis.__didIStableDeviceId = 'i-0123456789abcdef'
    assert.equal(deviceKey(), 'i-0123456789abcdef')
    assert.equal(deviceKey(), 'i-0123456789abcdef')
    assert.equal(takeOldDeviceKey(), 'random-old-key')
    assert.equal(takeOldDeviceKey(), '')
  } finally {
    delete globalThis.__didIStableDeviceId
    if (before) localStorage.setItem('did-i-device', before)
    else localStorage.removeItem('did-i-device')
  }
})

test('the dots legend seen flag rides in the synced prefs', async () => {
  const { readPrefs, writePrefs } = await import('../src/lib/prefs.js')
  const before = readPrefs()
  try {
    assert.equal(writePrefs({ jewelKeySeen: true }).jewelKeySeen, true)
    assert.equal(readPrefs().jewelKeySeen, true)
    assert.equal(writePrefs({ jewelKeySeen: 'yes' }).jewelKeySeen, undefined)
  } finally {
    localStorage.setItem('did-i-prefs', JSON.stringify(before))
  }
})

test('the update prompt compares x.y.z and never locks out on a bad row', async () => {
  const { updateState, versionBelow } = await import('../src/lib/app-update.js')
  assert.equal(versionBelow('1.2.0', '1.10.0'), true)
  assert.equal(versionBelow('1.10.0', '1.2.0'), false)
  assert.equal(versionBelow('1.2.0', '1.2.0'), false)
  assert.equal(versionBelow('1.2.0', 'soon'), false)
  assert.equal(updateState('1.1.0', { latest: '1.2.0', minimum: '1.0.0' }), 'offer')
  assert.equal(updateState('1.2.0', { latest: '1.2.0', minimum: '1.0.0' }), '')
  assert.equal(updateState('0.9.0', { latest: '1.2.0', minimum: '1.0.0' }), 'must')
  assert.equal(updateState('1.2.0', null), '')
})

test('tonight orders questions by ask time, untimed ones first, priority breaking ties', async () => {
  const { byAskTime } = await import('../src/lib/board-json.js')
  const row = (id, askAfter, priority) => ({ lamp: { id, askAfter, priority } })
  const order = byAskTime([
    row('nine', '21:00'),
    row('eight', '20:00'),
    row('anyLow', '', 'low'),
    row('anyHigh', '', 'high'),
  ]).map((r) => r.lamp.id)
  assert.deepEqual(order, ['anyHigh', 'anyLow', 'eight', 'nine'])
})

test('a hand-set question order beats priority, survives normalize, and spans folders', async () => {
  const { byAskTime, normalizeLamp, setLampOrder } = await import('../src/lib/board-json.js')
  const row = (id, askAfter, priority, order) => ({ lamp: { id, askAfter, priority, ...(order == null ? {} : { order }) } })
  const order = byAskTime([
    row('high', '', 'high'),
    row('second', '', 'low', 1),
    row('first', '', 'normal', 0),
    row('late', '21:00', 'normal', 0),
  ]).map((r) => r.lamp.id)
  assert.deepEqual(order, ['first', 'second', 'high', 'late'], 'ordered ones first, unmoved after, ask time still wins')
  assert.equal(normalizeLamp({ id: 'a', question: 'Did I?', order: 3 }).order, 3)
  assert.equal('order' in normalizeLamp({ id: 'a', question: 'Did I?' }), false)
  const books = [
    { id: 'b1', lamps: [{ id: 'x' }, { id: 'y' }] },
    { id: 'b2', lamps: [{ id: 'z' }] },
  ]
  const next = setLampOrder(books, ['z', 'x', 'y'])
  assert.deepEqual(next.flatMap((book) => book.lamps.map((lamp) => [lamp.id, lamp.order])), [['x', 1], ['y', 2], ['z', 0]])
  assert.equal(setLampOrder(next, ['z', 'x', 'y'])[0], next[0], 'an unchanged folder keeps its object')
})

test('every accessory the shop shows is sold by the server at the same price', async () => {
  const { ACCESSORIES } = await import('../src/lib/accessories.js')
  const sql = readFileSync(new URL('../supabase/shop-catalog.sql', import.meta.url), 'utf8')
  const rows = new Map([...sql.matchAll(/\('accessory', '(\w+)', (\d+)[,)]/g)].map((m) => [m[1], Number(m[2])]))
  for (const item of ACCESSORIES) assert.equal(rows.get(item.id), item.coins, item.id)
  assert.equal(rows.size, ACCESSORIES.length)
})

test('an accessory costs coins once, goes on, and comes off with a second tap', async () => {
  const { buyAccessory, wearAccessory, normalizePurse } = await import('../src/lib/purse.js')
  const book = { coins: 20, accessories: [], worn: {} }
  assert.equal(buyAccessory(book, 'crown').miss, 'shop.miss.needCoins')
  const bought = buyAccessory(book, 'beanie').book
  assert.equal(bought.coins, 5)
  assert.deepEqual(normalizePurse(bought).worn, { head: 'beanie' })
  assert.equal(buyAccessory(bought, 'beanie').book.coins, 5, 'owning it again is free')
  assert.deepEqual(normalizePurse(wearAccessory(bought, 'beanie').book).worn, {})
  assert.deepEqual(normalizePurse({ worn: { head: 'beanie' } }).worn, {}, 'only owned items are worn')
})

test('a night pays 2 a Did on up to 3 questions', async () => {
  const { putAnswer } = await import('../src/lib/board-ops.js')
  const { dueTonight } = await import('../src/lib/recurrence.js')
  const clock = new Date('2026-09-23T21:00:00')
  const lamps = ['a', 'b', 'c', 'd'].map((id) => ({ id, question: id + '?', cadence: 'daily', archived: false, createdOn: '2020-01-01' }))
  let book = { id: 't1', title: 'Home', dayFoldHour: 0, lamps, answers: [], coins: 0 }
  for (const id of ['a', 'b', 'c', 'd']) {
    const row = dueTonight(book, clock).find((r) => r.lamp.id === id)
    book = putAnswer(book, row, 'yes', clock)
  }
  assert.equal(book.coins, 6)
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
  assert.equal(inviteClip('abcde12345'), 'https://did-i.app/i/ABCDE12345', 'the page copies a web link iOS can detect')
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
  assert.ok(empty.includes('No questions yet'))
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
  assert.ok(tap.includes('buddySvgFor(props.buddyId, props.buddyWorn'), 'the saved card carries the buddy markup, dressed')
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
    emptyLabel: 'No questions yet',
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

test('friends add you by friend ID, and the app never asks for a phone number', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const read = (file) => readFileSync(path.join(root, file), 'utf8')
  const ids = read('supabase/friend-ids.sql')
  assert.ok(ids.includes('drop trigger if exists need_phone_to_ask'), 'a request no longer needs a number')
  assert.ok(ids.includes('drop column if exists phone'), 'saved numbers are deleted')
  assert.ok(ids.includes('friend_id_misses'), 'wrong IDs are capped')
  for (const file of ['native/screens/social.jsx', 'src/lib/PeopleConnect.jsx', 'native/screens/more.jsx', 'src/lib/Account.jsx']) {
    const src = read(file)
    assert.ok(!/savePhone|askFriend\(|phone-pad|inputMode="tel"/.test(src), `${file} has no phone number field`)
  }
  for (const file of ['native/screens/social.jsx', 'src/lib/PeopleConnect.jsx']) {
    assert.ok(read(file).includes('askByFriendId('), `${file} adds by friend ID`)
  }
  assert.ok(/friend ID/.test(en['legal.privacy.account.body']))
  assert.ok(!/phone number/.test(en['legal.privacy.account.body'] + en['legal.privacy.social.body'] + en['legal.terms.account.body']))
  assert.ok(/Friend IDs/.test(en['legal.privacy.social.body']))
  assert.ok(/ID de amigo/.test(es['legal.privacy.social.body']))
})

test('the last cloud save reads as a local time, not a raw timestamp', () => {
  const saved = new Date(2026, 8, 24, 22, 8)
  const words = stampWhen(saved.toISOString(), new Date(2026, 8, 24, 23, 0))
  assert.ok(words.includes('10:08 PM'), words)
  assert.ok(!/\d{4}-\d{2}-\d{2}T/.test(words), words)
  assert.equal(stampWhen('not a date'), '')
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const more = readFileSync(path.join(root, 'native/screens/more.jsx'), 'utf8')
  assert.ok(more.includes('t(line.key, { time: stampWhen(line.at) })'))
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
  assert.equal(swipeStub.includes('Pressable'), false, 'the face fallback has no answer buttons')
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

// Signed in, the server owns coins. A did must still reach credit_night_coins:
// for a while it never did, and no account earned night coins.
test('a signed-in did leaves its coins for the server, signed out pays the phone', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const url = (file) => pathToFileURL(path.join(root, file)).href
  // cloudSetUp reads its keys when cloud.js loads, so the signed-in side runs
  // in its own process with test keys.
  const script = `
    const store = new Map([['did-i-last-user', 'user-a']])
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
    globalThis.window = { dispatchEvent() {} }
    const { putAnswer } = await import(${JSON.stringify(url('src/lib/board-ops.js'))})
    const { takeEarnedCoins } = await import(${JSON.stringify(url('src/lib/purse.js'))})
    const book = { id: 'b', lamps: [{ id: 'a', question: 'a', cadence: 'daily', archived: false, createdOn: '2024-01-01' }], answers: [], coins: 0 }
    const row = { lamp: book.lamps[0], periodKey: '2026-10-02' }
    const next = putAnswer(book, row, 'yes', new Date(2026, 9, 2, 20))
    const again = putAnswer(next, row, 'yes', new Date(2026, 9, 2, 20))
    console.log(JSON.stringify({ local: again.coins, server: takeEarnedCoins(), after: takeEarnedCoins() }))
  `
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test' },
  })
  assert.equal(run.status, 0, run.stderr)
  // Paid once (the same night again is not paid twice), nothing on the phone.
  assert.deepEqual(JSON.parse(run.stdout.trim().split('\n').pop()), { local: 0, server: 2, after: 0 })
  // The save hands what taps earned to the server.
  const shelfHook = readFileSync(path.join(root, 'native/hooks/useAppShelf.js'), 'utf8')
  assert.match(shelfHook, /takeEarnedCoins\(\)/)
  assert.match(shelfHook, /creditNightCoins\(boardDate\(now, fold\), earned\)/)

  // Signed out (this process has no cloud keys), the phone keeps the coins.
  const book = { id: 'b', lamps: [lamp('a')], answers: [], coins: 0 }
  const paid = putAnswer(book, { lamp: book.lamps[0], periodKey: '2026-10-02' }, 'yes', new Date(2026, 9, 2, 20))
  assert.equal(paid.coins, 2)
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

test('a fresh phone opens the first night, a lost session shows sign-in', () => {
  const prev = globalThis.__didIPlatform
  globalThis.__didIPlatform = 'ios'
  clearAuthSkip()
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const shell = readFileSync(path.join(root, 'native/AppShell.jsx'), 'utf8')
  const sign = readFileSync(path.join(root, 'native/screens/SignInScreen.jsx'), 'utf8')
  const actions = readFileSync(path.join(root, 'native/components/AuthSignInActions.jsx'), 'utf8')
  try {
    writeAccountUserId('')
    assert.equal(needsAuth({ ready: false, user: null }), false, 'no sign-in wall before the first night')
    writeAccountUserId('user-a')
    assert.equal(needsAuth({ ready: false, user: null }), false, 'a signed-in phone does not flash sign-in while the session loads')
    assert.equal(needsAuth({ ready: true, user: null }), true, 'no session after the check still gates')
    assert.equal(authGated('/tonight', { ready: true, user: null }), true)
    writeAccountUserId('')
    assert.equal(needsAuth({ ready: true, user: null }), false)
    assert.equal(needsAuth({ ready: true, user: { id: 'u' } }), false)
    assert.equal(authGated('/tonight', { ready: false, user: null }), false)
    assert.equal(authGated('/privacy', { ready: false, user: null }), false)
    assert.ok(shell.includes('<SignInScreen'), 'the gate renders the sign-in screen')
    assert.ok(sign.includes("t('auth.title')"), 'the sign-in screen has a title')
    assert.ok(sign.includes("t('account.email')"), 'the sign-in screen has an email field')
    assert.ok(sign.includes('<AuthSignInActions'), 'the sign-in screen has the sign-in actions')
    assert.ok(actions.includes("t('account.signIn')"), 'a code can be confirmed')
    assert.ok(sign.includes("t('auth.tryLocal')"), 'the sign-in screen can stay on this phone')
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

test('first run picks 2 or 3, adds them with one time, face is the first', () => {
  const starters = starterList()
  let picks = []
  for (const item of starters.slice(0, FIRST_PICKS_MAX + 1)) picks = togglePick(picks, item)
  assert.equal(picks.length, FIRST_PICKS_MAX, 'the cap holds')
  picks = togglePick(picks, starters[0])
  assert.equal(picks.length, FIRST_PICKS_MAX - 1, 'a second tap takes it off')
  assert.equal(pickPack(PACKS[0]).length, Math.min(3, PACKS[0].items.length))
  const book = { ...emptyBoard('first-run'), lamps: [], answers: [] }
  const made = firstRunBook(book, picks, { question: 'Did I water the fern?', short: 'Fern' }, '21:00', new Date(2026, 9, 5, 15))
  const live = made.book.lamps.filter((lamp) => !lamp.archived)
  assert.equal(live.length, picks.length + 1)
  assert.ok(live.every((lamp) => lamp.askAfter === '21:00'), 'every question gets the reminder time')
  assert.equal(made.faceId, live.find((lamp) => lamp.question === picks[0].question).id)
  assert.equal(firstRunBook(book, [], null, '21:00').faceId, '')
})

test('coaching stays for 3 nights, night one is the first cleared night', () => {
  const ans = (periodKey) => ({ periodKey, status: 'yes' })
  assert.equal(isNewShelf([]), true)
  assert.equal(isNewShelf([{ answers: [ans('2026-10-01'), ans('2026-10-01'), ans('2026-10-02')] }]), true)
  assert.equal(isNewShelf([{ answers: [ans('2026-10-01')] }, { answers: [ans('2026-10-02'), ans('2026-10-03')] }]), false)
  assert.equal(answeredNights([{ answers: [ans('2026-10'), ans('once:x')] }]), 0, 'monthly and once keys are not nights')
  assert.equal(isNightOne([{ answers: [ans('2026-10-05')] }], '2026-10-05'), true)
  assert.equal(isNightOne([{ answers: [ans('2026-10-04')] }, { answers: [ans('2026-10-05')] }], '2026-10-05'), false)
  assert.equal(isNightOne([{ answers: [] }], '2026-10-05'), false)
  assert.equal(isNightOne([{ answers: [ans('2026-10-05')] }], ''), false)
})

test('night one and the sign-in card show once', () => {
  localStorage.removeItem('did-i-night-one')
  localStorage.removeItem('did-i-sign-in-nudge')
  assert.equal(nightOneSeen(), false)
  markNightOneSeen()
  assert.equal(nightOneSeen(), true)
  const base = { signedIn: false, cloud: true, nightDone: true, dismissed: signInNudgeSeen() }
  assert.equal(showSignInNudge(base), true)
  assert.equal(showSignInNudge({ ...base, signedIn: true }), false)
  assert.equal(showSignInNudge({ ...base, nightDone: false }), false)
  assert.equal(showSignInNudge({ ...base, cloud: false }), false)
  markSignInNudgeSeen()
  assert.equal(showSignInNudge({ ...base, dismissed: signInNudgeSeen() }), false)
  localStorage.removeItem('did-i-night-one')
  localStorage.removeItem('did-i-sign-in-nudge')
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
const mastMenuItems = await import('../native/components/mast-menu-items.js')

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

test("the menu's Friends and family badge always totals what its label says", () => {
  const { menuItems } = mastMenuItems
  nav.goHash('/tonight')
  for (const [inbox, asks, signedIn] of [
    [0, 0, true],
    [0, 0, false],
    [3, 0, true],
    [0, 2, true],
    [0, 2, false],
    [4, 5, true],
    [9, 9, false],
  ]) {
    const people = menuItems(true, inbox, asks, signedIn).find((item) => item.key === 'people')
    const expected = signedIn ? inbox + asks : asks
    assert.equal(people.count, expected, `count for inbox=${inbox} asks=${asks} signedIn=${signedIn}`)
    // The words stay short; the badge shows the number and screen readers say both.
    assert.equal(people.label, 'Friends and family', 'the visible label never carries the count')
    if (expected > 0) {
      assert.equal(people.a11y, `Friends and family, ${expected} waiting`, 'spoken label carries the same total as the badge')
    } else {
      assert.equal(people.a11y, '', 'no waiting total when there is nothing to show')
    }
  }
})

test('the swipe card exposes Did and Nope as accessibility actions, and its label carries the visible text', () => {
  assert.equal(
    swipeCardAccessibilityLabel('DID I', 'Did I lock the back door?', 'Due tonight'),
    'DID I, Did I lock the back door?, Due tonight',
  )
  assert.equal(swipeCardAccessibilityLabel('', 'Did I lock the back door?', ''), 'Did I lock the back door?', 'blank kicker/meta are dropped, not left as empty commas')

  const actions = swipeCardAccessibilityActions('Did', 'Nope')
  assert.deepEqual(actions, [
    { name: 'did', label: 'Did' },
    { name: 'nope', label: 'Nope' },
  ])

  let did = 0
  let nope = 0
  const handlers = { onDid: () => did++, onNope: () => nope++ }
  handleSwipeCardAccessibilityAction('did', { blockDid: false, blockNope: false, ...handlers })
  assert.equal(did, 1, 'the did action fires onDid')
  handleSwipeCardAccessibilityAction('nope', { blockDid: false, blockNope: false, ...handlers })
  assert.equal(nope, 1, 'the nope action fires onNope')
  handleSwipeCardAccessibilityAction('did', { blockDid: true, blockNope: false, ...handlers })
  assert.equal(did, 1, 'a blocked did does not fire again')
  handleSwipeCardAccessibilityAction('nope', { blockDid: false, blockNope: true, ...handlers })
  assert.equal(nope, 1, 'a blocked nope does not fire again')
})

test('goHash pushes, pops back to a screen it has, and switches the hall tab', () => {
  const stack = fakeStack()
  nav.goHash('/settings')
  nav.goHash('/shop')
  assert.deepEqual(stack.types(), ['PUSH', 'PUSH'])
  nav.goHash('/lamp', { id: 'a' })
  nav.goHash('/lamp', { id: 'b' })
  assert.equal(stack.depth(), 5, 'the same screen for another question is its own push')
  nav.goHash('/lamp', { id: 'b' })
  assert.equal(stack.depth(), 5, 'going to the screen you are on does nothing')
  nav.goHash('/settings')
  assert.equal(stack.top(), '/settings', 'a screen further back opens fresh, so back retraces your path')
  assert.equal(stack.depth(), 6)
  assert.equal(stack.types().at(-1), 'PUSH')
  nav.goHash('/lamps')
  assert.equal(stack.depth(), 1, 'a tab pops everything pushed over the hall')
  assert.equal(stack.top(), '/lamps')
  assert.deepEqual(stack.types().slice(-2), ['POP_TO_TOP', 'NAVIGATE'])
  assert.equal(nav.readRoute().path, '/lamps')
})

test('a done form going back to the screen behind it pops, so back never lands on the form again', () => {
  const stack = fakeStack()
  nav.goHash('/lamp', { id: 'a' })
  nav.goHash('/hang', { id: 'a' })
  assert.equal(stack.depth(), 3)
  nav.swapHash('/lamp', { id: 'a' })
  assert.equal(stack.depth(), 2, 'saving an edit goes back to the question, not a second copy of it')
  assert.equal(stack.top(), '/lamp')
  assert.equal(stack.types().at(-1), 'POP')
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
  const mark = readFileSync(path.join(root, 'native/components/ToastHost.jsx'), 'utf8')
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

test('a rolling number rolls each digit forward going up and back going down', () => {
  assert.deepEqual(rollColumns(9, 10), [{ from: ' ', to: '1' }, { from: '9', to: '0' }])
  assert.deepEqual(rollColumns(10, 9), [{ from: '1', to: ' ' }, { from: '0', to: '9' }])
  // 9 to 0 going up wraps forward to the second 0, then settles on the first.
  assert.deepEqual(rollStops('9', '0', true), { from: 10, to: 1, wide: 12 })
  // 0 to 9 going down starts on the second 0 and rolls back.
  assert.deepEqual(rollStops('0', '9', false), { from: 12, to: 10, wide: 10 })
  assert.deepEqual(rollStops('3', '4', true), { from: 4, to: 5, wide: 5 })
  assert.deepEqual(rollStops('5', '5', true), { from: 6, to: 6, wide: 6 })
})

test('the cheer bursts from the card that was answered, once', () => {
  aimCheer(120, 400)
  assert.deepEqual(takeCheerAim(), { x: 120, y: 400 })
  assert.equal(takeCheerAim(), null, 'a spot is used once')
  aimCheer(1, 2)
  assert.equal(takeCheerAim(Date.now() + 5000), null, 'a stale spot is dropped')
  assert.deepEqual(streakParts(7), { before: '', after: ' nights in a row' })
  assert.equal(streakParts(1), null)
})

test('undo, marks and errors wait their turn in one toast line', () => {
  const ids = () => toastQueue().map((item) => item.id)
  showToast({ id: 'mark:a', kind: 'mark' })
  showToast({ id: 'sync-miss', kind: 'error' })
  assert.deepEqual(ids(), ['mark:a', 'sync-miss'], 'first come, first shown')
  showToast({ id: 'undo:tonight', kind: 'undo', rev: 1 })
  assert.deepEqual(ids(), ['mark:a', 'undo:tonight', 'sync-miss'], 'an undo is next in line')
  showToast({ id: 'undo:questions', kind: 'undo', rev: 2 })
  assert.deepEqual(ids(), ['mark:a', 'undo:questions', 'sync-miss'], 'a newer undo replaces the older')
  showToast({ id: 'undo:questions', kind: 'undo', rev: 3 })
  assert.equal(toastQueue()[1].rev, 3, 'the same toast updates in place')
  dropToast('mark:a')
  dropToast('undo:questions')
  dropToast('sync-miss')
  assert.deepEqual(ids(), [])
  showToast({ id: 'mark:b', kind: 'mark' })
  showToast({ id: 'undo:tonight', kind: 'undo' })
  assert.deepEqual(ids(), ['mark:b', 'undo:tonight'])
  dropToast('mark:b')
  showToast({ id: 'undo:questions', kind: 'undo' })
  assert.deepEqual(ids(), ['undo:questions'], 'an undo on screen is replaced on screen')
  dropToast('undo:questions')
})

test('a quiet night sky drifts a handful of frames per second', () => {
  assert.ok(SKY_FPS <= 8, 'a handful of frames per second')
  assert.ok(Math.abs(moonPhase(new Date(Date.UTC(2000, 0, 6, 18, 14)))) < 1e-9, 'a known new moon')
  const full = moonPhase(new Date(Date.UTC(2000, 0, 21, 4, 40)))
  assert.ok(Math.abs(full - 0.5) < 0.02, 'a known full moon')
  assert.ok(moonPath(0.25, 20).startsWith('M 20 0 A 20 20 0 0 1 20 40'), 'a waxing moon is lit on the right')
  const star = starAt(STARS[0], 0, 1000, 300)
  assert.ok(star.x >= 0 && star.x < 300 && star.opacity > 0 && star.opacity <= 1, 'a star wraps inside the sky')
  const moon = moonAt(0, 300, 40)
  assert.ok(moon.x >= 0 && moon.x + 40 <= 300, 'the moon starts in full view')
  const later = moonAt(100000, 300, 40)
  assert.ok(later.x >= -40 && later.x <= 300, 'and wraps inside the sky')
})

test('the collection badge counts what the shop has sold', () => {
  assert.equal(kitCount({ looks: ['a', 'b'], cheers: ['c'], buddies: [] }), 3)
  assert.equal(kitCount(null), 0)
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
  expo: { requireOptionalNativeModule: () => null },
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
  assert.deepEqual(RISE_SPRING, { stiffness: 170, damping: 15, mass: 1 }, 'the captain picked variant A')
  assert.ok(depthLook(-0.1).scale > 1 && depthLook(-0.1).translateY === 0, 'a spring passing its place grows a hair, never lifts')
})

test('haptics speak one language on Tonight and do not switch off with Reduce Motion', () => {
  writePrefs({ lessMotion: true })
  felt.length = 0
  phone.feelTap('did')
  phone.feelTap('skip')
  phone.feelTap('undo')
  phone.feelTap('tick')
  phone.feelTap('edge')
  phone.playClick()
  assert.deepEqual(felt, ['notify:success', 'impact:soft', 'impact:rigid', 'selection', 'selection', 'selection'])
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

await testAsync('adding a new daily question does not cut the streak', async () => {
  const { shelfStreak: streakOf } = await import('../src/lib/hall-feel.js')
  const now = new Date('2026-10-05T21:13:00')
  const yes = (lampId, periodKey) => ({ lampId, periodKey, status: 'yes', answeredAt: `${periodKey}T21:00:00` })
  const book = {
    id: 'b',
    dayFoldHour: 0,
    lamps: [lamp('c', { createdOn: '2026-10-04' }), lamp('p', { createdOn: '2026-10-05' })],
    answers: [yes('c', '2026-10-04'), yes('c', '2026-10-05'), yes('p', '2026-10-05')],
  }
  assert.equal(streakOf([book], now), 2)
})

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

await testAsync('the widget shows the open Did we once your own questions are done', async () => {
  const { setWeNightRows, clearWeNights } = await import('../src/lib/we-nights.js')
  const { saveWeOpen } = await import('../src/lib/we-widget.js')
  const clock = new Date(2026, 9, 3, 21, 0)
  const night = boardDate(clock)
  const book = {
    id: 'b1',
    title: 'General',
    dayFoldHour: 0,
    lamps: [{ id: 'door', question: 'Did I lock the door?', cadence: 'daily', archived: false, createdOn: '2026-01-01' }],
    answers: [{ lampId: 'door', periodKey: night, status: 'yes', answeredAt: `${night}T20:00:00` }],
  }
  try {
    saveWeOpen([{ id: 'c1', question: 'Did we do black mage' }], night)
    setWeNightRows([{ card: 'c1', folder: '', night, status: '' }])
    const props = buildTonightWidgetProps({ currentId: 'b1', boards: [book] }, clock)
    assert.equal(props.question, 'Did we do black mage')
    assert.equal(props.tagTitle, en['we.title'])
    assert.equal(props.left, 1)
    assert.equal(props.items[0].lampId, 'we:c1', 'the Did we has a card, so the widgets show it')
    assert.equal(props.leadLampId, 'we:c1')
    assert.equal(props.items[0].status, 'open')
    const { weNight } = await import('../src/lib/we-nights.js')
    const morning = new Date(2026, 9, 4, 10, 0)
    assert.equal(applyWidgetTapOnce('we:c1', 'did', night, morning, morning.getTime()), null, 'a tap on the Did we card after its night ended is dropped')
    assert.equal(weNight(night).done, 0)
    applyWidgetTapOnce('we:c1', 'nope', '', clock)
    assert.equal(weNight(night).done, 0, 'a nope from the widget leaves it open')
    assert.equal(buildTonightWidgetProps({ currentId: 'b1', boards: [book] }, clock).items[0].status, 'skip')
    applyWidgetTapOnce('we:c1', 'did', '', clock)
    assert.equal(weNight(night).done, 1, 'did on the widget answers the Did we')
    setWeNightRows([{ card: 'c1', folder: '', night, status: '' }])
    const noped = { ...book, lamps: [...book.lamps, { id: 'gym', question: 'Did I go to the gym?', cadence: 'daily', archived: false, createdOn: '2026-01-01' }], answers: [...book.answers, { lampId: 'gym', periodKey: night, status: 'skip', answeredAt: `${night}T20:30:00` }] }
    assert.equal(buildTonightWidgetProps({ currentId: 'b1', boards: [noped] }, clock).question, 'Did we do black mage', 'an open Did we comes before a nope')
    setWeNightRows([{ card: 'c1', folder: '', night, status: 'did' }])
    const after = buildTonightWidgetProps({ currentId: 'b1', boards: [book] }, clock)
    assert.notEqual(after.question, 'Did we do black mage', 'gone once you said did')
    assert.equal(after.left, 0)
  } finally {
    clearWeNights()
    saveWeOpen([], night)
  }
})

await testAsync('the grace period for the previous night runs until 9am', async () => {
  const { graceNightIso, graceFirst, answerFor } = await import('../src/lib/recurrence.js')
  const { graceRowsFor } = await import('../src/lib/grace.js')
  const { lastBrokenNight } = await import('../src/lib/hall-feel.js')
  const { setWeNightRows, clearWeNights } = await import('../src/lib/we-nights.js')
  // Friday Oct 2 is the night; Saturday morning is its grace period.
  const fri = '2026-10-02'
  const at = (h, m = 0) => new Date(2026, 9, 3, h, m)
  assert.equal(graceNightIso(at(2)), fri)
  assert.equal(graceNightIso(at(8, 59)), fri)
  assert.equal(graceNightIso(at(9)), '', 'closes at 9am')
  assert.equal(graceNightIso(new Date(2026, 9, 2, 23, 0)), '', 'no grace before midnight')
  assert.equal(graceFirst(at(4, 59)), true, 'first until 5am')
  assert.equal(graceFirst(at(5)), false, 'behind today from 5am')

  const nights = ['2026-09-29', '2026-09-30', '2026-10-01']
  const book = {
    id: 'b1',
    title: 'Games',
    dayFoldHour: 0,
    lamps: [
      { id: 'daily', question: 'Did I do my dailies?', cadence: 'daily', archived: false, createdOn: '2026-09-01' },
      { id: 'once', question: 'Did I book the trip?', cadence: 'once', onceOn: fri, archived: false, createdOn: '2026-09-20' },
    ],
    answers: nights.map((n) => ({ lampId: 'daily', periodKey: n, status: 'yes', answeredAt: `${n}T21:00:00` })),
  }

  // 2am Saturday: Friday's dailies are still open, not closed as nope.
  const at2 = closePastNights(book, at(2))
  assert.equal(answerFor(at2, 'daily', fri), undefined, 'not closed during the grace period')
  assert.equal(at2.lamps.find((l) => l.id === 'once').archived, false, 'a one-time question stays until 9am')
  assert.deepEqual(graceRowsFor([at2], fri).map((r) => r.lamp.id).sort(), ['daily', 'once'])
  assert.equal(shelfStreak([at2], at(2)), 3, 'last night open in its grace period is not a break')
  assert.equal(lastBrokenNight([at2], at(2)), null, 'no streak-ended message before 9am')

  // A did at 2am lands on Friday as a did, and keeps the streak.
  const row = graceRowsFor([at2], fri).find((r) => r.lamp.id === 'daily')
  const onceRow = graceRowsFor([at2], fri).find((r) => r.lamp.id === 'once')
  const did = putAnswer(putAnswer(at2, row, 'yes', at(2)), onceRow, 'yes', at(2))
  assert.equal(answerFor(did, 'daily', fri)?.status, 'yes', 'a did after midnight is a did, not late')
  assert.equal(shelfStreak([did], at(2)), 4)

  // A nope in the grace period can still become a did (late) before 9am.
  const noped = putAnswer(at2, row, 'skip', at(3))
  assert.equal(graceRowsFor([noped], fri).some((r) => r.lamp.id === 'daily'), true, 'a nope stays open')
  const turned = putAnswer(noped, { ...row, answer: answerFor(noped, 'daily', fri) }, 'late', at(4))
  assert.equal(answerFor(turned, 'daily', fri)?.status, 'late')

  // 9am: still open is closed as nope, and now it is a break.
  const at9 = closePastNights(book, at(9, 1))
  assert.equal(answerFor(at9, 'daily', fri)?.status, 'skip', 'closed at 9am')
  assert.equal(at9.lamps.find((l) => l.id === 'once').archived, true)
  assert.equal(putAnswer(at9, { ...row, answer: answerFor(at9, 'daily', fri) }, 'yes', at(9, 5)), at9, 'too late after 9am')

  // A Did we from last night is in the same grace period.
  try {
    setWeNightRows([{ card: 'c1', folder: '', night: fri, status: '' }])
    assert.equal(shelfStreak([did], at(2)), 3, 'an open Did we from last night is not a break before 9am (and not counted yet)')
  } finally {
    clearWeNights()
  }
})

await testAsync('a Did we due for you counts in your streak and tonight bar by your own swipe', async () => {
  const { setWeNightRows, clearWeNights } = await import('../src/lib/we-nights.js')
  const clock = new Date(2026, 8, 28, 21, 0)
  const night = (back) => {
    const day = new Date(clock)
    day.setDate(day.getDate() - back)
    return boardDate(day)
  }
  // Your own question, did on each of the last four nights (tonight included).
  const book = {
    id: 'b1',
    dayFoldHour: 0,
    lamps: [{ id: 'door', question: 'Did I lock the door?', cadence: 'daily', archived: false, createdOn: '2026-01-01' }],
    answers: [0, 1, 2, 3].map((back) => ({ lampId: 'door', periodKey: night(back), status: 'yes', answeredAt: `${night(back)}T21:00:00` })),
  }
  const we = (back, status) => ({ card: 'c1', folder: '', night: night(back), status })
  try {
    setWeNightRows([we(0, 'did'), we(1, 'did'), we(2, 'did')])
    assert.equal(shelfStreak([book], clock), 4, 'your did on the Did we keeps the nights clear')
    setWeNightRows([we(0, 'did'), we(1, 'nope'), we(2, 'did')])
    assert.equal(shelfStreak([book], clock), 1, 'a nope on a Did we breaks the streak like your own nope')
    setWeNightRows([we(0, 'did'), we(1, ''), we(2, 'did')])
    assert.equal(shelfStreak([book], clock), 1, 'an unanswered Did we breaks it too')
    setWeNightRows([we(0, ''), we(1, 'did')])
    assert.equal(shelfStreak([book], clock), 3, 'an open Did we tonight is not a break yet; the nights before still count')
    // A nope tonight can still become late before the night turns, so it is not a break yet.
    setWeNightRows([we(0, 'nope'), we(1, 'did')])
    assert.equal(shelfStreak([book], clock), 3, 'a nope on the Did we tonight does not end the streak until the night is over')
    const nopeTonight = { ...book, answers: book.answers.map((a) => (a.periodKey === night(0) ? { ...a, status: 'skip' } : a)) }
    setWeNightRows([])
    assert.equal(shelfStreak([nopeTonight], clock), 3, 'the same for a nope on your own question tonight')
    // A night with only a Did we due counts once you said did.
    const gap = { ...book, answers: book.answers.filter((a) => a.periodKey !== night(1)), lamps: [{ ...book.lamps[0], cadence: 'weekly', weekdays: [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== new Date(night(1) + 'T12:00').getDay()) }] }
    setWeNightRows([we(1, 'did')])
    assert.equal(shelfStreak([gap], clock), 4, 'a Did we-only night counts as a streak night')
    // Tonight's bar: one of your own plus one Did we.
    const due = [{ lamp: book.lamps[0], dateIso: night(0), periodKey: night(0), answer: { status: 'yes' } }]
    assert.deepEqual(nightProgress(due, { due: 1, done: 0 }), { total: 2, answered: 1, ratio: 0.5 })
    assert.deepEqual(nightProgress(due, { due: 1, done: 1 }), { total: 2, answered: 2, ratio: 1 })
  } finally {
    clearWeNights()
  }
})

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
  assert.equal(shelfStreak([tonightOpen], clock), 7, 'tonight counts only once it is clear, and open is not a break')
  const lastNightOpen = { ...book, answers: book.answers.filter((a) => a.periodKey !== nights[1]) }
  assert.equal(shelfStreak([lastNightOpen], clock), 1, 'a missed night before tonight is a break')
})

test('"Streak broke" shows only for a missed past night, never for tonight reopening', async () => {
  const { markStreakSeen, maybeStreakMiss } = await import('../src/lib/streak-moments.js')
  localStorage.removeItem('did-i-streak-seen')
  const clock = new Date(2026, 8, 30, 16, 0)
  const lamp = (id, createdOn = '2026-09-27') => ({ id, question: `Did I ${id}?`, cadence: 'daily', archived: false, createdOn })
  const yes = (id, night) => ({ lampId: id, periodKey: night, status: 'yes', answeredAt: `${night}T15:00:00` })
  const nights = ['2026-09-28', '2026-09-29', '2026-09-30']
  const done = { id: 'b1', dayFoldHour: 0, lamps: [lamp('a'), lamp('b')], answers: nights.flatMap((n) => [yes('a', n), yes('b', n)]) }
  assert.equal(maybeStreakMiss([done], clock), null, 'all done')
  const added = { ...done, lamps: [...done.lamps, lamp('c', '2026-09-30')] }
  assert.equal(maybeStreakMiss([added], clock), null, 'a new question after finishing is not a break')
  const undone = { ...done, answers: done.answers.slice(0, -1) }
  assert.equal(maybeStreakMiss([undone], clock), null, 'undoing tonight is not a break')
  const missed = { ...done, answers: done.answers.filter((a) => a.periodKey !== '2026-09-29') }
  const miss = maybeStreakMiss([missed], clock)
  assert.deepEqual(miss, { kind: 'miss', was: 1, dateIso: '2026-09-29' }, 'a missed night after a streak is a break')
  markStreakSeen('miss', miss.dateIso)
  assert.equal(maybeStreakMiss([missed], clock), null, 'told once per missed night')
  localStorage.removeItem('did-i-streak-seen')
})

test('the 9 PM warning fires while tonight is open on a live streak, and friends see the real streak', async () => {
  const { streakRiskFire } = await import('../src/lib/streak-risk.js')
  const clock = new Date(2026, 8, 30, 16, 0)
  const lamp = (id) => ({ id, question: `Did I ${id}?`, cadence: 'daily', archived: false, createdOn: '2026-09-20' })
  const yes = (id, night) => ({ lampId: id, periodKey: night, status: 'yes', answeredAt: `${night}T15:00:00` })
  const past = ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29']
  const open = { id: 'b1', dayFoldHour: 0, lamps: [lamp('a')], answers: past.map((n) => yes('a', n)) }
  const fire = streakRiskFire(open, clock)
  assert.ok(fire, 'a streak with tonight open gets the warning')
  assert.equal(new Date(fire.at).getHours(), 21)
  const finished = { ...open, answers: [...open.answers, yes('a', '2026-09-30')] }
  assert.equal(streakRiskFire(finished, clock), null, 'no warning once tonight is done')
  assert.equal(shelfStreak([open], clock), 6, 'friends see 6 while tonight is open, not 0 and not capped at 5')
  assert.equal(shelfStreak([finished], clock), 7)
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
  assert.deepEqual(tomorrowPreview([{ ...book, lamps: [book.lamps[2]] }], clock), { count: 0, from: '', next: '2026-09-30' }, 'nothing tomorrow names the next night something is due')
})

// Just enough of React to drive one hook here: state, refs, memos and
// effects, rendered again until nothing changes.
function hookHost(useHook, propsFor) {
  const slots = []
  let at = 0
  let dirty = false
  let out = null
  const same = (a, b) => Boolean(a && b) && a.length === b.length && a.every((item, i) => Object.is(item, b[i]))
  const fake = {
    useState(init) {
      const k = at++
      if (!(k in slots)) slots[k] = typeof init === 'function' ? init() : init
      return [
        slots[k],
        (next) => {
          const value = typeof next === 'function' ? next(slots[k]) : next
          if (!Object.is(value, slots[k])) {
            slots[k] = value
            dirty = true
          }
        },
      ]
    },
    useRef(init) {
      const k = at++
      if (!(k in slots)) slots[k] = { current: init }
      return slots[k]
    },
    useMemo(make, deps) {
      const k = at++
      if (slots[k] && same(slots[k].deps, deps)) return slots[k].value
      slots[k] = { deps, value: make() }
      return slots[k].value
    },
    useCallback(fn, deps) {
      return fake.useMemo(() => fn, deps)
    },
    useEffect(run, deps) {
      const k = at++
      const prev = slots[k]
      if (prev && same(prev.deps, deps)) return
      slots[k] = { deps, cleanup: prev?.cleanup }
      pending.push(() => {
        prev?.cleanup?.()
        slots[k].cleanup = run()
      })
    },
  }
  let pending = []
  function render() {
    for (let pass = 0; pass < 50; pass += 1) {
      at = 0
      dirty = false
      pending = []
      out = useHook(propsFor())
      for (const run of pending) run()
      if (!dirty) return out
    }
    throw new Error('the hook never settled')
  }
  return { fake, render, get current() { return out } }
}

registerHooks({
  resolve: (specifier, context, next) =>
    specifier === 'react' && context.parentURL?.includes('/src/lib/useTonightStack.js')
      ? { url: 'hook-host:react', shortCircuit: true }
      : next(specifier, context),
  load: (url, context, next) =>
    url === 'hook-host:react'
      ? {
          format: 'module',
          source: ['useState', 'useRef', 'useMemo', 'useCallback', 'useEffect']
            .map((name) => `export const ${name} = (...args) => globalThis.__didIHookHost.fake.${name}(...args)`)
            .join('\n'),
          shortCircuit: true,
        }
      : next(url, context),
})

await testAsync('a nope leaves a still-open list, each question with Did it now and Leave it', async () => {
  const clock = new Date(2026, 8, 28, 21, 0)
  const lamp = (id) => ({ id, question: `Did I ${id}?`, cadence: 'daily', archived: false, createdOn: '2026-01-01' })
  let book = { id: 'b1', title: 'House', dayFoldHour: 0, lamps: [lamp('pills'), lamp('door'), lamp('bins')], answers: [] }
  const hadWindow = { ...globalThis.window }
  Object.assign(globalThis.window, {
    setTimeout: () => 0,
    clearTimeout() {},
    addEventListener() {},
    removeEventListener() {},
  })
  try {
    const host = hookHost(
      (props) => useTonightStackHosted(props),
      () => ({ value: book, boards: [book], now: clock, onChange: (next) => (book = next) }),
    )
    globalThis.__didIHookHost = host
    const { useTonightStack: useTonightStackHosted } = await import('../src/lib/useTonightStack.js?hook-host')
    const statusOf = (id) => book.answers.find((answer) => answer.lampId === id)?.status

    let stack = host.render()
    assert.equal(stack.bodyKind, 'face')
    for (let n = 0; n < 3; n += 1) {
      stack.mark(stack.faceRow, 'skip')
      stack = host.render()
    }
    assert.equal(stack.bodyKind, 'finish', 'after the last nope the finish face is the list')
    assert.deepEqual(stack.stillOpen.map((row) => row.lamp.id).sort(), ['bins', 'door', 'pills'])

    const first = stack.stillOpen[0]
    stack.lateFromList(first)
    stack = host.render()
    assert.equal(statusOf(first.lamp.id), 'late', 'Did it now saves the nope as late')
    assert.equal(stack.bodyKind, 'finish', 'the list stays put')
    assert.equal(stack.stillOpen.length, 2)

    const [second, third] = stack.stillOpen
    stack.leaveFromList(second)
    stack = host.render()
    assert.equal(statusOf(second.lamp.id), 'skip', 'Leave it keeps the nope')
    assert.deepEqual(stack.stillOpen.map((row) => row.lamp.id), [third.lamp.id])
    assert.equal(stack.bodyKind, 'finish')

    stack.leaveFromList(third)
    stack = host.render()
    assert.equal(stack.stillOpen.length, 0)
    assert.equal(stack.bodyKind, 'rest', 'leaving the last one rests the night')
  } finally {
    delete globalThis.__didIHookHost
    for (const key of Object.keys(globalThis.window)) if (!(key in hadWindow)) delete globalThis.window[key]
    Object.assign(globalThis.window, hadWindow)
  }
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

// A stand-in expo-haptics that logs what it plays. `refuse` lists calls that
// reject, the way performAndroidHapticsAsync does on a phone too old for it.
function hapticsLog({ refuse = [] } = {}) {
  const played = []
  const play = (name) => (arg) => {
    played.push(arg === undefined ? name : `${name}:${arg}`)
    return refuse.includes(name) ? Promise.reject(new Error(`${name} unavailable`)) : Promise.resolve()
  }
  const Haptics = {
    NotificationFeedbackType: { Success: 'success' },
    ImpactFeedbackStyle: { Soft: 'soft', Rigid: 'rigid', Heavy: 'heavy' },
    AndroidHaptics: { Confirm: 'confirm', Reject: 'reject', Segment_Tick: 'segment-tick' },
    notificationAsync: play('notify'),
    impactAsync: play('impact'),
    selectionAsync: play('select'),
    performAndroidHapticsAsync: play('android'),
  }
  return { Haptics, played }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

await testAsync('each answer on an iPhone feels like one thing: a Did is one success', async () => {
  const { Haptics, played } = hapticsLog()
  const feelTap = makeFeelTap({ Haptics, android: false, thresholdModule: () => null })
  const felt = async (kind) => {
    played.length = 0
    feelTap(kind)
    await settle()
    return [...played]
  }
  assert.deepEqual(await felt('did'), ['notify:success'])
  assert.deepEqual(await felt('skip'), ['impact:soft'])
  assert.deepEqual(await felt('undo'), ['impact:rigid'])
  assert.deepEqual(await felt('edge'), ['select'])
  assert.deepEqual(await felt('tick'), ['select'])
})

await testAsync('Android answers with its own HapticFeedbackConstants, and falls back on older phones', async () => {
  const threshold = { calls: 0, gestureThresholdAsync() { this.calls += 1; return Promise.resolve() } }
  const modern = hapticsLog()
  const feel = makeFeelTap({ Haptics: modern.Haptics, android: true, thresholdModule: () => threshold })
  feel('did')
  feel('skip')
  feel('edge')
  await settle()
  assert.deepEqual(modern.played, ['android:confirm', 'android:reject'])
  assert.equal(threshold.calls, 1, 'the swipe edge plays GESTURE_THRESHOLD_ACTIVATE from DidIHaptics')

  // A phone without the constants: each answer still plays exactly one haptic.
  const old = hapticsLog({ refuse: ['android'] })
  const oldFeel = makeFeelTap({ Haptics: old.Haptics, android: true, thresholdModule: () => null })
  for (const [kind, fallback] of [['did', 'notify:success'], ['skip', 'impact:soft'], ['edge', 'select']]) {
    old.played.length = 0
    oldFeel(kind)
    await settle()
    assert.equal(old.played.filter((name) => !name.startsWith('android')).length, 1, `${kind} falls back once`)
    assert.ok(old.played.includes(fallback), `${kind} falls back to ${fallback}`)
  }
  old.played.length = 0
  oldFeel('edge')
  await settle()
  assert.equal(old.played[0], 'android:segment-tick', 'a binary without DidIHaptics ticks with SEGMENT_TICK first')
})

await testAsync("the phone's Reduce Motion turns motion off, and back on, as it changes", async () => {
  let changed = null
  const a11y = {
    isReduceMotionEnabled: () => Promise.resolve(true),
    addEventListener: (type, fn) => {
      if (type === 'reduceMotionChanged') changed = fn
    },
  }
  const had = globalThis.window.matchMedia
  globalThis.window.matchMedia = phoneMatchMedia(a11y)
  try {
    assert.equal(readReduceMotion({ lessMotion: false }), false, 'motion stays on until the phone answers')
    await settle()
    assert.equal(readReduceMotion({ lessMotion: false }), true, "the phone's Reduce Motion is honoured")

    const heard = []
    const media = globalThis.window.matchMedia('(prefers-reduced-motion:  reduce)')
    media.addEventListener('change', (event) => heard.push(event.matches))
    changed(false)
    assert.equal(readReduceMotion({ lessMotion: false }), false)
    assert.equal(readReduceMotion({ lessMotion: true }), true, 'Less motion still turns it off on its own')
    changed(false)
    changed(true)
    assert.deepEqual(heard, [false, true], 'listeners hear each real change once')
    assert.equal(globalThis.window.matchMedia('(prefers-color-scheme: light)').matches, false)
  } finally {
    if (had) globalThis.window.matchMedia = had
    else delete globalThis.window.matchMedia
  }
})

test('with no accessibility module, the phone keeps its motion', () => {
  const matchMedia = phoneMatchMedia(undefined)
  assert.equal(matchMedia('(prefers-reduced-motion: reduce)').matches, false)
  const broken = phoneMatchMedia({ isReduceMotionEnabled: () => { throw new Error('no module') } })
  assert.equal(broken('(prefers-reduced-motion: reduce)').matches, false)
})

const checkRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

test('friend and family QR codes hold a didi link the scanner reads back', async () => {
  const { friendQrLink, familyQrLink, readQrLink, scanFromText } = await import('../src/lib/qr-links.js')
  assert.equal(friendQrLink('1234 5678 9012'), 'https://did-i.app/f/123456789012')
  assert.equal(friendQrLink('123'), '', 'a short ID makes no code')
  assert.equal(familyQrLink('ab-c123'), 'https://did-i.app/j/ABC123')
  assert.deepEqual(readQrLink('https://did-i.app/f/123456789012'), { friend: '123456789012' })
  assert.equal(scanFromText('scan=family:ABC123'), 'family:ABC123', 'the Play referrer carries it')
  assert.equal(scanFromText('see https://did-i.app/f/123456789012'), 'friend:123456789012')
  assert.deepEqual(readQrLink('didi://friend/123456789012'), { friend: '123456789012' })
  assert.deepEqual(readQrLink('didi://family/abc123'), { family: 'ABC123' })
  assert.equal(readQrLink('https://example.com/friend/123456789012'), null, 'other codes are not ours')
  assert.equal(readQrLink('didi://family/ABC'), null)
  const { create } = await import('qrcode/lib/core/qrcode.js')
  assert.ok(create(friendQrLink('123456789012'), { errorCorrectionLevel: 'M' }).modules.size >= 21)
})

test('a Did you link reads back from the page, the Open button, a copied line and the Play referrer', async () => {
  const { didYouLink, readDidYouLink, didYouFromText, sharedDidYouLine } = await import('../src/lib/did-you-links.js')
  assert.equal(didYouLink('ABCDEFGH23'), 'https://did-i.app/d/abcdefgh23')
  assert.equal(didYouLink('short'), '', 'a short code makes no link')
  assert.equal(readDidYouLink('https://did-i.app/d/abcdefgh23'), 'abcdefgh23')
  assert.equal(readDidYouLink('didi://d/ABCDEFGH23/'), 'abcdefgh23')
  assert.equal(readDidYouLink('https://did-i.app/f/123456789012'), '', 'a friend link is not a Did you link')
  assert.equal(didYouFromText('Did you go vote? https://did-i.app/d/abcdefgh23'), 'abcdefgh23')
  assert.equal(didYouFromText('utm_source=x&did=abcdefgh23'), 'abcdefgh23')
  assert.equal(didYouFromText('did=abc'), '')
  assert.equal(sharedDidYouLine(' Did you go vote? ', 'abcdefgh23'), 'Did you go vote? https://did-i.app/d/abcdefgh23')
  assert.equal(sharedDidYouLine('get this test?', 'abcdefgh23'), 'Did you get this test? https://did-i.app/d/abcdefgh23', 'the Did you lead comes back')
})

test('a sent Did you edits only while it waits, a stopped link says so', async () => {
  const { canEditSent, cleanSentEdit, deadLinkKey } = await import('../src/lib/did-you-links.js')
  assert.equal(canEditSent({ kind: 'todo', state: 'sent' }), true)
  assert.equal(canEditSent({ kind: 'todo', state: 'kept' }), false, 'answered: no edit')
  assert.equal(canEditSent({ kind: 'cheer', state: 'sent' }), false, 'a cheer has no words to edit')
  assert.equal(canEditSent(null), false)
  assert.deepEqual(cleanSentEdit('  call mom  '), { text: 'call mom', miss: '' })
  assert.equal(cleanSentEdit('   ').miss, 'sent.editBlank')
  assert.equal(cleanSentEdit('x'.repeat(201)).miss, 'sent.editLong')
  assert.equal(cleanSentEdit('x'.repeat(200)).miss, '')
  assert.equal(deadLinkKey(true), 'didYouLink.stopped')
  assert.equal(deadLinkKey(false), 'didYouLink.bad')
  const sql = readFileSync(path.join(checkRoot, 'supabase/did-you-links.sql'), 'utf8')
  assert.ok(/end_did_you_link[\s\S]*l\.made_by = me/.test(sql), 'only the maker stops a link')
  const hard = readFileSync(path.join(checkRoot, 'supabase/hardening.sql'), 'utf8')
  assert.ok(/edit_send[\s\S]*s\.from_id = me and s\.state = 'sent'/.test(hard), 'only the sender edits, only while it waits')
})

test('did-i.app/d/CODE is a site page, and the phone routes it to the add sheet', async () => {
  const { didYouCodeFromPath, scanFromPath } = await import('../src/site/path.js')
  assert.equal(didYouCodeFromPath('/d/ABCDEFGH23'), 'abcdefgh23')
  assert.equal(didYouCodeFromPath('/d/abc'), '')
  assert.equal(scanFromPath('/d/abcdefgh23'), null, 'not a QR page')
  const links = readFileSync(path.join(checkRoot, 'native/deep-link.js'), 'utf8')
  assert.ok(links.includes('readDidYouLink(url)') && links.includes('savePendingDidYou(route.didYou)'))
  const aasa = JSON.parse(readFileSync(path.join(checkRoot, 'public/.well-known/apple-app-site-association'), 'utf8'))
  assert.ok(aasa.applinks.details[0].components.some((c) => c['/'] === '/d/*'))
  const manifest = readFileSync(path.join(checkRoot, 'android/app/src/main/AndroidManifest.xml'), 'utf8')
  assert.ok(manifest.includes('android:pathPrefix="/d/"'))
})

test('every action that changes data on the server says so on the phone', () => {
  // A new server action goes here. Its call must be followed, in the same
  // handler, by something the person sees: confirmDone, an inline line, a
  // toast, a sheet, or the add stamp. See native/lib/confirm.js.
  const ACTIONS = [
    'weMake', 'weEdit', 'weAsk', 'weLeave', 'weFile', 'reportWe', 'weNudge', 'weReply', 'makeWeLink', 'endWeLinks',
    'makeDidYouLink', 'sendDidI', 'sayYes', 'sayNo', 'unsendAsk', 'dropFriend', 'weLeaveShared', 'reportSend',
    'cheerFriend', 'buyCheers', 'sendGift', 'answerSend', 'blockPerson', 'unblockPerson', 'makeFamily', 'joinFamily',
    'leaveFamily', 'setRole', 'dropMember', 'setAutoAdd', 'takeBack', 'saveName', 'askByFriendId', 'returnGift',
    'joinWeLink', 'befriendByLink', 'reportGift', 'cheerFamily', 'giftCheer',
  ]
  const SEEN = /confirmDone|setSaid\(|\bsay\(|showToast\(|feel\.land\(|onSent\(|onDone\b|onAsked\(|setLinkSaid\(|offerWeWith\(|setNote\(|publishSheet\(\{|guide\(/
  const files = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(jsx?|tsx?)$/.test(name)) files.push(full)
    }
  }
  walk(path.join(checkRoot, 'native'))
  const silent = []
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    for (const name of ACTIONS) {
      const re = new RegExp(`\\b(?:await\\s+)?${name}\\(`, 'g')
      let m
      while ((m = re.exec(text))) {
        const before = text.slice(Math.max(0, m.index - 20), m.index)
        if (/import|export|function\s*$|\.\s*$/.test(before)) continue
        if (!SEEN.test(text.slice(m.index, m.index + 900))) {
          silent.push(`${path.relative(checkRoot, file)}:${text.slice(0, m.index).split('\n').length} ${name}`)
        }
      }
    }
  }
  assert.deepEqual(silent, [], 'these actions change data and show nothing after')
  const toast = readFileSync(path.join(checkRoot, 'native/components/ToastHost.jsx'), 'utf8')
  assert.ok(toast.includes("item.text || t('confirm.done')"), 'a toast without text says Done, never a blank box')
})

test('a Did we link is the same /d/ path with a 12 letter code, and its preview names the sender', async () => {
  const { isWeLinkCode, readDidYouLink, didYouFromText, sharedDidYouLine } = await import('../src/lib/did-you-links.js')
  const { didYouCodeFromPath } = await import('../src/site/path.js')
  const { linkPreviewText, withLinkPreview } = await import('../src/lib/link-preview.js')
  assert.equal(readDidYouLink('https://did-i.app/d/abcdefgh2345'), 'abcdefgh2345')
  assert.ok(isWeLinkCode('ABCDEFGH2345'))
  assert.ok(!isWeLinkCode('abcdefgh23'), 'ten letters is a Did you')
  assert.equal(readDidYouLink('https://did-i.app/d/abcdefgh234'), '', 'eleven letters is neither')
  assert.equal(didYouFromText('Did we walk the dog? https://did-i.app/d/abcdefgh2345', 'a Did we is left alone'), 'abcdefgh2345')
  assert.equal(didYouFromText('did=abcdefgh2345'), 'abcdefgh2345')
  assert.equal(sharedDidYouLine('Did we walk the dog?', 'abcdefgh2345'), 'Did we walk the dog? https://did-i.app/d/abcdefgh2345', 'a Did we is left alone')
  assert.equal(didYouCodeFromPath('/d/abcdefgh2345'), 'abcdefgh2345')
  assert.deepEqual(linkPreviewText({ question: 'Did we walk the dog?', name: 'Aaron' }, true), {
    title: 'Aaron asked you to join a Did we',
    description: 'Did we walk the dog?',
  })
  assert.equal(linkPreviewText({ question: 'Did you vote?', name: '' }, false).title, 'A Did you from Did I')
  assert.equal(linkPreviewText({ question: 'Get this test?', name: 'Aaron' }, false).description, 'Did you get this test?', 'the capital from the phone keyboard drops')
  assert.equal(linkPreviewText(null, false), null)
  const page = readFileSync(path.join(checkRoot, 'index.html'), 'utf8')
  const out = withLinkPreview(page, { title: 'Ann "A" <b>', description: 'Did you drink water?', url: 'https://did-i.app/d/abcdefgh23' })
  assert.ok(out.includes('<meta property="og:title" content="Ann &quot;A&quot; &lt;b&gt;"'), 'og title filled and escaped')
  assert.ok(out.includes('<meta name="twitter:description" content="Did you drink water?"'))
  assert.ok(out.includes('<meta property="og:url" content="https://did-i.app/d/abcdefgh23"'))
  assert.ok(!out.includes("Now you don't have to wonder"), 'no generic title left')
  const vercel = JSON.parse(readFileSync(path.join(checkRoot, 'vercel.json'), 'utf8'))
  assert.equal(vercel.rewrites[0].source, '/d/:code', 'link pages go through the preview before the catch-all')
})

test('a question from Did I for one night never makes or breaks a streak', async () => {
  const { keptLamp } = await import('../src/lib/send-repeat.js')
  const clock = new Date(2026, 8, 28, 21, 0)
  const nights = []
  for (let back = 0; back < 4; back += 1) {
    const day = new Date(clock)
    day.setDate(day.getDate() - back)
    nights.push(boardDate(day))
  }
  const lamp = keptLamp({ question: 'Did you go vote?', night: nights[1], fromDidI: true, person: { display_name: 'Did I' } }, clock)
  assert.equal(lamp.fromDidI, true)
  assert.equal(lamp.onceOn, nights[1], 'on that night only')
  assert.equal(lamp.fromName, 'Did I')
  const door = { id: 'door', question: 'Did I lock the door?', cadence: 'daily', archived: false, createdOn: '2026-01-01' }
  const yes = (id, night) => ({ lampId: id, periodKey: night, status: 'yes', answeredAt: `${night}T21:00:00` })
  const book = {
    id: 'b1',
    dayFoldHour: 0,
    lamps: [door, { ...lamp, id: 'vote' }],
    answers: [...nights.map((night) => yes('door', night)), { lampId: 'vote', periodKey: nights[1], status: 'skip', answeredAt: `${nights[1]}T21:00:00` }],
  }
  assert.equal(shelfStreak([book], clock), 4, 'a nope on it does not break the streak')
  const only = { id: 'b2', dayFoldHour: 0, lamps: [{ ...lamp, id: 'vote', onceOn: nights[0], createdOn: nights[0] }], answers: [yes('vote', nights[0])] }
  assert.equal(shelfStreak([only], clock), 0, 'a did on it does not make a streak')
})

test('reminders carry Did and Nope buttons that save through the widget tap path', () => {
  const pings = readFileSync(path.join(checkRoot, 'native/shim/native.js'), 'utf8')
  assert.ok(pings.includes('setNotificationCategoryAsync(ASK_CATEGORY'), 'the category is registered')
  assert.ok(pings.includes('categoryIdentifier: ASK_CATEGORY'), 'question reminders use it')
  assert.ok(pings.includes('night: row.periodKey'), 'the night rides along so a late tap lands on it')
  const push = readFileSync(path.join(checkRoot, 'native/shim/push.js'), 'utf8')
  assert.ok(push.includes("action === 'did' || action === 'nope'"))
  const app = readFileSync(path.join(checkRoot, 'native/NativeApp.jsx'), 'utf8')
  assert.ok(app.includes('applyWidgetTapOnce(lampId, kind, night)'))
})

test('a spoken answer finds the right open question, or none', async () => {
  const { matchSpoken, spokenAnswer } = await import('../src/lib/voice-answer.js')
  const rows = [
    { lamp: { id: 'a', question: 'Did I stretch tonight?' } },
    { lamp: { id: 'b', question: 'Did I take my vitamins?' } },
    { lamp: { id: 'c', question: 'Did I lock the back door?' } },
  ]
  assert.equal(matchSpoken('stretch', rows)?.lamp.id, 'a')
  assert.equal(matchSpoken('take vitamins', rows)?.lamp.id, 'b')
  assert.equal(matchSpoken('locked the door', rows)?.lamp.id, 'c', 'locked still finds lock')
  assert.equal(matchSpoken('walk the dog', rows), null, 'nothing close means no guess')
  assert.equal(matchSpoken('', [rows[0]])?.lamp.id, 'a', 'one open question needs no words')
  assert.equal(spokenAnswer('yes'), 'did')
  assert.equal(spokenAnswer('nope'), 'nope')
  assert.equal(spokenAnswer('maybe'), '')
})

// What the widgets draw. Mirrors leadItem in widgets/DidITonightWidget.tsx
// and widgets/android/DidITonightAndroidWidget.jsx (the iOS extension can't
// import app modules). The drift test below keeps the three in step.
function widgetLeadOf(p) {
  const items = p?.items || []
  const hasOpen = items.some((item) => item.status === 'open')
  const id = String(p?.leadLampId || '').trim()
  if (id) {
    const hit = items.find((item) => item.lampId === id && (item.status === 'open' || (!hasOpen && item.status === 'skip')))
    if (hit) return hit
  }
  return items.find((item) => item.status === 'open') || items.find((item) => item.status === 'skip') || null
}
function widgetDraws(p) {
  const lead = widgetLeadOf(p)
  if (!lead) return { question: '', lampId: '', showButtons: false }
  const ios = String(p.question || '').trim() || lead.label
  const android = String(lead.question || '').trim() || String(lead.label || '').trim() || String(p.question || '').trim()
  return { question: ios, android, lampId: lead.lampId, showButtons: true }
}

test('the widget lead mirror matches both widget files', () => {
  const ios = readFileSync(path.join(checkRoot, 'widgets/DidITonightWidget.tsx'), 'utf8')
  const android = readFileSync(path.join(checkRoot, 'widgets/android/DidITonightAndroidWidget.jsx'), 'utf8')
  const pick = "item.lampId === id && (item.status === 'open' || (!hasOpen && item.status === 'skip'))"
  for (const src of [ios, android]) {
    assert.ok(src.replace(/\s+/g, ' ').includes(pick), 'leadItem still prefers leadLampId the same way')
    assert.ok(/items\.find\(\(item\) => item\.status === 'open'\)\s*\|\|\s*items\.find\(\(item\) => item\.status === 'skip'\)/.test(src), 'leadItem falls back open then nope')
  }
  assert.ok(ios.includes('const lead = leadItem(items, props?.leadLampId)'))
  assert.ok(ios.includes("String(props?.question || '').trim() || lead?.label || footer"))
  assert.ok(ios.includes('{lead ? questionText : footer}'), 'iOS draws a question only with a lead')
  assert.ok(ios.includes('const buttons = lead ?'))
  assert.ok(android.includes("const fromLead = String(lead.question || '').trim() || String(lead.label || '').trim()"))
})

await testAsync('the widget draws what Tonight would ask, with buttons only when there is a question', async () => {
  const { setWeNightRows, clearWeNights } = await import('../src/lib/we-nights.js')
  const { saveWeOpen } = await import('../src/lib/we-widget.js')
  const clock = new Date(2026, 9, 3, 21, 0)
  const night = boardDate(clock)
  const lamp = (id, question) => ({ id, question, cadence: 'daily', archived: false, createdOn: '2026-01-01' })
  const ans = (lampId, status) => ({ lampId, periodKey: night, status, answeredAt: `${night}T20:00:00` })
  const book = (answers) => ({ id: 'b1', title: 'General', dayFoldHour: 0, lamps: [lamp('door', 'Did I lock the door?'), lamp('gym', 'Did I go to the gym?')], answers })
  const draw = (answers) => {
    const props = buildTonightWidgetProps({ currentId: 'b1', boards: [book(answers)] }, clock)
    const seen = widgetDraws(props)
    if (seen.showButtons) assert.equal(seen.android, seen.question, 'iOS and Android draw the same question')
    if (props.left > 0) assert.ok(seen.showButtons && seen.question, `"${props.left} left" needs a question drawn`)
    return { props, seen }
  }
  try {
    saveWeOpen([], night)
    clearWeNights()
    let { seen } = draw([])
    assert.equal(seen.question, 'Did I lock the door?')
    assert.equal(seen.showButtons, true)
    ;({ seen } = draw([ans('door', 'yes'), ans('gym', 'yes')]))
    assert.equal(seen.question, '', 'all done and no Did we draws no question')
    assert.equal(seen.showButtons, false)

    saveWeOpen([{ id: 'c1', question: 'Did we do black mage' }], night)
    setWeNightRows([{ card: 'c1', folder: '', night, status: '' }])
    ;({ seen } = draw([ans('door', 'yes'), ans('gym', 'yes')]))
    assert.equal(seen.question, 'Did we do black mage')
    assert.ok(seen.lampId.startsWith('we:'))
    assert.equal(seen.showButtons, true)
    ;({ seen } = draw([ans('door', 'yes'), ans('gym', 'skip')]))
    assert.equal(seen.question, 'Did we do black mage', 'an open Did we is drawn before a nope')
    ;({ seen } = draw([]))
    assert.equal(seen.question, 'Did I lock the door?', 'your own open questions come first')

    setWeNightRows([{ card: 'c1', folder: '', night, status: 'did' }])
    const done = draw([ans('door', 'yes'), ans('gym', 'yes')])
    assert.notEqual(done.seen.question, 'Did we do black mage')
    assert.equal(done.seen.showButtons, false)
    assert.equal(done.props.left, 0)
  } finally {
    clearWeNights()
    saveWeOpen([], night)
  }
})

await testAsync('the share text and the link preview say the same question', async () => {
  const { sharedDidYouLine, didYouAsk } = await import('../src/lib/did-you-links.js')
  const { linkPreviewText } = await import('../src/lib/link-preview.js')
  for (const [q, code, we] of [['Get this test?', 'abcdefgh23', false], ['Did we walk the dog?', 'abcdefgh2345', true], ['go vote', 'abcdefgh23', false]]) {
    const line = sharedDidYouLine(q, code)
    assert.ok(line.includes('https://did-i.app/d/'), line)
    assert.equal(line, `${linkPreviewText({ question: q }, we).description} https://did-i.app/d/${code}`)
    assert.equal(didYouAsk(q), linkPreviewText({ question: q }, we).description)
  }
  assert.equal(sharedDidYouLine('Get this test?', 'abcdefgh23'), 'Did you get this test? https://did-i.app/d/abcdefgh23')
})

test('answers CSV escapes quotes, commas, newlines and formulas', () => {
  assert.equal(csvCell('plain'), 'plain')
  assert.equal(csvCell('a, b'), '"a, b"')
  assert.equal(csvCell('say "hi"'), '"say ""hi"""')
  assert.equal(csvCell('two\nlines'), '"two\nlines"')
  assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)")
  const shelf = {
    boards: [
      {
        lamps: [{ id: 'l1', question: 'drink water, lots', short: 'Water' }],
        answers: [
          { lampId: 'l1', periodKey: '2026-10-02', status: 'skip', note: 'he said "no"' },
          { lampId: 'l1', periodKey: '2026-10-01', status: 'yes', note: '' },
          { lampId: 'gone', periodKey: '2026-10-03', status: 'late' },
        ],
      },
    ],
  }
  assert.equal(
    answersCsv(shelf),
    'date,question,short name,answer,note\r\n' +
      '2026-10-01,"drink water, lots",Water,did,\r\n' +
      '2026-10-02,"drink water, lots",Water,nope,"he said ""no"""\r\n' +
      '2026-10-03,,,late,\r\n',
  )
  assert.equal(answersCsv({}), 'date,question,short name,answer,note\r\n')
})

test('every t() key the app uses is in English', () => {
  const files = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name)
      if (name === 'node_modules') continue
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(jsx?|tsx?)$/.test(name)) files.push(full)
    }
  }
  walk(path.join(checkRoot, 'native'))
  walk(path.join(checkRoot, 'src'))
  const missing = new Set()
  for (const file of files) {
    for (const m of readFileSync(file, 'utf8').matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) {
      if (!(m[1] in en)) missing.add(`${path.relative(checkRoot, file)} ${m[1]}`)
    }
  }
  assert.deepEqual([...missing], [])
})

test('a Did we not due tonight names its next night, same rule as we_due', async () => {
  const { weNextDue, weNextLabel } = await import('../src/lib/we-next.js')
  // 2026-10-05 is a Monday; Saturday is 6.
  const sat = { cadence: 'weekly', weekdays: [6], startsOn: '2026-01-01' }
  assert.equal(weNextDue(sat, '2026-10-05'), '2026-10-10')
  assert.equal(weNextDue(sat, '2026-10-10'), '2026-10-17')
  assert.equal(weNextDue({ cadence: 'daily', startsOn: '2026-01-01' }, '2026-10-05'), '2026-10-06')
  assert.equal(weNextDue({ cadence: 'daily', startsOn: '2026-10-20' }, '2026-10-05'), '2026-10-20')
  assert.equal(weNextDue({ ...sat, startsOn: '2026-10-12' }, '2026-10-05'), '2026-10-17')
  assert.equal(weNextDue({ cadence: 'weekly', weekdays: [], startsOn: '2026-01-01' }, '2026-10-05'), '')
  assert.equal(weNextLabel('2026-10-10', 'en-US'), 'Sat, Oct 10')
  assert.equal(weNextLabel('', 'en-US'), '')
  const { PING_KINDS } = await import('../src/lib/prefs.js')
  assert.ok(PING_KINDS.includes('we'))
  const sql = readFileSync(path.join(checkRoot, 'supabase/did-we.sql'), 'utf8')
  assert.ok(!/push_wanted\([^)]*'sends'\)/.test(sql), 'Did we pushes use their own switch')
})

const { contrastRatio, BODY_CONTRAST } = await import('../src/lib/contrast.js')
const { hallColors, LOOK_IDS } = await import('../native/palette.js')
test('dim and soft text stay readable on the panel in every look, dark and light', () => {
  assert.equal(contrastRatio('#000000', '#ffffff').toFixed(0), '21')
  assert.equal(contrastRatio('#777777', '#777777'), 1)
  const low = []
  for (const look of LOOK_IDS) {
    for (const theme of ['dark', 'light']) {
      const c = hallColors(look, theme)
      for (const key of ['inkDim', 'inkSoft']) {
        const r = contrastRatio(c[key], c.panel)
        if (r < BODY_CONTRAST) low.push(`${look} ${theme} ${key} ${r.toFixed(2)}`)
      }
    }
  }
  assert.deepEqual(low, [])
  const css = readFileSync(path.join(checkRoot, 'src/lib/did-i.css'), 'utf8')
  const dims = new Set([...css.matchAll(/--di-ink-dim: (#[0-9a-f]{6})/g)].map((m) => m[1]))
  for (const look of LOOK_IDS) {
    for (const theme of ['dark', 'light']) {
      assert.ok(dims.has(hallColors(look, theme).inkDim), `${look} ${theme} inkDim is in did-i.css too`)
    }
  }
})

const rateAsk = await import('../src/lib/rate-ask.js')
test('the store rating card comes once, on the 7th cleared night', () => {
  localStorage.removeItem('did-i-rate-ask')
  for (let d = 1; d <= 6; d += 1) assert.equal(rateAsk.noteClearedNight(`2026-10-0${d}`), false)
  assert.equal(rateAsk.noteClearedNight('2026-10-06'), false, 'the same night twice counts once')
  assert.equal(rateAsk.rateAskDue(), false)
  assert.equal(rateAsk.noteClearedNight('2026-10-07'), true)
  rateAsk.markRateAsked()
  assert.equal(rateAsk.rateAskDue(), false)
  assert.equal(rateAsk.noteClearedNight('2026-10-08'), false)
  localStorage.removeItem('did-i-rate-ask')
})

const { readPrefs: readPrefsForCheck } = await import('../src/lib/prefs.js')
test('the drop push knows every shop drop date, runs in order, and is off by default', () => {
  const sql = readFileSync(path.join(checkRoot, 'supabase/shop-drops.sql'), 'utf8')
  const dates = new Set(
    [...SHOP_CALENDAR.looks, ...SHOP_CALENDAR.cheers, ...SHOP_CALENDAR.buddies].map((item) => item.from).filter(Boolean),
  )
  for (const date of dates) assert.ok(sql.includes(`('${date}')`), `shop-drops.sql lists ${date}`)
  assert.ok(/enable row level security/.test(sql))
  const order = readFileSync(path.join(checkRoot, 'scripts/apply-all-sql.mjs'), 'utf8')
  assert.ok(order.indexOf("'supabase/push.sql'") < order.indexOf("'supabase/shop-drops.sql'"))
  const push = readFileSync(path.join(checkRoot, 'supabase/push.sql'), 'utf8')
  assert.equal((push.match(/"drop_live":/g) || []).length, 9, 'drop push text in all 9 languages')
  localStorage.removeItem('did-i-prefs')
  assert.equal(readPrefsForCheck().dropPings, false)
})

test('every Settings row moved under More is still on a route, phone and web', () => {
  for (const file of ['native/navigation/hash.js', 'src/site/hash.js']) {
    assert.ok(readFileSync(path.join(checkRoot, file), 'utf8').includes("'/settings/more'"), file)
  }
  const phone = readFileSync(path.join(checkRoot, 'native/screens/profile.jsx'), 'utf8')
  const web = readFileSync(path.join(checkRoot, 'src/lib/Profile.jsx'), 'utf8')
  for (const key of ['settings.loadCopy', 'settings.sendCopy', 'settings.diagnostics', 'settings.privacy', 'settings.terms', 'settings.sendCsv', 'settings.reminders']) {
    assert.ok(phone.includes(`'${key}'`), `phone ${key}`)
    assert.ok(web.includes(`'${key}'`), `web ${key}`)
  }
  for (const key of ['settings.phonePrivacy', 'appVersionLines', 'settings.replayIntro']) assert.ok(phone.includes(key), `phone ${key}`)
  assert.ok(phone.includes("goHash('/settings/more')") && web.includes("goHash('/settings/more')"))
})


test('the widget redraws at midnight and when last night\'s grace ends', async () => {
  const { widgetRedrawTimes } = await import('../src/lib/widget-config.js')
  const { boardDate } = await import('../src/lib/recurrence.js')
  const book = {
    id: 't1',
    title: 'Home',
    dayFoldHour: 0,
    lamps: [{ id: 'late', question: 'Late one?', cadence: 'daily', archived: false, createdOn: '2020-01-01', askAfter: '21:00' }],
    answers: [],
  }
  const now = new Date('2026-09-23T19:00:00')
  const times = widgetRedrawTimes([book], now)
  assert.ok(times.length >= 2, `got ${times.length}`)
  // Night turns come first, so the native cap of 12 never drops midnight.
  const turn = times[0]
  assert.notEqual(boardDate(turn), boardDate(now), 'the first redraw is on the new night')
  assert.equal(boardDate(new Date(turn.getTime() - 70 * 1000)), boardDate(now), 'and within a minute of the turn')
  assert.ok(times.some((d) => d.getHours() === 21 && d.getMinutes() === 0), 'ask times stay')
  assert.equal(new Set(times.map((d) => d.getTime())).size, times.length, 'no repeats')
  assert.ok(times.every((d) => d > now))
})

test('a widget card from an earlier night does not win after midnight', async () => {
  const { preferStoredTonightProps, tonightWidgetKey } = await import('../src/lib/widget-tonight.js')
  const stored = {
    items: [{ lampId: 'a', periodKey: '2026-09-23', status: 'open' }, { lampId: 'b', periodKey: '2026-09-23', status: 'open' }],
    leadLampId: 'a',
    updatedAt: new Date('2026-09-23T22:00:00').getTime(),
  }
  const built = {
    items: [{ lampId: 'a', periodKey: '2026-09-24', status: 'open' }],
    leadLampId: 'a',
    updatedAt: new Date('2026-09-24T12:00:00').getTime(),
  }
  assert.equal(preferStoredTonightProps(built, stored), built)
  // Same night, more open on the card: the card still wins (taps saved natively).
  const sameNight = { ...built, updatedAt: new Date('2026-09-23T22:30:00').getTime() }
  assert.equal(preferStoredTonightProps(sameNight, stored).items, stored.items)
  // The redraw key moves when an answer from another phone lands.
  const answered = { ...built, items: [{ ...built.items[0], status: 'done' }] }
  assert.notEqual(tonightWidgetKey(built), tonightWidgetKey(answered))
  assert.equal(tonightWidgetKey(built), tonightWidgetKey({ ...built, updatedAt: 1 }))
})

test('the sync line says synced just now, or saved on this phone after a miss', async () => {
  const { syncLine, syncFailed } = await import('../src/lib/sync-line.js')
  const now = Date.parse('2026-10-05T12:00:00Z')
  assert.equal(syncLine({ how: 'saved', at: '2026-10-05T11:59:30Z' }, now).key, 'account.syncJust')
  const older = syncLine({ how: 'saved', at: '2026-10-05T11:00:00Z' }, now)
  assert.equal(older.key, 'account.syncSaved')
  assert.equal(older.at, '2026-10-05T11:00:00Z')
  assert.equal(syncLine({ how: 'miss', miss: 'net' }, now).key, 'account.syncLocal')
  assert.equal(syncLine({ how: 'busy' }, now).key, 'account.syncBusy')
  assert.equal(syncLine({ how: 'out' }, now).key, 'account.syncIdle')
  assert.ok(syncFailed({ how: 'miss' }))
  assert.ok(!syncFailed({ how: 'saved' }))
  const { en } = await import('../src/locales/en.js')
  for (const key of ['account.syncJust', 'account.syncLocal', 'settings.syncMiss', 'pings.test', 'pings.testOff']) assert.ok(en[key], key)
})

test('the error log keeps no personal content and is capped', async () => {
  const { errorCode } = await import('../src/lib/app-errors.js')
  assert.equal(errorCode(new Error('FetchError: could not reach did I walk the dog')), 'FetchError:')
  assert.equal(errorCode({ code: 'PGRST301', message: 'secret' }), 'PGRST301')
  assert.equal(errorCode(null), 'unknown')
  assert.ok(errorCode('x'.repeat(200)).length <= 80)
  const sql = readFileSync(path.join(checkRoot, 'supabase/reliability.sql'), 'utf8')
  assert.ok(sql.includes('enable row level security'), 'app_errors has RLS')
  assert.ok(sql.includes('(select auth.uid())'), 'policies use (select auth.uid())')
  assert.ok(!/grant select[^;]*app_errors/i.test(sql), 'nobody but the service role reads the log')
  assert.ok(!sql.slice(sql.indexOf('create table if not exists public.app_errors')).includes('user_id'), 'the error log has no user id')
  assert.ok(sql.includes("interval '90 days'"), 'old phones drop off after 90 days')
  const all = readFileSync(path.join(checkRoot, 'scripts/apply-all-sql.mjs'), 'utf8')
  assert.ok(all.includes("'supabase/reliability.sql'"))
  const sync = readFileSync(path.join(checkRoot, 'src/lib/cloud-sync.js'), 'utf8')
  assert.ok(sync.includes("recordAppError('sync'"), 'failed syncs are logged')
  const push = readFileSync(path.join(checkRoot, 'supabase/functions/push/index.ts'), 'utf8')
  assert.ok(push.includes("from('app_errors')"), 'failed pushes are logged')
  assert.ok(!push.includes('user_id: row.to_id'), 'push errors carry no user id')
})

test('a sheet that pops up on Tonight catches the next tap', () => {
  const sheet = readFileSync(path.join(checkRoot, 'native/components/SheetHost.jsx'), 'utf8')
  assert.ok(!sheet.includes("pointerEvents={live ? 'auto' : 'none'}"), 'the veil never lets a tap through to Did or Nope')
  assert.ok(sheet.includes('if (live) sheet.onClose?.()'))
})

test('signing out clears the per-account lists kept for a fast first paint', () => {
  const was = globalThis.localStorage
  const keys = ['did-i-kept:people.links:u1', 'did-i-kept:inbox.rows:u1', 'did-i-we-cards:u1', 'did-i-shelf', 'did-i-prefs']
  try {
    // A browser: length and key().
    const web = new Map(keys.map((k) => [k, '1']))
    globalThis.localStorage = {
      get length() {
        return web.size
      },
      key: (i) => [...web.keys()][i] ?? null,
      getItem: (k) => web.get(k) ?? null,
      setItem: (k, v) => web.set(k, v),
      removeItem: (k) => web.delete(k),
    }
    forgetAccountCaches()
    assert.deepEqual([...web.keys()].sort(), ['did-i-prefs', 'did-i-shelf'])
    // The phone shim: allKeys().
    const phone = new Map(keys.map((k) => [k, '1']))
    globalThis.localStorage = {
      allKeys: () => [...phone.keys()],
      getItem: (k) => phone.get(k) ?? null,
      setItem: (k, v) => phone.set(k, v),
      removeItem: (k) => phone.delete(k),
    }
    forgetAccountCaches()
    assert.deepEqual([...phone.keys()].sort(), ['did-i-prefs', 'did-i-shelf'])
  } finally {
    globalThis.localStorage = was
  }
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const account = readFileSync(path.join(root, 'src/lib/account.js'), 'utf8')
  const sync = readFileSync(path.join(root, 'src/lib/cloud-sync.js'), 'utf8')
  const boot = readFileSync(path.join(root, 'native/bootstrap.js'), 'utf8')
  assert.equal((account.match(/forgetAccountCaches\(\)/g) || []).length, 3, 'sign out here, everywhere, and delete clear them')
  assert.ok(sync.includes('forgetAccountCaches()'), 'a session that ends on its own clears them')
  assert.ok(boot.includes('allKeys:'), 'the phone storage shim can list keys')
})

test('the web ships English and loads the language in use; the phone loads all', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const i18n = readFileSync(path.join(root, 'src/lib/i18n.js'), 'utf8')
  const main = readFileSync(path.join(root, 'src/main.jsx'), 'utf8')
  const entry = readFileSync(path.join(root, 'index.js'), 'utf8')
  const imports = i18n.match(/from '\.\.\/locales\/\w+\.js'/g) || []
  assert.deepEqual(imports, ["from '../locales/en.js'"], 'only English is in the main bundle')
  assert.ok(main.includes('startLocales().finally(mount)'), 'the web waits for its language before the first render')
  assert.ok(entry.includes("import './src/lib/locales-all.js'"), 'the phone has every language at start')
  const was = globalThis.localStorage.getItem('did-i-prefs')
  try {
    globalThis.localStorage.setItem('did-i-prefs', JSON.stringify({ locale: 'es' }))
    assert.notEqual(t('nav.home'), en['nav.home'], 'a loaded language is used')
  } finally {
    if (was == null) globalThis.localStorage.removeItem('did-i-prefs')
    else globalThis.localStorage.setItem('did-i-prefs', was)
  }
})

console.log(`\n${ran - failed} of ${ran} passed`)
if (failed) process.exit(1)
