// The checks that do not need a server. Run with: npm test
//
// Everything here is something that broke once, or would break quietly
// if someone changed the wrong line.

import './offline-env.mjs'
import { strict as assert } from 'node:assert'
import { testBuyCredits } from '../supabase/functions/gem-iap/gate.js'
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
import { peopleTonightItems, peopleWaitingLine } from '../src/lib/people-tonight.js'
import { nightWhyLines } from '../src/lib/night-why.js'
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
import { PACKS, STARTERS, addPack, packList, starterBlank, starterList, undoPack, unusedStarters } from '../src/lib/starters.js'
import {
  FIRST_PICKS_MAX,
  answeredNights,
  firstRunBook,
  isNewShelf,
  isNightOne,
  markNightOneSeen,
  markSignInNudgeSeen,
  nightOneSeen,
  packState,
  showSignInNudge,
  shouldShowWidgetTip,
  countWidgetTipDay,
  signInNudgeSeen,
  togglePack,
  togglePick,
} from '../src/lib/first-run.js'
import { mergeShelves } from '../src/lib/shelf-merge.js'
import { devServerUrl, makeLocation } from '../native/location-shim.js'
import { lintStore } from './lint-store.mjs'
import { isDemoBoard, stripDemoShelf } from '../src/lib/demo-strip.js'
import { emptyShake, shakeStep } from '../src/lib/shake-undo.js'
import { NOTE_MAX, bulkLamps, hangInto, moveLamps, setAnswerNote, takeDown, undoBulkLamps } from '../src/lib/board-ops.js'

import { answersToSend, applyAnswers, dropSentAnswers, shelfWithoutAnswers } from '../src/lib/answer-log.js'
import {
  INVITE_CODE_LEN,
  INVITE_GEMS_CAP,
  cleanCode,
  cleanInvite,
  inviteGemsDue,
  safeAvatarPath,
} from '../src/lib/people.js'
import { inviteNextFriendGems, inviteRewardProgress } from '../src/lib/invite-reward.js'
import { inviteClip, inviteFromText, inviteLink, playLinkFor } from '../src/lib/invite-link.js'
import { applyGemOwnedToBook, validateCoinItem } from '../src/lib/wallet.js'
import { BUDDIES, FREE_BUDDY, LOOKS, SHOP_CALENDAR, WISH_MAX, buyLook, isLive, isTeased, normalizePurse, offSeason, seasonNext, shopRow, toggleWish, wishGoal, wishLine, CHEERS as SHOP_CHEERS } from '../src/lib/purse.js'
const CHEERS_FOR_SIGN_IN = () => SHOP_CHEERS.find((item) => item.gems > 0).id
import { hasAnyTopic, joinTopics, shelfTopics, topicsOf } from '../src/lib/board-json.js'
import '../src/lib/locales-all.js'
import { t } from '../src/lib/i18n.js'
import { forgetAccountCaches, forgetPendingLinks } from '../src/lib/account-cache.js'
import { answersCsv, csvCell } from '../src/lib/answers-csv.js'
import { GEM_PACKS, GEM_UNIT_CENTS } from '../src/lib/gem-packs.js'
import { cheerKinds, holdFor, popsFor, sunRayLayout } from '../src/lib/cheer-pops.js'
import {
  clearLocalShelf,
  dropBook,
  enterLand,
  hallEmpty,
  mergeSameTitles,
  normalizeShelf,
  parkEmptyTags,
  addBook,
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
import { personTint, personTintIndex } from '../src/lib/person-tint.js'
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
import { pickSocialLine } from '../src/lib/social-line.js'
import { nightProgress } from '../src/lib/night-progress.js'
import { RISE_SPRING, cardTilt, depthLook, flyPath, grabSide, releaseWay } from '../native/lib/swipe-motion.js'
import { rollColumns, rollStops } from '../native/lib/roll-digits.js'
import { aimCheer, takeCheerAim } from '../native/lib/cheer-origin.js'
import { streakParts } from '../src/lib/streak-copy.js'
import { dropToast, nextToast, showToast, toastQueue, undoUp } from '../native/lib/toast-queue.js'
import { SKY_FPS, STARS, isDaytime, sunAt, moonAt, moonPath, moonPhase, starAt } from '../native/lib/night-sky.js'
import { kitCount } from '../native/lib/kit-flight.js'
import { makeFeelTap } from '../native/lib/feel-tap.js'
import { phoneMatchMedia } from '../native/lib/reduce-media.js'
import { readReduceMotion } from '../src/lib/useReduceMotion.js'
import { joinTagIds, leftoverOn, scopedBooks, tagIdsOf, taggedDue } from '../src/lib/tags.js'
import { ownedLookIds, widgetLookId, widgetTonightUri } from '../src/lib/widget-config.js'
import { writeAccountUserId } from '../src/lib/session-id.js'
import { coinNightLine, coinNights, gemThisWeek, mergeCoinNights } from '../src/lib/coin-history.js'
import { clockWords, isRecapNight, monthStripNights, weekStripNights, nightWhy, nextStreakGoal, recapLine, recapShareText, shelfFeedRows, shelfNoteRows, shelfStatsCounts, stampWhen, tomorrowPreview, weekRecap, weekdayName, firstAnswerYear, firstAnswerMonth, yearMonths } from '../src/lib/hall-pages.js'
import { setWeNightRows, weCardState, weCardsOn } from '../src/lib/we-nights.js'
import { marksToToast, streakLength } from '../src/lib/achievements.js'
import { addNotice, markNoticesSeen, NOTICE_CAP, readNotices, unseenNotices } from '../src/lib/notices.js'
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

// An async test is awaited before the count, so its failure counts too.
const pendingTests = []
function test(name, fn) {
  ran += 1
  try {
    const out = fn()
    if (out && typeof out.then === 'function') {
      pendingTests.push(out.then(
        () => console.log(`ok   ${name}`),
        (error) => {
          failed += 1
          console.error(`FAIL ${name}
     ${error.message}`)
        },
      ))
      return
    }
    console.log(`ok   ${name}`)
  } catch (error) {
    failed += 1
    console.error(`FAIL ${name}\n     ${error.message}`)
  }
}

function lamp(id, extra = {}) {
  return { id, question: id, cadence: 'daily', archived: false, createdOn: '2024-01-01', ...extra }
}

test('a night pays 2 a did, 1 late, new questions too, nothing past 3 taps', () => {
  const clock = new Date('2026-10-04T21:00:00')
  const old = lamp('a', { createdOn: '2026-10-01' })
  const fresh = lamp('n', { createdOn: '2026-10-04' })
  const book = (lamps, answers = []) => ({ id: 'b', dayFoldHour: 0, lamps, answers })
  assert.equal(coinsFor('yes', book([old]), { lamp: old }, clock), 2)
  assert.equal(coinsFor('late', book([old]), { lamp: old }, clock), 1)
  assert.equal(coinsFor('skip', book([old]), { lamp: old }, clock), 0)
  // Added today, even one just for tonight: it pays like any other.
  assert.equal(coinsFor('yes', book([fresh]), { lamp: fresh }, clock), 2)
  const paid = ['x', 'y', 'z'].map((id) => lamp(id, { createdOn: '2026-10-01' }))
  const answers = paid.map((item) => ({ lampId: item.id, periodKey: '2026-10-04', status: 'yes', answeredAt: '2026-10-04T20:00:00' }))
  const fourth = lamp('w', { createdOn: '2026-10-01' })
  assert.equal(coinsFor('yes', book([...paid, fourth], answers), { lamp: fourth }, clock), 0)
})

test('tonight people cards: open family rows, then Did you asks due tonight, minus swiped ones', () => {
  const fam = (id, answer = null) => ({ family: { id: 'f1', name: 'Home' }, lamp: { id, question: `q${id}` }, night: '2026-10-08', answer })
  const ask = (id, extra = {}) => ({ id, kind: 'todo', state: 'sent', question: `ask${id}`, due_on: '2026-10-08', ...extra })
  const items = peopleTonightItems({
    familyRows: [fam('a'), fam('b', { status: 'yes' })],
    asks: [ask('1'), ask('2', { due_on: '2026-10-09' }), ask('3', { kind: 'cheer' }), ask('app:4', { appSend: true }), ask('5', { state: 'kept' })],
    night: '2026-10-08',
  })
  assert.deepEqual(items.map((item) => item.key), ['fam:f1:a:2026-10-08', 'ask:1'])
  assert.deepEqual(items.map((item) => item.kind), ['family', 'ask'])
  // A sender a timezone ahead stamps tomorrow: a fresh one still shows, an old one waits.
  const now = Date.parse('2026-10-08T22:00:00Z')
  const ahead = peopleTonightItems({
    asks: [ask('6', { due_on: '2026-10-09', made_at: '2026-10-08T21:00:00Z' }), ask('7', { due_on: '2026-10-09', made_at: '2026-10-06T21:00:00Z' }), ask('8', { due_on: '2026-10-10', made_at: '2026-10-08T21:00:00Z' })],
    night: '2026-10-08',
    now,
  })
  assert.deepEqual(ahead.map((item) => item.key), ['ask:6'])
  const left = peopleTonightItems({ familyRows: [fam('a')], asks: [ask('1')], night: '2026-10-08', gone: ['ask:1'] })
  assert.deepEqual(left.map((item) => item.key), ['fam:f1:a:2026-10-08'])
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

test('a bulk move takes answers along and moves back on undo', () => {
  const home = { id: 'home', lamps: [{ id: 'a' }, { id: 'b' }], answers: [{ lampId: 'b', periodKey: '2026-09-25', status: 'yes', note: 'hi' }] }
  const work = { id: 'work', lamps: [{ id: 'c' }], answers: [] }
  const moved = moveLamps([home, work], [{ boardId: 'home', lampId: 'b' }], 'work')
  const [h, w] = ['home', 'work'].map((id) => moved.find((book) => book.id === id))
  assert.deepEqual(h.lamps.map((item) => item.id), ['a'])
  assert.deepEqual(w.lamps.map((item) => item.id), ['c', 'b'])
  assert.equal(w.answers[0].note, 'hi')
  const back = moveLamps([h, w], [{ boardId: 'work', lampId: 'b' }], 'home')
  assert.deepEqual(back.find((book) => book.id === 'home').lamps.map((item) => item.id), ['a', 'b'])
  assert.equal(back.find((book) => book.id === 'home').answers.length, 1)
  assert.deepEqual(moveLamps([home, work], [{ boardId: 'work', lampId: 'c' }], 'work'), [])
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

const travel = await import('../src/lib/travel.js')
const { shelfStreak: travelShelfStreak } = await import('../src/lib/hall-feel.js')
const { graceRowsFor } = await import('../src/lib/grace.js')
const { unlockAchievements } = await import('../src/lib/achievements.js')
const LA = 'America/Los_Angeles'
const TOKYO = 'Asia/Tokyo'

// Did answers for a daily question from Oct 1 to Oct 16, leaving out some.
function travelBook(leaveOut, skips = []) {
  const answers = []
  for (let day = 1; day <= 16; day += 1) {
    const iso = `2026-10-${String(day).padStart(2, '0')}`
    if (leaveOut.includes(iso)) continue
    answers.push({ id: `t${day}`, lampId: 'walk', periodKey: iso, status: 'yes', answeredAt: `${iso}T20:00:00.000Z`, note: '' })
  }
  return { id: 'trip', dayFoldHour: 0, lamps: [lamp('walk', { createdOn: '2026-10-01' })], answers, travelSkips: skips }
}

test('flying LA to Tokyo skips the 15th and the streak goes on', () => {
  const seen = { zone: LA, night: '2026-10-14', skips: [] }
  // Lands 15:00 Tokyo on the 16th (23:00 the 15th in LA), or opens at 18:00.
  for (const at of ['2026-10-16T06:00:00Z', '2026-10-16T09:00:00Z']) {
    assert.deepEqual(travel.travelStep(seen, TOKYO, new Date(at)).skips, ['2026-10-15'])
  }
  const book = travelBook(['2026-10-15'], ['2026-10-15'])
  const noon = new Date(2026, 9, 16, 12)
  assert.equal(questionStreak(book, book.lamps[0], '2026-10-16'), 15)
  assert.equal(travelShelfStreak([book], noon), 15)
  // The skipped night is not closed as Not yet, and reads blank on the calendar.
  const open = travelBook(['2026-10-15', '2026-10-16'], ['2026-10-15'])
  const closed = closePastNights(open, new Date(2026, 9, 16, 10), [])
  assert.equal(answerFor(closed, 'walk', '2026-10-15'), undefined)
  assert.equal(travelShelfStreak([closed], noon), 14)
})

test('changing Mondays to daily keeps the past Mondays streak', async () => {
  const { keepPastSchedule } = await import('../src/lib/recurrence.js')
  const mondays = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19']
  const old = lamp('read', { cadence: 'weekly', weekdays: [1], createdOn: '2026-09-01' })
  const next = { ...old, cadence: 'daily', weekdays: [] }
  next.was = keepPastSchedule(old, next, '2026-10-21')
  const answers = mondays.map((night) => ({ id: night, lampId: 'read', periodKey: night, status: 'yes' }))
  assert.equal(questionStreak({ id: 'b', lamps: [old], answers }, old, '2026-10-21'), 7)
  assert.equal(questionStreak({ id: 'b', lamps: [next], answers }, next, '2026-10-21'), 7)
  // Without was, the Tuesday before reads as a miss.
  assert.equal(questionStreak({ id: 'b', lamps: [{ ...next, was: undefined }], answers }, { ...next, was: undefined }, '2026-10-21', 400, new Date(2026, 9, 21, 12)), 0)
  // At 1am last night is still open: unanswered, it does not break the run yet.
  const daily = lamp('walk', { cadence: 'daily', createdOn: '2026-10-01' })
  const did = ['2026-10-17', '2026-10-18', '2026-10-19'].map((night) => ({ id: night, lampId: 'walk', periodKey: night, status: 'yes' }))
  assert.equal(questionStreak({ id: 'b', lamps: [daily], answers: did }, daily, '2026-10-21', 400, new Date(2026, 9, 21, 1)), 3)
  assert.equal(questionStreak({ id: 'b', lamps: [daily], answers: did }, daily, '2026-10-21', 400, new Date(2026, 9, 21, 12)), 0)
})

test('flying Tokyo to LA repeats a day and marks nothing', () => {
  const next = travel.travelStep({ zone: TOKYO, night: '2026-10-16', skips: [] }, LA, new Date('2026-10-16T22:00:00Z'))
  assert.deepEqual(next.skips, [])
  const book = travelBook([])
  assert.equal(questionStreak(book, book.lamps[0], '2026-10-16'), 16)
})

test('a clock set ahead or a DST change is no trip, and the night still closes', () => {
  // Same zone, clock a day ahead.
  assert.deepEqual(travel.travelStep({ zone: LA, night: '2026-10-14', skips: [] }, LA, new Date('2026-10-17T03:00:00Z')).skips, [])
  // DST ends Nov 1 in LA: same zone, nothing marked.
  assert.deepEqual(travel.travelStep({ zone: LA, night: '2026-10-31', skips: [] }, LA, new Date('2026-11-02T20:00:00Z')).skips, [])
  // A small jump (New York to London) cannot lose a night.
  assert.deepEqual(travel.travelStep({ zone: 'America/New_York', night: '2026-10-10', skips: [] }, 'Europe/London', new Date('2026-10-14T09:00:00Z')).skips, [])
  const closed = closePastNights(travelBook(['2026-10-15', '2026-10-16']), new Date(2026, 9, 16, 10), [])
  assert.equal(answerFor(closed, 'walk', '2026-10-15')?.status, 'skip')
})

test('a real missed night before the flight still ends the streak', () => {
  const book = travelBook(['2026-10-13', '2026-10-15'], ['2026-10-15'])
  assert.equal(questionStreak(book, book.lamps[0], '2026-10-16'), 2)
  assert.equal(travelShelfStreak([book], new Date(2026, 9, 16, 12)), 2)
  // Not opened for days before the trip: no night is skipped at all.
  const next = travel.travelStep({ zone: LA, night: '2026-10-10', skips: [] }, TOKYO, new Date('2026-10-16T06:00:00Z'))
  assert.deepEqual(next.skips, [])
})

test('only a real west-bound date-line trip skips, at most once a week', () => {
  const step = (from, to, at, extra = {}) => travel.travelStep({ zone: from, night: '2026-10-14', skips: [], ...extra }, to, new Date(at))
  assert.deepEqual(step('Pacific/Honolulu', 'Pacific/Auckland', '2026-10-16T03:00:00Z').skips, ['2026-10-15'])
  assert.deepEqual(step(LA, 'Australia/Sydney', '2026-10-16T05:00:00Z').skips, ['2026-10-15'])
  // Not a date-line crossing: London to Tokyo, New York to London, east-bound.
  assert.deepEqual(step('Europe/London', TOKYO, '2026-10-16T06:00:00Z').skips, [])
  assert.deepEqual(step(TOKYO, LA, '2026-10-16T22:00:00Z').skips, [])
  // Flipping the zone in Settings every day: the second flip within a week gets nothing.
  const first = step(LA, TOKYO, '2026-10-16T06:00:00Z')
  const back = travel.travelStep(first, LA, new Date('2026-10-16T20:00:00Z'))
  const again = travel.travelStep({ ...back, night: '2026-10-16' }, TOKYO, new Date('2026-10-18T06:00:00Z'))
  assert.deepEqual(again.skips, ['2026-10-15'])
  // A week later a real trip counts again.
  const later = travel.travelStep({ ...back, zone: LA, night: '2026-10-23' }, TOKYO, new Date('2026-10-25T06:00:00Z'))
  assert.deepEqual(later.skips, ['2026-10-15', '2026-10-24'])
  // The week counts skips another phone synced to the shelf, too.
  const fresh = { zone: LA, night: '2026-10-23', skips: [] }
  assert.deepEqual(travel.travelStep(fresh, TOKYO, new Date('2026-10-25T06:00:00Z'), ['2026-10-20']).skips, [])
  assert.deepEqual(travel.travelStep(fresh, TOKYO, new Date('2026-10-25T06:00:00Z'), ['2026-10-15']).skips, ['2026-10-24'])
})

test('on a travel-skipped night each question is judged on its own', () => {
  const noon = new Date(2026, 9, 16, 12)
  // An older phone closed the 15th on its own (Not yet at its midnight, in LA).
  const auto = { id: 'auto', lampId: 'walk', periodKey: '2026-10-15', status: 'skip', answeredAt: '2026-10-15T07:00:00.000Z', note: '' }
  const older = travelBook(['2026-10-15'], ['2026-10-15'])
  const merged = mergeShelves({ currentId: 'trip', boards: [older] }, { currentId: 'trip', boards: [{ ...older, answers: [...older.answers, auto] }] }, '2026-10-16', '2026-10-15')
  assert.deepEqual(merged.boards[0].travelSkips, ['2026-10-15'])
  assert.equal(questionStreak(merged.boards[0], merged.boards[0].lamps[0], '2026-10-16'), 15)
  assert.equal(travelShelfStreak(merged.boards, noon), 15)
  // A Not yet tapped that night still counts as one.
  const tapped = { ...auto, answeredAt: '2026-10-15T07:12:31.402Z' }
  const real = { ...older, answers: [...older.answers, tapped] }
  assert.equal(questionStreak(real, real.lamps[0], '2026-10-16'), 1)
  // It is a miss for the shelf too (the freeze earned at 14 nights covers it).
  assert.equal(weekStripNights([real], noon).find((night) => night.iso === '2026-10-15').freeze, true)
  // One Did of three on the skipped night keeps the streak; the other two step aside.
  const three = travelBook(['2026-10-15'], ['2026-10-15'])
  three.lamps = [three.lamps[0], lamp('read', { createdOn: '2026-10-15' }), lamp('call', { createdOn: '2026-10-15' })]
  three.answers = [
    ...three.answers,
    { id: 'r', lampId: 'read', periodKey: '2026-10-15', status: 'yes', answeredAt: '2026-10-15T20:00:00.000Z', note: '' },
    ...['read', 'call'].map((id) => ({ id: `${id}16`, lampId: id, periodKey: '2026-10-16', status: 'yes', answeredAt: '2026-10-16T20:00:00.000Z', note: '' })),
  ]
  assert.equal(travelShelfStreak([three], noon), 16)
  const marks = weekStripNights([three], noon)
  assert.equal(marks.find((night) => night.iso === '2026-10-15').miss, false)
})

test('the other walks step over a travel-skipped night', () => {
  // Last night lost to travel is still offered in grace, so a Did can count.
  const book = travelBook(['2026-10-15', '2026-10-16'], ['2026-10-15'])
  assert.equal(graceRowsFor([book], '2026-10-15').length, 1)
  // A quiet week holds with the skipped night in it, and coming back after it is no come-back.
  const week = unlockAchievements({ ...travelBook(['2026-10-15'], ['2026-10-15']), opens: ['2026-10-16'] }, new Date(2026, 9, 16, 22))
  assert.ok(week.unlocked.includes('quiet-week'))
  assert.ok(!week.unlocked.includes('come-back'))
  const hole = unlockAchievements({ ...travelBook(['2026-10-15']), opens: ['2026-10-16'] }, new Date(2026, 9, 16, 22))
  assert.ok(hole.unlocked.includes('come-back'))
  // A one-time "by" question closed by an older app at the start of the day it was made reads as automatic.
  assert.equal(travel.autoClosed({ status: 'skip', answeredAt: '2026-10-12T07:00:00.000Z' }, '2026-10-15'), true)
  assert.equal(travel.autoClosed({ status: 'skip', answeredAt: '2026-10-15T21:03:11.250Z' }, '2026-10-15'), false)
  // Did we on a skipped night: done counts, open steps aside, other nights as usual.
  assert.deepEqual(travel.travelWe(true, { due: 2, done: 1, clear: false }), { due: 1, clear: true })
  assert.deepEqual(travel.travelWe(false, { due: 1, done: 0, clear: false }), { due: 1, done: 0, clear: false })
})

test('a skipped night with one Did we done and one open: the walk and the calendar agree', () => {
  const noon = new Date(2026, 9, 16, 12)
  // The folder's question was made on the 15th and left open; one Did we done, one open.
  const book = { ...travelBook(['2026-10-15'], ['2026-10-15']), lamps: [lamp('walk', { createdOn: '2026-10-15' })] }
  try {
    setWeNightRows([
      { card: 'w1', folder: '', night: '2026-10-15', status: 'did' },
      { card: 'w2', folder: '', night: '2026-10-15', status: '' },
    ])
    assert.equal(travelShelfStreak([book], noon), 2)
    const night = weekStripNights([book], noon).find((item) => item.iso === '2026-10-15')
    assert.deepEqual([night.due, night.on, night.miss], [1, true, false])
    const october = yearMonths([book], 2026, noon).find((month) => month.nights.some((item) => item.iso === '2026-10-15'))
    const yearNight = october.nights.find((item) => item.iso === '2026-10-15')
    assert.deepEqual([yearNight.due, yearNight.on, yearNight.miss], [1, true, false])
    // Without the skip the open one is a miss.
    assert.equal(travelShelfStreak([{ ...book, travelSkips: [] }], noon), 1)
  } finally {
    setWeNightRows([])
  }
  // The close looks past the skipped night to the real previous one.
  const open = travelBook(['2026-10-14', '2026-10-15', '2026-10-16'], ['2026-10-15'])
  const closed = closePastNights(open, new Date(2026, 9, 16, 10), [])
  assert.equal(answerFor(closed, 'walk', '2026-10-14')?.status, 'skip')
  assert.equal(answerFor(closed, 'walk', '2026-10-15'), undefined)
})

test('travel skips on this phone belong to one account', () => {
  const at = new Date('2026-10-16T06:00:00Z')
  const put = (owner) => localStorage.setItem('did-i-zone-seen', JSON.stringify({ zone: LA, night: '2026-10-14', skips: [], owner }))
  put('user-a')
  assert.deepEqual(travel.noteZone(at, TOKYO, 'user-a'), ['2026-10-15'])
  assert.deepEqual(travel.noteZone(at, TOKYO, 'user-a'), ['2026-10-15'])
  // Another account on the phone gets none of them.
  assert.deepEqual(travel.noteZone(at, TOKYO, 'user-b'), [])
  // Sign out clears them but keeps the zone, so no new trip is read.
  put('user-a')
  travel.noteZone(at, TOKYO, 'user-a')
  travel.forgetTravelSkips()
  const kept = JSON.parse(localStorage.getItem('did-i-zone-seen'))
  assert.deepEqual([kept.zone, kept.skips], [TOKYO, []])
  assert.deepEqual(travel.noteZone(at, TOKYO, ''), [])
  assert.equal(kept.skipAt, 0)
  // Skips made signed out go to the account that signs in next, then are its own.
  put('')
  assert.deepEqual(travel.noteZone(at, TOKYO, ''), ['2026-10-15'])
  assert.deepEqual(travel.noteZone(at, TOKYO, 'user-c'), ['2026-10-15'])
  assert.deepEqual(travel.noteZone(at, TOKYO, 'user-d'), [])
  localStorage.removeItem('did-i-zone-seen')
})

test('travel-skipped nights union across phones and stay capped', () => {
  const left = { currentId: 'trip', boards: [travelBook(['2026-10-15'], ['2026-10-15'])] }
  const right = { currentId: 'trip', boards: [travelBook(['2026-10-15'], ['2026-09-02'])] }
  const merged = mergeShelves(left, right, '2026-10-16', '2026-10-15')
  assert.deepEqual(merged.boards[0].travelSkips, ['2026-09-02', '2026-10-15'])
  const many = Array.from({ length: 80 }, (_, i) => addDaysIso('2025-01-01', i * 7))
  const capped = travel.capSkips(many)
  assert.equal(capped.length, travel.TRAVEL_SKIP_MAX)
  assert.equal(capped[capped.length - 1], many[79])
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

test('weekday initials come from the language file, so Chinese and Japanese work on Hermes', () => {
  assert.deepEqual([0, 1, 2].map((d) => weekdayName(`2026-10-0${4 + d}`, 'narrow', 'zh')), ['日', '一', '二'])
  assert.deepEqual([0, 1].map((d) => weekdayName(`2026-10-0${4 + d}`, 'narrow', 'ja')), ['日', '月'])
  assert.equal(weekdayName('2026-10-05', 'narrow', 'en'), 'M')
})

test('an idea you already have stays hidden in any language, whatever its case', () => {
  const book = { lamps: [{ id: 'a', question: 'Did I take my meds?', short: 'meds' }] }
  try {
    for (const locale of ['en', 'ko', 'fr', 'es']) {
      writePrefs({ locale })
      assert.ok(!unusedStarters(book).some((s) => s.idea === 'pills'), `meds idea shown in ${locale}`)
      assert.ok(!packList(book).some((p) => p.items.some((i) => i.idea === 'pills')), `meds pack item shown in ${locale}`)
    }
    const added = { lamps: [{ id: 'b', question: 'Did I スキンケアをした?', short: 'スキンケア' }] }
    writePrefs({ locale: 'en' })
    assert.ok(!unusedStarters(added).some((s) => s.idea === 'skin'), 'a skincare idea added in Japanese shows again in English')
  } finally {
    writePrefs({ locale: 'en' })
  }
})

test('the first question finishes "Did I ___" once', () => {
  assert.equal(didQuestion('lock the back door'), 'Did I lock the back door?')
  assert.equal(didQuestion('  Lock the   back door??  '), 'Did I lock the back door?')
  assert.equal(didQuestion('did i lock the back door?'), 'Did I lock the back door?')
  assert.equal(didQuestion('Did I'), '')
  assert.equal(didQuestion('   '), '')
  assert.equal(didQuestion('TV off'), 'Did I TV off?')
  assert.equal(didQuestion('Pass6 test question'), 'Did I Pass6 test question?')
  assert.equal(didQuestion('McDonald run'), 'Did I McDonald run?')
  for (const starter of STARTERS) {
    assert.equal(didQuestion(starterBlank(starter)), starter.question, starter.short)
  }
})

test('the account page intro reads in the language, past the shop names', () => {
  // coins, gems and cheers stay English across the app; questions and streak do not here.
  for (const [lang, strings] of Object.entries({ zh, ja, ko })) {
    const left = (strings['account.outBody'].match(/[A-Za-z]+/g) || []).filter((w) => !['coins', 'gems', 'cheers'].includes(w))
    assert.deepEqual(left, [], `${lang} account.outBody`)
  }
})

test('idea questions read "Did I ___?" in every language, so the chip fills the lead', () => {
  // The form shows a fixed "Did I" lead and the chip as the words after it.
  const subject = { de: /^(habe|hab) ich\b/i, fr: /^(ai-je|me suis-je)\b/i, es: /^¿/, it: /^ho\b/i, pt: /^eu\b/i, zh: /^我/, ja: /^私/, ko: /^나/ }
  for (const [lang, strings] of Object.entries({ en, es, fr, de, pt, it, zh, ja, ko })) {
    for (const key of Object.keys(en).filter((k) => /^ideas\.\w+\.question$/.test(k))) {
      const question = strings[key]
      assert.ok(question.startsWith('Did I '), `${lang} ${key} starts with Did I`)
      const blank = starterBlank({ question })
      assert.ok(blank && !/[?？]$/.test(blank), `${lang} ${key} chip has no ?`)
      assert.ok(!/^did i\b/i.test(blank) && !subject[lang]?.test(blank), `${lang} ${key} chip does not repeat the lead`)
      assert.equal(didQuestion(blank), question, `${lang} ${key} saves the same shape as a typed one`)
    }
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

await testAsync('referral ladder: real gem steps, Night look, Hive at 15, Bloom at 20, server-given only', async () => {
  const R = await import('../src/lib/invite-reward.js')
  const P = await import('../src/lib/purse.js')
  const F = await import('../src/lib/frames.js')
  const at12 = R.referLadder(12)
  assert.equal(at12.goal, 20)
  assert.equal(at12.toBuddy, 3)
  assert.deepEqual(at12.rungs.filter((r) => r.kind === 'gems').map((r) => [r.n, r.gems]), [[1, 1], [2, 2], [3, 3], [4, 4]], 'gem steps add to ten')
  assert.deepEqual(at12.rungs.map((r) => r.state), ['got', 'got', 'got', 'got', 'got', 'next', 'later'])
  assert.equal(R.referLadder(16).goal, 20)
  assert.equal(R.referLadderNote(R.referLadder(25)).key, 'refer.allDone')
  // Never sold: not in the shop, not buyable, not a gift.
  assert.ok(!P.SHOP_BUDDIES.some((b) => b.id === 'hive') && P.BUDDIES.some((b) => b.id === 'hive'))
  assert.equal(P.buyBuddy({ gems: 99 }, 'hive').miss, 'shop.miss.buddyGone')
  assert.ok(!P.giftItems().buddies.some((b) => b.id === 'hive'))
  assert.ok(!F.frameForSale('bloom'))
  assert.ok(!F.framesOwned({}, { bestStreak: 999, joined: 50 }).has('bloom'), 'Bloom only comes from the server list')
  // claim_invites lists them; the purse keeps them, and only these ids.
  const won = P.applyInvitePayout({}, { gems: 0, looks: [], buddies: ['hive', 'cat'], frames: ['bloom', 'gold'] })
  const purse = P.normalizePurse(won)
  assert.ok(purse.buddies.includes('hive') && !purse.buddies.includes('cat'))
  assert.deepEqual(purse.frames, ['bloom'])
  assert.equal(P.applyInvitePayout(won, { buddies: ['hive'], frames: ['bloom'] }), won, 'given twice changes nothing')
  // A server gem list does not take the earned buddy away.
  const W = await import('../src/lib/wallet.js')
  assert.ok(W.applyGemOwnedToBook(won, { gems: 0, buddies: [] }).buddies.includes('hive'))
  const sql = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../supabase/referral-rewards.sql'), 'utf8')
  assert.ok(sql.includes("select 15") && sql.includes("select 20") && sql.includes("'hive'") && sql.includes("'bloom'"))
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

test('adding a folder keeps the default for new questions where it was', () => {
  const shelf = { currentId: 'b1', boards: [{ id: 'b1', title: 'Tag', lamps: [lamp('a')], answers: [] }] }
  const added = addBook(shelf, { ...emptyBoard(), title: 'Gym' })
  assert.equal(added.boards.length, 2)
  assert.equal(added.currentId, 'b1')
  // putBook still switches, for the paths that move a question into a new folder.
  assert.notEqual(putBook(shelf, { ...emptyBoard(), title: 'Gym' }).currentId, 'b1')
})

test('a folder you just made stays listed even though it is not current', () => {
  const shelf = { currentId: 'b1', boards: [{ id: 'b1', title: 'Tag', lamps: [lamp('a')], answers: [] }] }
  const added = parkEmptyTags(addBook(shelf, { ...emptyBoard(), title: 'Gym' }))
  assert.equal(added.currentId, 'b1')
  assert.equal(added.boards.filter((item) => !item.archived).length, 2)
  const stale = { ...shelf, boards: [...shelf.boards, { id: 'old', title: 'Z', lamps: [], answers: [], archived: true }] }
  assert.equal(parkEmptyTags(stale).boards.find((item) => item.id === 'old').archived, false)
})

test('empty folders step aside only when the list is crowded', () => {
  const full = (id) => ({ id, title: id, lamps: [lamp(`q-${id}`)], answers: [] })
  const empty = (id) => ({ id, title: id, lamps: [], answers: [] })
  const few = { currentId: 'b1', boards: [full('b1'), empty('e1'), empty('e2')] }
  assert.equal(parkEmptyTags(few).boards.filter((item) => item.archived).length, 0)
  const many = { currentId: 'b1', boards: [full('b1'), full('b2'), full('b3'), empty('e1'), empty('e2'), empty('e3'), empty('new')] }
  const parked = parkEmptyTags(many)
  assert.deepEqual(parked.boards.filter((item) => item.archived).map((item) => item.id), ['e1', 'e2', 'e3'])
  assert.equal(parked.boards.find((item) => item.id === 'new').archived, false)
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
  assert.deepEqual(shelfNoteRows(boards), [], 'no notes, no rows')
  const noted = [{ ...boards[0], answers: [...boards[0].answers, { id: 'n1', lampId: 'a', periodKey: '2026-10-02', status: 'yes', note: 'ran', answeredAt: '2026-10-02T21:00' }, { id: 'n2', lampId: 'gone', periodKey: '2026-10-02', status: 'yes', note: 'x', answeredAt: '2026-10-02T22:00' }] }, boards[1]]
  assert.deepEqual(shelfNoteRows(noted).map((row) => row.answer.id), ['n1'], 'notes only, and only on questions that still exist')
  assert.equal(nextStreakGoal(1), 3)
  assert.equal(nextStreakGoal(5), 7)
})

test('the year view stops at this month and goes back to the first answer', () => {
  const now = new Date('2026-10-04T12:00:00')
  const boards = [{ id: 'b1', title: 'Tag', lamps: [{ ...lamp('a'), createdOn: '' }], answers: [{ lampId: 'a', periodKey: '2024-03-02', status: 'yes' }] }]
  assert.equal(firstAnswerYear(boards, now), 2024)
  assert.equal(firstAnswerYear([{ id: 'b', lamps: [], answers: [] }], now), 2026)
  assert.equal(firstAnswerMonth(boards, now), '2024-03')
  assert.equal(firstAnswerMonth([{ id: 'b', lamps: [], answers: [] }], now), '2026-10', 'no answers: this month')
  assert.equal(yearMonths(boards, 2026, now).length, 10)
  const old = yearMonths(boards, 2024, now)
  assert.equal(old.length, 12)
  assert.equal(old[2].nights.find((night) => night.iso === '2024-03-02').on, true)
  // The one-pass year walk marks every night the same as the month view.
  const mixed = [{
    id: 'b1',
    title: 'Tag',
    lamps: [
      lamp('d', { createdOn: '2026-07-10' }),
      lamp('w', { createdOn: '2026-07-01', cadence: 'weekly', weekdays: [1, 4] }),
      lamp('m', { createdOn: '2026-06-01', cadence: 'monthly', monthDay: 'last' }),
      lamp('o', { createdOn: '2026-08-01', cadence: 'once', onceWhen: 'by', dueBy: '2026-08-20' }),
      lamp('x', { createdOn: '2026-07-01', archived: true }),
    ],
    answers: [
      { lampId: 'd', periodKey: '2026-08-03', status: 'yes' },
      { lampId: 'w', periodKey: '2026-08-03', status: 'yes' },
      { lampId: 'd', periodKey: '2026-08-06', status: 'skip' },
      { lampId: 'w', periodKey: '2026-08-06', status: 'late' },
      { lampId: 'm', periodKey: '2026-07', status: 'yes' },
      { lampId: 'o', periodKey: 'once:o', status: 'yes' },
    ],
  }]
  const year = yearMonths(mixed, 2026, now)
  for (let m = 5; m <= 9; m += 1) {
    const month = monthStripNights(mixed, now, '', m - 9).nights
    assert.deepEqual(year[m].nights, month, `month ${m + 1}`)
  }
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
  const live = { ...paused, paused: false }
  assert.equal(weReminders([{ ...live, people: [{ ...me, status: 'nope' }] }])[0].skipNight, '', 'Not yet keeps the day reminder')
  assert.notEqual(weReminders([{ ...live, people: [me] }])[0].skipNight, '', 'Did drops the day reminder')
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

test('coin history pays like coinsFor: 2, 1, 0, first 3, a new question too', () => {
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
    { night: '2026-10-03', coins: 3, reason: 'late' },
    { night: '2026-10-02', coins: 2, reason: '' },
    { night: '2026-10-01', coins: 0, reason: 'none' },
  ])
  assert.equal(nights.length, 7)
  // Signed in, the server's numbers win but its missing 0 nights stay listed.
  const merged = mergeCoinNights(nights, [{ night: '2026-10-04', coins: 6 }, { night: '2026-10-03', coins: 2 }])
  assert.equal(merged.length, 7)
  assert.deepEqual(merged[1], { night: '2026-10-03', coins: 2, reason: '' })
  assert.deepEqual(merged[2], { night: '2026-10-02', coins: 2, reason: '' })
  // Tonight stays on your own answers, like Home, whatever the server says.
  assert.deepEqual(mergeCoinNights(nights, [{ night: '2026-10-04', coins: 2 }], '2026-10-04')[0], nights[0])
  assert.match(coinNightLine(nights[1], 'Sat'), /late/i, 'a late Did explains 3 coins, not 4')
  assert.match(coinNightLine(merged[1], 'Sat'), /\.$/, 'a line with no reason still ends in a period')
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
  // The row sent up carries the note stamp, zoned, since the server reads a
  // time with no zone as UTC.
  assert.equal(answersToSend(fresh, true)[0].e, new Date(noted.answers[0].noteAt).toISOString())
  assert.equal(answersToSend(fresh, true)[0].a, new Date(answer.answeredAt).toISOString())
})

test('answer times compare by time: old zoneless rows against new UTC ones', () => {
  // An old row written at 22:00 local, and a UTC row one hour later.
  const old = new Date(2026, 9, 14, 22, 0, 0)
  const pad = (n) => String(n).padStart(2, '0')
  const zoneless = `2026-10-14T22:00:00`
  const utc = new Date(old.getTime() + 3600_000).toISOString()
  const book = { id: 'b1', lamps: [{ id: 'l1' }], answers: [{ id: 'a1', lampId: 'l1', periodKey: '2026-10-14', status: 'skip', answeredAt: zoneless }] }
  const row = { lamp_id: 'l1', period_key: '2026-10-14', board_id: 'b1', status: 'yes', answered_at: utc, note: '' }
  assert.equal(applyAnswers({ boards: [book] }, [row]).changed, 1)
  // The other way: a newer zoneless answer here keeps out an older UTC row.
  const older = { ...row, answered_at: new Date(old.getTime() - 3600_000).toISOString() }
  assert.equal(applyAnswers({ boards: [book] }, [older]).changed, 0)
  assert.equal(pad(new Date(utc).getHours()), '23')
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
  const admin = packList(empty).find((pack) => pack.id === 'admin')
  const { book, ids } = addPack(empty, admin, new Date('2026-10-05T10:00:00'))
  assert.equal(ids.length, 3)
  assert.equal(new Set(ids).size, 3)
  assert.equal(book.lamps.length, 3)
  assert.ok(!packList(book).some((pack) => pack.id === 'admin'), 'a pack already on the tag is not offered again')
  const meds = packList({ ...empty, lamps: [{ ...lamp('p'), question: `Did I ${t('starter.pills.blank')}?` }] }).find((pack) => pack.id === 'meds')
  assert.equal(meds.items.length, 2, 'the meds already there are left out')
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
  // Gentle mode: no streak numbers in the recap line or the share text.
  const best = t('recap.best', { n: 3 })
  assert.ok(recapLine(recap).includes(best), 'recap line has the best streak')
  assert.ok(!recapLine(recap, true).includes(best) && recapLine(recap, true).includes(t('recap.dids', { n: 2 })), 'gentle recap line has no best streak')
  const gentleText = recapShareText(recap, true)
  assert.ok(!gentleText.includes('3') && !gentleText.includes('{'), 'gentle share text has no best streak')
  // Shared outside the app, so every language names Did I.
  for (const [code, table] of Object.entries({ en, es, fr, de, pt, it, zh, ja, ko })) {
    for (const key of ['recap.share', 'recap.shareGentle']) assert.ok(table[key].includes('Did I'), `${code} ${key} names Did I`)
  }
})

test('an achievement never takes the undo toast spot while an undo is up', () => {
  for (const item of toastQueue()) dropToast(item.id)
  showToast({ id: 'mark:t', kind: 'mark', mark: { id: 'first' }, ms: 5200 })
  assert.equal(nextToast().id, 'mark:t')
  showToast({ id: 'undo:t', kind: 'undo', rev: 1, label: 'x', hint: 'y', until: Date.now() + 5000, total: 5000 })
  assert.equal(nextToast().id, 'undo:t', 'undo shows first')
  assert.equal(undoUp(), true, 'marks wait while the undo is up')
  assert.equal(typeof toastQueue()[0].onShown, 'function', 'a plain undo gets a clock that starts when shown')
  dropToast('undo:t')
  assert.equal(undoUp(), false)
  assert.equal(nextToast().id, 'mark:t', 'the mark comes after')
  dropToast('mark:t')
  const shell = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'native/AppShell.jsx'), 'utf8')
  assert.ok(/marksHeld \|\| undoUp\(/.test(shell), 'AppShell holds new marks while an undo is up')
})

test('undo windows come from one place: answers 5 s, deletes 7 s', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const times = readFileSync(path.join(root, 'src/lib/undo-times.js'), 'utf8')
  assert.ok(/ANSWER_UNDO_MS = 8000/.test(times) && /DELETE_UNDO_MS = 7000/.test(times))
  for (const file of ['src/lib/useTonightStack.js', 'src/lib/AllLamps.jsx', 'native/screens/questions.jsx', 'native/components/LampManage.jsx', 'native/components/NightNotes.jsx', 'native/screens/more.jsx']) {
    const src = readFileSync(path.join(root, file), 'utf8')
    assert.ok(src.includes('undo-times.js'), `${file} reads undo-times.js`)
    assert.ok(!/UNDO_MS = \d|until: now \+ \d|useUndoToast\([^)]*\}, \d{4}\)/.test(src), `${file} has no undo time of its own`)
  }
})

test('weekday initials follow the app language, not English', () => {
  // 2026-10-06 is a Tuesday: T in English, D (Dienstag) in German.
  assert.equal(weekdayName('2026-10-06', 'narrow', 'en'), 'T')
  assert.equal(weekdayName('2026-10-06', 'narrow', 'de'), 'D')
  assert.equal(weekdayName('2026-10-06', 'long', 'de'), 'Dienstag')
  assert.equal(weekdayName('', 'narrow', 'de'), '')
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const src = readFileSync(path.join(root, 'native/components/DoneCard.jsx'), 'utf8')
  assert.ok(!src.includes('night.weekday.slice'), 'the done card draws initials from weekdayName')
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
  const moved = { currentId: 'b1', boards: [takeDown(older.boards[0], lamp('y')), { id: 'b2', title: 'Other', lamps: [lamp('y')], answers: [{ lampId: 'y', periodKey: '2026-09-30', status: 'yes', answeredAt: '2026-09-30T10:00:00Z' }] }] }
  for (const both of [mergeShelves(moved, older, '2026-09-30', '2026-09-29'), mergeShelves(older, moved, '2026-09-29', '2026-09-30')]) {
    assert.deepEqual(both.boards.map((book) => book.lamps.map((item) => item.id)), [['x'], ['y']])
    // Its answers go with it, including the ones the older phone kept in b1.
    assert.deepEqual(both.boards[1].answers.map((item) => item.periodKey).sort(), ['2026-09-29', '2026-09-30'])
    assert.equal(both.boards[0].answers.length, 0)
  }
  // A row pulled from the server with the old board_id lands in the new home.
  const pulledRow = [{ lamp_id: 'y', period_key: '2026-10-01', board_id: 'b1', status: 'yes', answered_at: '2026-10-01T10:00:00Z' }]
  const applied = applyAnswers(normalizeShelf(moved), pulledRow).shelf
  assert.ok(applied.boards[1].answers.some((item) => item.periodKey === '2026-10-01'))
})

test('a question deleted while the launch sync is out stays deleted', () => {
  const start = { currentId: 'b1', boards: [{ id: 'b1', title: 'Tag', lamps: [lamp('x'), lamp('y')], answers: [{ lampId: 'y', periodKey: '2026-10-06', status: 'yes', answeredAt: '2026-10-06T10:00:00Z' }] }] }
  // The pull read this phone, then the server, which still has y.
  const pulled = mergeShelves(start, start, '2026-10-06T10:00', '2026-10-06T09:00')
  // Meanwhile the delete lands on this phone.
  const after = { ...start, boards: [takeDown(start.boards[0], lamp('y'), new Date('2026-10-06T10:01:00Z'))] }
  assert.ok(pulled.boards[0].lamps.some((item) => item.id === 'y'), 'writing the pulled shelf as is would bring y back')
  const landed = mergeShelves(after, pulled, '2026-10-06T10:01', '2026-10-06T10:00')
  assert.deepEqual(landed.boards[0].lamps.map((item) => item.id), ['x'])
  assert.equal(landed.boards[0].answers.length, 0)
  // The server's old answer row for y does not come back either.
  const rows = [{ lamp_id: 'y', period_key: '2026-10-06', board_id: 'b1', status: 'yes', answered_at: '2026-10-06T10:00:00Z' }]
  assert.equal(applyAnswers(landed, rows).shelf.boards[0].answers.length, 0)
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const sync = readFileSync(path.join(root, 'src/lib/cloud-sync.js'), 'utf8')
  assert.ok(!sync.includes('let written = writeShelf(') && sync.includes('written = land(written, uploadAt)'), 'the pull folds in local saves made while it ran')
  const hook = readFileSync(path.join(root, 'native/hooks/useAppShelf.js'), 'utf8')
  assert.ok(!hook.includes('setShelf(result)'), 'the app shows the stored shelf after a pull, not the pull result')
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

test('a never-answered starter the account already has does not merge in as a twin', () => {
  const water = (id, cadence = 'daily') => ({ ...lamp(id), question: 'Did I drink water?', cadence })
  const shelf = normalizeShelf({
    currentId: 'cloud',
    boards: [
      { id: 'cloud', title: 'General', lamps: [water('x')], answers: [] },
      { id: 'phone', title: 'General', lamps: [water('s1'), { ...lamp('s2'), question: 'Did I stretch?' }, water('w', 'weekly'), { ...water('t'), askAfter: '07:00' }], answers: [] },
    ],
  })
  const ids = shelf.boards.flatMap((book) => book.lamps.map((one) => one.id)).sort()
  assert.deepEqual(ids, ['s2', 't', 'w', 'x'], 'the twin goes; a different schedule or ask time stays')
})

test('undo puts a removed folder back as itself, even when another took its name', () => {
  const start = { currentId: 'b1', boards: [{ id: 'b1', title: 'Home', lamps: [lamp('x')], answers: [] }, { id: 'b2', title: 'Work', lamps: [lamp('y')], answers: [] }] }
  const removed = start.boards[1]
  let shelf = normalizeShelf(dropBook(start, 'b2'))
  shelf = { ...shelf, boards: shelf.boards.map((book) => (book.id === 'b1' ? { ...book, title: 'Work' } : book)) }
  const back = putBook(shelf, removed)
  assert.deepEqual(back.boards.map((book) => book.id).sort(), ['b1', 'b2'])
  assert.ok(back.goneTags.some((item) => item.id === 'b2' && item.back), 'the delete marker is lifted')
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

await testAsync('every accessory can be given, at its shop price and dates', async () => {
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

await testAsync('a seasonal accessory is sold only in its season, and kept after', async () => {
  const { accessoryOnSale, accessoryById } = await import('../src/lib/accessories.js')
  const { normalizePurse } = await import('../src/lib/purse.js')
  const witch = accessoryById('witch')
  assert.ok(accessoryOnSale(witch, '2026-10-15'))
  assert.ok(!accessoryOnSale(witch, '2026-11-01'))
  assert.ok(!accessoryOnSale(witch, '2026-09-30'))
  assert.deepEqual(normalizePurse({ accessories: ['witch'], worn: { head: 'witch' } }).worn, { head: 'witch' })
})

await testAsync('signed in, the server list is the whole accessory list, like coin looks', async () => {
  const { applyCoinCatalogToBook } = await import('../src/lib/wallet.js')
  const { normalizePurse } = await import('../src/lib/purse.js')
  const book = { coins: 5, accessories: ['crown', 'beanie'], worn: { head: 'crown' }, buddyOn: 'ant' }
  const next = normalizePurse(applyCoinCatalogToBook(book, { coins: 5, looks: [], cheerStages: {}, accessories: ['beanie'] }))
  assert.deepEqual(next.accessories, ['beanie'])
  assert.deepEqual(next.worn, {}, 'an accessory the server does not have comes off')
  assert.equal(applyCoinCatalogToBook(book, { coins: 0, looks: [], cheerStages: {}, accessories: [] }).coins, 0, 'a server balance of 0 is kept')
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

test('a family code is six or ten and an invite code is ten', () => {
  assert.equal(cleanCode('abc-234 xx'), 'ABC234XX')
  assert.equal(cleanCode('abc-234 xxyyz'), 'ABC234XXYY')
  assert.equal(cleanInvite('d93aq5lbs4zzz'), 'D93AQ5LBS4')
  assert.equal(cleanInvite('D93AQ5LBS4').length, 10)
  // New family codes are 10 (apps from 1.3.8); the file runs after people.sql.
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  assert.match(readFileSync(path.join(root, 'supabase/family-code-10.sql'), 'utf8'), /for i in 1\.\.10 loop/)
  const order = readFileSync(path.join(root, 'scripts/apply-all-sql.mjs'), 'utf8')
  assert.ok(order.indexOf('family-code-10.sql') > order.indexOf('people.sql'))
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

// A translation can only use {placeholders} the English string is given.
test('locale placeholders match English', () => {
  const holes = (text) => String(text).match(/\{\w+\}/g) || []
  const bad = []
  for (const [code, pack] of Object.entries({ es, fr, de, pt, it, zh, ja, ko })) {
    for (const [key, value] of Object.entries(pack)) {
      const mine = new Set(holes(en[key]))
      const extra = holes(value).filter((hole) => !mine.has(hole))
      if (extra.length) bad.push(`${code} ${key}: ${extra.join(' ')}`)
    }
  }
  assert.deepEqual(bad, [])
})

// Chinese, Japanese and Korean keep only product and brand words in English.
test('zh, ja and ko have no stray English words', () => {
  const keep = new Set(('Did I we you coin coins gem gems cheer cheers Google Play Apple App Store Android iPhone iOS Mac Windows ' +
    'Safari Chrome Siri Watch Wear OS Assistant Supabase EAS Expo Firebase Cloud Messaging Vercel React Excel Sheets CSV PIN QR ID AM PM ' +
    'URL JSON HTTPS IP OK D Hayes Street Jordan Hale Aaron Bryant AQ LBS ' +
    // Widget names in the phone's widget picker, which is not translated.
    'today tonight questions together').toLowerCase().split(' '))
  const skip = (key) => /^(legal|lang|site\.into|device)\./.test(key) || /^(cheer|look)\.\w+\.name$/.test(key) ||
    key === 'site.door.title' || key === 'site.read.p5' || mayMatchEnglish(key)
  for (const [code, table] of Object.entries({ zh, ja, ko })) {
    const stray = []
    for (const [key, value] of Object.entries(table)) {
      if (skip(key)) continue
      const text = value.replace(/\{\w+\}/g, ' ').replace(/\S*[@.\/]\w\S*/g, ' ')
      const words = (text.match(/[A-Za-z][A-Za-z'-]*/g) || []).filter((word) => !keep.has(word.toLowerCase()))
      if (words.length) stray.push(`${key}: ${words.join(' ')}`)
    }
    assert.deepEqual(stray, [], `${code} has English words; translate them in src/locales/${code}.js`)
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

await testAsync('the widget holds back a question until its ask time, like the stack', async () => {
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

await testAsync('the widget says all clear when tonight is done, even with open-only on', async () => {
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

await testAsync('a kept did you stays marked with who sent it, so Questions can show it apart', async () => {
  const { keptLamp } = await import('../src/lib/send-repeat.js')
  const { normalizeLamp } = await import('../src/lib/board-json.js')
  const kept = normalizeLamp(keptLamp({ question: 'Did you call grandma?', person: { display_name: '  Sam  ' } }))
  assert.equal(kept.fromDidYou, true)
  assert.equal(kept.fromName, 'Sam')
  const own = normalizeLamp(keptLamp('Did I stretch?'))
  assert.equal(own.fromDidYou, undefined)
  assert.equal(own.fromName, undefined)
})

await testAsync('a one-time question stops asking once its day is behind us', async () => {
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

await testAsync('a phone moves to its stable id once and hands back the old key', async () => {
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

await testAsync('the dots legend seen flag rides in the synced prefs', async () => {
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

await testAsync('the update prompt compares x.y.z and never locks out on a bad row', async () => {
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

await testAsync('tonight orders questions by ask time, untimed ones first, priority breaking ties', async () => {
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

await testAsync('a hand-set question order beats priority, survives normalize, and spans folders', async () => {
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

await testAsync('every accessory the shop shows is sold by the server at the same price', async () => {
  const { ACCESSORIES } = await import('../src/lib/accessories.js')
  const sql = readFileSync(new URL('../supabase/shop-catalog.sql', import.meta.url), 'utf8')
  const rows = new Map([...sql.matchAll(/\('accessory', '(\w+)', (\d+)[,)]/g)].map((m) => [m[1], Number(m[2])]))
  for (const item of ACCESSORIES) assert.equal(rows.get(item.id), item.coins, item.id)
  assert.equal(rows.size, ACCESSORIES.length)
})

await testAsync('an accessory costs coins once, goes on, and comes off with a second tap', async () => {
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

await testAsync('a night pays 2 a Did on up to 3 questions', async () => {
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

test('stale widget props never undo a newer answer for tonight', () => {
  const book = {
    id: 'tag-a',
    title: 'A',
    lamps: [{ id: 'l1', question: 'One?', cadence: 'daily', archived: false }],
    answers: [],
  }
  const clock = new Date(2026, 8, 20, 21, 0)
  const shelf = writeShelf({ currentId: 'tag-a', boards: [book] })
  const props = buildTonightWidgetProps(shelf, clock)
  const did = mergeWidgetPropsIntoShelf(shelf, { items: props.items.map((item) => ({ ...item, status: 'yes' })) }, clock)
  const stale = mergeWidgetPropsIntoShelf(did, { items: props.items.map((item) => ({ ...item, status: 'skip' })) }, clock)
  assert.equal(stale, did, 'a stale nope does not replace a did from the web')
  const nope = mergeWidgetPropsIntoShelf(shelf, { items: props.items.map((item) => ({ ...item, status: 'skip' })) }, clock)
  const turned = mergeWidgetPropsIntoShelf(nope, { items: props.items.map((item) => ({ ...item, status: 'yes' })) }, clock)
  assert.notEqual(turned.boards[0].answers.find((row) => row.lampId === 'l1')?.status, 'skip', 'a nope can still turn into a did')
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
  // A day kept from before a switch to monthly stays closed, and the other way round.
  assert.ok(periodPassed({ ...lamp, cadence: 'monthly' }, pastKey, todayIso), 'an old daily key stays passed after a switch to monthly')
  assert.ok(!periodPassed(lamp, todayIso.slice(0, 7), todayIso), 'this month stays open after a switch to daily')
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
  const answered = findPress(mixedTree, 'did:door|n')()
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

await testAsync('a widget or reminder Did pays one purse, not one per folder', async () => {
  const { mergePurses } = await import('../src/lib/purse.js')
  const folder = (id, lamp) => ({
    id,
    title: id,
    coins: 16,
    lamps: [{ id: lamp, question: `${lamp}?`, cadence: 'daily', archived: false, createdOn: '2020-01-01' }],
    answers: [],
  })
  const fresh = () => writeShelf({ currentId: 'f1', boards: [folder('f1', 'a'), folder('f2', 'b'), folder('f3', 'c')] })
  const at = new Date(2026, 8, 23, 21, 0)
  fresh()
  const tapped = applyWidgetTapOnce('b', 'did', '2026-09-23', at, at.getTime())
  const coins = tapped.boards.map((book) => book.coins)
  assert.ok(coins.every((n) => n === coins[0]), `every folder holds the same coins: ${coins}`)
  assert.ok(coins[0] > 16 && coins[0] <= 20, `one Did adds a few coins, got ${coins[0]}`)
  assert.equal(mergePurses(readShelf().boards).coins, coins[0])
  assert.equal(applyWidgetTapOnce('b', 'did', '2026-09-23', at, at.getTime()), null, 'a second tap the same night does nothing')
  assert.equal(mergePurses(readShelf().boards).coins, coins[0], 'and pays nothing')

  // The iOS widget path: answers merged from the widget's saved props.
  const shelf = fresh()
  const merged = mergeWidgetPropsIntoShelf(shelf, { items: [{ lampId: 'b', periodKey: '2026-09-23', status: 'yes' }] }, at)
  assert.deepEqual(merged.boards.map((book) => book.coins), [coins[0], coins[0], coins[0]])
  assert.equal(mergePurses(merged.boards).coins, coins[0])

  // Answers queued in two folders: both pays count, once each.
  const both = mergeWidgetPropsIntoShelf(
    fresh(),
    {
      items: [
        { lampId: 'a', periodKey: '2026-09-23', status: 'yes' },
        { lampId: 'b', periodKey: '2026-09-23', status: 'yes' },
      ],
    },
    at,
  )
  const pay = coins[0] - 16
  assert.deepEqual(both.boards.map((book) => book.coins), [16 + 2 * pay, 16 + 2 * pay, 16 + 2 * pay])

  // Folders already out of step (A 100, B 50): a tap on B starts from 100.
  writeShelf({ currentId: 'f1', boards: [{ ...folder('f1', 'a'), coins: 100 }, { ...folder('f2', 'b'), coins: 50 }] })
  const fixed = applyWidgetTapOnce('b', 'did', '2026-09-23', at, at.getTime())
  assert.deepEqual(fixed.boards.map((book) => book.coins), [100 + pay, 100 + pay])
  writeShelf({ currentId: 'f1', boards: [{ ...folder('f1', 'a'), coins: 100 }, { ...folder('f2', 'b'), coins: 50 }] })
  const props = mergeWidgetPropsIntoShelf(readShelf(), { items: [{ lampId: 'b', periodKey: '2026-09-23', status: 'yes' }] }, at)
  assert.deepEqual(props.boards.map((book) => book.coins), [100 + pay, 100 + pay])

  // A phone already out of step shows the largest folder, not the sum.
  assert.equal(mergePurses([{ coins: 16 }, { coins: 18 }, { coins: 16 }]).coins, 18)
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
    taskBody.includes('renderWidget(renderDidITonightAndroidWidget(props') && !taskBody.includes('later !== stamp'),
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
  assert.deepEqual(JSON.parse(run.stdout.trim().split('\n').pop()), { local: 0, server: { '2026-10-02': 2 }, after: {} })
  // The save hands what taps earned to the server.
  const shelfHook = readFileSync(path.join(root, 'native/hooks/useAppShelf.js'), 'utf8')
  assert.match(shelfHook, /takeEarnedCoins\(\)/)
  assert.match(shelfHook, /creditNightCoins\(night, earned\)/)
  // A failed credit keeps the coins for the next save.
  assert.match(shelfHook, /returnEarnedCoins\(night, earned, new Date\(\), taken\.gen\)/)

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

await testAsync('reviewer sign-in: off by default, a 3 second hold opens it only while the server switch is on', async () => {
  const { readReviewerFlag, REVIEWER_HOLD_MS } = await import('../src/lib/reviewer-flag.js')
  const db = (result) => ({ rpc: async (name) => (name === 'reviewer_signin_on' ? result() : { data: null, error: 'no' }) })
  assert.equal(await readReviewerFlag(db(() => ({ data: true, error: null }))), true, 'on reads as on')
  assert.equal(await readReviewerFlag(db(() => ({ data: false, error: null }))), false, 'off reads as off')
  assert.equal(await readReviewerFlag(db(() => ({ data: null, error: { message: 'x' } }))), false, 'an error reads as off')
  assert.equal(await readReviewerFlag(db(() => { throw new Error('offline') })), false, 'offline reads as off')
  assert.equal(await readReviewerFlag(db(() => ({ data: 'true', error: null }))), false, 'only a plain true is on')
  assert.equal(await readReviewerFlag(null), false, 'no cloud reads as off')
  assert.equal(REVIEWER_HOLD_MS, 3000)

  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const read = (p) => readFileSync(path.join(root, p), 'utf8')
  const hook = read('src/lib/useAuthSignIn.js')
  const sign = read('native/screens/SignInScreen.jsx')
  const mark = read('native/components/AuthMark.jsx')
  const web = read('src/lib/Account.jsx')
  assert.ok(hook.includes('const [reviewerOn, setReviewerOn] = useState(false)'), 'the switch starts off and is read from the server')
  assert.ok(/function showReviewer\(\) \{\s*if \(!reviewerOn\) return/.test(hook), 'flag off: opening reviewer sign-in does nothing')
  assert.ok(
    sign.includes("onMarkLongPress={auth.step === 'start' && auth.reviewerOn ? auth.showReviewer : undefined}"),
    'flag off: the title hold has no handler; flag on: it opens reviewer sign-in',
  )
  assert.ok(mark.includes('delayLongPress={REVIEWER_HOLD_MS}') && mark.includes('disabled={!on}'), 'the hold is 3 seconds and off without a handler')
  assert.ok(mark.includes("accessibilityActions={on ? [{ name: 'reviewer'"), 'VoiceOver gets the action only while on')
  assert.ok(
    mark.includes("accessibilityRole={on ? 'button' : 'text'}") && mark.includes("accessibilityHint={on ? t('auth.reviewerHint') : undefined}"),
    'on: the title is a button with a spoken hint; off: plain text',
  )
  const card = read('native/components/AuthEmailCard.jsx')
  assert.ok(
    card.includes("auth.step === 'start' && auth.reviewerOn ? (") && card.includes("label={t('auth.reviewer')} onPress={auth.showReviewer}") && card.includes("auth.step === 'reviewer' ?"),
    'More and People sign-in cards show the switch-gated reviewer button and its password field',
  )
  for (const src of [sign, card]) {
    assert.ok(src.includes('textContentType="password"') && src.includes('autoComplete="current-password"') && src.includes('textContentType="emailAddress"'), 'reviewer fields name password and email for autofill')
  }
  assert.ok(read('native/components/ui.jsx').includes('textContentType={textContentType}'), 'Field passes textContentType through')
  assert.ok(read('native/screens/more.jsx').includes('<AuthEmailCard') && read('native/screens/social.jsx').includes('<AuthEmailCard'), 'every native sign-in surface uses the card')
  assert.ok(hook.includes('watchReviewerFlag(setReviewerOn)'), 'the screen keeps watching the switch')

  // Retry: 1s, 3s, 10s, three at 30s, then stop; one shared watcher; never in the background.
  const { createReviewerWatch, reviewerRetryMs, REVIEWER_FOCUS_GAP_MS } = await import('../src/lib/reviewer-flag.js')
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(reviewerRetryMs), [1000, 3000, 10000, 30000, 30000, 30000, null])
  const tick = () => new Promise((r) => setTimeout(r, 0))
  function rig(answers = []) {
    const s = { waits: [], pending: null, reads: 0, clock: 0, front: true, frontFns: new Set(), focusFns: new Set() }
    s.watch = createReviewerWatch({
      read: async () => {
        s.reads += 1
        return answers.shift() ?? false
      },
      setTimer: (fn, ms) => {
        s.waits.push(ms)
        s.pending = fn
        return ms
      },
      clearTimer: () => {
        s.pending = null
      },
      now: () => s.clock,
      isFront: () => s.front,
      onFront: (fn) => {
        s.frontFns.add(fn)
        return () => s.frontFns.delete(fn)
      },
      win: { addEventListener: (_, fn) => s.focusFns.add(fn), removeEventListener: (_, fn) => s.focusFns.delete(fn) },
    })
    s.fire = async () => {
      await tick()
      const fn = s.pending
      s.pending = null
      if (fn) fn()
      await tick()
    }
    s.setFront = async (on) => {
      s.front = on
      s.frontFns.forEach((fn) => fn(on))
      await tick()
    }
    s.focus = async () => {
      s.focusFns.forEach((fn) => fn())
      await tick()
    }
    return s
  }

  // Off forever: 7 reads (first + 6 retries), then nothing until the app comes back.
  const a = rig()
  const stopA = a.watch(() => {})
  const stopA2 = a.watch(() => {})
  for (let i = 0; i < 10; i++) await a.fire()
  assert.equal(a.reads, 7, 'two screens share one watcher, and it stops after the last 30s read')
  assert.deepEqual(a.waits, [1000, 3000, 10000, 30000, 30000, 30000], 'backs off 1s, 3s, 10s, then three at 30s')
  await a.setFront(false)
  await a.setFront(true)
  assert.equal(a.reads, 8, 'coming back to the front re-arms')
  await a.setFront(false)
  assert.equal(a.pending, null, 'nothing scheduled in the background')
  await a.fire()
  assert.equal(a.reads, 8)
  a.front = true
  a.clock = REVIEWER_FOCUS_GAP_MS
  await a.focus()
  assert.equal(a.reads, 9, 'web focus re-reads')
  a.clock = 2 * REVIEWER_FOCUS_GAP_MS - 1
  await a.focus()
  assert.equal(a.reads, 9, 'web focus waits 5s between reads')
  for (let i = 0; i < 10; i++) await a.fire()
  assert.equal(a.pending, null, 'retries ran out again')
  const ranOut = a.reads
  const stopA3 = a.watch(() => {})
  await tick()
  assert.equal(a.reads, ranOut, 'a new screen within 5s of a read does not read again')
  stopA3()
  a.clock += REVIEWER_FOCUS_GAP_MS + 1
  const stopA4 = a.watch(() => {})
  await tick()
  assert.equal(a.reads, ranOut + 1, 'a sign-in screen opened later re-reads once the retries ran out')
  stopA4()
  stopA()
  stopA2()
  assert.equal(a.frontFns.size + a.focusFns.size, 0, 'last screen gone: listeners removed')
  await a.setFront(true)
  await a.fire()
  assert.equal(a.reads, ranOut + 1, 'unmounted: no more reads')

  // Turns on: reports once, stops, and a later screen gets on at once.
  const b = rig([false, false, true])
  const seen = []
  b.watch((on) => seen.push(on))
  for (let i = 0; i < 5; i++) await b.fire()
  assert.deepEqual(seen, [true], 'reports on once')
  assert.equal(b.reads, 3)
  assert.equal(b.pending, null, 'no retry after on')
  await b.setFront(true)
  assert.equal(b.reads, 3, 'no re-read once on')
  const late = []
  b.watch((on) => late.push(on))
  assert.deepEqual(late, [true], 'a screen mounted later sees on without a read')

  // Starts in the background: no read until the app comes to the front.
  const c = rig()
  c.front = false
  c.watch(() => {})
  await tick()
  assert.equal(c.reads, 0, 'no read while in the background')
  await c.setFront(true)
  assert.equal(c.reads, 1)

  const shell = read('native/components/BoardShell.jsx')
  assert.ok(shell.includes('<KeyboardAvoidingView') && shell.includes('keyboardShouldPersistTaps="handled"'), 'More and People cards sit in BoardShell, which lifts the form over the keyboard')
  assert.ok(web.includes("auth.step === 'start' && auth.reviewerOn ? ("), 'web hides reviewer sign-in while off')
  const sql = read('supabase/reviewer-flag.sql')
  assert.ok(sql.includes("values ('reviewer_signin', false)") && sql.includes("set search_path = ''") && sql.includes('enable row level security'), 'the switch ships off, RLS on, pinned search_path')
  const order = read('scripts/apply-all-sql.mjs')
  assert.ok(order.indexOf('reviewer-flag.sql') > 0 && order.indexOf('reviewer-flag.sql') < order.indexOf('drop-tonight.sql'), 'applied before drop-tonight.sql')
})

test('a fresh phone opens on welcome, a phone already in use does not, a lost session shows sign-in', () => {
  const prev = globalThis.__didIPlatform
  globalThis.__didIPlatform = 'ios'
  clearAuthSkip()
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const shell = readFileSync(path.join(root, 'native/AppShell.jsx'), 'utf8')
  const sign = readFileSync(path.join(root, 'native/screens/SignInScreen.jsx'), 'utf8')
  const actions = readFileSync(path.join(root, 'native/components/AuthSignInActions.jsx'), 'utf8')
  try {
    localStorage.removeItem('did-i-welcome')
    localStorage.removeItem('did-i-shelf')
    writeAccountUserId('')
    assert.equal(needsAuth({ ready: false, user: null }), true, 'a fresh install starts on the welcome screen')
    localStorage.setItem('did-i-shelf', JSON.stringify({ boards: [{ id: 'b', lamps: [{ id: 'l', question: 'Did I take my meds?' }] }] }))
    assert.equal(needsAuth({ ready: true, user: null }), false, 'a phone already used without an account is not walled')
    localStorage.removeItem('did-i-shelf')
    localStorage.setItem('did-i-welcome', '1')
    assert.equal(needsAuth({ ready: true, user: null }), false, 'a finished first night is not walled')
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
    assert.ok(
      sign.includes("auth.step === 'start' && auth.reviewerOn ? (") && sign.includes('<KeyButton colors={colors} label={t(\'auth.reviewer\')} onPress={auth.showReviewer}'),
      'App Review sign-in is a full-width button, shown only while the switch is on',
    )
    assert.ok(
      sign.indexOf("t('auth.getStarted')") > -1 && sign.indexOf("t('auth.getStarted')") < sign.indexOf('<AuthSignInActions'),
      'Get started is the first button on Welcome, sign-in options sit under it',
    )
    assert.ok(sign.includes('skipAuth()'), 'staying on this phone records the skip')
    assert.ok(sign.includes('onDone?.()'), 'staying on this phone opens the app')
    skipAuth()
    assert.equal(needsAuth({ ready: false, user: null }), false)
    assert.equal(authGated('/tonight', { ready: true, user: null }), false)
  } finally {
    clearAuthSkip()
    localStorage.removeItem('did-i-welcome')
    if (prev == null) delete globalThis.__didIPlatform
    else globalThis.__didIPlatform = prev
  }
})

test('first five minutes: first run can go back to Welcome, the swipe hint is one line cleared by the first answer', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const more = readFileSync(path.join(root, 'native/screens/more.jsx'), 'utf8')
  const intro = readFileSync(path.join(root, 'native/components/SwipeIntro.jsx'), 'utf8')
  const tonight = readFileSync(path.join(root, 'native/screens/TonightScreen.jsx'), 'utf8')
  assert.ok(more.includes('{step > 0 ? <KeyButton') && more.includes("t('first.back')"), 'Back shows after step one, not on it')
  assert.ok(more.includes("t('first.haveAccount')"), 'step one keeps I have an account as a full button')
  assert.ok(!intro.includes('<Modal'), 'the swipe hint is not a popup')
  assert.ok(intro.includes("t('swipeIntro.line')"), 'the swipe hint is one line')
  assert.ok(tonight.includes('markSwipeIntroSeen()'), 'the first answer clears the swipe hint')
})

test('first run picks questions and packs, adds them with one time, face is the first', () => {
  const starters = starterList()
  let picks = []
  for (const item of starters) picks = togglePick(picks, item, 3)
  assert.equal(picks.length, 3, 'the cap holds')
  picks = togglePick(picks, starters[0], 3)
  assert.equal(picks.length, 2, 'a second tap takes it off')
  const all = packList({ lamps: [] })
  assert.ok(all.reduce((n, pack) => n + pack.items.length, 0) <= FIRST_PICKS_MAX, 'every pack question fits under the cap')
  const [bed, meds] = all
  let packed = togglePack([], bed)
  assert.equal(packState(packed, bed), 'all', 'a pack tap checks every question in it')
  packed = togglePick(packed, bed.items[0])
  assert.equal(packState(packed, bed), 'some', 'one question can come off a pack')
  packed = togglePack(packed, meds)
  packed = togglePack(packed, bed)
  assert.equal(packState(packed, bed), 'all', 'a partly picked pack fills back up')
  packed = togglePack(packed, bed)
  assert.equal(packState(packed, bed), 'none', 'a second tap on a full pack clears it')
  assert.equal(packState(packed, meds), 'all', 'clearing one pack leaves the others')
  assert.equal(togglePack(togglePack([], meds), meds).length, 0, 'a pack can always be unpicked')
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
  // Later is a week, not for good.
  assert.equal(signInNudgeSeen(Date.now() + 8 * 24 * 60 * 60 * 1000), false)
  localStorage.removeItem('did-i-night-one')
  localStorage.removeItem('did-i-sign-in-nudge')
})

test('widget tip shows from day 2, never with a widget, at most twice, 3 days apart', () => {
  const ask = (state, today, more = {}) =>
    shouldShowWidgetTip({ state, today, hasQuestion: true, widgetPlaced: false, busy: false, ...more })
  let tip = countWidgetTipDay({}, '2026-10-01')
  assert.equal(countWidgetTipDay(tip, '2026-10-01'), tip)
  assert.equal(ask(tip, '2026-10-01'), false)
  tip = countWidgetTipDay(tip, '2026-10-02')
  assert.equal(tip.days, 2)
  assert.equal(ask(tip, '2026-10-02'), true)
  assert.equal(ask(tip, '2026-10-02', { widgetPlaced: true }), false)
  assert.equal(ask(tip, '2026-10-02', { hasQuestion: false }), false)
  assert.equal(ask(tip, '2026-10-02', { busy: true }), false)
  assert.equal(ask({ ...tip, done: true }, '2026-10-02'), false)
  tip = { ...tip, shown: 1, shownDay: '2026-10-02' }
  assert.equal(ask(tip, '2026-10-04'), false)
  assert.equal(ask(tip, '2026-10-05'), true)
  tip = { ...tip, shown: 2, shownDay: '2026-10-05' }
  assert.equal(ask(tip, '2026-12-01'), false)
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
  assert.ok(sheet.includes('useReduceMotion()') && sheet.includes('Animated.timing'), 'sheets slide in, and not with Less motion on')
  const motion = readFileSync(path.join(root, 'native/lib/motion.jsx'), 'utf8')
  assert.ok(/if \(reduce\) return/.test(motion) && motion.includes('motionOff()'), 'shared motion helpers stop for Less motion')
  const ui = readFileSync(path.join(root, 'native/components/ui.jsx'), 'utf8')
  assert.ok((ui.match(/pressFx\(pressed\)/g) || []).length >= 4, 'shared buttons dip when pressed')
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
  assert.ok(!plist.includes('NSMotionUsageDescription'), 'shake is off, so iOS never asks for motion')
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
  assert.deepEqual(streakParts(7), { before: '', after: ' days in a row' })
  assert.equal(streakParts(1), null)
})

test('undo, marks and errors wait their turn in one toast line', () => {
  const ids = () => toastQueue().map((item) => item.id)
  showToast({ id: 'mark:a', kind: 'mark' })
  showToast({ id: 'sync-miss', kind: 'error' })
  assert.deepEqual(ids(), ['mark:a', 'sync-miss'], 'first come, first shown')
  showToast({ id: 'undo:tonight', kind: 'undo', rev: 1 })
  assert.deepEqual(ids(), ['undo:tonight', 'mark:a', 'sync-miss'], 'an undo goes first, a mark waits behind it')
  showToast({ id: 'undo:questions', kind: 'undo', rev: 2 })
  assert.deepEqual(ids(), ['undo:questions', 'mark:a', 'sync-miss'], 'a newer undo replaces the older')
  showToast({ id: 'undo:questions', kind: 'undo', rev: 3 })
  assert.equal(toastQueue()[0].rev, 3, 'the same toast updates in place')
  dropToast('mark:a')
  dropToast('undo:questions')
  dropToast('sync-miss')
  assert.deepEqual(ids(), [])
  showToast({ id: 'mark:b', kind: 'mark' })
  showToast({ id: 'undo:tonight', kind: 'undo' })
  assert.deepEqual(ids(), ['undo:tonight', 'mark:b'])
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

test('sun rays sit evenly around the disc center at every stage and size', () => {
  for (let stage = 1; stage <= 5; stage++) {
    for (const pop of popsFor('sun', stage)) {
      const sun = pop.bits.find((bit) => bit.sun)
      for (const px of [8, 33.6, Number.parseFloat(sun.size) * 16]) {
        const { count, box, rays } = sunRayLayout(px, sun.rays)
        assert.equal(rays.length, count)
        assert.equal(count % 2, 0, 'long and short rays alternate all the way round')
        rays.forEach((ray, i) => {
          assert.ok(Math.abs(ray.deg - (360 / count) * i) < 1e-9, 'even spacing')
          assert.ok(Math.abs(ray.left + ray.w / 2 - box / 2) < 1e-9, 'ray on the center line')
          assert.ok(ray.top + ray.len - ray.len * 1.25 >= 0, 'ray fits in its box at the 1.25 grow')
          assert.ok(box / 2 - (ray.top + ray.len) > px / 2, 'ray starts outside the disc')
        })
      }
    }
  }
})

test('sun rays grow from their base with translates, so preview replays keep the pivot', () => {
  const src = readFileSync(fileURLToPath(new URL('../native/components/CheerBurst.jsx', import.meta.url)), 'utf8')
  const ray = src.slice(src.indexOf('function SunRay'), src.indexOf('function Sun('))
  assert.ok(!ray.includes('transformOrigin'))
  assert.ok(ray.includes('[{ translateY: ray.len / 2 }, { scaleY }, { translateY: -ray.len / 2 }]'))
})

test('by day the sun rises left, peaks at noon and sets right', () => {
  const at = (h, m = 0) => new Date(2026, 9, 14, h, m)
  assert.equal(isDaytime(at(5, 59)), false)
  assert.equal(isDaytime(at(6)), true)
  assert.equal(isDaytime(at(17, 59)), true)
  assert.equal(isDaytime(at(18)), false)
  const morning = sunAt(at(7), 300, 200, 40)
  const noon = sunAt(at(12), 300, 200, 40)
  const evening = sunAt(at(17), 300, 200, 40)
  assert.ok(morning.x < noon.x && noon.x < evening.x, 'it crosses left to right')
  assert.ok(noon.y < morning.y && noon.y < evening.y && noon.y >= 0, 'it is highest at noon and stays in the sky')
  assert.ok(evening.x + 40 <= 300 && morning.y + 40 <= 200, 'it stays in the box')
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

test('a bad OTA can roll back: early fatal errors reach the native handler, boot draws nothing, fail screen retries', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const guard = readFileSync(path.join(root, 'native/fatal-guard.cjs'), 'utf8')
  const boot = readFileSync(path.join(root, 'native/Boot.jsx'), 'utf8')
  const app = readFileSync(path.join(root, 'native/NativeApp.jsx'), 'utf8')
  assert.match(guard, /isFatal && !__DEV__ && !global\.__didIReady && !embedded/)
  assert.match(guard, /let embedded = true\s+try \{\s+embedded = Boolean\(require\('expo-updates'\)\.isEmbeddedLaunch\)/)
  assert.match(guard, /\(!isFatal \|\| early\) && typeof prev === 'function'\) prev\(error, isFatal\)/)
  assert.doesNotMatch(app, /__didIReady/)
  assert.match(boot, /global\.__didIReady = true\s+setApp\(/)
  assert.match(boot, /!mod\.isEmbeddedLaunch[\s\S]*getGlobalHandler\(\)\(error, true\)[\s\S]*setTimeout\(showFail, 3000\)\s+return \(\) => clearTimeout\(timer\)/)
  assert.match(boot, /const showFail = [\s\S]*setFail\([\s\S]*SplashScreen\.hideAsync\(\)/)
  assert.match(boot, /DevSettings\.reload\(\)/)
  assert.match(boot, /reloadAsync\(\)\.catch\(\(\) => setRetryFailed\(true\)\)/)
  assert.match(boot, /t\('boot\.retryFail'\)/)
  assert.match(boot, /if \(!App\) return null/)
  assert.match(boot, /t\('boot\.retry'\)/)
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
  // No Did sound on the phone, so playClick adds nothing.
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

await testAsync('Did we days before the first question still count in the streak', async () => {
  const { setWeNightRows, clearWeNights } = await import('../src/lib/we-nights.js')
  const clock = new Date(2026, 9, 10, 21, 0)
  const book = { id: 'b1', title: 'General', dayFoldHour: 0, lamps: [{ id: 'q', question: 'Did I read?', cadence: 'daily', archived: false, createdOn: '2026-10-08' }], answers: ['2026-10-08', '2026-10-09', '2026-10-10'].map((n) => ({ lampId: 'q', periodKey: n, status: 'yes', answeredAt: n + 'T20:00:00' })) }
  try {
    setWeNightRows(['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'].map((night) => ({ card: 'c1', folder: '', night, status: 'did' })))
    assert.equal(shelfStreak([book], clock), 5, 'two Did we days before the question was made still count')
  } finally {
    clearWeNights()
  }
})

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

await testAsync('a skip reads Not yet while its night is open, Said not yet once it closed', async () => {
  const { answerWord, nightOpen } = await import('../src/lib/recurrence.js')
  const { nightWhyLines } = await import('../src/lib/night-why.js')
  const { pillStatusLabel } = await import('../src/lib/pill-status.js')
  // Friday Oct 2 is the night; it stays open until 9am Saturday.
  const fri = '2026-10-02'
  const sat2am = new Date(2026, 9, 3, 2, 0)
  const sat9am = new Date(2026, 9, 3, 9, 0)
  assert.equal(nightOpen(fri, new Date(2026, 9, 2, 22, 0)), true, 'tonight is open')
  assert.equal(nightOpen(fri, sat2am), true, 'open through the grace period')
  assert.equal(nightOpen(fri, sat9am), false, 'closed at 9am')
  assert.equal(nightOpen('2026-09-30', sat2am), false, 'older nights are closed')
  assert.equal(answerWord('skip', true), 'notYet')
  assert.equal(answerWord('skip', false), 'nope')
  assert.equal(answerWord('', false), 'nope', 'an empty closed night is a nope')
  assert.equal(answerWord('', true), '', 'an empty open night is just open')
  assert.equal(answerWord('yes', false), 'yes')
  assert.equal(answerWord('late', true), 'late')
  assert.equal(pillStatusLabel('skip'), 'Marked not yet')
  const why = (iso, state) => ({ iso, state, noped: [{ lamp: { question: 'Did I read?', short: 'Read' } }], unanswered: [], weOpen: [] })
  assert.match(nightWhyLines(why(fri, 'missed'), { now: sat2am }).join(' '), /Not yet: Read/)
  assert.match(nightWhyLines(why(fri, 'missed'), { now: sat9am }).join(' '), /Said not yet: Read/)
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
  assert.ok(streakHitCopy(2).body.startsWith('2 days'))
  assert.equal(streakHitCopy(3).title, en['streak.hitTitle'], 'three nights is')
  assert.equal(streakNights(1), '1 day in a row')
  assert.equal(streakNights(7), '7 days in a row')
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

await testAsync('"Streak broke" shows only for a missed past night, never for tonight reopening', async () => {
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

await testAsync('the 9 PM warning fires while tonight is open on a live streak, and friends see the real streak', async () => {
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

await testAsync('friend and family QR codes hold a didi link the scanner reads back', async () => {
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

await testAsync('a Did you link reads back from the page, the Open button, a copied line and the Play referrer', async () => {
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

await testAsync('a sent Did you edits only while it waits, a stopped link says so', async () => {
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

await testAsync('did-i.app/d/CODE is a site page, and the phone routes it to the add sheet', async () => {
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
    'answerFamilyLamp', 'weAnswer', 'editFamilyLamp', 'addFamilyLamp', 'dropFamilyLamp', 'renameFamily', 'saveFriendNote',
    'editSend', 'shareStreak', 'sendFriendCheer', 'sendFamilyCheer', 'reportDidYouLink',
  ]
  const SEEN = /confirmDone|confirmMiss|setMiss[(]|setSaid\(|\bsay\(|showToast\(|feel\.land\(|onSent\(|onDone\b|onAsked\(|setLinkSaid\(|offerWeWith\(|setNote\(|publishSheet\(\{|guide\(/
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
  // Buys, gem credits and sync: a throw or a miss shows something, with a retry where one helps.
  const coinShop = readFileSync(path.join(checkRoot, 'src/lib/coin-shop.js'), 'utf8')
  assert.ok(/function counted[\s\S]{0,400}catch[\s\S]{0,200}shop\.miss\.buyFail/.test(coinShop), 'a thrown buy returns buyFail, not a dead tap')
  const gemStore = readFileSync(path.join(checkRoot, 'native/iap/gem-store.js'), 'utf8')
  assert.ok(/purchaseUpdatedListener\([\s\S]{0,600}creditMissToast\(\)/.test(gemStore), 'a paid pack that does not credit says so')
  const meSrc = readFileSync(path.join(checkRoot, 'src/lib/cloud-sync.js'), 'utf8')
  assert.ok(/async function meOrThrow[\s\S]{0,200}if \(!data\?\.session && error\) throw error/.test(meSrc) && (meSrc.match(/await meOrThrow\(\)/g) || []).length === 2, 'an offline refresh failure never reads as signed out and wipes the shelf')
  const widgetSync = readFileSync(path.join(checkRoot, 'native/widget-sync.js'), 'utf8')
  assert.ok(/mine\.get\([^)]*\) !== item\.status[\s\S]{0,200}mergeWidgetPropsIntoShelf\(next, taps\(entry\.props\)\)/.test(widgetSync), 'a status the app wrote to the widget timeline is not merged back as a tap')
  assert.ok(/function creditMissToast[\s\S]{0,300}onPress/.test(gemStore), 'the credit miss toast retries on tap')
  assert.ok(/startGemPurchase\(packId\)\s*\}\s*catch/.test(readFileSync(path.join(checkRoot, 'src/lib/GemShop.jsx'), 'utf8')), 'web gem buy shows a store error')
  const tonightSrc = readFileSync(path.join(checkRoot, 'native/screens/TonightScreen.jsx'), 'utf8')
  assert.ok(/id: 'sync-miss'[^\n]*onPress: \(\) => pullAndMerge\(\)/.test(tonightSrc), 'the sync miss toast retries on tap')
  // After sign-in, loading rows until the first pull lands; never the done card.
  assert.ok(/if \(pullWait\) \{[\s\S]{0,300}<LateMeta/.test(tonightSrc), 'Tonight shows loading rows while the first pull is out')
  assert.ok(tonightSrc.indexOf('if (pullWait)') < tonightSrc.indexOf("'tonight.doneTitle'"), 'loading comes before the done card')
  const syncSrc = readFileSync(path.join(checkRoot, 'src/lib/cloud-sync.js'), 'utf8')
  assert.ok(/firstPull: true/.test(syncSrc) && /pulling = null\s*\n?\s*if \(state\.firstPull\) setState\(\{ firstPull: false \}\)/.test(syncSrc.replace(/\r/g, '')), 'the first pull flag always clears')
})

test('gentle mode: missed nights are plain on the calendar and week', () => {
  const read = (rel) => readFileSync(path.join(checkRoot, rel), 'utf8')
  assert.ok(read('src/lib/Calendar.jsx').includes("night.miss && prefs.gentle !== true ? 'is-miss'"), 'web calendar')
  assert.ok(read('src/lib/WeekGrid.jsx').includes("gentle && cell.state === 'hole' ? 'open'"), 'web week')
  const grid = read('native/components/CalendarGrid.jsx')
  assert.ok(grid.includes('prefs.gentle === true ? colors.open : colors.miss') && !/night\.miss \? colors\.miss/.test(grid), 'phone calendar and year')
  assert.ok(read('native/screens/more.jsx').includes("if (state === 'hole') return gentle ? colors.open : colors.miss"), 'phone week')
})

test('web first run: a welcome with Get started and sign in', () => {
  const app = readFileSync(path.join(checkRoot, 'src/App.jsx'), 'utf8')
  assert.ok(app.indexOf('<FirstWelcome') > 0 && app.indexOf('<FirstWelcome') < app.indexOf('<FirstNight'), 'welcome comes before /first')
  const welcome = readFileSync(path.join(checkRoot, 'src/lib/Welcome.jsx'), 'utf8')
  for (const key of ['auth.getStarted', 'auth.haveAccount', 'legal.signInLead']) assert.ok(welcome.includes(`t('${key}')`), key)
})

await testAsync('a Did we link is the same /d/ path with a 12 letter code, and its preview names the sender', async () => {
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

await testAsync('a question from Did I for one night never makes or breaks a streak', async () => {
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
  assert.ok(pings.includes('data: askNoteData(row)'), 'the night rides along so a late tap lands on it')
  const push = readFileSync(path.join(checkRoot, 'native/shim/push.js'), 'utf8')
  assert.ok(push.includes('notificationAnswer(response)'))
  const app = readFileSync(path.join(checkRoot, 'native/NativeApp.jsx'), 'utf8')
  assert.ok(app.includes('applyWidgetTapOnce(lampId, kind, night, new Date(), at || Date.now())'))
})

await testAsync('a spoken answer finds the right open question, or none', async () => {
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

await testAsync('a spoken answer about as close to two questions picks neither', async () => {
  const { matchSpoken } = await import('../src/lib/voice-answer.js')
  const rows = [
    { lamp: { id: 'a', question: 'Did I walk the dog?' } },
    { lamp: { id: 'b', question: 'Did I walk the cat?' } },
  ]
  assert.equal(matchSpoken('walk', rows), null, 'a tie must not answer the first row')
  assert.equal(matchSpoken('walk dog', rows)?.lamp.id, 'a', 'a clear winner still matches')
  // The same question from last night's grace rows is not a rival.
  assert.equal(matchSpoken('walk', [rows[0], { ...rows[0], periodKey: 'x' }])?.lamp.id, 'a')
})

test('didi://answer opens the card but never saves without a tap', () => {
  const links = readFileSync(path.join(checkRoot, 'native/deep-link.js'), 'utf8')
  assert.ok(!links.includes('applyWidgetTapOnce'), 'any app or page can open didi://answer')
  assert.match(links, /goHash\('\/tonight', \{ face: row\.lamp\.id, tag: 'all' \}\)/)
})

test('a repeat tap on a lit Did we answer does not clear it', () => {
  const we = readFileSync(path.join(checkRoot, 'native/components/WeTonight.jsx'), 'utf8')
  assert.ok(we.includes('if (!night && status && mine?.status === status) return'))
  assert.ok(!/mine\?\.status === status \? null/.test(we), 'no toggle back to no answer')
  assert.ok(we.includes('if (paid.miss) paid = await claim()'), 'a missed claim is tried once more')
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
  const pick = "item.lampId === id && (!night || String(item.periodKey || '') === night) && (item.status === 'open' || (!hasOpen && item.status === 'skip'))"
  for (const src of [ios, android]) {
    assert.ok(src.replace(/\s+/g, ' ').includes(pick), 'leadItem still prefers leadLampId the same way')
    assert.ok(/items\.find\(\(item\) => item\.status === 'open'\)\s*\|\|\s*items\.find\(\(item\) => item\.status === 'skip'\)/.test(src), 'leadItem falls back open then nope')
  }
  assert.ok(ios.includes('const lead = leadItem(items, props?.leadLampId, props?.leadNight)'))
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

// WidgetKit evaluates the widget function's source on its own, in a context
// that holds only @expo/ui's exports and the jsx stub (expo-widgets/bundle).
// A throw there is an empty box in a Release build. Run it the same way.
await testAsync('the widget function draws on its own, with only what WidgetKit gives it', async () => {
  const vm = await import('node:vm')
  const require = createRequire(import.meta.url)
  const babel = require('@babel/core')
  const file = path.join(checkRoot, 'widgets/DidITonightWidget.tsx')
  const code = babel.transformFileSync(file, { filename: file, caller: { name: 'metro', platform: 'ios' } })?.code || ''
  const source = code.slice(code.indexOf('DidITonightWidget=`') + 'DidITonightWidget=`'.length, code.lastIndexOf('`;var widget'))
  // What expo-widgets/bundle/index.ts puts on globalThis: every export of
  // @expo/ui/swift-ui and its modifiers, following `export * from`.
  const exported = new Set()
  const seen = new Set()
  const readExports = (file) => {
    const found = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'].map((end) => file + end).find((p) => existsSync(p) && statSync(p).isFile())
    if (!found || seen.has(found)) return
    seen.add(found)
    const text = readFileSync(found, 'utf8')
    for (const m of text.matchAll(/export (?:const|function|class) (\w+)/g)) exported.add(m[1])
    for (const m of text.matchAll(/export \{([^}]*)\}/g)) {
      for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop()?.replace(/^type\s+/, '')
        if (name) exported.add(name)
      }
    }
    for (const m of text.matchAll(/export \* from '(\.[^']+)'/g)) readExports(path.join(path.dirname(found), m[1]))
  }
  readExports(path.join(checkRoot, 'node_modules/@expo/ui/src/swift-ui/index'))
  readExports(path.join(checkRoot, 'node_modules/@expo/ui/src/swift-ui/modifiers/index'))
  const ast = babel.parseSync(`(${source})`, { configFile: false, babelrc: false })
  const free = new Set()
  babel.traverse(ast, { Program(p) { for (const name of Object.keys(p.scope.globals)) free.add(name) } })
  const builtins = new Set(['Array', 'Boolean', 'Math', 'Number', 'Object', 'String', 'JSON', 'encodeURIComponent', '_jsx', '_jsxs', '_Fragment'])
  const missing = [...free].filter((name) => !builtins.has(name) && !exported.has(name))
  assert.deepEqual(missing, [], `the widget uses names WidgetKit does not have: ${missing.join(', ')}`)
  const sandbox = {}
  for (const name of free) {
    if (builtins.has(name)) continue
    sandbox[name] = /^[A-Z]/.test(name) ? (props) => ({ type: `${name}View`, props: props || {} }) : (...args) => ({ $type: name, args })
  }
  sandbox._jsx = sandbox._jsxs = (type, props) => (typeof type === 'function' ? type(props) : { type, props })
  const fn = vm.runInNewContext(`(${source})`, sandbox)

  const { saveWeLine } = await import('../src/lib/we-widget.js')
  const { wornShapes } = await import('../src/lib/accessory-shapes.js')
  const { ACCESSORIES } = await import('../src/lib/accessories.js')
  const clock = new Date(2026, 9, 3, 21, 0)
  const night = boardDate(clock)
  const slots = {}
  for (const item of ACCESSORIES) if (!slots[item.slot]) slots[item.slot] = item.id
  const worn = { ...slots }
  const lamp = (id, question) => ({ id, question, cadence: 'daily', archived: false, createdOn: '2026-01-01' })
  const book = (answers, extra = {}) => ({
    id: 'b1', title: 'General', dayFoldHour: 0,
    lamps: [lamp('door', 'Did I lock the door?')], answers,
    buddies: ['owl'], buddyOn: 'owl', accessories: Object.values(worn), worn, ...extra,
  })
  const gem = { bg: '#0a0e14', panel: '#111820', ink: '#e0e4f0', inkSoft: '#99a1b0', on: '#5ee8ff', skip: '#7d8694', miss: '#ff6f61', line: '#2b3140', look: 'glow', gem: true }
  const families = ['systemSmall', 'systemMedium', 'systemLarge', 'accessoryCircular', 'accessoryRectangular', 'accessoryInline']
  const drawAll = (props, label) => {
    for (const widgetFamily of families) {
      for (const widgetRenderingMode of ['fullColor', 'accented']) {
        // Props go through JSON, as they do to the app group and back.
        const out = JSON.stringify(fn(JSON.parse(JSON.stringify(props ?? null)), { widgetFamily, widgetRenderingMode }))
        assert.ok(out && out !== 'null', `${label} draws on ${widgetFamily}`)
      }
    }
  }
  try {
    saveWeLine('Did we · waiting on a friend', night)
    const open = buildTonightWidgetProps({ currentId: 'b1', boards: [book([])] }, clock)
    assert.equal(open.buddyId, 'owl')
    assert.ok(open.weLine, 'the Did we line reaches the widget')
    const dressed = { ...open, colors: gem, buddyShapes: wornShapes(open.buddyWorn, 'owl', gem.on) }
    assert.ok(dressed.buddyShapes.front.length, 'the owl wears something')
    drawAll(dressed, 'an owl in accessories on a gem look')
    const medium = JSON.stringify(fn(dressed, { widgetFamily: 'systemMedium', widgetRenderingMode: 'fullColor' }))
    assert.ok(medium.includes('Did I lock the door?') && medium.includes('waiting on a friend') && medium.includes('#8b6b4a'))
    const done = buildTonightWidgetProps({ currentId: 'b1', boards: [book([{ lampId: 'door', periodKey: night, status: 'yes', answeredAt: `${night}T20:00:00` }])] }, clock)
    drawAll({ ...done, colors: gem, buddyShapes: wornShapes(done.buddyWorn, 'owl', gem.on) }, 'an all-done night')
    drawAll(buildTonightWidgetProps({ boards: [] }, clock), 'an empty shelf')
    drawAll(undefined, 'no snapshot yet')

    // Bad decorations are dropped; the question still draws.
    const broken = {
      ...dressed,
      colors: { ...gem, on: null, bg: 42 },
      buddyShapes: { behind: 'oops', front: [null, ['e', 'x']] },
      items: [null, ...dressed.items],
      weLine: { not: 'a string' },
    }
    const kept = JSON.stringify(fn(broken, { widgetFamily: 'systemMedium', widgetRenderingMode: 'fullColor' }))
    assert.ok(kept.includes('Did I lock the door?'), 'a broken decoration never blanks the question')

    // Every so often lead: "Last time" line under it, a plain string prop.
    assert.equal(open.sinceLine, '', 'a daily lead has no last time line')
    const every = { id: 'sheets', question: 'Did I wash the sheets?', cadence: 'every', everyDays: 3, archived: false, createdOn: '2026-01-01' }
    const ago = addDaysIso(night, -6)
    const everyBook = book([{ lampId: 'sheets', periodKey: ago, status: 'yes', answeredAt: `${ago}T20:00:00` }], { lamps: [every] })
    const due = buildTonightWidgetProps({ currentId: 'b1', boards: [everyBook] }, clock)
    assert.equal(due.leadLampId, 'sheets')
    assert.equal(typeof due.sinceLine, 'string')
    assert.equal(due.sinceLine, t('every.lastMany', { n: 6 }))
    assert.equal(due.items[0].since, due.sinceLine)
    drawAll(due, 'an every so often lead')
    for (const widgetFamily of ['systemSmall', 'systemMedium', 'systemLarge']) {
      const drawn = JSON.stringify(fn(JSON.parse(JSON.stringify(due)), { widgetFamily, widgetRenderingMode: 'fullColor' }))
      assert.ok(drawn.includes(due.sinceLine), `the last time line draws on ${widgetFamily}`)
    }
    const never = buildTonightWidgetProps({ currentId: 'b1', boards: [book([], { lamps: [every] })] }, clock)
    assert.equal(never.sinceLine, t('every.never'))
    drawAll({ ...due, sinceLine: 42, items: due.items.map((item) => ({ ...item, since: null })) }, 'a bad last time line')
    const android = readFileSync(path.join(checkRoot, 'widgets/android/DidITonightAndroidWidget.jsx'), 'utf8')
    assert.ok(android.includes('text={sinceText}') && android.includes('p.sinceLine'), 'Android draws the last time line too')
    // Next and a tap move the line with the card.
    assert.equal(peekNextTonightCard({ ...due, items: [...due.items, { lampId: 'x', question: 'Q', status: 'open' }] }).sinceLine, '')
  } finally {
    saveWeLine('', night)
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
          { lampId: 'l1', periodKey: '2026-10-01', status: 'yes', note: '', amount: 5 },
          { lampId: 'gone', periodKey: '2026-10-03', status: 'late' },
        ],
      },
    ],
  }
  assert.equal(
    answersCsv(shelf),
    'date,question,short name,answer,note,amount\r\n' +
      '2026-10-01,"drink water, lots",Water,did,,5\r\n' +
      '2026-10-02,"drink water, lots",Water,not yet,"he said ""no""",\r\n' +
      '2026-10-03,,,late,,\r\n',
  )
  assert.equal(answersCsv({}), 'date,question,short name,answer,note,amount\r\n')
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

await testAsync('a Did we not due tonight names its next night, same rule as we_due', async () => {
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


await testAsync('the widget redraws at midnight and when last night\'s grace ends', async () => {
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
  // Night turns come first, so Android's alarm cap of 12 (WidgetAlarms) never
  // drops midnight. The iPhone timeline uses widgetTimelineTimes (cap 30).
  const turn = times[0]
  assert.notEqual(boardDate(turn), boardDate(now), 'the first redraw is on the new night')
  assert.equal(boardDate(new Date(turn.getTime() - 70 * 1000)), boardDate(now), 'and within a minute of the turn')
  assert.ok(times.some((d) => d.getHours() === 21 && d.getMinutes() === 0), 'ask times stay')
  assert.equal(new Set(times.map((d) => d.getTime())).size, times.length, 'no repeats')
  assert.ok(times.every((d) => d > now))
})

await testAsync('the iPhone widget timeline reaches the next nights, a card per night, and taps still carry', async () => {
  const { widgetTimelineTimes } = await import('../src/lib/widget-config.js')
  const { boardDate } = await import('../src/lib/recurrence.js')
  const book = {
    id: 't1',
    title: 'Home',
    dayFoldHour: 0,
    lamps: [{ id: 'late', question: 'Late one?', cadence: 'daily', archived: false, createdOn: '2020-01-01', askAfter: '21:00' }],
    answers: [],
  }
  const shelf = writeShelf({ currentId: 't1', boards: [book] })
  const now = new Date('2026-09-23T19:00:00')
  const times = widgetTimelineTimes([book], now)
  assert.ok(times.length <= 30 && times.every((d) => d > now), `got ${times.length}`)
  assert.equal(new Set(times.map((d) => d.getTime())).size, times.length, 'no repeats')
  for (const night of ['2026-09-23', '2026-09-24', '2026-09-25']) {
    const ask = times.find((d) => boardDate(d) === night && d.getHours() === 21)
    assert.ok(ask, `ask time on ${night}`)
    const props = buildTonightWidgetProps(shelf, ask)
    assert.equal(props.leadLampId, 'late', night)
    assert.ok(props.items.some((item) => item.lampId === 'late' && item.periodKey === night && item.status === 'open'), night)
  }
  assert.ok(times.some((d) => boardDate(d) === '2026-09-26'), 'the third midnight turns over too')
  // Twelve ask times a day fill the cap during day 2: the turns still stay.
  const many = { ...book, lamps: Array.from({ length: 12 }, (_, i) => ({ ...book.lamps[0], id: 'q' + i, askAfter: String(8 + i).padStart(2, '0') + ':00' })) }
  const crowded = widgetTimelineTimes([many], new Date('2026-09-23T07:00:00'))
  assert.ok(crowded.length <= 30)
  assert.ok(crowded.some((d) => boardDate(d) === '2026-09-26'), 'many ask times never cut the third midnight')
  // The native tap patch (patches/expo-widgets) closes lampId:periodKey in
  // later entries; each later night keeps its own open card.
  const entries = times.map((date) => ({ date, props: buildTonightWidgetProps(shelf, date) }))
  const tapped = entries.findIndex((e) => boardDate(e.date) === '2026-09-23' && e.props.leadLampId === 'late')
  assert.ok(tapped >= 0)
  const later = entries.slice(tapped + 1)
  assert.ok(later.some((e) => e.props.items.some((item) => item.lampId === 'late' && item.periodKey === '2026-09-24')), 'Thursday has its own card')
  assert.ok(later.every((e) => e.props.items.every((item) => item.lampId !== 'late' || item.periodKey !== '2026-09-23' || item.status === 'open')), 'the tapped card is the one the patch closes')
  const sync = readFileSync(path.join(checkRoot, 'native/widget-sync.js'), 'utf8')
  assert.ok(sync.includes('widgetTimelineTimes(boards'), 'iOS timeline uses the multi-night times')
})

await testAsync('iOS reads widget taps out of the timeline before writing it again', async () => {
  const sync = readFileSync(path.join(checkRoot, 'native/widget-sync.js'), 'utf8')
  const bridge = readFileSync(path.join(checkRoot, 'native/widget-bridge.js'), 'utf8')
  const shelfHook = readFileSync(path.join(checkRoot, 'native/hooks/useAppShelf.js'), 'utf8')
  const body = sync.slice(sync.indexOf('export async function syncTonightWidget'))
  assert.ok(body.indexOf('!timelineRead && readTimeline') < body.indexOf('updateTimeline'), 'sync waits for the read first')
  assert.ok(/readTimeline\(\)\.catch\(/.test(body), 'a failed read does not block the write')
  assert.ok(bridge.includes('setWidgetTimelineReader(() => beginWidgetRefresh())'))
  assert.ok(bridge.includes("if (state !== 'active') markWidgetTimelineRead(false)"), 'leaving the app marks it unread')
  // Only a getTimeline that worked marks it read; a failed one leaves it unread.
  const pull = sync.slice(sync.indexOf('export async function pullWidgetTimelineIntoShelf'))
  const pullTry = pull.slice(0, pull.indexOf('} catch'))
  assert.ok(pullTry.indexOf('timelineRead = true') > pullTry.indexOf('await api.getTimeline()'), 'read marked after getTimeline')
  assert.ok(!pull.slice(pull.indexOf('} catch'), pull.indexOf('} catch') + 60).includes('timelineRead'), 'a failed read stays unread')
  assert.ok(!bridge.includes('markWidgetTimelineRead()'), 'the bridge does not mark it read on its own')
  // A sign-in or sign-out overwrites the old account's timeline, never reads it in.
  assert.ok(/if \(changed\) markWidgetTimelineRead\(true\)\r?\n\s+const redraw = changed \? syncTonightWidget/.test(shelfHook), 'account change skips the read')
  // After the read, the newest stored shelf is drawn, not the read's copy.
  const afterRead = body.slice(body.indexOf('await readTimeline()'), body.indexOf('const built'))
  assert.ok(afterRead.includes('shelf = readShelf()') && !afterRead.includes('shelf = (await'), 'sync redraws from readShelf()')
  assert.ok(shelfHook.includes('beginWidgetRefresh()') && !shelfHook.includes('refreshWidgetTimelineFromKit()'), 'cold start shares the one read')
})

await testAsync('a widget card from an earlier night does not win after midnight', async () => {
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

await testAsync('the sync line says synced just now, or saved on this phone after a miss', async () => {
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

await testAsync('the error log keeps no personal content and is capped', async () => {
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
  assert.ok(push.indexOf('await accessToken()') < push.indexOf("rpc('take_push_batch'"), 'the Firebase token is fetched before rows are marked sent')
  assert.ok(push.indexOf('await apnsJwt()') < push.indexOf("rpc('take_push_batch'"), 'the Apple key is signed before rows are marked sent')
  assert.ok(/try \{\s*why = apple/.test(push), 'one failed send skips only that token')
  assert.ok(push.includes("console.error('push: send threw', apple ? 'ios' : 'android', (e as Error)?.name ?? 'error')"), 'a thrown send never logs the error text, which holds the token')
})

test('a sheet that pops up on Tonight catches the next tap', () => {
  const sheet = readFileSync(path.join(checkRoot, 'native/components/SheetHost.jsx'), 'utf8')
  assert.ok(!sheet.includes("pointerEvents={live ? 'auto' : 'none'}"), 'the veil never lets a tap through to Did or Nope')
  assert.ok(sheet.includes('if (live) once(sheet, sheet.onClose)'))
  // A double tap on Done runs the close once, not twice (a toggle would reopen it).
  assert.ok(sheet.includes('fired.current === of'), 'a sheet acts on its first Done or close only')
  assert.ok(!/onPress=\{\(\) => sheet\.on(Go|Close)/.test(sheet), 'every sheet button goes through once')
  // A closing sheet drops the keyboard while its text box is still mounted.
  assert.ok(sheet.includes('if (wasOpen.current) Keyboard.dismiss()'), 'closing a sheet drops the keyboard')
})

test('an achievement toasts once per phone, even when it is earned again', () => {
  const was = globalThis.localStorage
  const kv = new Map([['did-i-ach-caught-up', '1']])
  try {
    globalThis.localStorage = { getItem: (k) => kv.get(k) ?? null, setItem: (k, v) => kv.set(k, String(v)), removeItem: (k) => kv.delete(k) }
    assert.deepEqual(marksToToast(['first-did']), [{ id: 'first-did', more: 0, ids: ['first-did'] }])
    assert.deepEqual(marksToToast(['first-did']), [])
    assert.deepEqual(marksToToast(['first-did', 'honest-skip']), [{ id: 'honest-skip', more: 0, ids: ['honest-skip'] }])
  } finally {
    globalThis.localStorage = was
  }
})

test('recent notices keep the newest, cap the list, and count unseen', () => {
  const was = globalThis.localStorage
  const kv = new Map()
  try {
    globalThis.localStorage = { getItem: (k) => kv.get(k) ?? null, setItem: (k, v) => kv.set(k, String(v)), removeItem: (k) => kv.delete(k) }
    for (let i = 0; i < NOTICE_CAP + 5; i += 1) addNotice({ id: `n${i}`, title: 'x', text: 'y' }, 1000 + i)
    const list = readNotices()
    assert.equal(list.length, NOTICE_CAP)
    assert.equal(list[0].id, `n${NOTICE_CAP + 4}`)
    assert.equal(unseenNotices(), NOTICE_CAP)
    markNoticesSeen(5000)
    assert.equal(unseenNotices(), 0)
    addNotice({ id: 'n3', title: 'x' }, 6000)
    assert.equal(readNotices()[0].id, 'n3')
    assert.equal(unseenNotices(), 1)
  } finally {
    globalThis.localStorage = was
  }
})

test('signing out clears the per-account lists kept for a fast first paint', () => {
  const was = globalThis.localStorage
  const keys = [
    'did-i-kept:people.links:u1', 'did-i-kept:inbox.rows:u1', 'did-i-we-cards:u1', 'did-i-shelf', 'did-i-prefs',
  ]
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
  // Pending links: only a real sign out or delete clears them, never the
  // SIGNED_OUT event a stale session fires at startup before sign up.
  assert.equal((account.match(/forgetPendingLinks\(\)/g) || []).length, 3)
  assert.ok(!sync.includes('forgetPendingLinks'))
  const links = new Map(['did-i-pending-invite', 'did-i-pending-did-you', 'did-i-did-you-claims', 'did-i-link-friends', 'did-i-we-link-web', 'did-i-shelf'].map((k) => [k, '1']))
  const before = globalThis.localStorage
  globalThis.localStorage = { allKeys: () => [...links.keys()], getItem: (k) => links.get(k) ?? null, setItem: (k, v) => links.set(k, v), removeItem: (k) => links.delete(k) }
  try {
    forgetAccountCaches()
    assert.equal(links.size, 6, 'the SIGNED_OUT clear keeps pending links')
    forgetPendingLinks()
    assert.deepEqual([...links.keys()], ['did-i-shelf'])
  } finally {
    globalThis.localStorage = before
  }
  assert.ok(sync.includes('forgetAccountCaches()'), 'a session that ends on its own clears them')
  assert.ok(boot.includes('allKeys:'), 'the phone storage shim can list keys')
})

test('sign out: Did we reminders and widget line go with the account', () => {
  const was = globalThis.localStorage
  const store = new Map([['did-i-we-pings', '[]'], ['did-i-we-widget', '{}'], ['did-i-shelf', '1']])
  globalThis.localStorage = {
    allKeys: () => [...store.keys()],
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  }
  try {
    forgetAccountCaches()
    assert.deepEqual([...store.keys()], ['did-i-shelf'])
  } finally {
    globalThis.localStorage = was
  }
  const read = (rel) => readFileSync(path.join(checkRoot, rel), 'utf8')
  const sync = read('src/lib/cloud-sync.js')
  const out = sync.slice(sync.indexOf('export function signedOutSync()'))
  assert.ok(out.indexOf('forgetAccountCaches()') < out.indexOf('clearLocalShelf()'), 'every sign-out path clears them')
  const shelf = read('native/hooks/useAppShelf.js')
  assert.match(shelf, /\n      scheduleNativePings\(event\.detail\.boards \|\| \[\]\)/, 'reminders re-arm after every pull, account change included')
  assert.doesNotMatch(read('native/shim/native.js'), /if \(!list\.length\) return/, 'an empty shelf still clears old reminders')
})

test('sign out: unsent answers are sent first, and a failed send asks', () => {
  const read = (rel) => readFileSync(path.join(checkRoot, rel), 'utf8')
  const sync = read('src/lib/cloud-sync.js')
  const save = sync.slice(sync.indexOf('export async function saveBeforeSignOut('))
  assert.ok(save.indexOf('await flushPushSoon()') < save.indexOf("if (state.how === 'miss') await pushNow("), 'flush, then one retry')
  assert.match(save, /return state\.how !== 'miss'/)
  const leave = read('native/lib/leave-account.js')
  assert.ok(leave.indexOf('saveBeforeSignOut()') < leave.indexOf('await run()'), 'saved before the sign out runs')
  assert.ok(leave.indexOf("return 'unsaved'") < leave.indexOf('signedOutSync()'), 'a failed send never wipes')
  assert.match(leave, /kind !== 'delete' && !force/, 'delete account is unchanged')
  for (const rel of ['native/screens/more.jsx', 'native/screens/profile.jsx']) {
    assert.match(read(rel), /out === 'unsaved'[\s\S]{0,80}setSure\(\{[\s\S]{0,40}t\('account\.unsavedTitle'\)/, rel)
  }
  const web = read('src/lib/Account.jsx')
  assert.equal((web.match(/if \(await saveBeforeSignOut\(\)\) await out\(\)\s*else unsavedNote\(out\)/g) || []).length, 2, 'web: here and everywhere')
  assert.equal(en['account.unsavedTitle'], "Some answers aren't saved yet. Sign out anyway?")
  assert.equal(en['account.unsavedYes'], 'Sign out anyway')
})

test('sign out: no session asks, a stalled send gives up after 8s and asks', () => {
  const sync = readFileSync(path.join(checkRoot, 'src/lib/cloud-sync.js'), 'utf8')
  const save = sync.slice(sync.indexOf('export async function saveBeforeSignOut(ms = 8000)'))
  assert.ok(save.indexOf('if (!(await me())) return false') < save.indexOf('flushPushSoon()'), 'no user: ask before any push can wipe')
  assert.match(save, /setTimeout\(\(\) => resolve\(false\), ms\)/)
  const sent = save.slice(save.indexOf('const sent = (async () => {'), save.indexOf('const late ='))
  assert.ok(sent.indexOf('await awaitWidgetTimeline()') > -1 && sent.indexOf('await awaitWidgetTimeline()') < sent.indexOf('flushPushSoon()'), 'iOS widget taps are read in first, inside the 8s cap')
  assert.match(sent, /else if \(next !== shelf\) await pushNow\(next\)/, 'widget taps send even with no save waiting')
  assert.match(readFileSync(path.join(checkRoot, 'native/widget-bridge.js'), 'utf8'), /setWidgetBeforePull\(\(\) => beginWidgetRefresh\(\)\)/)
  assert.match(save, /return await Promise\.race\(\[sent, late\]\)/)
})

test('sync: the shelf is not sent for an account until a pull landed for it on this phone', () => {
  const sync = readFileSync(path.join(checkRoot, 'src/lib/cloud-sync.js'), 'utf8')
  const push = sync.slice(sync.indexOf('export async function pushNow('), sync.indexOf('let weMark'))
  const gate = push.indexOf('if (readLastUser() !== user.id) {')
  assert.match(push.slice(gate, gate + 260), /^if \(readLastUser\(\) !== user\.id\) \{\s*await pullAndMerge\(\)\s*if \(readLastUser\(\) !== user\.id\) return[\s\S]*?doc = readShelf\(\)\s*\}/, 'a closed gate pulls, no miss, then sends the current shelf')
  assert.ok(gate > push.indexOf('await pushAnswers(doc)'), 'answers still go')
  assert.ok(gate < push.indexOf('putShelf('), 'the shelf waits for a pull')
  const pull = sync.slice(sync.indexOf('async function pullAndMergeOnce()'))
  const opened = pull.indexOf('writeLastUser(user.id)')
  assert.ok(opened > pull.indexOf('await putShelf('), 'set only after the shelf landed')
  assert.ok(opened < pull.indexOf('await pushAnswers('), 'an answer or widget failure after that cannot keep the gate shut')
  const out = sync.slice(sync.indexOf('export function signedOutSync()'))
  assert.ok(out.slice(0, 800).includes("writeLastUser('')"), 'cleared on sign out')
})
test('sign in: a pull that throws still leaves the sign-in screen', () => {
  const src = readFileSync(path.join(checkRoot, 'src/lib/useAuthSignIn.js'), 'utf8')
  assert.match(src, /try \{\s*await pullAndMerge\(\)\s*\} catch \{\s*setMiss\(t\('tonight\.syncMiss'\)\)\s*\}\s*signedIn\.current\?\.\(\)/)
  // Apple, Google, email and reviewer all end in the same finish().
  assert.equal((src.match(/await finish\(\)/g) || []).length, 4)
})

test('gems: refunded buys are finished with the store, retryable ones are not', () => {
  const store = readFileSync(path.join(checkRoot, 'native/iap/gem-store.js'), 'utf8')
  const set = store.match(/export const FINISH_UNCREDITED = new Set\((\[[^\]]*\])\)/)
  assert.ok(set, 'list of misses that finish')
  const list = JSON.parse(set[1].replace(/'/g, '"'))
  assert.deepEqual(list.sort(), ['refunded', 'test'])
  for (const retry of ['receipt', 'store', 'setup', 'pending', 'signin', 'miss', 'other']) assert.ok(!list.includes(retry), retry)
  assert.match(store, /if \(FINISH_UNCREDITED\.has\(out\.miss\) && mod\?\.finishTransaction\)/)
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

test('Home shows at most one social line: a Did we waiting on you, then a friend still going', () => {
  const me = { id: 'me', me: true, state: 'in', status: null }
  const cob = { id: 'c', name: 'CobaltLily', state: 'in', status: 'did' }
  const card = { id: 'w1', due: true, myState: 'in', done: false, mode: 'all', people: [me, cob] }
  const friends = [{ id: 'f1', name: 'Rae', shared: true, done: false }]
  assert.deepEqual(pickSocialLine({ weCards: [card], people: friends, nightDone: true }), { kind: 'we', id: 'w1', name: 'CobaltLily' })
  assert.equal(pickSocialLine({ weCards: [{ ...card, people: [{ ...me, status: 'did' }, cob] }], people: [], nightDone: false }), null)
  assert.equal(pickSocialLine({ weCards: [{ ...card, due: false }], people: friends, nightDone: false }), null)
  assert.equal(pickSocialLine({ weCards: [{ ...card, mode: 'turns', turn: 'c' }], people: [], nightDone: false }), null)
  assert.deepEqual(pickSocialLine({ weCards: [], people: friends, nightDone: true }), { kind: 'cheer', id: 'f1', name: 'Rae' })
  assert.equal(pickSocialLine({ weCards: [], people: friends, nightDone: false }), null, 'no cheer line before you are done')
  assert.equal(pickSocialLine({ weCards: [], people: [{ ...friends[0], done: true }], nightDone: true }), null)
  assert.equal(pickSocialLine({ weCards: [], people: [{ ...friends[0], shared: false }], nightDone: true }), null, 'sharing off is never shown as not done')
})

test('family summary hour and phone names: prefs clamp, SQL order, menu resets the stack', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  writePrefs({ familyHour: 19 })
  assert.equal(JSON.parse(globalThis.localStorage.getItem('did-i-prefs')).familyHour, 19)
  writePrefs({ familyHour: 24 })
  assert.equal(JSON.parse(globalThis.localStorage.getItem('did-i-prefs')).familyHour, 21, 'out of range falls back to 9pm')
  writePrefs({ familyHour: 21 })
  const summary = readFileSync(path.join(root, 'supabase/family-summary.sql'), 'utf8')
  assert.ok(summary.includes('= p.family_hour'), 'the summary waits for the chosen hour')
  assert.ok(summary.includes('family_hour between 0 and 23'))
  const names = readFileSync(path.join(root, 'supabase/device-names.sql'), 'utf8')
  assert.ok(names.includes('length(name) <= 40'), 'phone names are capped on the server')
  const order = readFileSync(path.join(root, 'scripts/apply-all-sql.mjs'), 'utf8')
  assert.ok(order.includes("'supabase/device-names.sql'"))
  const menu = readFileSync(path.join(root, 'native/components/MastMenu.jsx'), 'utf8')
  assert.ok(menu.includes('goFromMenu(item.path)'), 'a menu pick starts from Home')
  const hash = readFileSync(path.join(root, 'native/navigation/hash.js'), 'utf8')
  // A menu page goes on top of the page you were on, so phone back returns there.
  assert.ok(!hash.includes('routes: [routes[0], { name: route.path'), 'menu navigation keeps the page you were on behind it')
})

await testAsync('frames: still frames cost coins, animated cost gems, and the server sells the same', async () => {
  const F = await import('../src/lib/frames.js')
  for (const frame of F.FRAMES) {
    if (frame.kind === 'coin') assert.ok(frame.coins > 0 && !frame.gems && !frame.animated, `${frame.id} is a still coin frame`)
    if (frame.kind === 'gem') assert.ok([2, 3].includes(frame.gems) && !frame.coins && frame.animated, `${frame.id} is 2 or 3 gems`)
    if (['free', 'earned', 'season'].includes(frame.kind)) assert.ok(!F.frameForSale(frame.id), `${frame.id} is never sold`)
    for (const field of ['name', 'desc', 'f1', 'f2', 'f3']) assert.ok(F.frameText(frame.id, field) in en, `${frame.id} ${field} string`)
  }
  assert.equal(F.frameRarity(F.frameById('thin')), 'common')
  assert.equal(F.frameRarity(F.frameById('wood')), 'rare')
  assert.equal(F.frameRarity(F.frameById('glow')), 'epic')
  assert.equal(F.frameRarity(F.frameById('aurora')), 'legendary')
  // shop-catalog.sql carries the same prices.
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const sql = readFileSync(path.join(root, 'supabase/shop-catalog.sql'), 'utf8')
  const rows = [...sql.matchAll(/\('frame', '([a-z]+)', (null|\d+), (null|\d+),/g)]
  // Every frame ever sold, dated drops included.
  const sold = F.FRAMES.filter((frame) => F.frameForSale(frame.id, '2099-12-31'))
  assert.equal(rows.length, sold.length, 'every sold frame is in shop_catalog')
  // A dated frame stays out of the shop until its drop day.
  for (const frame of F.FRAMES.filter((item) => item.from)) {
    const eve = new Date(Date.parse(`${frame.from}T12:00:00Z`) - 86400000).toISOString().slice(0, 10)
    assert.ok(!F.shownFrames(eve).includes(frame) && !F.frameForSale(frame.id, eve), `${frame.id} is hidden before ${frame.from}`)
    assert.ok(F.shownFrames(frame.from).includes(frame), `${frame.id} shows on ${frame.from}`)
  }
  for (const [, id, coins, gems] of rows) {
    const frame = F.frameById(id)
    assert.equal(coins === 'null' ? 0 : Number(coins), frame.coins, `${id} coins`)
    assert.equal(gems === 'null' ? 0 : Number(gems), frame.gems, `${id} gems`)
  }
})

await testAsync('frames: friends read the same frame ids, and only gem frames are gifts', async () => {
  const F = await import('../src/lib/frames.js')
  const P = await import('../src/lib/purse.js')
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const sql = readFileSync(path.join(root, 'supabase/friends-week.sql'), 'utf8').replace(/\r\n/g, '\n')
  const list = sql.match(/check \(frame_on in \(([^)]*)\)\)/)
  assert.ok(list, 'friends-week.sql checks frame_on')
  const ids = [...list[1].matchAll(/'([a-z]*)'/g)].map((m) => m[1]).filter(Boolean)
  assert.deepEqual([...ids].sort(), F.FRAMES.map((frame) => frame.id).sort(), 'frame_on allows every frame id and no other')
  const gifts = P.giftItems().frames
  assert.ok(gifts.length > 0 && gifts.every((frame) => frame.kind === 'gem'), 'gift frames are gem frames only')
  const got = P.mergeGift({}, { kind: 'frame', item_id: 'glow' })
  assert.ok(got.known && !got.had && P.normalizePurse(got.book).frames.includes('glow'), 'a gifted frame lands on the list')
  assert.ok(P.mergeGift(got.book, { kind: 'frame', item_id: 'glow' }).had, 'a second one goes back')
  assert.equal(P.normalizePurse(P.wearGift(got.book, 'frame', 'glow')).frame, 'glow', 'wear it puts it on')
})

await testAsync('frames: who owns what, seasons, and the worn frame', async () => {
  const F = await import('../src/lib/frames.js')
  const none = F.framesOwned({}, { bestStreak: 0, everFrozen: false, today: '2026-10-05' })
  assert.deepEqual([...none], ['first'], 'everyone owns First Light')
  const ctx = { bestStreak: 12, everFrozen: true, today: '2026-10-05' }
  const owned = F.framesOwned({ frames: ['thin', 'web'] }, ctx)
  for (const id of ['first', 'thin', 'web', 'vine', 'gems', 'frost']) assert.ok(owned.has(id), id)
  assert.ok(!owned.has('ember'), 'ember needs 30 nights')
  assert.deepEqual(F.frameProgress(F.frameById('ember'), ctx), { n: 12, of: 30 })
  // Seasons, both ends included, and one that wraps the year.
  const web = F.frameById('web')
  assert.ok(F.seasonOpen(web, '2026-10-01') && F.seasonOpen(web, '2026-10-31'))
  assert.ok(!F.seasonOpen(web, '2026-11-01'))
  assert.equal(F.seasonNextText(web, '2026-11-02'), '2027-10-01')
  assert.equal(F.seasonNextText(F.frameById('sakura'), '2026-10-05'), '2027-03-15')
  const wrap = { season: { from: '12-20', until: '01-05' } }
  assert.ok(F.seasonOpen(wrap, '2026-12-25') && F.seasonOpen(wrap, '2027-01-05') && !F.seasonOpen(wrap, '2027-01-06'))
  assert.ok(!F.seasonOpen(F.frameById('bday'), '2026-01-01'), 'birthday stays hidden')
  // A claim only while open, kept after.
  assert.equal(F.claimFrame({}, 'snow', '2026-10-05').miss, 'frames.miss.closed')
  const claimed = F.claimFrame({}, 'web', '2026-10-05').book
  assert.ok(F.framesOwned(claimed, { today: '2026-12-05' }).has('web'), 'a seasonal frame stays after its season')
  // Worn: only a frame you own; normalize drops unknown ids.
  assert.equal(F.wornFrame({ frame: 'gold' }, ctx), '', 'not owned, not worn')
  assert.equal(F.wornFrame({ frame: 'thin', frames: ['thin'] }, ctx), 'thin')
  assert.equal(F.wornFrame({ frame: 'nope' }, ctx), '')
  const purse = normalizePurse({ frames: ['thin', 'nope', 'thin', 'first'], frame: 'gold' })
  assert.deepEqual(purse.frames, ['thin'])
  assert.equal(purse.frame, '')
  assert.equal(normalizePurse({ frame: 'first' }).frame, 'first')
  // Wear toggles, buying takes coins or gems signed out.
  assert.equal(F.wearFrame({ frame: 'first' }, 'first').book.frame, '')
  assert.equal(F.buyFrameLocal({ coins: 10 }, 'thin').miss, 'shop.miss.needCoins')
  const bought = F.buyFrameLocal({ coins: 40, gems: 0 }, 'thin').book
  assert.equal(bought.coins, 10)
  assert.equal(bought.frame, 'thin')
  assert.equal(F.buyFrameLocal({ coins: 999 }, 'ember').miss, 'frames.miss.notSold')
  // Kept once earned.
  assert.deepEqual(F.keepEarnedFrames({ frames: [] }, { bestStreak: 7 }).frames, ['vine', 'gems'])
})

await testAsync('frames: a newly earned frame is announced once per device', async () => {
  const F = await import('../src/lib/frames.js')
  // First run (seen null): only what was just gained, not frames owned before.
  assert.deepEqual(F.framesToAnnounce(['vine'], ['vine', 'gems'], null), ['gems'])
  // Seen already, or not earned (bought), or nothing new: nothing.
  assert.deepEqual(F.framesToAnnounce([], ['vine', 'gems'], ['vine']), ['gems'])
  assert.deepEqual(F.framesToAnnounce([], ['thin'], []), [])
  assert.deepEqual(F.framesToAnnounce(['vine'], ['vine'], []), [])
  localStorage.removeItem('did-i-frames-toasted')
  assert.deepEqual(F.takeFramesToAnnounce(['vine'], ['vine', 'gems']), ['gems'])
  // The same frame again (a sync dropped and re-added it): not shown twice, old ones neither.
  assert.deepEqual(F.takeFramesToAnnounce([], ['vine', 'gems']), [])
})

await testAsync('gifts: the arrival cheer plays once per gift on a device', async () => {
  const G = await import('../src/lib/gift-inbox.js')
  assert.equal(G.giftCheerFresh('g1', null), true)
  assert.equal(G.giftCheerFresh('g1', ['g1']), false)
  assert.equal(G.giftCheerFresh('', []), false)
  localStorage.removeItem('did-i-gifts-cheered')
  assert.equal(G.takeGiftCheer('g1'), true)
  assert.equal(G.takeGiftCheer('g1'), false)
  assert.equal(G.takeGiftCheer('g2'), true)
})

await testAsync('frames: owned lists merge across phones and server lists keep their own kind', async () => {
  const { mergePurses } = await import('../src/lib/purse.js')
  const { applyCoinCatalogToBook } = await import('../src/lib/wallet.js')
  const merged = mergePurses([{ frames: ['thin'], frame: '' }, { frames: ['web'], frame: 'web' }])
  assert.deepEqual(merged.frames.sort(), ['thin', 'web'])
  assert.equal(merged.frame, 'web')
  const book = { frames: ['thin', 'glow', 'web', 'vine'], frame: 'web' }
  const coin = applyCoinCatalogToBook(book, { coins: 5, looks: [], cheerStages: {}, accessories: [], frames: ['wood'] })
  assert.deepEqual(coin.frames.sort(), ['glow', 'vine', 'web', 'wood'], 'coin list replaces coin frames only')
  const gem = applyGemOwnedToBook(book, { gems: 1, looks: [], cheers: [], buddies: [], frames: ['aurora'] })
  assert.deepEqual(gem.frames.sort(), ['aurora', 'thin', 'vine', 'web'], 'gem list replaces gem frames only')
  assert.equal(validateCoinItem('frame', 'thin'), true)
  assert.equal(validateCoinItem('frame', 'glow'), false, 'a gem frame is not a coin buy')
})

const frameGeo = await import('../native/components/frames/geometry.js')

test('every card frame id has art, and the vine and moon math hold', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const ids = frameGeo.FRAME_IDS
  assert.equal(ids.length, 77)
  assert.equal(new Set(ids).size, 77)
  const art = readFileSync(path.join(root, 'native/components/frames/art.jsx'), 'utf8')
  const map = art.slice(art.indexOf('export const FRAME_ART = {'))
  const keys = [...map.slice(0, map.indexOf('\n}')).matchAll(/^\s+(\w+): \{/gm)].map((m) => m[1])
  assert.deepEqual([...keys].sort(), [...ids].sort(), 'FRAME_ART covers exactly the catalog')
  for (const key of keys) assert.ok(new RegExp(key + ': \\{ (under|over): \\w+').test(map), key + ' draws something')
  if (existsSync(path.join(root, 'src/lib/frames.js'))) {
    const data = readFileSync(path.join(root, 'src/lib/frames.js'), 'utf8')
    for (const id of ids) assert.ok(data.includes("'" + id + "'"), id + ' is in src/lib/frames.js')
  }
  const preview = readFileSync(path.join(root, 'native/components/frames/FramePreview.jsx'), 'utf8')
  assert.ok(preview.includes('<CardFrame id={id}') && preview.includes('active={false} still'), 'previews are still')
  assert.ok(preview.includes('runAfterInteractions') && preview.includes('memo('), 'preview tiles mount lazily and are memoized')
  const frame = readFileSync(path.join(root, 'native/components/frames/CardFrame.jsx'), 'utf8')
  assert.ok(frame.includes('FRAME_ART[id]') && frame.includes('pointerEvents="none"'), 'frames never take touches')
  const runtime = readFileSync(path.join(root, 'native/components/frames/runtime.jsx'), 'utf8')
  assert.ok(runtime.includes('IDLE_MS = 25000') && runtime.includes('useReduceMotion'), 'frames pause on idle and reduce motion')
  // Vine: a short streak barely starts, 60+ nights wrap the card, flowers come after 8.
  const small = frameGeo.vineLayout(3, 300, 360, 24)
  const big = frameGeo.vineLayout(80, 300, 360, 24)
  assert.ok(small.usable < small.length * 0.2)
  assert.equal(big.usable, big.length)
  assert.equal(small.flowers.length, 0)
  assert.equal(frameGeo.vineCounts(22).flowers, 2)
  assert.equal(frameGeo.vineCounts(1000).leaves, 70)
  // The perimeter walk closes on itself and starts at the bottom-left going up.
  const L = frameGeo.rrLength(300, 360, 24)
  const a = frameGeo.rrPointAt(0, 0, 300, 360, 24, 0)
  const b = frameGeo.rrPointAt(0, 0, 300, 360, 24, L - 0.001)
  assert.ok(Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01)
  assert.deepEqual([a.x, a.y, Math.round(a.nx)], [0, 336, -1])
  // Moon: a known full moon (2024-10-17) and new moon (2024-11-01).
  const full = frameGeo.moonPhase(new Date(Date.UTC(2024, 9, 17, 11, 26)))
  const fresh = frameGeo.moonPhase(new Date(Date.UTC(2024, 10, 1, 12, 47)))
  assert.ok(Math.abs(full - 0.5) < 0.02, 'full ' + full)
  assert.ok(fresh < 0.02 || fresh > 0.98, 'new ' + fresh)
  const week = frameGeo.moonWeek(new Date(2026, 9, 5))
  assert.equal(week.week.length, 7)
  assert.equal(week.week.filter((d) => d.today).length, 1)
  assert.equal(frameGeo.ringProgress(2, 4), 0.5)
  assert.equal(frameGeo.ringProgress(3, 0), 0)
})

// Every so often questions (cadence 'every'): due by the last Did, no streak.
function everyBook(answers = [], extra = []) {
  return {
    id: 'ev',
    title: 'Home',
    dayFoldHour: 0,
    lamps: [{ id: 'sheets', question: 'Did I change the sheets?', cadence: 'every', everyDays: 7, archived: false, createdOn: '2026-09-01' }, ...extra],
    answers: answers.map(([lampId, periodKey, status]) => ({ lampId, periodKey, status, answeredAt: `${periodKey}T21:00:00` })),
  }
}
const evAt = (d) => new Date(2026, 8, d, 12, 0)
const evDay = (d) => `2026-09-${String(d).padStart(2, '0')}`

await testAsync('every so often: due when never done or once the gap passed; Did resets, Not yet asks again', async () => {
  const { dueTonight, everyDueOn } = await import('../src/lib/recurrence.js')
  const has = (book, d) => dueTonight(book, evAt(d)).some((row) => row.lamp.id === 'sheets')
  assert.ok(has(everyBook(), 1), 'never done: due right away')
  const did5 = everyBook([['sheets', evDay(5), 'yes']])
  assert.ok(has(did5, 5), 'answered tonight stays on tonight')
  assert.ok(!has(did5, 6) && !has(did5, 11), 'not due inside the gap')
  assert.ok(has(did5, 12), 'due 7 days after the last Did')
  const noped = everyBook([['sheets', evDay(5), 'yes'], ['sheets', evDay(12), 'skip']])
  assert.ok(has(noped, 13), 'Not yet asks again the next night')
  assert.ok(!isDueOn(noped.lamps[0], evDay(12)), 'isDueOn stays false, so walks leave it out')
  assert.ok(!everyDueOn(noped, noped.lamps[0], '2026-08-30'), 'not before it was made')
})

await testAsync('every so often: no streak, never breaks a night, counts once done', async () => {
  const { shelfStreak, lastBrokenNight } = await import('../src/lib/hall-feel.js')
  const { allClearTonight } = await import('../src/lib/recurrence.js')
  const daily = { id: 'd', question: 'Did I stretch?', cadence: 'daily', archived: false, createdOn: '2026-09-01' }
  const rows = []
  for (let d = 1; d <= 10; d += 1) rows.push(['d', evDay(d), 'yes'])
  rows.push(['sheets', evDay(9), 'skip'])
  const book = everyBook(rows, [daily])
  assert.equal(shelfStreak([book], evAt(10)), 10, 'an open or Not yet every so often question never breaks the streak')
  assert.equal(lastBrokenNight([book], evAt(11)), null)
  assert.equal(questionStreak(book, book.lamps[0], evDay(10)), 0)
  assert.equal(bestQuestionStreak(book, book.lamps[0], evDay(10)), 0)
  assert.ok(allClearTonight(book, evAt(10)), 'tonight is clear with the every question still open')
  const onlyEvery = everyBook([['sheets', evDay(3), 'yes']])
  assert.equal(shelfStreak([onlyEvery], evAt(3)), 0, 'a Did on it alone is not a streak night')
  assert.ok(allClearTonight(onlyEvery, evAt(3)), 'but it does count for that night once done')
})

test('every so often: the widget shows it only when Tonight does', () => {
  const at = evAt(8)
  const notDue = everyBook([['sheets', evDay(5), 'yes']])
  const props = buildTonightWidgetProps(writeShelf({ currentId: 'ev', boards: [notDue] }), at)
  assert.ok(!(props.items || []).some((item) => item.lampId === 'sheets'), 'not due: not on the widget')
  const due = everyBook([['sheets', evDay(1), 'yes']])
  const props2 = buildTonightWidgetProps(writeShelf({ currentId: 'ev', boards: [due] }), at)
  assert.ok((props2.items || []).some((item) => item.lampId === 'sheets' && item.status === 'open'), 'due: on the widget')
})

await testAsync('every so often: the gap is learned from 3+ gaps and shown as usually', async () => {
  const { learnedGap, everyDueOn } = await import('../src/lib/recurrence.js')
  const { gapLine, lastTimeLine, sinceBadge } = await import('../src/lib/every-copy.js')
  const two = everyBook([1, 10, 19].map((d) => ['sheets', evDay(d), 'yes']))
  assert.equal(learnedGap(two, 'sheets', evDay(25)), 0, 'two gaps are not enough')
  const book = everyBook([1, 10, 19, 28].map((d) => ['sheets', evDay(d), 'yes']))
  const lamp = { ...book.lamps[0], everyDays: 3 }
  assert.equal(learnedGap(book, 'sheets', '2026-10-05'), 9)
  assert.ok(!everyDueOn(book, lamp, '2026-10-06'), 'the learned 9 wins over the set 3')
  assert.ok(everyDueOn(book, lamp, '2026-10-07'))
  assert.equal(gapLine(book, lamp, '2026-10-05'), 'Usually every 9 days')
  assert.equal(lastTimeLine(book, lamp, '2026-10-05'), 'Last time: 7 days ago')
  assert.equal(lastTimeLine(everyBook(), lamp, evDay(3)), 'Never yet')
  assert.equal(sinceBadge(book, lamp, evDay(28)), 'today', 'a Did tonight reads today, not 0d')
})

await testAsync('every so often: saved shape, pack, and the toast note action', async () => {
  const { normalizeLamp, missLamp } = await import('../src/lib/board-json.js')
  const lamp = normalizeLamp({ id: 'x', question: 'Did I water the plants?', cadence: 'every', everyDays: '14' })
  assert.equal(lamp.cadence, 'every')
  assert.equal(lamp.everyDays, 14)
  assert.equal(normalizeLamp({ id: 'y', question: 'Q?', cadence: 'daily', everyDays: 5 }).everyDays, '')
  if (missLamp) assert.equal(missLamp({ question: 'Did I?', cadence: 'every', everyDays: 0 }), 'hang.miss.everyDays')
  const home = PACKS.find((pack) => pack.id === 'home')
  assert.ok(home && home.items.every((item) => item.cadence === 'every' && item.everyDays >= 7))
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const screen = readFileSync(path.join(root, 'native/screens/TonightScreen.jsx'), 'utf8')
  assert.ok(screen.includes('openAnswerNote(') && screen.includes("t('note.addShort')"), 'a Did offers a note from the undo toast')
})

await testAsync('amounts: average over 30 nights, 14 night chart, rounding', async () => {
  const { lampAmounts, roundAmount, amountAverageLine } = await import('../src/lib/lamp-record.js')
  const lamp = { id: 'w', question: 'Did I drink water?', cadence: 'daily', trackAmount: true, amountUnit: 'glasses' }
  const today = '2026-10-09'
  const at = (back, status, amount) => {
    const key = addDaysIso(today, -back)
    return { lampId: 'w', periodKey: key, status, answeredAt: `${key}T21:00:00.000Z`, ...(amount == null ? {} : { amount }) }
  }
  const answers = [
    at(0, 'yes', 6), at(1, 'late', 5), at(2, 'skip', 99), at(3, 'yes'), at(13, 'yes', 7),
    at(14, 'yes', 6), at(29, 'yes', 6), at(30, 'yes', 100), { lampId: 'z', periodKey: today, status: 'yes', amount: 50 },
  ]
  const out = lampAmounts({ answers }, lamp, today)
  assert.equal(out.count, 5, 'only Did nights with an amount in the last 30')
  assert.equal(out.average, 6)
  assert.equal(out.bars.length, 14)
  assert.equal(out.bars[0].night, addDaysIso(today, -13))
  assert.equal(out.bars[0].amount, 7)
  assert.equal(out.bars[13].night, today)
  assert.equal(out.bars[13].amount, 6)
  assert.equal(out.bars[11].amount, null, 'a nope amount is not charted')
  assert.equal(out.bars[10].amount, null, 'a Did with no amount is a gap')
  assert.equal(out.max, 7)
  assert.equal(roundAmount(2.46), 2.5)
  assert.equal(roundAmount(12.6), 13)
  assert.equal(roundAmount(NaN), null)
  assert.equal(amountAverageLine(6, 'glasses'), t('amounts.avg', { n: 6, unit: 'glasses' }))
  assert.equal(amountAverageLine(6, ''), t('amounts.avgPlain', { n: 6 }))
  assert.equal(amountAverageLine(null, 'glasses'), '')
  const none = lampAmounts({ answers: [] }, lamp, today)
  assert.equal(none.count, 0)
  assert.equal(none.average, null)
  assert.ok(none.bars.every((bar) => bar.amount === null))
  assert.deepEqual(lampAmounts({ answers }, { ...lamp, trackAmount: false }, today).bars, [])
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  for (const file of ['native/screens/questions.jsx', 'src/lib/LampDetail.jsx']) {
    const src = readFileSync(path.join(root, file), 'utf8')
    assert.ok(/useMemo\(\(\) => lampAmounts\(/.test(src), `${file} memoizes the amounts walk`)
    assert.ok(src.includes("t('amounts.empty')"), `${file} has an empty state`)
  }
})

await testAsync('amounts: saved on the answer, round trip through the answer log, last 5, SQL', async () => {
  const { normalizeLamp, normalizeAnswer, cleanAmount, AMOUNT_MAX } = await import('../src/lib/board-json.js')
  const { lastDidTimes, amountWords } = await import('../src/lib/lamp-record.js')
  const lamp = normalizeLamp({ id: 'w', question: 'Did I drink water?', trackAmount: true, amountUnit: '  glasses  ' + 'x'.repeat(40) })
  assert.equal(lamp.trackAmount, true)
  assert.ok(lamp.amountUnit.startsWith('glasses') && lamp.amountUnit.length <= 24)
  const plain = normalizeLamp({ id: 'p', question: 'Did I read?', amountUnit: 'pages' })
  assert.ok(!('trackAmount' in plain) && !('amountUnit' in plain), 'off means nothing stored')
  assert.equal(cleanAmount('2,5'), 2.5)
  assert.equal(cleanAmount(''), null)
  assert.equal(cleanAmount(-1), null)
  assert.equal(cleanAmount(AMOUNT_MAX + 1), null)
  assert.equal(cleanAmount('abc'), null)
  assert.equal(normalizeAnswer({ lampId: 'w', periodKey: '2026-10-01', amount: 3 }).amount, 3)
  assert.ok(!('amount' in normalizeAnswer({ lampId: 'w', periodKey: '2026-10-01', amount: 'x' })))

  const answer = { id: 'a1', lampId: 'w', periodKey: '2026-10-01', status: 'yes', answeredAt: '2026-10-01T21:00:00.000Z', note: '' }
  const book = { id: 'b1', lamps: [lamp], answers: [answer] }
  const counted = setAnswerNote(book, 'w', '2026-10-01', 'after the gym', new Date('2026-10-02T09:00:00'), '6')
  assert.equal(counted.answers[0].amount, 6)
  assert.ok(counted.answers[0].noteAt > answer.answeredAt, 'an amount moves noteAt like a note')
  // Leaving amount out keeps it; '' clears it.
  assert.equal(setAnswerNote(counted, 'w', '2026-10-01', 'new words', new Date('2026-10-02T10:00:00')).answers[0].amount, 6)
  assert.ok(!('amount' in setAnswerNote(counted, 'w', '2026-10-01', 'after the gym', new Date('2026-10-02T10:00:00'), '').answers[0]))
  // An amount-only change still saves.
  assert.equal(setAnswerNote(counted, 'w', '2026-10-01', 'after the gym', new Date('2026-10-02T10:00:00'), 8).answers[0].amount, 8)
  // Remove note clears the note and the amount, on the phone and the web.
  const removed = setAnswerNote(counted, 'w', '2026-10-01', '', new Date('2026-10-02T10:00:00'), '').answers[0]
  assert.ok(removed.note === '' && !('amount' in removed), 'remove note clears both')
  const notesSrc = readFileSync(path.join(checkRoot, 'native/components/NightNotes.jsx'), 'utf8')
  assert.ok(/function removeNote[\s\S]{0,400}setAnswerNote\(book, lampId, periodKey, '', undefined, ''\)/.test(notesSrc), 'phone Remove note clears the amount')
  assert.ok(readFileSync(path.join(checkRoot, 'src/lib/Tonight.jsx'), 'utf8').includes("onSave('', '', { share: false"), 'web Remove note clears the amount and unshares it')

  // Up: m is always sent, null when there is none.
  const shelf = { currentId: 'b1', boards: [counted] }
  const sent = answersToSend(shelf, true)
  assert.equal(sent[0].m, 6)
  assert.equal(answersToSend({ boards: [book] }, true)[0].m, null)
  // Down: a row with amount lands on the answer; a row from before the column has none.
  const row = { lamp_id: 'w', period_key: '2026-10-01', board_id: 'b1', status: 'yes', answered_at: sent[0].a, note: sent[0].n, note_at: sent[0].e, amount: '6' }
  const pulled = applyAnswers({ currentId: 'b1', boards: [book] }, [row]).shelf.boards[0].answers[0]
  assert.equal(pulled.amount, 6)
  assert.equal(pulled.note, 'after the gym')
  const { amount: _gone, ...oldRow } = row
  assert.ok(!('amount' in applyAnswers({ currentId: 'b1', boards: [book] }, [oldRow]).shelf.boards[0].answers[0]))

  // Last 5: only Did nights, newest first, with note and amount.
  const answers = []
  for (let day = 1; day <= 8; day += 1) {
    const key = `2026-09-0${day}`
    answers.push({ id: `n${day}`, lampId: 'w', periodKey: key, status: day === 7 ? 'skip' : day === 6 ? 'late' : 'yes', answeredAt: `${key}T21:00:00.000Z`, note: day === 8 ? 'big day' : '', ...(day === 8 ? { amount: 9 } : {}) })
  }
  answers.push({ id: 'other', lampId: 'z', periodKey: '2026-09-09', status: 'yes', answeredAt: '', note: '' })
  const last = lastDidTimes({ answers }, lamp, 5)
  assert.deepEqual(last.map((item) => item.periodKey), ['2026-09-08', '2026-09-06', '2026-09-05', '2026-09-04', '2026-09-03'])
  assert.equal(last[0].note, 'big day')
  assert.equal(last[0].amount, 9)
  assert.equal(last[1].amount, null)
  assert.equal(amountWords(9, 'glasses'), '9 glasses')
  assert.equal(amountWords(null, 'glasses'), '')
  assert.deepEqual(lastDidTimes({ answers }, null), [])

  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const sql = readFileSync(path.join(root, 'supabase/answers.sql'), 'utf8')
  assert.ok(/add column if not exists amount numeric/.test(sql), 'amount column, idempotent')
  assert.ok(/answer_log_amount\s+check \(amount is null or \(amount >= 0 and amount <= 100000\)\)/.test(sql), 'amount range check')
  assert.ok(sql.includes("not (r ? 'm')") && sql.includes('amount = excluded.amount'), 'put_answers keeps the stored amount for an older app')
  const push = readFileSync(path.join(root, 'supabase/push.sql'), 'utf8')
  const wanted = push.slice(push.indexOf('function public.push_wanted'), push.indexOf('revoke all on function public.push_wanted'))
  assert.ok(wanted.includes("prefs ->> 'gentle'") && wanted.includes("'streakRisk'"), 'push_wanted reads gentle for the streak-risk push')
  const shim = readFileSync(path.join(root, 'native/shim/native.js'), 'utf8')
  assert.ok(shim.includes("pingOn('streakRisk') && !gentleOn()"), 'the phone skips the streak-risk ping in gentle mode')
  const notes = readFileSync(path.join(root, 'native/components/NightNotes.jsx'), 'utf8')
  assert.ok(notes.includes('trackAmount') && notes.includes('decimal-pad'), 'the note sheet asks for an amount')
})


test('seasonal items say when they come back', () => {
  const cocoa = { id: 'cocoa', from: '2026-12-01', until: '2027-01-01' }
  assert.equal(seasonNext(cocoa, '2026-10-05'), '2026-12-01', 'before the season: this year')
  assert.equal(seasonNext(cocoa, '2026-12-10'), '2026-12-01', 'in season: the current one')
  assert.equal(seasonNext(cocoa, '2027-01-01'), '2027-12-01', 'after it ends: next year')
  assert.equal(seasonNext(cocoa, '2029-03-01'), '2029-12-01', 'years later still lands on Dec 1')
  const off = offSeason(normalizePurse({ accessories: ['cocoa'] }), '2026-10-05')
  assert.ok(off.owned.some((row) => row.item.id === 'cocoa'), 'owned cocoa is out of season in October')
  assert.ok(off.coming.some((row) => row.item.id === 'sparkler'), 'sparkler shows as coming')
  assert.ok(!off.coming.some((row) => row.item.id === 'cocoa'), 'owned items are not also coming')
})

test('the wishlist caps at its max and drops an item once bought', () => {
  let book = { coins: 100, gems: 0 }
  const looks = SHOP_CALENDAR.looks.filter((item) => item.id !== 'lime')
  const cheers = SHOP_CALENDAR.cheers.filter((item) => item.gems > 0)
  const keys = [...looks.map((item) => ['look', item.id]), ...cheers.map((item) => ['cheer', item.id])]
  for (const [type, id] of keys.slice(0, WISH_MAX)) book = toggleWish(book, type, id).book
  assert.equal(normalizePurse(book).wish.length, WISH_MAX)
  const [type, id] = keys[WISH_MAX]
  assert.equal(toggleWish(book, type, id).miss, 'shop.miss.wishFull', 'one past the max is turned down')
  assert.equal(normalizePurse({ wish: keys.map(([a, b]) => `${a}:${b}`) }).wish.length, WISH_MAX, 'a synced list is capped too')
  book = toggleWish({ coins: 30 }, 'look', 'ink').book
  assert.deepEqual(wishGoal(normalizePurse(book)), { type: 'look', id: 'ink', kind: 'coins', n: 0, nights: 0 })
  const bought = buyLook(book, 'ink')
  assert.equal(bought.miss, '')
  assert.deepEqual(normalizePurse(bought.book).wish, [], 'buying it clears the heart')
  assert.equal(wishGoal(normalizePurse(toggleWish({ coins: 0 }, 'look', 'ink').book)).n, Math.ceil(30 / 6), '6 coins a night')
})

test('shop rows hide owned items and drops before their day', () => {
  const owned = normalizePurse({ looks: LOOKS.map((item) => item.id) })
  assert.deepEqual(shopRow('look', LOOKS, owned), [], 'own every look: the row is empty')
  const none = normalizePurse({})
  assert.ok(!shopRow('look', LOOKS, none).some((item) => item.id === 'lime'), 'the free look is owned, so hidden')
  const drop = SHOP_CALENDAR.looks.find((item) => item.from === '2026-10-23')
  assert.ok(!shopRow('look', SHOP_CALENDAR.looks, none, '2026-10-20').includes(drop), 'a coming drop stays out of the row')
  assert.ok(shopRow('look', SHOP_CALENDAR.looks, none, '2026-10-23').includes(drop), 'on its day it is in')
})

// r10-answer: earned streak freezes and Did / Nope from a reminder.
const { FREEZE_MAX, freezeState, nightsToNextFreeze, walkFreezes } = await import('../src/lib/hall-feel.js')
const { askActions, askNoteData, firstResponse, notificationAnswer } = await import('../src/lib/notify-answer.js')

test('a freeze is earned every 14 nights in a row, capped at two, and spent on the next miss', () => {
  const clears = (n) => Array(n).fill('clear')
  assert.deepEqual(walkFreezes(clears(13)), { run: 13, held: 0, frozen: [] })
  assert.equal(walkFreezes(clears(14)).held, 1)
  assert.equal(walkFreezes(clears(28)).held, 2)
  assert.equal(walkFreezes(clears(42)).held, FREEZE_MAX, 'never more than two held')
  const spent = walkFreezes([...clears(14), 'none', 'miss', 'clear'])
  assert.deepEqual(spent, { run: 15, held: 0, frozen: [15] }, 'the miss is covered, the run goes on but does not grow on it')
  assert.deepEqual(walkFreezes([...clears(13), 'miss', 'clear']), { run: 1, held: 0, frozen: [] }, 'no freeze yet: the miss breaks it')
  assert.equal(walkFreezes([...clears(14), 'miss', 'miss']).run, 0, 'one freeze covers one miss only')
  assert.equal(walkFreezes([...clears(14), 'miss', ...clears(13)]).held, 0, 'the covered night does not count toward the next 14')
  assert.equal(walkFreezes([...clears(14), 'miss', ...clears(14)]).held, 1)
})

test('a freeze is never used by accident and there is no balance to add to', () => {
  const clears = (n) => Array(n).fill('clear')
  // Nights with nothing due never spend one, however many there are.
  assert.deepEqual(walkFreezes([...clears(14), ...Array(30).fill('none')]), { run: 14, held: 1, frozen: [] })
  // No streak, no freeze to spend: misses before any run cost nothing.
  assert.deepEqual(walkFreezes(['miss', 'miss', ...clears(3)]), { run: 3, held: 0, frozen: [] })
  // Freezes come only from the answers walk: nothing stored is read, and the shop has none.
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const feel = readFileSync(path.join(root, 'src/lib/hall-feel.js'), 'utf8')
  assert.ok(!/\b(book|boards|purse|profile)\.freez/i.test(feel), 'no stored freeze count is read')
  const purse = readFileSync(path.join(root, 'src/lib/purse.js'), 'utf8')
  assert.ok(!/freez/i.test(purse), 'freezes are not sold or held in the purse')
  // A past night cannot be answered, so freezes cannot be farmed by filling old nights.
  const ops = readFileSync(path.join(root, 'src/lib/board-ops.js'), 'utf8')
  assert.ok(/periodPassed\(row\.lamp, row\.periodKey, openFloorIso\(clock\)\)/.test(ops), 'answers refuse nights past the open floor')
})

test('next freeze counts down to the next 14, none when two are held', () => {
  assert.equal(nightsToNextFreeze(0), 14)
  assert.equal(nightsToNextFreeze(5), 9)
  assert.equal(nightsToNextFreeze(14, 1), 14)
  assert.equal(nightsToNextFreeze(27, 1), 1)
  assert.equal(nightsToNextFreeze(30, 2), 0)
})

test('a freeze keeps the overall streak and shows as its own dot', () => {
  const days = []
  for (let d = 1; d <= 18; d += 1) days.push(`2026-08-${String(d).padStart(2, '0')}`)
  const book = {
    id: 'b1',
    title: 'General',
    dayFoldHour: 0,
    lamps: [{ id: 'door', question: 'Did I lock the door?', cadence: 'daily', archived: false, createdOn: '2026-08-01' }],
    answers: days.filter((d) => d !== '2026-08-15').map((d) => ({ lampId: 'door', periodKey: d, status: 'yes', answeredAt: `${d}T20:00:00` })),
  }
  const now = new Date(2026, 7, 19, 21, 0)
  const boards = [book]
  assert.equal(shelfStreak(boards, now), 17, '14 + 3; the frozen night keeps it but does not add')
  const state = freezeState(boards, now)
  assert.equal(state.held, 0)
  assert.ok(state.frozen.has('2026-08-15'))
  assert.equal(freezeState(boards, now), state, 'memoized on the shelf and night')
  const dot = weekStripNights(boards, now).find((night) => night.iso === '2026-08-15')
  assert.equal(dot.freeze, true)
  assert.equal(dot.miss, false)
  assert.equal(nightWhy(boards, '2026-08-15', now).state, 'freeze')
  assert.ok(en['why.freeze'])
  const short = { ...book, lamps: [{ ...book.lamps[0], createdOn: '2026-08-02' }], answers: book.answers.filter((a) => a.periodKey >= '2026-08-02') }
  assert.equal(shelfStreak([short], now), 3, 'only 13 nights before the miss: no freeze, the streak broke')
  assert.equal(freezeState([short], now).frozen.size, 0)
})

test('reminder Did / Nope buttons map to the question and its period', () => {
  const data = askNoteData({ lamp: { id: 'door' }, periodKey: '2026-10-05' })
  assert.deepEqual(data, { lampId: 'door', night: '2026-10-05', go: '/tonight' })
  const press = (action, payload) => ({ actionIdentifier: action, notification: { request: { identifier: '42', content: { data: payload } } } })
  assert.deepEqual(notificationAnswer(press('did', data), 7), { kind: 'lamp', id: 'door', action: 'did', night: '2026-10-05', at: 7, noteId: '42' })
  assert.equal(notificationAnswer(press('nope', data), 7).action, 'nope')
  assert.equal(notificationAnswer(press('expo.modules.notifications.actions.DEFAULT', data)), null, 'a plain tap opens the app')
  assert.equal(notificationAnswer(press('did', { go: '/tonight' })), null)
  assert.equal(notificationAnswer(press('did', { weId: 'c1', night: '2026-10-05' })).kind, 'we')
  assert.ok(askActions((k) => k).every((a) => a.options.opensAppToForeground === true), 'the buttons open the app so a closed app never drops the answer')
})

test('a reminder tap at 23:59:58 handled after midnight files to its night, once', async () => {
  const { firstResponse } = await import('../src/lib/notify-answer.js')
  const night = '2026-08-10'
  const book = { id: 'b1', title: 'General', dayFoldHour: 0, lamps: [{ id: 'door', question: 'Did I lock the door?', cadence: 'daily', archived: false, createdOn: '2026-08-01' }], answers: [] }
  writeShelf({ currentId: 'b1', boards: [book] })
  const response = { actionIdentifier: 'did', notification: { request: { identifier: '9', content: { data: askNoteData({ lamp: { id: 'door' }, periodKey: night }) } } } }
  const handled = new Date(2026, 7, 11, 0, 0, 2)
  const answer = notificationAnswer(response, handled.getTime())
  const saved = applyWidgetTapOnce(answer.id, answer.action, answer.night, handled, answer.at)
  assert.equal(answerFor(saved.boards[0], 'door', night)?.status, 'yes', 'files to last night')
  // A Not yet at 00:30, then the reminder's Did at 01:00: stamped 01:00, and
  // it wins the later-time merge on another phone.
  writeShelf({ currentId: 'b1', boards: [book] })
  const notYetAt = new Date(2026, 7, 11, 0, 30)
  assert.ok(applyWidgetTapOnce('door', 'nope', night, notYetAt, notYetAt.getTime()))
  const oneAm = new Date(2026, 7, 11, 1, 0)
  const did = applyWidgetTapOnce('door', 'did', night, oneAm, notificationAnswer(response, oneAm.getTime()).at)
  const stamped = answerFor(did.boards[0], 'door', night)
  assert.ok(['yes', 'late'].includes(stamped.status), 'the Did replaced the Not yet')
  assert.equal(Date.parse(stamped.answeredAt), oneAm.getTime())
  // An old queued widget Did (22:00) replayed after an in-app Not yet (22:05):
  // it keeps its own time, so across phones the newer Not yet wins.
  writeShelf({ currentId: 'b1', boards: [book] })
  const notYet = applyWidgetTapOnce('door', 'nope', night, new Date(2026, 7, 10, 22, 5), new Date(2026, 7, 10, 22, 5).getTime())
  const replay = applyWidgetTapOnce('door', 'did', night, new Date(2026, 7, 10, 22, 6), new Date(2026, 7, 10, 22, 0).getTime())
  assert.equal(Date.parse(answerFor(replay.boards[0], 'door', night).answeredAt), new Date(2026, 7, 10, 22, 0).getTime())
  const merged = mergeShelves(replay, notYet)
  assert.equal(answerFor(merged.boards[0], 'door', night).status, 'skip', 'the newer Not yet wins')
  // A night that has truly closed is dropped.
  const late = new Date(2026, 7, 12, 12, 0)
  assert.equal(applyWidgetTapOnce('door', 'did', night, late, notificationAnswer(response, late.getTime()).at), null)
  // The listener and getLastNotificationResponseAsync both see the launch tap.
  const seen = new Set()
  assert.equal(firstResponse(seen, response), true)
  assert.equal(firstResponse(seen, response), false, 'the repeat is skipped')
  assert.equal(firstResponse(seen, { ...response, actionIdentifier: 'nope' }), true)
})

await testAsync('coins earned for the server survive a reload, for that account only', async () => {
  // Three loads of the module stand in for three app starts. Imported first:
  // other tests may touch storage while an import is awaited.
  const first = await import('../src/lib/purse.js?earned=1')
  const reload = await import('../src/lib/purse.js?earned=2')
  const other = await import('../src/lib/purse.js?earned=3')
  writeAccountUserId('user-a')
  try {
    first.returnEarnedCoins('2026-10-02', 3, new Date(2026, 9, 2, 20))
    assert.deepEqual({ ...reload.takeEarnedCoins() }, { '2026-10-02': 3 })
    first.returnEarnedCoins('2026-10-02', 2, new Date(2026, 9, 2, 20))
    writeAccountUserId('user-b')
    assert.deepEqual({ ...other.takeEarnedCoins() }, {}, 'another account never gets them')
  } finally {
    localStorage.removeItem('did-i-earned-coins')
    writeAccountUserId('')
  }
})

test('a reminder answer for a night that has turned is dropped', () => {
  const night = '2026-08-10'
  const book = { id: 'b1', title: 'General', dayFoldHour: 0, lamps: [{ id: 'door', question: 'Did I lock the door?', cadence: 'daily', archived: false, createdOn: '2026-08-01' }], answers: [] }
  writeShelf({ currentId: 'b1', boards: [book] })
  const morning = new Date(2026, 7, 11, 10, 0)
  assert.equal(applyWidgetTapOnce('door', 'did', night, morning, morning.getTime()), null)
  const evening = new Date(2026, 7, 10, 21, 0)
  const saved = applyWidgetTapOnce('door', 'did', night, evening, evening.getTime())
  assert.equal(answerFor(saved.boards[0], 'door', night)?.status, 'yes')
  assert.equal(applyWidgetTapOnce('door', 'nope', night, evening, evening.getTime()), null, 'a did is not turned into a nope')
})

test('friends: one color per person, and the product names take a plural', () => {
  const id = '2f0c6a3e-1111-4222-8333-444455556666'
  assert.equal(personTintIndex(id), personTintIndex(id), 'same id, same color')
  for (const sample of ['a', 'b', id, '']) assert.ok(personTintIndex(sample) >= 1 && personTintIndex(sample) <= 6)
  assert.equal(personTint({ we: 'w' }, id), 'w', 'falls back to a theme color')
  const bad = Object.entries(en).filter(([, value]) => /Did (wes|yous)\b/.test(String(value)))
  assert.deepEqual(bad.map(([key]) => key), [], "say Did we's and Did you's")
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const order = readFileSync(path.join(root, 'scripts/apply-all-sql.mjs'), 'utf8')
  assert.ok(order.indexOf('friends-week.sql') > order.indexOf('avatars.sql'), 'friends-week redefines known_people after avatars')
})

await testAsync('usage milestones stay anonymous and write-only', async () => {
  const sql = readFileSync(new URL('../supabase/milestones.sql', import.meta.url), 'utf8')
  assert.match(sql, /alter table public\.milestones enable row level security/)
  assert.match(sql, /revoke all on public\.milestones from anon, authenticated/)
  assert.doesNotMatch(sql, /grant (select|insert|update|delete)[^;]*public\.milestones/i)
  assert.match(sql, /security definer\s+set search_path = public/)
  assert.doesNotMatch(sql, /user_id/, 'no account id in milestones')
  // Every event the app sends is allowed by the table.
  const allowed = sql.match(/event in \(([^)]*)\)/)[1]
  const app = readFileSync(new URL('../src/lib/milestones.js', import.meta.url), 'utf8') +
    readFileSync(new URL('../src/lib/coin-shop.js', import.meta.url), 'utf8') +
    readFileSync(new URL('../src/lib/people.js', import.meta.url), 'utf8') +
    readFileSync(new URL('../src/lib/widget-tonight.js', import.meta.url), 'utf8') +
    readFileSync(new URL('../native/AppShell.jsx', import.meta.url), 'utf8')
  const sent = [...app.matchAll(/noteMilestone\('([a-z_0-9]+)'\)/g)].map((m) => m[1])
  assert.ok(sent.length >= 4, 'found the app calls')
  for (const n of [1, 3, 7, 14]) sent.push(`night_${n}`)
  for (const e of new Set(sent)) assert.ok(allowed.includes(`'${e}'`), e)
})

// 2026-10-07: a dev phone with old saved data synced and zeroed a real account's coins.
test('a shelf sync never lowers the server coin or gem balance', () => {
  const sql = readFileSync(new URL('../supabase/wallet.sql', import.meta.url), 'utf8')
  const body = sql.slice(sql.indexOf('function public.clamp_shelf_gems()'), sql.indexOf('create trigger clamp_shelf_gems'))
  assert.ok(body.length > 0)
  assert.doesNotMatch(body, /updates+public.profiles/i)
})

await testAsync('earned frames use the best streak ever, not just tonight', async () => {
  const { bestShelfStreak, shelfStreak } = await import('../src/lib/hall-feel.js')
  const day = (n) => `2026-09-${String(n).padStart(2, '0')}`
  const yes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14]
  const book = {
    id: 'b1',
    title: 'Home',
    dayFoldHour: 0,
    lamps: [{ id: 'daily', question: 'Did I stretch?', cadence: 'daily', archived: false, createdOn: day(1) }],
    answers: yes.map((n) => ({ lampId: 'daily', periodKey: day(n), status: 'yes', answeredAt: `${day(n)}T21:00:00` })),
  }
  const now = new Date(2026, 8, 15, 12, 0)
  assert.equal(shelfStreak([book], now), 3, 'Sep 11 was left open, so tonight is 3')
  assert.equal(bestShelfStreak([book], now), 10, 'the 10 nights before the break still count as the best')
  assert.equal(bestShelfStreak([], now), 0)
})

await testAsync('no mangled characters (UTF-8 saved as Windows-1252) in app code or copy', async () => {
  const { readdirSync, statSync } = await import('node:fs')
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const bad = []
  // Latin accents (Ã©, Â·) and 3-byte scripts (Japanese, Korean, Chinese) read as Windows-1252.
  const MANGLED = /Â[ -¿]|Ã[-¿]|[â-ï][-¿Œ-Ÿƒˆ˜–-™]{2}/
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (/.(jsx?|mjs|tsx?)$/.test(name) && MANGLED.test(readFileSync(p, 'utf8'))) bad.push(path.relative(root, p))
    }
  }
  for (const dir of ['native', 'src', 'widgets']) walk(path.join(root, dir))
  assert.deepEqual(bad, [], 'files with mangled characters')
})

await testAsync('gentle mode is off by default and only true when set', async () => {
  const { readPrefs, writePrefs, gentleOn } = await import('../src/lib/prefs.js')
  const before = readPrefs()
  try {
    localStorage.removeItem('did-i-prefs')
    assert.equal(readPrefs().gentle, false)
    writePrefs({ gentle: 'yes' })
    assert.equal(gentleOn(), false)
    writePrefs({ gentle: true })
    assert.equal(gentleOn(), true)
  } finally {
    writePrefs(before)
  }
})

await testAsync('gentle mode tells the widgets to hide streak numbers, and the stack is unchanged', async () => {
  const { writePrefs } = await import('../src/lib/prefs.js')
  const book = {
    id: 't1',
    title: 'Home',
    dayFoldHour: 0,
    lamps: [{ id: 'a', question: 'A?', cadence: 'daily', archived: false, createdOn: '2020-01-01' }],
    answers: [],
  }
  const clock = new Date('2026-09-23T20:00:00')
  try {
    writePrefs({ gentle: false })
    const plain = buildTonightWidgetProps(writeShelf({ currentId: 't1', boards: [book] }), clock)
    assert.equal(plain.gentle, false)
    writePrefs({ gentle: true })
    const soft = buildTonightWidgetProps(writeShelf({ currentId: 't1', boards: [book] }), clock)
    assert.equal(soft.gentle, true)
    assert.equal(soft.left, plain.left)
    assert.equal(soft.leadLampId, plain.leadLampId)
    assert.ok(!/streak/i.test(JSON.stringify(soft)), 'no streak text in widget props')
  } finally {
    writePrefs({ gentle: false })
  }
})

test('gentle mode hides own streak counts on the phone, not what others see', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const read = (p) => readFileSync(path.join(root, p), 'utf8')
  assert.match(read('native/screens/TonightScreen.jsx'), /stack\.streak > 0 && !gentle/)
  assert.match(read('native/components/StreakMoment.jsx'), /gentleOn\(\)/)
  assert.match(read('native/screens/questions.jsx'), /gentle \? null/)
  const more = read('native/screens/more.jsx')
  assert.match(more, /if \(gentle\) \{/)
  assert.match(more, /gentle \? null : <NumberTile half colors=\{colors\} label=\{t\('stats\.bestRun'\)\}/)
  assert.match(read('native/shim/native.js'), /pingOn\('streakHit'\) \|\| gentleOn\(\)/)
  assert.ok(!/gentle/.test(read('native/screens/social.jsx')), 'friends and family views stay as they are')
})

test('the rate card asks for the in-app review, with the store link as fallback', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const card = readFileSync(path.join(root, 'native/components/RateCard.jsx'), 'utf8')
  assert.match(card, /from 'expo-store-review'/)
  assert.match(card, /StoreReview\.isAvailableAsync\(\)/)
  assert.match(card, /StoreReview\.hasAction\(\)/)
  assert.match(card, /StoreReview\.requestReview\(\)/)
  assert.match(card, /markRateAsked\(\)/)
  assert.ok(card.indexOf('requestReview()') < card.indexOf('Linking.openURL(url)'))
  const metro = readFileSync(path.join(root, 'metro.config.cjs'), 'utf8')
  assert.match(metro, /\['expo-store-review', 'store-review-safe\.cjs'\]/)
})

await testAsync('every so often made tonight: progress and the done card agree', async () => {
  const { dueTonight, dueClearTonight } = await import('../src/lib/recurrence.js')
  const daily = { id: 'd', question: 'Did I stretch?', cadence: 'daily', archived: false, createdOn: '2026-09-01' }
  const book = everyBook([['d', evDay(5), 'yes']], [daily])
  book.lamps[0].createdOn = evDay(5)
  const due = dueTonight(book, evAt(5))
  assert.ok(dueClearTonight(due), 'deck calls the night clear')
  const meter = nightProgress(due)
  assert.equal(meter.answered, meter.total, 'progress agrees: nothing left')
  const did = everyBook([['d', evDay(5), 'yes'], ['sheets', evDay(5), 'yes']], [daily])
  assert.equal(nightProgress(dueTonight(did, evAt(5))).total, 2, 'counts once done')
})

await testAsync('gentle mode hides a friend streak number, done tonight still shows', async () => {
  const { friendLine, friendStreak } = await import('../src/lib/people.js')
  const night = '2026-10-09'
  const plain = { share_streak: true, streak: 12, done_on: '2026-10-08' }
  const soft = { share_streak: true, streak: 12, done_on: '2026-10-08', gentle: true }
  assert.equal(friendStreak(plain), 12)
  assert.equal(friendStreak(soft), 0, 'no number for a gentle friend, even if one slipped through')
  assert.equal(friendStreak({ ...soft, streak: null }), 0, 'the server sends null')
  assert.match(friendLine(plain, night), /12/)
  assert.ok(!/12/.test(friendLine(soft, night)), 'not yet, no number')
  const done = friendLine({ ...soft, done_on: night }, night)
  assert.ok(done.includes('✓') && !/12/.test(done), 'done tonight with a check')
  assert.ok(!/\d/.test(friendLine({ ...soft, done_on: night }, night)))
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const read = (p) => readFileSync(path.join(root, p), 'utf8')
  for (const file of ['native/screens/social.jsx', 'src/lib/Friends.jsx', 'src/lib/People.jsx']) {
    const src = read(file)
    assert.ok(!/person\.streak\s*>|person\?\.streak\s*>|person\.streak\b(?!_)/.test(src.replace(/share_streak/g, '')), `${file} reads friend streaks only through friendStreak`)
    assert.ok(!/function friendLine\(/.test(src) && !/function line\(/.test(src), `${file} uses the shared friendLine`)
  }
})

await testAsync('check on me: due only past the time, on an asked night, unanswered, once', async () => {
  const { checkOnDue, checkOnDays, checkOnFits, cleanMinute, minuteClock, CHECK_ON_DEFAULT } = await import('../src/lib/check-on.js')
  assert.equal(CHECK_ON_DEFAULT, 1320)
  assert.equal(minuteClock(1320), '22:00')
  assert.equal(cleanMinute(-30), 0)
  assert.equal(cleanMinute(2000), 1439)
  const link = { at_minute: 1320, days: [], sent_on: null }
  const at = { night: '2026-10-09', minute: 1325, weekday: 5, answered: false }
  assert.equal(checkOnDue(link, at), true)
  assert.equal(checkOnDue(link, { ...at, minute: 1319 }), false, 'before the time')
  assert.equal(checkOnDue(link, { ...at, answered: true }), false, 'answered, Did or nope')
  assert.equal(checkOnDue({ ...link, sent_on: '2026-10-09' }, at), false, 'one push a night')
  assert.equal(checkOnDue({ ...link, sent_on: '2026-10-08' }, at), true, 'a new night')
  assert.equal(checkOnDue({ ...link, days: [1, 3] }, at), false, 'not asked on a Friday')
  assert.equal(checkOnDue({ ...link, days: [5] }, at), true)
  assert.deepEqual(checkOnDays({ cadence: 'weekly', weekdays: [3, 1, 1, 9] }), [1, 3])
  assert.deepEqual(checkOnDays({ cadence: 'daily' }), [])
  assert.equal(checkOnFits({ cadence: 'daily' }), true)
  assert.equal(checkOnFits({ cadence: 'monthly' }), false, 'monthly with no day')
  assert.equal(checkOnFits({ cadence: 'daily', archived: true }), false)
})

await testAsync('check-on: monthly, once, deadline and every-so-often nights', async () => {
  const { checkOnDue, checkOnFits, checkOnKind, checkOnShape, checkOnWhen } = await import('../src/lib/check-on.js')
  const base = { at_minute: 1320, sent_on: null, days: [] }
  const at = (night, more = {}) => ({ night, minute: 1330, weekday: 2, answered: false, ...more })
  // Monthly: the day, clamped to short months; 0 is the last day.
  const monthly = { ...base, kind: 'monthly', month_day: 12 }
  assert.equal(checkOnDue(monthly, at('2026-10-12')), true)
  assert.equal(checkOnDue(monthly, at('2026-10-13')), false)
  assert.equal(checkOnDue(monthly, at('2026-10-12', { answered: true })), false)
  assert.equal(checkOnDue({ ...monthly, month_day: 31 }, at('2027-02-28')), true, '31st falls on the last day')
  assert.equal(checkOnDue({ ...monthly, month_day: 0 }, at('2026-10-31')), true)
  assert.equal(checkOnDue({ ...monthly, month_day: 0 }, at('2026-10-30')), false)
  // Just once, and a deadline: only that night, only once.
  const once = { ...base, kind: 'once', on_date: '2026-10-20' }
  assert.equal(checkOnDue(once, at('2026-10-20')), true)
  assert.equal(checkOnDue(once, at('2026-10-21')), false)
  assert.equal(checkOnDue({ ...once, sent_on: '2026-10-20' }, at('2026-10-20')), false)
  const by = { ...base, kind: 'by', on_date: '2026-10-20', starts_on: '2026-10-01' }
  assert.equal(checkOnDue(by, at('2026-10-15')), true, 'a night inside the window')
  assert.equal(checkOnDue(by, at('2026-10-20')), true)
  assert.equal(checkOnDue(by, at('2026-09-30')), false, 'before the window')
  assert.equal(checkOnDue(by, at('2026-10-21')), false, 'after the due date')
  assert.equal(checkOnDue({ ...by, starts_on: null }, at('2026-10-15')), false, 'no start: the due night only')
  // Every so often: never done, or every_days since the last Did.
  const every = { ...base, kind: 'every', every_days: 7 }
  assert.equal(checkOnDue(every, at('2026-10-09')), true, 'never done')
  assert.equal(checkOnDue(every, at('2026-10-09', { lastDid: '2026-10-05' })), false)
  assert.equal(checkOnDue(every, at('2026-10-12', { lastDid: '2026-10-05' })), true)
  assert.equal(checkOnDue(every, at('2026-10-12', { lastDid: '2026-10-05', minute: 600 })), false, 'before the time')
  // The learned gap wins over the set one, as on Tonight.
  assert.equal(checkOnDue(every, at('2026-10-09', { lastDid: '2026-10-05', learned: 3 })), true)
  // From the question to the row.
  assert.equal(checkOnKind({ cadence: 'monthly', monthDay: 'last' }), 'monthly')
  assert.deepEqual(checkOnShape({ cadence: 'monthly', monthDay: 12 }), { kind: 'monthly', month_day: 12, on_date: null, starts_on: null, every_days: null })
  assert.equal(checkOnShape({ cadence: 'monthly', monthDay: 'last' }).month_day, 0)
  assert.equal(checkOnShape({ cadence: 'once', onceOn: '2026-10-20' }).on_date, '2026-10-20')
  assert.equal(checkOnFits({ cadence: 'once' }), false, 'a once with no day')
  const dl = checkOnShape({ cadence: 'once', onceWhen: 'by', dueBy: '2026-10-20', createdOn: '2026-10-01' })
  assert.deepEqual([dl.kind, dl.on_date, dl.starts_on], ['by', '2026-10-20', '2026-10-01'])
  assert.equal(checkOnShape({ cadence: 'every', everyDays: 14 }).every_days, 14)
  assert.equal(checkOnShape({ cadence: 'every' }).every_days, 7)
  assert.equal(checkOnShape({ cadence: 'daily' }).kind, 'night')
  assert.equal(checkOnWhen({ cadence: 'daily' }), null)
  assert.deepEqual(checkOnWhen({ cadence: 'monthly', monthDay: 12 }), { key: 'checkOn.whenMonthly', day: 12 })
  assert.deepEqual(checkOnWhen({ cadence: 'once', onceWhen: 'by', dueBy: '2026-10-20' }), { key: 'checkOn.whenBy', date: '2026-10-20' })
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const card = readFileSync(path.join(root, 'native/components/CheckOnCard.jsx'), 'utf8')
  assert.match(card, /checkOnWhen\(lamp\)/)
})

test('social-gentle.sql: queue_check_ons handles every kind in one statement', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const sql = readFileSync(path.join(root, 'supabase/social-gentle.sql'), 'utf8')
  for (const col of ['kind text not null default \'night\'', 'month_day smallint', 'on_date date', 'starts_on date', 'every_days smallint']) {
    assert.ok(sql.includes(`add column if not exists ${col}`), col)
  }
  assert.match(sql, /kind in \('night', 'monthly', 'once', 'by', 'every'\)/)
  assert.match(sql, /grant update \(buddy_id, question, at_minute, days, kind, month_day, on_date, starts_on, every_days\)/)
  const job = sql.slice(sql.indexOf('function public.queue_check_ons'))
  const body = job.slice(0, job.indexOf('$$;'))
  assert.ok(!/\bloop\b|\bfor \w+ in\b/i.test(body), 'no per-row loop')
  assert.match(body, /when 'monthly' then extract\(day from k\.local\)/)
  assert.match(body, /when 'once' then k\.local::date = k\.on_date/)
  assert.match(body, /when 'by' then k\.local::date between coalesce\(k\.starts_on, k\.on_date\) and k\.on_date/)
  // A Not yet on a deadline only holds tonight; a Did ends it.
  assert.match(body, /k\.kind <> 'by' or a\.status in \('yes', 'late'\)\s*or \(a\.updated_at at time zone k\.zone\)::date = k\.local::date/)
  // Every so often uses the gap the app learns: median of the last 6 Did nights' gaps, from 4 Dids.
  assert.match(body, /left join lateral \(/)
  assert.match(body, /case when count\(\*\) >= 4/)
  assert.match(body, /percentile_cont\(0\.5\) within group \(order by n\.gap\)/)
  assert.match(body, /limit 6/)
  assert.match(body, /when 'every' then coalesce\(k\.local::date - g\.last_did >= coalesce\(g\.learned, k\.every_days\), true\)/)
  // Same numbers as learnedGap: 6 nights, 4 Dids, median rounded half up.
  const src = readFileSync(path.join(root, 'src/lib/recurrence.js'), 'utf8')
  assert.match(src, /const LEARN_GAPS = 5/)
  assert.match(src, /if \(count < 4\) return 0/)
  assert.match(body, /a\.status in \('yes', 'late'\)/)
  assert.match(body, /to_char\(k\.local, 'YYYY-MM'\)/)
  assert.match(body, /'once:' \|\| k\.lamp_id/)
  assert.match(body, /public\.push_wanted\(k\.buddy_id, 'friends'\)/)
  assert.match(body, /push_token is not null/)
  assert.match(body, /from public\.blocks b/)
  assert.match(body, /k\.sent_on is null or k\.sent_on < k\.local::date/)
})

test('check-on.js: daily limit says try tomorrow, total cap says turn one off', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const src = readFileSync(path.join(root, 'src/lib/check-on.js'), 'utf8')
  assert.match(src, /\/too many check-ons\/i\.test\([^)]*\)\) return 'checkOn\.capToday'/)
  assert.match(src, /\/check-on cap\/i\.test\([^)]*\)\) return 'checkOn\.cap'/)
})

test('social-gentle.sql: gentle streak hidden on the server, check_ons locked down and batched', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const sql = readFileSync(path.join(root, 'supabase/social-gentle.sql'), 'utf8').replace(/\r\n/g, '\n')
  // known_people nulls the number for gentle people.
  assert.match(sql, /create or replace function public\.known_people\(\)[\s\S]*?case when coalesce\(p\.prefs ->> 'gentle', ''\) = 'true' then null else p\.streak end/)
  assert.match(sql, /grant execute on function public\.known_people\(\) to authenticated/)
  // check_ons: RLS, policies, cap, index, size checks.
  assert.match(sql, /alter table public\.check_ons enable row level security/)
  assert.match(sql, /for select using \(\(select auth\.uid\(\)\) in \(owner_id, buddy_id\)\)/)
  assert.match(sql, /for insert with check \(\s*\(select auth\.uid\(\)\) = owner_id\s*and \(public\.are_friends\(buddy_id\) or \(public\.shares_family\(buddy_id\) and not public\.blocked_with\(buddy_id\)\)\)/)
  assert.match(sql, /for update using \(\(select auth\.uid\(\)\) = owner_id\)/)
  assert.match(sql, /for delete using \(\(select auth\.uid\(\)\) in \(owner_id, buddy_id\)\)/)
  assert.ok(!/auth\.uid\(\) =/.test(sql.replace(/\(select auth\.uid\(\)\)/g, '')), 'no bare auth.uid() in policies')
  assert.match(sql, /where owner_id = new\.owner_id\) >= 20 then\s*raise exception 'check-on cap'/)
  assert.match(sql, /create index if not exists check_ons_buddy_idx on public\.check_ons \(buddy_id\)/)
  assert.match(sql, /unique \(owner_id, lamp_id\)/)
  assert.match(sql, /length\(btrim\(question\)\) between 1 and 200/)
  assert.match(sql, /grant update \(buddy_id, question, at_minute, days[^)]*\) on public\.check_ons to authenticated/)
  // The job: one statement, answer_log, push_wanted, blocks, through push_queue on pg_cron.
  const job = sql.slice(sql.indexOf('function public.queue_check_ons'))
  assert.ok(!/\bloop\b|\bfor \w+ in\b/i.test(job.slice(0, job.indexOf('$$;'))), 'no per-row loop')
  assert.match(job, /from public\.answer_log a/)
  assert.match(job, /public\.push_wanted\(k\.buddy_id, 'friends'\)/)
  assert.match(job, /from public\.blocks b/)
  assert.match(job, /insert into public\.push_queue/)
  assert.match(job, /revoke all on function public\.queue_check_ons\(\) from public, anon, authenticated/)
  assert.match(sql, /cron\.schedule\('check-ons', '\*\/5 \* \* \* \*'/)
  const order = readFileSync(path.join(root, 'scripts/apply-all-sql.mjs'), 'utf8')
  assert.ok(order.indexOf('social-gentle.sql') > order.indexOf('friends-week.sql'), 'social-gentle redefines known_people after friends-week')
  // The push opens the friend page, which opens the Did you with the words in.
  assert.match(sql, /'\/friend\?id=' \|\| m\.owner_id::text \|\| '&face=checkon'/)
  const social = readFileSync(path.join(root, 'native/screens/social.jsx'), 'utf8')
  assert.match(social, /face === 'checkon'/)
  assert.match(social, /initialQuestion=\{sheet\.question \|\| ''\}/)
})

await testAsync('did we amounts: weekly total math and week start', async () => {
  const { readAmount, togetherLine, totalsById, weekStartIso } = await import('../src/lib/social-amounts.js')
  assert.equal(weekStartIso('2026-10-09'), '2026-10-05', 'friday -> monday')
  assert.equal(weekStartIso('2026-10-05'), '2026-10-05', 'monday stays')
  assert.equal(weekStartIso('2026-10-11'), '2026-10-05', 'sunday ends the week')
  const sums = totalsById([
    { card_id: 'a', unit: 'glasses', total: '31', mine: '4' },
    { card_id: 'b', unit: '', total: 2.345, mine: null },
    { card_id: 'c', unit: 'km', total: 'x', mine: '' },
    { unit: 'lost' },
  ])
  assert.deepEqual(sums.get('a'), { unit: 'glasses', total: 31, mine: 4 })
  assert.equal(sums.get('b').total, 2.35)
  assert.equal(sums.get('c').total, 0)
  assert.equal(sums.get('c').mine, null)
  assert.equal(sums.size, 3)
  assert.equal(togetherLine(sums.get('a')), 'Together: 31 glasses this week')
  assert.equal(togetherLine(sums.get('b')), 'Together: 2.35 this week')
  assert.equal(togetherLine(sums.get('c')), '', 'nothing yet reads as nothing')
  assert.equal(readAmount('3,5'), 3.5)
  assert.equal(readAmount(''), null)
  assert.ok(Number.isNaN(readAmount('-1')))
  assert.ok(Number.isNaN(readAmount('100001')))
})

await testAsync('web social: shared notes and check-ons grouped per friend, web screens wired', async () => {
  const { notesByFriend } = await import('../src/lib/social-amounts.js')
  const { groupBy } = await import('../src/lib/check-on.js')
  const notes = notesByFriend(
    [
      { user_id: 'a', note: 'one' },
      { user_id: 'b', note: 'x' },
      { user_id: 'a', note: '  ' },
      { user_id: 'a', note: 'two' },
      { user_id: 'a', note: 'three' },
      { note: 'nobody' },
    ],
    2,
  )
  assert.deepEqual(notes.get('a').map((row) => row.note), ['one', 'two'], 'newest first, capped, blank dropped')
  assert.equal(notes.get('b').length, 1)
  assert.equal(notes.size, 2)
  const asks = groupBy([{ id: 1, owner_id: 'a' }, { id: 2, owner_id: 'b' }, { id: 3, owner_id: 'a' }, { id: 4 }], 'owner_id')
  assert.deepEqual(asks.get('a').map((row) => row.id), [1, 3])
  assert.equal(asks.size, 2)
  assert.equal(groupBy(null, 'x').size, 0)
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const read = (file) => readFileSync(path.join(root, file), 'utf8')
  assert.match(read('src/lib/Family.jsx'), /howOften === 'daily' \? 0 : Number\(howOften\)/, 'web family can add every so often')
  assert.match(read('src/lib/FamilyTonight.jsx'), /sharedLastLine\(row\.last, row\.night, row\.lastName\)/)
  assert.match(read('src/lib/SendDidYou.jsx'), /senderLastDid\(book, question/, 'web ask carries your last Did')
  assert.match(read('src/lib/DidYou.jsx'), /senderLastDid\(book, question/)
  assert.match(read('src/lib/Inbox.jsx'), /sendLastLine\(row\.repeat, row\.last_did_on/)
  assert.match(read('src/lib/Sent.jsx'), /sendLastLine\(row\.repeat, row\.last_did_on/)
  assert.match(read('src/lib/LampDetail.jsx'), /<CheckOnCard lamp=\{lamp\} \/>/)
  assert.match(read('src/lib/DidWe.jsx'), /togetherLine\(sums\.get\(card\.id\)\)/)
  assert.match(read('src/lib/Friends.jsx'), /sharedNotesOf\(ids\)/)
})

test('did we amounts: private question amounts never in the query', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const sql = readFileSync(path.join(root, 'supabase/social-amounts.sql'), 'utf8')
  const fn = sql.slice(sql.indexOf('function public.we_week_totals'), sql.indexOf('revoke all on function public.we_track_amount'))
  assert.ok(fn.length > 100, 'we_week_totals found')
  assert.doesNotMatch(fn, /answer_log/, 'totals never read your own questions')
  assert.match(fn, /from public\.we_answers a/)
  assert.match(fn, /m\.user_id = \(select auth\.uid\(\)\)\s+and m\.state = 'in'/, 'only cards you are on')
  assert.match(fn, /c\.track_amount/, 'only cards that track an amount')
  assert.doesNotMatch(fn, /returns table \([^)]*user_id/, 'no per-person rows')
  const client = readFileSync(path.join(root, 'src/lib/social-amounts.js'), 'utf8')
  assert.doesNotMatch(client.replace(/^\s*\/\/.*$/gm, ''), /answer_log|put_answers/, 'client never reads private amounts')
  assert.match(client, /db\.rpc\('we_week_totals', \{ cards: ids/, 'one batched read for every card')
})

test('shared notes and we amounts: sql guards', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const sql = readFileSync(path.join(root, 'supabase/social-amounts.sql'), 'utf8')
  assert.match(sql, /alter table public\.shared_notes enable row level security/)
  assert.match(sql, /for select using \(\(select auth\.uid\(\)\) = user_id or public\.are_friends\(user_id\)\)/)
  assert.doesNotMatch(sql.replace(/\(select auth\.uid\(\)\)/g, ''), /auth\.uid\(\)/, 'no bare auth.uid()')
  assert.match(sql, /length\(note\) between 1 and 500/)
  assert.match(sql, /length\(question\) <= 200/)
  assert.match(sql, /amount_unit\) <= 24/)
  assert.match(sql, />= 20 then\s+raise exception 'too many shared notes today'/)
  assert.match(sql, /before insert on public\.shared_notes/)
  assert.match(sql, /create index if not exists shared_notes_made_idx on public\.shared_notes \(user_id, made_at\)/)
  assert.equal((sql.match(/security definer/g) || []).length, (sql.match(/set search_path = public/g) || []).length)
  assert.match(sql, /revoke all on public\.shared_notes from anon/)
  assert.match(sql, /where id = card and made_by = me/, 'only the maker turns amounts on')
  assert.match(sql, /status = 'did'/, 'amounts only on a did')
  const all = readFileSync(path.join(root, 'scripts/apply-all-sql.mjs'), 'utf8')
  assert.match(all, /'supabase\/social-amounts\.sql'/)
  const notes = readFileSync(path.join(root, 'native/components/NightNotes.jsx'), 'utf8')
  assert.match(notes, /useState\(\(\) => Boolean\(share && noteShared/, 'share starts off unless already shared')
  const web = readFileSync(path.join(root, 'src/lib/Tonight.jsx'), 'utf8')
  assert.match(web, /sharedNote\.toggle/)
})

await testAsync('shared every so often: due across members, any Did resets it, copy, SQL', async () => {
  const { sharedEveryDue, newestDid, sharedLastLine, sendLastLine } = await import('../src/lib/every-copy.js')
  const { repeatFrom, readRepeat, keptLamp, senderLastDid } = await import('../src/lib/send-repeat.js')
  const { peopleTonightItems } = await import('../src/lib/people-tonight.js')
  const lamp = { id: 'w', cadence: 'every', every_days: 7, made_on: '2026-09-01', archived: false }
  assert.ok(sharedEveryDue(lamp, null, '2026-09-01'), 'never done: due for everyone')
  assert.ok(!sharedEveryDue(lamp, null, '2026-08-31'), 'not before it was made')
  const answers = [
    { lamp_id: 'w', user_id: 'sam', period_key: '2026-09-03', status: 'yes' },
    { lamp_id: 'w', user_id: 'ana', period_key: '2026-09-08', status: 'skip' },
  ]
  const last = newestDid(answers)
  assert.deepEqual(last, { on: '2026-09-03', by: 'sam' }, 'a nope never counts as the last Did')
  assert.ok(!sharedEveryDue(lamp, last, '2026-09-09'), 'Sam did it 6 nights ago: not due for anyone')
  assert.ok(sharedEveryDue(lamp, last, '2026-09-10'), 'due for everyone 7 nights after Sam')
  const reset = newestDid([...answers, { lamp_id: 'w', user_id: 'ana', period_key: '2026-09-10', status: 'yes' }])
  assert.equal(reset.by, 'ana', 'the newest Did wins, whoever said it')
  assert.ok(!sharedEveryDue(lamp, reset, '2026-09-11'), 'one Did resets it for the whole family')
  assert.ok(!sharedEveryDue({ ...lamp, cadence: 'daily' }, null, '2026-09-10'), 'only every so often questions')
  assert.equal(sharedLastLine(null, '2026-09-10', 'Sam'), en['every.never'])
  assert.equal(sharedLastLine(last, '2026-09-05', 'Sam'), 'Sam did it 2 days ago')
  assert.equal(sharedLastLine(last, '2026-09-04', 'Sam'), 'Sam did it 1 day ago')
  assert.equal(sharedLastLine(last, '2026-09-03', 'Sam'), 'Sam did it today')
  assert.equal(sharedLastLine(last, '2026-09-05', ''), 'Last time: 2 days ago')
  // Did you asks
  assert.equal(repeatFrom('every', [], 14), 'every:14')
  assert.equal(repeatFrom('every', [], 0), '')
  assert.equal(readRepeat('every:14').everyDays, 14)
  assert.equal(readRepeat('every:999').cadence, 'once', 'out of range falls back')
  const kept = keptLamp({ question: 'Did I water the plants?', repeat: 'every:7' }, new Date('2026-09-10T20:00:00'))
  assert.equal(kept.cadence, 'every')
  assert.equal(kept.everyDays, 7)
  assert.equal(sendLastLine('every:7', '2026-08-29', '2026-09-10'), 'Last time: 12 days ago')
  assert.equal(sendLastLine('every:7', null, '2026-09-10'), en['every.never'])
  assert.equal(sendLastLine('daily', '2026-08-29', '2026-09-10'), '', 'only every so often asks')
  const book = { lamps: [{ id: 'p', question: 'Did I water the plants?', cadence: 'every', everyDays: 7 }], answers: [{ lampId: 'p', periodKey: '2026-08-29', status: 'yes' }] }
  assert.equal(senderLastDid(book, 'Did you water the plants', '2026-09-10'), '2026-08-29', 'matches your own question')
  assert.equal(senderLastDid(book, 'Did you feed the cat?', '2026-09-10'), '')
  // Not yet only affects you: your nope takes the card off your tonight only.
  const famRow = (answer) => ({ family: { id: 'f' }, lamp: { id: 'w', question: 'Did we water the plants?' }, night: '2026-09-10', answer })
  assert.equal(peopleTonightItems({ familyRows: [famRow(null)] }).length, 1)
  assert.equal(peopleTonightItems({ familyRows: [famRow({ status: 'skip' })] }).length, 0)
  // SQL
  const sql = readFileSync(new URL('../supabase/shared-every.sql', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
  for (const bit of [
    "cadence in ('daily', 'weekly', 'once', 'every')",
    'every_days between 1 and 365',
    'security definer\nset search_path = public',
    'public.in_family(l.family_id)',
    'lamps[1:200]',
    'revoke all on function public.family_every_last(uuid[]) from public, anon;',
    "status in ('yes', 'late')",
    'create index if not exists family_answers_last_did_idx',
    "'^every:[1-9][0-9]{0,2}$'",
  ]) assert.ok(sql.includes(bit), bit)
  assert.doesNotMatch(sql, /create table/i, 'no new table, so no new policies to keep')
  assert.doesNotMatch(sql, /[^(]auth\.uid\(\)/, 'no bare auth.uid()')
  const people = readFileSync(new URL('../supabase/people.sql', import.meta.url), 'utf8')
  assert.ok(people.replace(/\r\n/g, '\n').includes('on public.family_answers\n  for select using (public.in_family(family_id));'), 'members already see family answers')
  const order = readFileSync(new URL('../scripts/apply-all-sql.mjs', import.meta.url), 'utf8')
  assert.ok(order.indexOf('shared-every.sql') > order.indexOf('did-you-repeat.sql'), 'after the repeat constraint it replaces')
  const lib = readFileSync(new URL('../src/lib/people.js', import.meta.url), 'utf8')
  assert.ok(lib.includes("rpc('family_every_last'"), 'one call for every question, not one per row')
})

await testAsync('shared notes sync across devices, and Did we group notes', async () => {
  const { sharedKeysFrom, weNotesView } = await import('../src/lib/social-amounts.js')
  assert.deepEqual(
    sharedKeysFrom([{ lamp_id: 'a', period_key: '2026-10-09' }, { lamp_id: 'a', period_key: '2026-10-09' }, { lamp_id: 'b' }, null]),
    ['a|2026-10-09'],
    'server rows become cache keys, no repeats or broken rows',
  )
  assert.deepEqual(sharedKeysFrom(null), [])
  const people = [{ id: 'me', name: 'Me' }, { id: 'p', name: 'Pat' }]
  const view = weNotesView(
    [
      { user_id: 'me', night: '2026-10-09', note: 'ran', shared: false },
      { user_id: 'p', night: '2026-10-08', note: 'old', shared: true },
      { user_id: 'p', night: '2026-10-09', note: 'new', shared: true },
      { user_id: 'p', night: '2026-10-07', note: 'kept', shared: false },
      { user_id: 'gone', night: '2026-10-09', note: 'left', shared: true },
      { user_id: 'p', night: '2026-10-06', note: '  ', shared: true },
    ],
    'me',
    people,
  )
  assert.deepEqual(view.mine.get('2026-10-09'), { note: 'ran', shared: false })
  assert.deepEqual(view.shared.map((r) => r.note), ['new', 'old'], 'only shared, only people on the card, newest first')
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const client = readFileSync(path.join(root, 'src/lib/social-amounts.js'), 'utf8')
  assert.match(client, /\.from\('shared_notes'\)\s*\.select\('lamp_id, period_key'\)\s*\.eq\('user_id', user\.id\)/, 'one read of all your shared notes')
  assert.match(client, /SYNC_MS/, 'cached, not per row')
  const notes = readFileSync(path.join(root, 'native/components/NightNotes.jsx'), 'utf8')
  assert.match(notes, /noteSharedNow\(share\.lampId, share\.periodKey\)/, 'sheet asks the server on open')
  const web = readFileSync(path.join(root, 'src/lib/Tonight.jsx'), 'utf8')
  assert.match(web, /noteSharedNow\(target\.lampId, target\.periodKey\)/)
  const we = readFileSync(path.join(root, 'native/components/WeNotes.jsx'), 'utf8')
  assert.match(we, /useState\(Boolean\(initial\?\.shared\)\)/, 'share with the group starts off')
  assert.match(we, /cheer\.cheer\(/, 'shared notes use the Did we cheer')
  const sql = readFileSync(path.join(root, 'supabase/social-amounts.sql'), 'utf8').replace(/\r\n/g, '\n')
  const part = sql.slice(sql.indexOf('create table if not exists public.we_notes'))
  assert.match(part, /alter table public\.we_notes enable row level security/)
  assert.match(part, /shared\s+and public\.we_note_in\(card_id, \(select auth\.uid\(\)\)\)\s+and public\.we_note_in\(card_id, user_id\)/, 'readers and writers must still be on the card')
  assert.match(part, /m\.state = 'in' and not c\.archived/, 'leaving or closing ends access')
  assert.match(part, /public\.we_note_did\(card_id, user_id, night\)/, 'only on a did night')
  assert.match(part, /create index if not exists we_notes_card_night_idx on public\.we_notes \(card_id, night\)/)
  assert.match(part, /create index if not exists we_notes_made_idx on public\.we_notes \(user_id, made_at\)/)
  assert.match(part, /length\(note\) between 1 and 500/)
  assert.match(part, />= 20 then\s+raise exception 'too many shared notes today'/)
  assert.match(part, /before insert on public\.we_notes/)
  assert.match(part, /revoke all on public\.we_notes from anon/)
  assert.doesNotMatch(part.replace(/\(select auth\.uid\(\)\)/g, ''), /auth\.uid\(\)/, 'no bare auth.uid()')
})

await testAsync('gaps-1: past Did we notes, note cheers, web amounts, family check-on asks', async () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
  // Past Did nights that can take a note: inside 14 nights, before tonight, Did only, newest first, no repeats.
  const { weNoteNights } = await import('../src/lib/social-amounts.js')
  assert.deepEqual(
    weNoteNights(
      [
        { night: '2026-10-09', status: 'did' },
        { night: '2026-10-07', status: 'did' },
        { night: '2026-10-08', status: 'nope' },
        { night: '2026-09-20', status: 'did' },
        { night: '2026-09-25', status: 'did' },
        { night: '2026-10-07', status: 'did' },
        { night: 'bad', status: 'did' },
      ],
      '2026-10-09',
    ),
    ['2026-10-07', '2026-09-25'],
  )
  assert.deepEqual(weNoteNights(null, '2026-10-09'), [])
  const weNotesUi = read('native/components/WeNotes.jsx')
  assert.match(weNotesUi, /putWeNote\(\{ cardId: card\.id, night: on,/, 'a past night saves on that night')
  assert.match(weNotesUi, /didNights\.map/)

  // A cheer for a note names the note, in the inbox and the banner.
  const { cheerTitle, didYouNewsLines } = await import('../src/lib/people.js')
  const { t } = await import('../src/lib/i18n.js')
  assert.equal(cheerTitle({ kind: 'cheer', question: 'Did I take my meds?' }), t('inbox.cheerNote', { q: 'Did I take my meds?' }))
  assert.ok(cheerTitle({ kind: 'cheer', question: 'Did I take my meds?' }).includes('Did I take my meds?'))
  assert.equal(cheerTitle({ kind: 'cheer', question: '' }), t('inbox.aCheer'))
  assert.ok(didYouNewsLines({ kind: 'cheer', n: 1, name: 'A', question: 'Water' }).title.includes('Water'))
  assert.equal(didYouNewsLines({ kind: 'cheer', n: 2, name: 'A', question: 'Water' }).title, t('didyou.newCheer', { name: 'A' }))
  assert.match(read('src/lib/Inbox.jsx'), /cheerTitle\(row\)/)
  assert.match(read('native/screens/social.jsx'), /cheer\(row\.question \|\| ''\)/, 'phone note cheer passes the note')
  assert.match(read('src/lib/Friends.jsx'), /onCheer\(row\.question \|\| ''\)/, 'web note cheer passes the note')
  const cheers = read('supabase/friend-cheers.sql')
  assert.match(cheers, /drop function if exists public\.send_friend_cheer\(uuid, text, text\);/)
  assert.match(cheers, /send_friend_cheer\(other uuid, note text, want text, about text default ''\)/)
  assert.match(cheers, /select 1 from public\.shared_notes s where s\.user_id = other and s\.question = topic/, 'only a note they really shared')
  assert.match(cheers, /values \(who, other, 'cheer', topic, line, cid\)/)
  assert.match(cheers, /grant execute on function public\.send_friend_cheer\(uuid, text, text, text\) to authenticated/)
  const push = read('supabase/push.sql')
  const wordsAt = push.indexOf("words jsonb := '") + "words jsonb := '".length
  const words = JSON.parse(push.slice(wordsAt, push.indexOf("}'", wordsAt) + 1).replace(/''/g, "'"))
  for (const lang of Object.keys(words)) assert.ok(words[lang].send_cheer_note.includes('{q}'), `push words parse, ${lang}`)
  for (const lang of ['en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']) {
    assert.match(push, new RegExp(`"${lang}": \\{[^\\n]*"send_cheer_note": "(?:[^"\\\\\\n]|\\\\.)*\\{q\\}`), `push text ${lang}`)
  }
  assert.match(push, /when new\.kind = 'cheer' and btrim\(coalesce\(new\.question, ''\)\) <> ''\s+then left\(public\.push_text\(new\.to_id, 'send_cheer_note'/)

  // Web Did we card: maker turns amounts on or off; after a Did you add yours.
  const we = read('src/lib/DidWe.jsx')
  assert.match(we, /function WeAmount\(/)
  assert.match(we, /weTrackAmount\(card\.id, true, text\.trim\(\)\)/)
  assert.match(we, /weTrackAmount\(card\.id, false\)/)
  assert.match(we, /wePutAmount\(card\.id, amount\)/)
  assert.match(we, /if \(!card\.mine && !\(sum && didTonight\)\) return null/, 'only the maker turns it on')
  assert.match(we, /<WeAmount card=\{card\}/)

  // Web Family page: asks from family members who are not friends (friends' are on Friends).
  const fam = read('src/lib/Family.jsx')
  assert.match(fam, /checkOnsForMe\(\)/)
  assert.match(fam, /for \(const id of friendIds\) askRows\.delete\(id\)/)
  assert.match(fam, /stopCheckOn\(ask\.id\)/)
  assert.match(fam, /initialQuestion=\{sheet\.question \|\| ''\}/)

  // An edit that changes words or schedule moves the check-on with it; anything else sends nothing.
  const { checkOnRule, followCheckOn } = await import('../src/lib/check-on.js')
  const daily = { id: 'q1', question: 'Water', cadence: 'daily' }
  assert.equal(checkOnRule(daily), checkOnRule({ ...daily, note: 'x', short: 'W' }), 'other fields do not count')
  assert.notEqual(checkOnRule(daily), checkOnRule({ ...daily, cadence: 'weekly', weekdays: [1] }))
  assert.notEqual(checkOnRule(daily), checkOnRule({ ...daily, question: 'Water plants' }))
  assert.equal(checkOnRule({ ...daily, cadence: 'nope' }), '', 'no rule for a question the server cannot check')
  assert.deepEqual(await followCheckOn(daily, { ...daily, note: 'x' }), { miss: '' }, 'unchanged: no write')
  assert.deepEqual(await followCheckOn(daily, { ...daily, id: 'q2', cadence: 'weekly' }), { miss: '' }, 'another question: no write')
  assert.match(read('native/screens/questions.jsx'), /if \(existing\) followCheckOn\(existing, next\)/)
  assert.match(read('src/lib/HangPage.jsx'), /if \(existing\) followCheckOn\(existing, lamp\)/)

  // Web Friends: the result line sticks in view instead of sitting under a long list.
  assert.match(read('src/lib/Friends.jsx'), /<div className="di-people-said">/)
  assert.match(read('src/lib/did-i.css'), /\.di-people-said \{\s*position: sticky;/)
})

// Owner picks A: family chip, gentle blanks, Track an amount on the form, web friend notes.
const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const readSrc = (file) => readFileSync(path.join(srcRoot, file), 'utf8').split(String.fromCharCode(13)).join('')

test('family and asks show as a chip beside your count and never add to it', () => {
  const items = peopleTonightItems({
    familyRows: [
      { family: { id: 'f' }, lamp: { id: 'a', question: 'Feed the cat?' }, night: '2026-10-09', answer: null },
      { family: { id: 'f' }, lamp: { id: 'b', question: 'Trash?' }, night: '2026-10-09', answer: null },
      { family: { id: 'f' }, lamp: { id: 'c', question: 'Done one' }, night: '2026-10-09', answer: { status: 'yes' } },
    ],
    asks: [{ id: 's1', kind: 'todo', state: 'sent', question: 'Call mom?' }],
    night: '2026-10-09',
  })
  assert.equal(peopleWaitingLine(items), `${t('tonight.meterFamily', { n: 2 })} · ${t('tonight.meterAsks', { n: 1 })}`)
  assert.equal(peopleWaitingLine(items.filter((item) => item.kind === 'family')), t('tonight.meterFamily', { n: 2 }))
  assert.equal(peopleWaitingLine([]), '', 'gone once all are answered')
  const own = [{ lamp: lamp('mine'), dateIso: '2026-10-09', answer: null }]
  assert.equal(nightProgress(own).total, 1, 'own total is only your own rows')
  assert.match(readSrc('native/screens/TonightScreen.jsx'), /waiting=\{peopleWaitingLine\(peopleItems\)\}/)
  const web = readSrc('src/lib/Tonight.jsx')
  assert.match(web, /waiting=\{peopleWaitingLine\(peopleTonightItems\(\{ familyRows: family\.rows \}\)\)\}/)
  assert.match(web, /getElementById\('di-fam-strip'\)\?\.scrollIntoView\(\{ behavior: reduce \? 'auto' : 'smooth'/)
  assert.match(readSrc('src/lib/FamilyTonight.jsx'), /id="di-fam-strip"/)
  assert.doesNotMatch(readSrc('src/lib/FamilyTonight.jsx'), /useFamilyTonight[(]/, 'one family read, shared with the chip')
})

test('gentle mode: a missed night is blank on Home, week, month, list and why sheet', () => {
  const why = { state: 'missed', iso: '2026-10-01', noped: [], unanswered: [{ lamp: lamp('Water') }], weOpen: [] }
  writePrefs({ gentle: false })
  assert.equal(nightWhyLines(why)[0], t('why.missed'))
  writePrefs({ gentle: true })
  const lines = nightWhyLines(why)
  assert.ok(!lines.includes(t('why.missed')), 'no streak broke line')
  assert.ok(lines.some((line) => line.includes('Water')), 'still names what was left')
  writePrefs({ gentle: false })
  assert.match(readSrc('native/components/DoneCard.jsx'), /night\.miss && !gentle\s*\?\s*missDot\(colors\)/)
  assert.match(readSrc('native/components/WeekStrip.jsx'), /night\.miss && !gentle \? colors\.miss/)
  assert.match(readSrc('src/lib/WeekStrip.jsx'), /night\.miss && prefs\.gentle !== true \? 'is-miss'/)
  const month = readSrc('native/components/LampMonth.jsx')
  assert.match(month, /nightOpen\(iso\) \? 'open' : gentle \? '' : 'missed'/)
  assert.match(month, /\.\.\.\(gentle \? \[\] : \[\{ id: 'missed'/)
  const list = readSrc('native/screens/questions.jsx')
  assert.match(list, /earlierStates\(earlier, gentle\)/)
  assert.match(list, /const missed = gentle \? '' : 'missed'/)
  assert.match(readSrc('native/components/CalendarGrid.jsx'), /t\(gentleOn\(\) \? 'jewelKey\.open' : 'cal\.notAnswered'\)/)
  assert.match(readSrc('src/lib/Calendar.jsx'), /prefs\.gentle === true \? 'cal\.hintGentle' : 'cal\.hint'/)
  assert.match(readSrc('native/screens/more.jsx'), /gentle \? 'cal\.hintGentle' : 'cal\.hint'/)
})

test('new Did we form: Track an amount with a unit, saved right after the card is made', () => {
  const phone = readSrc('native/screens/we.jsx')
  assert.match(phone, /if \(track\) \{\s+const tracked = await weTrackAmount\(out\.id, true, unit\.trim\(\)\)\s+if \(tracked\.miss\) confirmMiss\(t\('weAmount\.trackLater'\)\)/)
  assert.ok(phone.indexOf('weTrackAmount(out.id') > phone.indexOf('await weMake('), 'after the card exists')
  const web = readSrc('src/lib/DidWe.jsx')
  assert.match(web, /const tracked = await weTrackAmount\(out\.id, true, unit\.trim\(\)\)/)
  assert.match(web, /setMadeId\(out\.id\)/, 'a failed amount never makes the card twice')
  assert.match(web, /<SetSwitch label=\{t\('weAmount\.track'\)\}/)
  for (const src of [phone, web]) assert.match(src, /maxLength=\{24\}/, 'same unit limit as the server')
  assert.match(readSrc('supabase/social-amounts.sql'), /left\(btrim\(regexp_replace\(coalesce\(want_unit, ''\), '\\s\+', ' ', 'g'\)\), 24\)/)
})

test('web Friends: your private friend note, view, edit, remove, one read for the list', () => {
  const people = readSrc('src/lib/people.js')
  assert.match(people, /export async function friendNotesAll\(\)/)
  assert.match(people, /from\('friend_notes'\)\.select\('friend_id, note'\)\.eq\('owner_id', user\.id\)/)
  const web = readSrc('src/lib/Friends.jsx')
  assert.match(web, /friendNotesAll\(\)\.catch\(\(\) => null\)/, 'loaded once with the list, not per friend')
  assert.match(web, /<FriendNoteBox/)
  assert.match(web, /maxLength=\{FRIEND_NOTE_MAX\}/)
  assert.match(web, /onClick=\{\(\) => save\(''\)\}/, 'remove clears it')
  assert.match(web, /t\('friendNote\.private', \{ name \}\)/)
  assert.doesNotMatch(web, /readFriendNote\(/, 'no read per friend')
})

await testAsync('an ended Did you link is refused, says so, and can be reported', async () => {
  const read = (rel) => readFileSync(path.join(checkRoot, rel), 'utf8')
  const sql = read('supabase/did-you-links.sql')
  // Ended: no lookup, no add count, and the preview and page can tell.
  assert.match(sql, /look_up_did_you_link[\s\S]*?and not l\.ended/)
  // 7 days: lookup, claim, the stopped line and my links all use did_you_link_open.
  assert.match(sql, /interval '7 days'/)
  for (const fn of ['look_up_did_you_link', 'claim_did_you_link', 'did_you_link_stopped', 'my_did_you_links']) {
    assert.match(sql, new RegExp(fn + '[\\s\\S]*?did_you_link_open\\(l\\.made_by, l\\.made_at\\)'), fn + ' checks the 7 days')
  }
  assert.match(read('supabase/friend-ask-name.sql'), /befriend_by_link[\s\S]*?did_you_link_open/)
  assert.match(t('legal.privacy.social.body'), /works for 7 days/)
  assert.match(sql, /claim_did_you_link[\s\S]*?not l\.ended and l\.made_by is distinct from me/)
  assert.match(sql, /grant execute on function public\.did_you_link_stopped\(text\) to anon, authenticated/)
  assert.match(t('didYouLink.stopped'), /^This link has ended/)
  const api = read('api/link-preview.js')
  assert.match(api, /did_you_link_stopped[\s\S]*endedPreviewText\(lang\)/)
  // Report: signed in only, capped by cap_reports, once per person per link, no takedown.
  const report = /create or replace function public\.report_did_you_link[\s\S]*?\$\$;/.exec(sql)?.[0] || ''
  assert.match(report, /if me is null then raise exception 'sign in first'/)
  assert.match(report, /insert into public\.reports/)
  assert.match(report, /r\.from_id = me and r\.reason like tag/)
  assert.doesNotMatch(report, /ended = true|delete from public\.did_you_links/, 'a report does not take the link down')
  assert.match(sql, /revoke all on function public\.report_did_you_link\(text, text\) from public, anon/)
  assert.match(read('supabase/did-we-guard.sql'), /cap_reports[\s\S]*>= 20/)
  assert.match(read('src/site/DidYouLanding.jsx'), /reportDidYouLink\(code\)/)
  assert.match(read('native/components/DidYouLinkHost.jsx'), /onFoot:[\s\S]*reportDidYouLink\(code\)/)
  assert.match(read('src/lib/did-you-links.js'), /report_did_you_link/)
})

await testAsync('link previews pick the visitor language, question as written', async () => {
  const read = (rel) => readFileSync(path.join(checkRoot, rel), 'utf8')
  const { PREVIEW_LANGS, endedPreviewText, linkPreviewText, previewLang } = await import('../src/lib/link-preview.js')
  assert.deepEqual([...PREVIEW_LANGS].sort(), readdirSync(path.join(checkRoot, 'src/locales')).map((f) => f.replace('.js', '')).sort())
  assert.equal(previewLang(''), 'en')
  assert.equal(previewLang('de-DE,de;q=0.9,en;q=0.8'), 'de')
  assert.equal(previewLang('nl-NL,nl;q=0.9,fr;q=0.5'), 'fr')
  assert.equal(previewLang('en;q=0.4, ja;q=0.9'), 'ja')
  assert.equal(previewLang('sv, nl'), 'en')
  assert.equal(previewLang('ko;q=0, es'), 'es')
  const de = linkPreviewText({ question: 'call mom', name: 'Sam' }, false, 'de')
  assert.equal(de.title, 'Sam hat dir ein Did you geschickt')
  assert.equal(de.description, 'Did you call mom', 'the question stays as written')
  assert.equal(linkPreviewText({ question: 'call mom' }, false, 'xx').title, 'A Did you from Did I')
  assert.equal(endedPreviewText('es').title, 'Este enlace terminó')
  const api = read('api/link-preview.js')
  assert.match(api, /previewLang\(req\.headers\?\.\['accept-language'\]\)/)
  assert.match(api, /'Vary', 'Accept-Language'/)
})

test('gaps-2: Did we links can be reported, the same as Did you links', () => {
  const read = (rel) => readFileSync(path.join(checkRoot, rel), 'utf8')
  const sql = read('supabase/share-links.sql')
  const report = /create or replace function public\.report_we_link[\s\S]*?\$\$;/.exec(sql)?.[0] || ''
  assert.match(report, /if me is null then raise exception 'sign in first'/)
  assert.match(report, /r\.from_id = me and r\.reason like tag/, 'once per person per link')
  assert.match(report, /perform public\.block_person\(who, ''\)/)
  assert.doesNotMatch(report, /ended = true|delete from public\.we_links/, 'a report does not take the link down')
  assert.match(sql, /revoke all on function public\.report_we_link\(text, text\) from public, anon/)
  const lib = read('src/lib/did-you-links.js')
  assert.match(lib, /clean\.length === 12 \? 'report_we_link' : 'report_did_you_link'/)
  const host = read('native/components/DidYouLinkHost.jsx')
  assert.match(host, /if \(we\) \{[\s\S]*?\.\.\.\(found\.name \? reportFoot\(name\) : \{\}\)/, 'the Did we join sheet has Report')
  const page = read('src/site/DidYouLanding.jsx')
  assert.match(page, /we && !found\.name \? null : \(\s*<ReportLink/)
  assert.match(page, /found\.avatarUrl \? <img className="di-link-avatar"/, 'the link page shows the maker photo')
})

test('gaps-2: web calendar and week strip show a freeze ring', () => {
  const read = (rel) => readFileSync(path.join(checkRoot, rel), 'utf8')
  for (const file of ['src/lib/Calendar.jsx', 'src/lib/WeekStrip.jsx']) {
    assert.match(read(file), /night\.freeze \? 'is-freeze' : ''/, file)
  }
  const css = read('src/lib/did-i.css')
  assert.match(css, /\.di-cal-day\.is-freeze \.di-cal-pip,\s*\.di-weekbar-days li\.is-freeze \.di-weekbar-pip \{[^}]*var\(--di-freeze\)/)
  assert.ok(existsSync(path.join(checkRoot, 'supabase/tests/check-ons.test.sql')), 'check-ons has a SQL test')
})

test('drop-tonight.sql: old public tonight list is gone and delete_me still works', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const sql = readFileSync(path.join(root, 'supabase/drop-tonight.sql'), 'utf8').replace(/\r\n/g, '\n')
  assert.ok(!existsSync(path.join(root, 'supabase/tonight.sql')), 'tonight.sql would recreate the tables')
  assert.ok(!existsSync(path.join(root, 'supabase/dit-board.sql')), 'dit-board.sql would recreate the wall')
  for (const fn of ['tonight_wall(date)', 'tonight_tally(date)', 'sync_tonight(date, text[])', 'set_public_tonight(boolean)', 'cheer_on(uuid, date)', 'report_tonight(uuid, text)', 'sweep_tonight()', 'cap_tonight()', 'queue_cheer_push()']) {
    assert.ok(sql.includes('drop function if exists public.' + fn + ';'), fn)
  }
  assert.match(sql, /drop table if exists public\.tonight cascade;/)
  assert.match(sql, /drop table if exists public\.cheers cascade;/)
  assert.match(sql, /alter table public\.profiles drop column if exists public_tonight;/)
  // Idempotent: no bare create table or drop without if exists.
  assert.ok(!/drop (table|function|index) (?!if exists)/.test(sql))
  const del = sql.slice(sql.indexOf('create or replace function public.delete_me()'))
  assert.match(del, /security definer\nset search_path = public, auth/)
  assert.match(del, /me uuid := \(select auth\.uid\(\)\);/)
  assert.match(del, /update public\.family_members set role = 'parent'/)
  assert.match(del, /delete from auth\.users where id = me;/)
  assert.ok(!/public\.(tonight|cheers)\b/.test(del.slice(0, del.indexOf('$;'))), 'delete_me no longer names dropped tables')
  assert.match(del, /grant execute on function public\.delete_me\(\) to authenticated;/)
  // Runs last, so nothing applied after it can bring delete_me or the tables back.
  const order = readFileSync(path.join(root, 'scripts/apply-all-sql.mjs'), 'utf8')
  const files = [...order.matchAll(/'supabase\/([\w-]+\.sql)'/g)].map((m) => m[1])
  assert.equal(files.at(-1), 'drop-tonight.sql')
  assert.ok(!files.includes('tonight.sql') && !files.includes('dit-board.sql'))
  // No other SQL or client code reaches the dropped tables or functions.
  const dropped = /public\.tonight\b|public\.cheers\b|public_tonight|tonight_wall|tonight_tally|sync_tonight|set_public_tonight|report_tonight|sweep_tonight|rpc\(\s*['"]cheer_on['"]|from\(\s*['"](tonight|cheers)['"]/
  const walk = (dir) => readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
  const hits = [...walk(path.join(root, 'supabase')), ...walk(path.join(root, 'src')), ...walk(path.join(root, 'native')), ...walk(path.join(root, 'widgets'))]
    .filter((p) => /\.(sql|js|jsx|ts|tsx|mjs)$/.test(p) && !p.endsWith('drop-tonight.sql') && !p.includes('drop-tonight.test'))
    .filter((p) => dropped.test(readFileSync(p, 'utf8')))
  assert.deepEqual(hits, [])
})

await testAsync('signed out: gem buys ask to sign in, coin buys stay on the phone', async () => {
  const { SIGN_IN_MISS, buyFrame, buyWithGems, buyLookWithCoins } = await import('../src/lib/coin-shop.js')
  const book = { coins: 500, gems: 50 }
  for (const [kind, id] of [['buddy', 'cat'], ['cheer', CHEERS_FOR_SIGN_IN()]]) {
    const out = await buyWithGems(book, kind, id)
    assert.equal(out.miss, SIGN_IN_MISS, kind)
    assert.equal(out.book, book, 'nothing spent')
  }
  const gemLook = LOOKS.find((item) => item.gems > 0)
  assert.equal((await buyLookWithCoins(book, gemLook.id)).miss, SIGN_IN_MISS)
  assert.equal((await buyFrame(book, 'glow')).miss, SIGN_IN_MISS)
  // Coin items still buy on this phone.
  const coinFrame = await buyFrame(book, 'thin')
  assert.equal(coinFrame.miss, '')
  assert.ok(normalizePurse(coinFrame.book).frames.includes('thin'))
  const coinLook = LOOKS.find((item) => item.coins > 0 && !item.gems)
  assert.equal((await buyLookWithCoins(book, coinLook.id)).miss, '')
  // Owned gem items can still be worn.
  assert.equal((await buyWithGems({ ...book, buddies: ['ant', 'cat'] }, 'buddy', 'cat')).miss, '')
  for (const lang of ['en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'zh']) {
    const text = readFileSync(new URL('../src/locales/' + lang + '.js', import.meta.url), 'utf8')
    assert.match(text, /'shop\.miss\.signInGems'/, lang)
  }
  const host = readFileSync(new URL('../native/components/SheetHost.jsx', import.meta.url), 'utf8')
  assert.match(host, /export function askSignIn[\s\S]*?goLabel: t\('we\.signIn'\)[\s\S]*?closeLabel: t\('account\.stay'\)[\s\S]*?goHash\('\/account'\)/)
})

test('wishlist knows frames: buyable and seasonal, not earned; a seasonal one counts only while open', () => {
  let book = toggleWish({ coins: 0 }, 'frame', 'thin').book
  assert.deepEqual(normalizePurse(book).wish, ['frame:thin'])
  assert.equal(toggleWish({}, 'frame', 'vine').miss, 'shop.miss.wishGone', 'earned frames are not wishable')
  // Owning it takes the heart off.
  assert.deepEqual(normalizePurse({ ...book, frames: ['thin'] }).wish, [])
  // A gem frame: gems to go.
  assert.deepEqual(wishGoal(normalizePurse(toggleWish({ gems: 1 }, 'frame', 'glow').book)), { type: 'frame', id: 'glow', kind: 'gems', n: 2, nights: 14 })
  // Seasonal: closed is skipped, open says you can get it now.
  const hearts = normalizePurse(toggleWish({}, 'frame', 'hearts').book)
  assert.equal(wishGoal(hearts, '2027-06-01'), null)
  const open = wishGoal(hearts, '2027-02-05')
  assert.equal(open.n, 0)
  assert.deepEqual(wishLine(open), { key: 'wish.ready', n: 0, nameKey: 'frame.hearts.name' })
  const frames = readFileSync(new URL('../native/screens/frames.jsx', import.meta.url), 'utf8')
  assert.match(frames, /toggleWish\(book, 'frame', id\)/)
  assert.match(frames, /t\('shop\.remindMe'\)/)
})

test('launch-safety: test buys credit only listed ids after the launch date', () => {
  const review = 'review-id'
  const env = { IAP_TEST_USERS: ` ${review}, tester-2 `, IAP_LAUNCH_AT: '2026-11-01T00:00:00Z' }
  const before = Date.parse('2026-10-20T00:00:00Z')
  const after = Date.parse('2026-11-02T00:00:00Z')
  assert.equal(testBuyCredits('stranger', env, before), true, 'anyone before launch')
  assert.equal(testBuyCredits('stranger', env, after), false, 'stranger after launch')
  assert.equal(testBuyCredits(review, env, after), true, 'App Review account after launch')
  assert.equal(testBuyCredits('tester-2', env, after), true)
  assert.equal(testBuyCredits('stranger', { IAP_TEST_USERS: review }, before), false, 'no date: list only, as before')
  assert.equal(testBuyCredits(review, { IAP_TEST_USERS: review }, before), true)
  assert.equal(testBuyCredits('stranger', { IAP_LAUNCH_AT: 'soon' }, before), false, 'bad date: list only')
  const iap = readFileSync(path.join(checkRoot, 'supabase/functions/gem-iap/index.ts'), 'utf8')
  assert.match(iap, /import \{ testBuyCredits \} from '\.\/gate\.js'/)
  assert.match(iap, /IAP_LAUNCH_AT: Deno\.env\.get\('IAP_LAUNCH_AT'\)/)
  assert.match(iap, /if \(verified\.test && !testerAllowed\(userId\)\) return json\(\{ miss: 'test' \}, 403\)/)
  const store = readFileSync(path.join(checkRoot, 'native/iap/gem-store.js'), 'utf8')
  assert.match(store, /out\?\.miss === 'test'\) testBuyToast\(\)/)
  assert.match(store, /function testBuyToast\(\) \{\s*showToast\(\{[^}]*t\('gems\.testMiss'\)/)
  assert.equal(en['gems.testMiss'], "Test purchases don't add gems.")
})

test('launch-safety: reports admin is server checked and off every menu', () => {
  const read = (rel) => readFileSync(path.join(checkRoot, rel), 'utf8')
  const sql = read('supabase/admin.sql')
  assert.match(sql, /alter table public\.admins enable row level security/)
  assert.match(sql, /alter table public\.report_actions enable row level security/)
  assert.match(sql, /create or replace function public\.is_admin\(\)[\s\S]*?security definer\s+set search_path = public/)
  assert.match(sql, /for select to authenticated using \(\(select public\.is_admin\(\)\)\)/)
  for (const fn of ['admin_reports', 'admin_act']) {
    const body = sql.slice(sql.indexOf(`function public.${fn}(`))
    assert.match(body.slice(0, 1200), /if not public\.is_admin\(\) then raise exception 'not allowed'/, fn)
  }
  assert.match(sql, /insert into public\.report_actions/)
  assert.doesNotMatch(sql, /^insert into public\.admins/m, 'no admin ids shipped')
  assert.match(read('scripts/apply-all-sql.mjs'), /'supabase\/admin\.sql'/)
  assert.ok(existsSync(path.join(checkRoot, 'supabase/tests/admin.test.sql')))
  assert.match(read('src/site/hash.js'), /'\/admin\/reports'/)
  for (const rel of ['src/lib/SettingsCog.jsx', 'src/lib/AppNav.jsx', 'native/AppShell.jsx']) {
    assert.doesNotMatch(read(rel), /admin\/reports/, `${rel} does not link the admin page`)
  }
})

test('report emails: queued by trigger, closed table, capped, sent by report-mail on a cron', () => {
  const read = (rel) => readFileSync(path.join(checkRoot, rel), 'utf8')
  const sql = read('supabase/admin-mail.sql')
  assert.match(sql, /alter table public\.report_mail_queue enable row level security/)
  assert.match(sql, /revoke all on public\.report_mail_queue from public, anon, authenticated/)
  assert.match(sql, /create unique index if not exists report_mail_queue_report_idx on public\.report_mail_queue \(report_id\)/, 'one email per report')
  assert.match(sql, /after insert on public\.reports/)
  assert.match(sql, /least\(coalesce\(lim, 50\), 50\)/, 'at most 50 a run')
  assert.match(sql, /left\(coalesce\(r\.reason, ''\), 300\)/)
  assert.match(sql, /cron\.schedule\('report-mail', '0 13 \* \* \*'/, 'one summary a day, not one email per report')
  for (const fn of ['report_mail_batch', 'admin_emails', 'report_mail_done']) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon, authenticated`), fn)
  }
  assert.match(read('scripts/apply-all-sql.mjs'), /'supabase\/admin\.sql',\s+'supabase\/admin-mail\.sql'/)
  const fn = read('supabase/functions/report-mail/index.ts')
  assert.match(fn, /https:\/\/api\.resend\.com\/emails/)
  assert.match(fn, /RESEND_API_KEY/)
  assert.match(fn, /'Did I <support@did-i\.app>'/)
  assert.match(fn, /claims\?\.role === 'service_role'/)
  assert.match(fn, /https:\/\/did-i\.app\/app#\/admin\/reports/)
  assert.doesNotMatch(fn, /—/)
})

test('admin photo remove: only avatars/<that user>/<file>, admin delete policy, path read before admin_act', () => {
  const id = '0b7c2a4e-1111-4222-8333-444455556666'
  assert.equal(safeAvatarPath(`${id}/1700000000.jpg`), `${id}/1700000000.jpg`)
  for (const bad of [null, '', `${id}/../x.jpg`, `${id}/a/b.jpg`, 'other/x.jpg', `/${id}/x.jpg`, `${id}/`, 'avatars/' + id + '/x.jpg']) {
    assert.equal(safeAvatarPath(bad), '', String(bad))
  }
  const read = (rel) => readFileSync(path.join(checkRoot, rel), 'utf8')
  const sql = read('supabase/admin-mail.sql')
  assert.match(sql, /"avatars admin delete" on storage\.objects\s+for delete to authenticated\s+using \(bucket_id = 'avatars' and \(select public\.is_admin\(\)\)\)/)
  assert.match(sql, /obj !~ \('\^' \|\| r\.about_id::text \|\| '\/\[A-Za-z0-9\._-\]\+\$'\)/)
  const js = read('src/lib/people.js')
  const body = js.slice(js.indexOf('export async function adminAct('))
  assert.ok(body.indexOf("rpc('admin_photo_path'") < body.indexOf("rpc('admin_act'"), 'path read before the link is cleared')
  assert.ok(body.indexOf("rpc('admin_act'") < body.indexOf(".remove([path])"), 'file removed after the RPC')
})

await testAsync('did we look: status line, face overflow, done rule, dots', async () => {
  const { weDot, weFaceRow, weRuleKey, weStatus, weWeekDots } = await import('../src/lib/we-look.js')
  const p = (id, status, extra = {}) => ({ id, name: id, state: 'in', status, ...extra })
  const three = [p('me', 'did', { me: true }), p('jo', null), p('al', 'nope')]
  assert.deepEqual(weStatus({ mode: 'all', people: three, dids: 1, total: 3 }), { key: 'we.ofDid', vars: { n: 1, total: 3 } })
  assert.equal(weStatus({ mode: 'all', done: true }).key, 'we.doneAll')
  for (const mode of ['any', 'most', 'turns']) assert.equal(weStatus({ mode, done: true }).key, 'we.doneTogether')
  assert.equal(weStatus({ mode: 'turns', turn: 'me', people: three }).key, 'we.yourTurnShort')
  assert.deepEqual(weStatus({ mode: 'turns', turn: 'jo', people: three }), { key: 'we.theirTurn', vars: { name: 'jo' } })
  assert.equal(weStatus({ mode: 'turns', turn: 'gone', people: three, dids: 1, total: 3 }).key, 'we.ofDid')
  assert.deepEqual(['did', 'nope', null, undefined].map((s) => weDot({ status: s })), ['did', 'notYet', 'none', 'none'])
  const seven = Array.from({ length: 7 }, (_, i) => p(`p${i}`, i % 2 ? 'did' : null))
  seven.push({ id: 'asked', state: 'asked' })
  const row = weFaceRow({ people: seven, total: 7 })
  assert.equal(row.shown.length, 5)
  assert.equal(row.more, 2)
  assert.ok(!row.shown.some((f) => f.person.id === 'asked'), 'asked people are not faces')
  assert.equal(weFaceRow({ people: seven.slice(0, 2), total: 9 }).more, 7, 'a count card still says +N for hidden people')
  assert.equal(weFaceRow({ people: seven.slice(0, 3) }).more, 0)
  assert.deepEqual(['all', 'any', 'most', 'turns', 'weird'].map(weRuleKey), ['we.rule.all', 'we.rule.any', 'we.rule.most', 'we.rule.turns', 'we.rule.all'])
  const week = weWeekDots({ doneNights: ['2026-10-10', '2026-10-04', '2026-10-03'] }, '2026-10-10', new Map([['2026-10-09', 'nope']]))
  assert.equal(week.length, 7)
  assert.equal(week[0].night, '2026-10-04')
  assert.deepEqual(week.map((d) => d.together), [true, false, false, false, false, false, true])
  assert.equal(week[5].mine, 'notYet')
  const en = readFileSync(path.join(checkRoot, 'src/locales/en.js'), 'utf8')
  for (const key of ['we.ofDid', 'we.doneAll', 'we.yourTurnShort', 'we.rule.most', 'we.emptyFriend', 'we.newButton']) assert.ok(en.includes(`'${key}':`), key)
})

await testAsync('did we weekly wording, face lookup and slim Tonight row', async () => {
  const { weFaceFor, weMissKey, weModeKey, weNextCoinsKey, wePersonKey, weRowLine, weStatus, weWeekKey } = await import('../src/lib/we-look.js')
  const people = [{ id: 'me', name: 'Me', me: true, state: 'in', status: 'did' }, { id: 'jo', name: 'Jo', state: 'in', status: null }]
  assert.equal(weStatus({ cadence: 'weekly', mode: 'all', people, dids: 1, total: 2 }).key, 'we.ofDidWeek')
  assert.equal(weStatus({ cadence: 'daily', mode: 'all', people, dids: 1, total: 2 }).key, 'we.ofDid')
  assert.equal(weStatus({ cadence: 'weekly', mode: 'all', done: true }).key, 'we.doneAllWeek')
  assert.equal(weNextCoinsKey({ cadence: 'weekly' }, 6).key, 'we.nextCoinsWeeks')
  assert.equal(weNextCoinsKey({ cadence: 'weekly' }, 1).key, 'we.nextCoinsWeek')
  assert.equal(weNextCoinsKey({}, 1).key, 'we.nextCoinsOne')
  assert.equal(weNextCoinsKey({}, 6).key, 'we.nextCoins')
  assert.equal(wePersonKey({ cadence: 'weekly' }, 'did'), 'we.pDidWeek')
  assert.equal(wePersonKey({}, null), 'we.pWaiting')
  assert.equal(weWeekKey({ cadence: 'weekly' }, 'we.goalLine'), 'we.goalLineWeek')
  assert.equal(weWeekKey({ cadence: 'daily' }, 'we.goalLine'), 'we.goalLine')
  assert.equal(weMissKey({ cadence: 'weekly' }, 'we.missClosed'), 'we.missClosedWeek')
  assert.equal(weMissKey({ cadence: 'weekly' }, 'we.missNudged'), 'we.missNudged')
  assert.equal(weMissKey({}, 'we.missClosed'), 'we.missClosed')
  assert.equal(weModeKey({ cadence: 'weekly' }, 'we.modeNote', 'turns'), 'we.modeNote.turnsWeek')
  assert.equal(weModeKey({ cadence: 'weekly' }, 'we.modeLine', 'all'), 'we.modeLine.all')
  assert.equal(weModeKey({}, 'we.modeLine', 'turns'), 'we.modeLine.turns')
  const turns = { cadence: 'weekly', mode: 'turns', turn: 'jo', people }
  assert.equal(weStatus(turns).key, 'we.theirTurnWeek')
  assert.equal(weStatus({ ...turns, cadence: 'daily' }).key, 'we.theirTurn')
  const { weNotTonightLine } = await import('../src/lib/did-we.js')
  const { weNextLabel } = await import('../src/lib/we-next.js')
  const wk = { cadence: 'weekly', weekdays: [6], startsOn: '2026-01-01', slot: '2026-10-03' }
  assert.match(weNotTonightLine({ ...wk, done: true }, 'en', '2026-10-05'), /^Done for this week · Next:/)
  assert.match(weNotTonightLine({ ...wk, slot: '', startsOn: '2026-10-01' }, 'en', '2026-09-30'), /^Starts /)
  assert.equal(weNotTonightLine({ cadence: 'daily', weekdays: [], startsOn: '2026-01-01' }, 'en', '2026-10-05'), 'Not due today · Next: ' + weNotTonightLine({ cadence: 'daily', startsOn: '2026-01-01' }, 'en', '2026-10-05').split('Next: ')[1])
  const { weekKind } = await import('../src/lib/we-look.js')
  const multi = { cadence: 'weekly', weekdays: [1, 4], startsOn: '2026-01-01', slot: '2026-10-05', mode: 'all', people, dids: 1, total: 2 }
  assert.equal(weekKind(multi), 'multi')
  assert.equal(weekKind(wk), 'weekly')
  assert.equal(weekKind({ cadence: 'daily', weekdays: [1, 4] }), 'daily')
  assert.deepEqual(weStatus(multi, 'en'), { key: 'we.ofDidDay', vars: { day: 'Monday', n: 1, total: 2 } })
  assert.equal(weStatus({ ...multi, done: true }, 'en').key, 'we.doneAllDay')
  assert.equal(weStatus({ ...multi, mode: 'turns', turn: 'me' }, 'en').key, 'we.yourTurnDay')
  assert.equal(weStatus({ ...multi, mode: 'turns', turn: 'jo' }, 'en').key, 'we.theirTurnDay')
  assert.equal(wePersonKey(multi, 'did'), 'we.pDidDay')
  assert.equal(wePersonKey(multi, 'nope'), 'we.pNopeDay')
  assert.equal(wePersonKey(multi, null), 'we.pWaitingDay')
  assert.equal(weWeekKey(multi, 'we.goalLine'), 'we.goalLine')
  assert.equal(weWeekKey(multi, 'we.paused'), 'we.paused')
  assert.equal(weWeekKey(multi, 'we.tonightsTurn'), 'we.tonightsTurnDay')
  assert.equal(weMissKey(multi, 'we.missClosed'), 'we.missClosed')
  assert.equal(weNextCoinsKey(multi, 6).key, 'we.nextCoins')
  assert.equal(weModeKey(multi, 'we.modeLine', 'turns'), 'we.modeLine.turnsDay')
  assert.equal(weModeKey(multi, 'we.modeNote', 'all'), 'we.modeNote.all')
  assert.equal(weStatus({ cadence: 'daily', mode: 'all', people, dids: 1, total: 2 }, 'en').key, 'we.ofDid')
  assert.equal(weStatus({ ...multi, slot: '' }, 'en').key, 'we.ofDid')
  const monThu = { ...multi, done: true }
  assert.equal(weNotTonightLine(monThu, 'en', '2026-10-05'), 'Done for Monday · Next: ' + weNextLabel('2026-10-08', 'en'))
  assert.equal(weNotTonightLine(monThu, 'en', '2026-10-06'), 'Done for Monday · Next: ' + weNextLabel('2026-10-08', 'en'))
  assert.equal(weNotTonightLine({ ...monThu, slot: '2026-10-08' }, 'en', '2026-10-11'), 'Done for Thursday · Next: ' + weNextLabel('2026-10-12', 'en'))
  assert.match(weNotTonightLine({ ...multi, slot: '', startsOn: '2026-10-01' }, 'en', '2026-09-30'), /^Starts /)
  const known = new Map([['jo', { avatar: 'https://x/jo.png', buddy: 'frog' }]])
  assert.equal(weFaceFor(people[1], known).avatar, 'https://x/jo.png')
  assert.equal(weFaceFor(people[1], known).buddy, 'frog')
  assert.equal(weFaceFor({ id: 'al' }, known).id, 'al')
  assert.deepEqual(weRowLine([{ people }]).status.map((b) => b.key), ['we.youDid', 'we.rowWaitingOne'])
  assert.deepEqual(weRowLine([{ done: true, people }]).status.map((b) => b.key), ['we.doneTogether'])
  const many = weRowLine([{ done: true }, { people }])
  assert.ok(many.many && many.n === 2)
  assert.deepEqual(many.status[0], { key: 'we.rowManyStatus', vars: { done: 1, waiting: 1 } })
  const src = readFileSync(path.join(checkRoot, 'native/components/WeTonight.jsx'), 'utf8')
  const tonight = readFileSync(path.join(checkRoot, 'native/screens/TonightScreen.jsx'), 'utf8')
  assert.ok(!src.includes('export function WeToday') && tonight.includes('setWePick('), 'a Did we pill opens its card in the stack, not a bar or the list')
  assert.ok(!/WeAnswered[sS]*<WeAnswers/.test(src.slice(src.indexOf('export function WeAnswered'), src.indexOf('export function weStatusLine'))), 'the chip block is gone from Tonight')
})

test('card frame art draws over a card that sets its own zIndex (First light in Collection)', () => {
  const src = readSrc('native/components/frames/CardFrame.jsx')
  assert.ok(src.includes('style={[styles.fill, styles.over]}'), 'Over layer uses styles.over')
  assert.match(src, /over: \{ zIndex: \d+, elevation: \d+ \}/)
})

test('the watch app target exists and CI builds it without signing', () => {
  const read = (p) => readFileSync(path.join(checkRoot, p), 'utf8')
  const target = JSON.parse(read('targets/watch/expo-target.config.json'))
  assert.equal(target.type, 'watch')
  assert.equal(target.bundleIdentifier, '.watchkitapp')
  assert.deepEqual(target.entitlements['com.apple.security.application-groups'], ['group.com.aaronbryant.didi'])
  assert.ok(existsSync(path.join(checkRoot, target.icon.replace(/^\.\.\/\.\.\//, ''))), 'watch icon file exists')
  assert.ok(read('targets/watch/DidIWatchApp.swift').includes('Open Did I on your iPhone'))
  const plist = read('targets/watch/Info.plist')
  const version = JSON.parse(read('app.json')).expo.version
  assert.ok(plist.includes(`<string>${version}</string>`), 'watch CFBundleShortVersionString matches app.json version (App Store rejects a mismatch)')
  assert.ok(/<key>WKApplication<\/key>\s*<true\/>/.test(plist))
  assert.ok(read('app.config.js').includes("process.env.DIDI_WATCH === '1'"), 'watch target is opt-in')
  const wf = read('.github/workflows/ios-watch-check.yml')
  assert.ok(wf.includes("DIDI_WATCH: '1'"))
  assert.ok(wf.includes('-target DidIWatch') && wf.includes('-scheme DidI '), 'builds the watch target and the app scheme')
  assert.equal((wf.match(/^\s+CODE_SIGNING_ALLOWED=NO$/gm) || []).length, 2, 'both builds skip signing')
  assert.ok(!/secrets\.|altool|ios-bump-build/.test(wf), 'no secrets, no upload, no build number bump')
  assert.ok(read('.github/scripts/ios-apply-manual-signing.rb').includes('com.aaronbryant.didi.watchkitapp'))
  // Complication: nested under the watch app's bundle id, same version, same App Group.
  const comp = JSON.parse(read('targets/watch-widget/expo-target.config.json'))
  assert.equal(comp.type, 'watch-widget')
  assert.ok(comp.bundleIdentifier.startsWith('com.aaronbryant.didi.watchkitapp.'), 'complication id sits under the watch app id')
  assert.deepEqual(comp.entitlements['com.apple.security.application-groups'], ['group.com.aaronbryant.didi'])
  assert.ok(read('targets/watch-widget/Info.plist').includes(`<string>${version}</string>`), 'complication CFBundleShortVersionString matches app.json version')
  assert.ok(wf.includes('DidIWatchWidget.appex'), 'CI checks the complication is embedded in the watch app')
  assert.ok(read('.github/scripts/ios-apply-manual-signing.rb').includes(comp.bundleIdentifier))
  assert.ok(read('.github/scripts/ios-signing.sh').includes('IOS_WATCH_WIDGET_PROVISIONING_PROFILE'))
  // Watch sync: Apple Watch and Wear OS, and the cards ride the Tonight widget push.
  assert.ok(read('native/widget-sync.js').includes('sendWatchCards(props, shelf)'))
  assert.ok(read('native/watch-sync.js').includes("Platform.OS === 'ios'"))
  assert.ok(read('native/watch-sync.js').includes('NativeModules.DidIWatch'))
  // Wear OS: same package, needs the phone, taps saved natively like a widget tap.
  const wearGradle = read('android/wear/build.gradle')
  assert.ok(wearGradle.includes("applicationId 'com.aaronbryant.didi'"))
  assert.ok(/minSdk 30\b/.test(wearGradle))
  const wearManifest = read('android/wear/src/main/AndroidManifest.xml')
  assert.ok(wearManifest.includes('android.hardware.type.watch'))
  assert.ok(/wearable\.standalone" android:value="false"/.test(wearManifest))
  assert.ok(read('android/app/src/main/AndroidManifest.xml').includes('.watch.WatchTapService'))
  const wearTap = read('android/app/src/main/java/com/aaronbryant/didi/watch/WatchTapService.java')
  assert.ok(wearTap.indexOf('WidgetTapStore.commit') < wearTap.indexOf('tellJs(context)'), 'watch tap is on disk before JS hears of it')
  assert.ok(read('.github/workflows/wear-check.yml').includes('-p wear'))
  // Watch words come from the phone in its language; the watch fills the numbers.
  for (const key of ['watch.allDone', 'watch.notYet', 'watch.count', 'watch.openPhone']) {
    assert.ok(read('native/watch-sync.js').includes(`'${key}'`), `${key} is sent to the watch`)
  }
  assert.ok(read('targets/watch/DidIWatchApp.swift').includes('notYetLabel'))
  assert.ok(read('targets/watch-widget/DidIWatchWidget.swift').includes('countLabel'))
})

await testAsync('the watch buddy table matches the widget BUDDY table', async () => {
  const src = readFileSync(path.join(checkRoot, 'widgets/DidITonightWidget.tsx'), 'utf8')
  const m = src.match(/const BUDDY: Record<string, \(string \| number\)\[\]\[\]> = (\{[\s\S]*?\r?\n {2}\})\r?\n/)
  assert.ok(m, 'found the BUDDY table in the widget')
  const fromWidget = new Function(`return ${m[1]}`)()
  const { BUDDY_PARTS } = await import(pathToFileURL(path.join(checkRoot, 'src/lib/buddy-parts.js')).href)
  assert.deepEqual(BUDDY_PARTS, fromWidget, 'src/lib/buddy-parts.js is a copy of the widget table')
})

test('watch cards carry look colours, buddy, streak and cheer', () => {
  const src = readFileSync(path.join(checkRoot, 'native/watch-sync.js'), 'utf8')
  for (const key of ['colors,', 'buddy:', 'streak:', 'streakLabel:', 'cheer:', "'tonight.streakMany'"]) {
    assert.ok(src.includes(key), `${key} is sent to the watch`)
  }
  const swift = readFileSync(path.join(checkRoot, 'targets/watch/DidIWatchApp.swift'), 'utf8')
  for (const key of ['var colors: WatchColors?', 'var buddy: WatchBuddy?', 'var streak: Int?', 'var cheer: [String]?']) {
    assert.ok(swift.includes(key), `watch decodes ${key} as optional`)
  }
})

await testAsync('a kept Did you shares its last week of answers with the sender, unless turned off', async () => {
  const { keptLamp } = await import(pathToFileURL(path.join(checkRoot, 'src/lib/send-repeat.js')).href)
  const { normalizeLamp } = await import(pathToFileURL(path.join(checkRoot, 'src/lib/board-json.js')).href)
  const { sendAnswerRows, sendAnswerLine } = await import(pathToFileURL(path.join(checkRoot, 'src/lib/send-answers.js')).href)
  const { boardDate, addDaysIso } = await import(pathToFileURL(path.join(checkRoot, 'src/lib/recurrence.js')).href)
  const sid = '0b9a3f4e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
  const lamp = normalizeLamp(keptLamp({ id: sid, question: 'Did you read?', repeat: 'daily', person: { display_name: 'Sam' } }))
  assert.equal(lamp.sendId, sid, 'an inbox keep remembers its send')
  assert.equal(normalizeLamp(keptLamp({ question: 'Did you read?' })).sendId, undefined, 'a link keep has no send')
  assert.equal(normalizeLamp(keptLamp({ id: 'app:x', question: 'Did you read?' })).sendId, undefined, 'a Did I has no send')
  const tonight = boardDate()
  const book = {
    lamps: [lamp, { ...lamp, id: 'mine', sendId: undefined }],
    answers: [
      { lampId: lamp.id, periodKey: tonight, status: 'skip' },
      { lampId: lamp.id, periodKey: addDaysIso(tonight, -1), status: 'yes', answeredAt: '2026-01-01T22:41:00Z' },
      { lampId: lamp.id, periodKey: addDaysIso(tonight, -30), status: 'yes' },
      { lampId: 'mine', periodKey: tonight, status: 'yes' },
    ],
  }
  const out = sendAnswerRows({ boards: [book] })
  assert.deepEqual(out.ids, [sid])
  assert.deepEqual(out.rows.map((row) => row.answer), ['did', 'nope'], 'only this week, only the kept Did you')
  const off = sendAnswerRows({ boards: [{ ...book, lamps: [{ ...lamp, shareOff: true }] }] })
  assert.equal(off.ids.length, 0, 'sharing off sends nothing')
  assert.match(sendAnswerLine([{ night: tonight, answer: 'nope' }], tonight), /Not yet/)
  assert.match(sendAnswerLine([{ night: addDaysIso(tonight, -1), answer: 'did' }], tonight), /Did yesterday/)
  assert.equal(sendAnswerLine([{ night: addDaysIso(tonight, -1), answer: 'nope' }], tonight), '', 'an old Not yet says nothing')
  const sql = readFileSync(path.join(checkRoot, 'supabase/send-answers.sql'), 'utf8')
  assert.match(sql, /revoke all on public\.send_answers from anon, authenticated;/)
  assert.ok(sql.includes('not public.blocked_with(s.to_id)') && sql.includes('not public.blocked_with(s.from_id)'), 'blocking stops both ways')
  const onceId = '1b9a3f4e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
  const once = normalizeLamp(keptLamp({ id: onceId, question: 'Did you file it?' }))
  const answeredAt = new Date().toISOString()
  const dated = (extra) => sendAnswerRows({ boards: [{ lamps: [{ ...once, ...extra }], answers: [{ lampId: once.id, periodKey: `once:${once.id}`, status: 'yes', answeredAt }] }] }).rows
  assert.equal(dated({ onceWhen: 'by', dueBy: addDaysIso(tonight, 20) })[0]?.night, tonight, 'a by date far ahead does not move the answer')
  assert.equal(dated({ onceOn: addDaysIso(tonight, -30), createdOn: addDaysIso(tonight, -30) })[0]?.night, tonight, 'an old once question answered now still shows')
  const many = Array.from({ length: 205 }, (_, i) => ({ ...lamp, id: `m${i}`, sendId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, createdOn: addDaysIso(tonight, -i) }))
  const capped = sendAnswerRows({ boards: [{ lamps: many, answers: [] }] })
  assert.equal(capped.ids.length, 200)
  assert.ok(capped.ids.includes(many[0].sendId) && !capped.ids.includes(many[204].sendId), 'the oldest are left off')
  assert.ok(sql.includes('a.night >= current_date - 8'), 'the sender reads the last week by date, not by row count')
  assert.ok(sql.includes('a.night < current_date - 14') && !sql.includes('current_date - 60'), 'old answers are pruned within two weeks')
})

await testAsync('an ios widget tap on the last night card answers last night, not tonight', async () => {
  const { recordWidgetAnswer, buildTonightWidgetProps } = await import('../src/lib/widget-tonight.js')
  const { writeWidgetTonightProps } = await import('../src/lib/widget-store.js')
  const fri = '2026-10-02'
  const sat3am = new Date(2026, 9, 3, 3, 0)
  const fresh = () => writeShelf({
    currentId: 'grace-tap',
    boards: [{
      id: 'grace-tap',
      title: 'Home',
      lamps: [{ id: 'door', question: 'Door?', cadence: 'daily', archived: false, createdOn: '2020-01-01' }],
      answers: [],
    }],
  })
  const shelf = fresh()
  const props = buildTonightWidgetProps(shelf, sat3am)
  const doors = props.items.filter((item) => item.lampId === 'door')
  assert.equal(doors.length, 2, 'last night and tonight both show')
  assert.equal(props.items[0].periodKey, fri, 'last night leads before 5am')
  const answers = () => readShelf().boards.find((b) => b.id === 'grace-tap').answers
  // New targets carry the night.
  assert.ok(recordWidgetAnswer('door', 'did', sat3am, fri))
  assert.deepEqual(answers().map((a) => a.periodKey), [fri])
  // Old targets carry none; the stored lead picks the night.
  fresh()
  writeWidgetTonightProps(props)
  const next = recordWidgetAnswer('door', 'did', sat3am)
  assert.ok(next)
  assert.deepEqual(answers().map((a) => a.periodKey), [fri])
  // A card from a night that has closed does not write.
  fresh()
  assert.equal(recordWidgetAnswer('door', 'did', new Date(2026, 9, 3, 10, 0), fri), null)
  assert.equal(answers().length, 0)
  // A stale widget's Not yet keeps a Did made in the app; Not yet then Did still lands.
  fresh()
  recordWidgetAnswer('door', 'did', sat3am, fri)
  assert.equal(recordWidgetAnswer('door', 'nope', sat3am, fri), null)
  assert.notEqual(answers()[0].status, 'skip')
  fresh()
  recordWidgetAnswer('door', 'nope', sat3am, fri)
  assert.ok(recordWidgetAnswer('door', 'did', sat3am, fri))
  assert.notEqual(answers()[0].status, 'skip')
})

await testAsync('widget lead follows its night when one question shows twice', async () => {
  const { advanceTonightCard, buildTonightWidgetProps, peekNextTonightCard, tonightWidgetKey } = await import('../src/lib/widget-tonight.js')
  const fri = '2026-10-02'
  const sat = '2026-10-03'
  const sat3am = new Date(2026, 9, 3, 3, 0)
  const shelf = writeShelf({
    currentId: 'grace-lead',
    boards: [{
      id: 'grace-lead',
      title: 'Home',
      lamps: [{ id: 'door', question: 'Door?', cadence: 'daily', archived: false, createdOn: '2020-01-01' }],
      answers: [],
    }],
  })
  const props = buildTonightWidgetProps(shelf, sat3am)
  assert.equal(props.leadNight, fri)
  const peeked = peekNextTonightCard(props)
  assert.equal(peeked.leadLampId, 'door')
  assert.equal(peeked.leadNight, sat, 'Next moves to the tonight copy')
  const tapped = advanceTonightCard(peeked, 'door', 'did', sat)
  assert.ok(tapped, 'the tap lands on the card Next showed')
  assert.equal(tapped.items.find((i) => i.periodKey === sat).status, 'yes')
  assert.equal(tapped.items.find((i) => i.periodKey === fri).status, 'open')
  // Old props without leadNight still pick by lampId.
  const { leadNight, ...old } = props
  assert.ok(advanceTonightCard(old, 'door', 'did', fri))
  // A rename from another device redraws.
  const renamed = { ...props, items: props.items.map((i) => ({ ...i, question: 'Front door?' })) }
  assert.notEqual(tonightWidgetKey(renamed), tonightWidgetKey(props))
})

await testAsync('an ios widget tap on a Did we card is saved as a Did we answer', async () => {
  const { recordWidgetAnswer } = await import('../src/lib/widget-tonight.js')
  const { weNightStatus } = await import('../src/lib/we-nights.js')
  const now = new Date(2026, 9, 3, 21, 0)
  assert.ok(recordWidgetAnswer('we:card-1', 'did', now, '2026-10-03'))
  assert.equal(weNightStatus('2026-10-03', 'card-1'), 'did')
})

await testAsync('a late watch tap keeps the time it was tapped', async () => {
  const src = readFileSync(path.join(checkRoot, 'android/app/src/main/java/com/aaronbryant/didi/watch/WatchTapService.java'), 'utf8')
  assert.ok(src.includes("WidgetTapStore.commit(context, id, answer, night, at)"))
})

await testAsync('an old widget Not yet does not undo a saved Did we', async () => {
  const { recordWidgetAnswer } = await import('../src/lib/widget-tonight.js')
  const { weNightStatus } = await import('../src/lib/we-nights.js')
  const now = new Date(2026, 9, 3, 21, 30)
  recordWidgetAnswer('we:card-1', 'nope', now, '2026-10-03')
  assert.equal(weNightStatus('2026-10-03', 'card-1'), 'did')
})

await testAsync('coins handed back after sign out are dropped', async () => {
  const { dropEarnedCoins, returnEarnedCoins, takeEarnedCoins } = await import('../src/lib/purse.js')
  const clock = new Date(2026, 9, 3, 21, 0)
  takeEarnedCoins()
  returnEarnedCoins('2026-10-03', 2, clock)
  const taken = takeEarnedCoins()
  assert.deepEqual(Object.entries(taken), [['2026-10-03', 2]])
  dropEarnedCoins()
  returnEarnedCoins('2026-10-03', 2, clock, taken.gen)
  assert.deepEqual(takeEarnedCoins(), {})
  const fresh = takeEarnedCoins()
  returnEarnedCoins('2026-10-03', 1, clock, fresh.gen)
  assert.deepEqual({ ...takeEarnedCoins() }, { '2026-10-03': 1 })
})

test('a missed due-by question is stamped at its start, so an earlier Did wins', () => {
  const lamp = { id: 'by1', question: 'Taxes?', cadence: 'once', onceWhen: 'by', dueBy: '2026-10-05', createdOn: '2026-10-01' }
  const book = { id: 'b', lamps: [lamp], answers: [] }
  const out = closePastNights(book, new Date(2026, 9, 7, 12, 0))
  const row = (out.answers || []).find((item) => item.lampId === 'by1')
  assert.ok(row, 'the missed question gets a Not yet')
  assert.ok(String(row.answeredAt).startsWith('2026-10-01'), `stamped at the start: ${row.answeredAt}`)
})

test('pulse, sign out mid sync, and device keys keep their guards', () => {
  const people = readFileSync(path.join(checkRoot, 'src/lib/people.js'), 'utf8')
  assert.ok(people.includes('claimed = adder ? await addAutoSends(db, adder) : []'), 'pulseLook defines claimed')
  const sync = readFileSync(path.join(checkRoot, 'src/lib/cloud-sync.js'), 'utf8')
  assert.ok(sync.includes("if (run !== syncRun) throw new Error('account.signedOut')"), 'land stops after sign out')
  assert.ok(sync.includes('if (run !== syncRun) return null'), 'a dropped pull sets no miss')
  assert.ok(sync.indexOf('takeOldDeviceKey()') < sync.indexOf("from('devices').upsert"), 'old device row goes first')
})

await testAsync('readthrough 8: a due-by Did counts on its own night only, not the whole window', async () => {
  const { shelfStreak: streakOf } = await import('../src/lib/hall-feel.js')
  const { yearMonths } = await import('../src/lib/hall-pages.js')
  const clock = new Date(2026, 8, 30, 16, 0)
  const by = { id: 'by', question: 'Taxes?', cadence: 'once', onceWhen: 'by', dueBy: '2026-10-05', createdOn: '2026-09-20' }
  const book = { id: 'b', dayFoldHour: 0, lamps: [by], answers: [{ lampId: 'by', periodKey: 'once:by', status: 'yes', answeredAt: '2026-09-28T22:00:00' }] }
  assert.equal(streakOf([book], clock), 1, 'one Did is one night, not ten')
  const sept = yearMonths([book], 2026, clock)[8].nights.filter((n) => !n.pad)
  assert.equal(sept.find((n) => n.iso === '2026-09-28').on, true)
  assert.equal(sept.find((n) => n.iso === '2026-09-25').on, false, 'nights before the tap are not filled')
})

await testAsync('readthrough 8: a missed one-time question still breaks its night after it is archived', async () => {
  const { shelfStreak: streakOf } = await import('../src/lib/hall-feel.js')
  const { yearMonths } = await import('../src/lib/hall-pages.js')
  const clock = new Date(2026, 8, 30, 16, 0)
  const nights = ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29']
  const daily = { id: 'a', question: 'Read?', cadence: 'daily', createdOn: '2026-09-24' }
  const once = { id: 'o', question: 'Call?', cadence: 'once', onceOn: '2026-09-27', createdOn: '2026-09-24', archived: true }
  const answers = [
    ...nights.map((n) => ({ lampId: 'a', periodKey: n, status: 'yes', answeredAt: `${n}T21:00:00` })),
    { lampId: 'o', periodKey: 'once:o', status: 'skip', answeredAt: '2026-09-27T00:00:00' },
  ]
  const book = { id: 'b', dayFoldHour: 0, lamps: [daily, once], answers }
  assert.equal(streakOf([book], clock), 2, 'the missed night still ends the run')
  const sept = yearMonths([book], 2026, clock)[8].nights.filter((n) => !n.pad)
  assert.equal(sept.find((n) => n.iso === '2026-09-27').miss, true, 'the year view still shows the miss')
  const stopped = { ...book, answers: answers.filter((a) => a.lampId === 'a') }
  assert.equal(streakOf([stopped], clock), 6, 'stopped before its day with no answer: not held against you')
})

await testAsync('readthrough 8: the 9 PM warning fires when last night was frozen', async () => {
  const { streakRiskFire } = await import('../src/lib/streak-risk.js')
  const { shelfStreak: streakOf } = await import('../src/lib/hall-feel.js')
  const clock = new Date(2026, 8, 30, 16, 0)
  const answers = []
  for (let d = 15; d <= 28; d += 1) {
    const n = `2026-09-${d}`
    answers.push({ lampId: 'a', periodKey: n, status: 'yes', answeredAt: `${n}T21:00:00` })
  }
  const book = { id: 'b', dayFoldHour: 0, lamps: [{ id: 'a', question: 'Read?', cadence: 'daily', createdOn: '2026-09-15' }], answers }
  const heat = streakOf([book], clock)
  assert.equal(heat, 14, 'the freeze carries the streak over last night')
  assert.ok(streakRiskFire(book, clock, heat), 'a frozen streak still gets the warning')
  const notify = readFileSync(path.join(checkRoot, 'src/lib/notify.js'), 'utf8')
  assert.ok(notify.includes('shelfStreak([book], now)'), 'web pings pass the real streak')
})

await testAsync('readthrough 8: shop lists, seasonal accessories, beta refs and send answers', async () => {
  const { LOOKS, liveLooks, mergeGift, normalizePurse } = await import('../src/lib/purse.js')
  const future = liveLooks('2099-01-01').find((item) => !LOOKS.includes(item))
  if (future) {
    assert.ok(!liveLooks('2000-01-01').includes(future), 'not live before its day')
    assert.equal(mergeGift({}, { kind: 'look', item_id: future.id }).known, true, 'a gift of a new look is kept')
    assert.ok(normalizePurse({ looks: [future.id] }).looks.includes(future.id), 'an owned new look is kept')
  }
  const { accessoryOnSale, accessoryById } = await import('../src/lib/accessories.js')
  const witch = accessoryById('witch')
  assert.ok(accessoryOnSale(witch, '2027-10-15'), 'seasonal comes back next year')
  assert.ok(!accessoryOnSale(witch, '2027-11-01'))
  const sparkler = accessoryById('sparkler')
  assert.ok(accessoryOnSale(sparkler, '2028-01-03'), 'a window across new year')
  assert.ok(!accessoryOnSale(sparkler, '2027-01-10'))
  const { betaRefFrom } = await import('../src/lib/invite-link.js')
  assert.equal(betaRefFrom('?ref=src=post:fall'), 'src=post:fall')
  const { sendAnswerLine } = await import('../src/lib/send-answers.js')
  assert.equal(sendAnswerLine([{ night: '2026-10-15', answer: 'nope' }], '2026-10-14'), t('sent.notYetTonight'), 'their night ahead of ours is still today')
})

test('readthrough 8: web guards for sign out, inbox, family and Did we hooks', () => {
  const src = (f) => readFileSync(path.join(checkRoot, f), 'utf8')
  const account = src('src/lib/account.js')
  for (const fn of ['signOutHere', 'signOutEverywhere']) {
    const body = account.slice(account.indexOf(`export async function ${fn}`))
    assert.ok(body.indexOf('dropPushToken()') < body.indexOf('db.auth.signOut'), `${fn} drops the push token first`)
  }
  assert.ok(!/^import .*push\.js/m.test(account), 'account.js loads push.js late (static import is a cycle on the phone)')
  assert.ok(account.includes("import('./push.js')"), 'push.js is a dynamic import')
  assert.match(src('src/lib/Inbox.jsx'), /if \(already\) \{\r?\n\s+if \(keep && state === 'kept' && row\.kind === 'todo' && onKeep && !sendOnShelf\(/, 'inbox does not add twice')
  assert.ok(src('src/lib/Family.jsx').includes('answerFamilyLamp(fam.id, lamp.id, boardDate(new Date(), fam.fold_hour), status)'))
  const we = src('src/lib/DidWe.jsx')
  const home = we.slice(we.indexOf('export function WeHome'))
  assert.ok(home.indexOf('useWeTotals(') < home.indexOf('return <'), 'useWeTotals runs before any early return')
  assert.ok(src('src/lib/people.js').includes("made_on: boardDate(),"), 'family questions send made_on')
})

await testAsync('readthrough 8 review: one-time nights, archived once rules, seasonal accessories', async () => {
  const { onceDoneNight } = await import('../src/lib/recurrence.js')
  const { ACCESSORIES } = await import('../src/lib/accessories.js')
  const { buyAccessory } = await import('../src/lib/purse.js')
  // Regex kept its backslashes: a due-by Did counts on the night it was tapped.
  const by = { id: 'o', cadence: 'once', onceWhen: 'by', dueBy: '2026-09-27', createdOn: '2026-09-20' }
  const at = (d, h) => new Date(2026, 8, d, h, 0).toISOString()
  assert.equal(onceDoneNight(by, { status: 'yes', answeredAt: at(24, 21) }), '2026-09-24')
  assert.equal(onceDoneNight(by, { status: 'yes' }), '2026-09-27')
  assert.equal(onceDoneNight({ ...by, onceWhen: 'on', onceOn: '2026-09-27' }, { status: 'yes', answeredAt: at(24, 21) }), '')
  // A grace tap after the last night counts on the last night.
  assert.equal(onceDoneNight(by, { status: 'yes', answeredAt: at(28, 1) }), '2026-09-27')

  const nights = []
  for (let d = 10; d <= 29; d += 1) nights.push(`2026-09-${String(d).padStart(2, '0')}`)
  const daily = { id: 'a', question: 'Read?', cadence: 'daily', createdOn: '2026-09-10' }
  const done = nights.map((n) => ({ lampId: 'a', periodKey: n, status: 'yes', answeredAt: `${n}T21:00:00` }))
  const clock = new Date(2026, 8, 30, 16, 0)
  const night = (book, iso) => yearMonths([book], 2026, clock)[8].nights.find((n) => n.iso === iso)
  // A paused due-by question with a Not yet is not a miss.
  const paused = { id: 'y', question: 'Taxes?', cadence: 'once', onceWhen: 'by', dueBy: '2026-09-25', createdOn: '2026-09-12', archived: true }
  const b1 = { id: 'b', dayFoldHour: 0, lamps: [daily, paused], answers: [...done, { lampId: 'y', periodKey: 'once:y', status: 'skip', answeredAt: '2026-09-14T21:00:00' }] }
  assert.equal(night(b1, '2026-09-25').miss, false)
  assert.ok(shelfStreak([b1], clock) >= 20)
  // A legacy one-time question with no day, auto-closed, does not break every night.
  const legacy = { id: 'n', question: 'X?', cadence: 'once', onceWhen: 'on', onceOn: '', createdOn: '2026-09-10', archived: true }
  const b2 = { id: 'b', dayFoldHour: 0, lamps: [daily, legacy], answers: [...done, { lampId: 'n', periodKey: 'once:n', status: 'skip', answeredAt: '2026-09-10T21:00:00' }] }
  assert.equal(night(b2, '2026-09-22').miss, false)
  assert.ok(shelfStreak([b2], clock) >= 20)
  // A fixed-day Not yet still counts as that night's miss.
  const fixed = { id: 'f', question: 'Call?', cadence: 'once', onceWhen: 'on', onceOn: '2026-09-22', createdOn: '2026-09-10', archived: true }
  const b3 = { id: 'b', dayFoldHour: 0, lamps: [daily, fixed], answers: [...done, { lampId: 'f', periodKey: 'once:f', status: 'skip', answeredAt: '2026-09-22T21:00:00' }] }
  assert.equal(night(b3, '2026-09-22').miss, true)

  // Seasonal accessories come back every year, not just their first one.
  const witch = ACCESSORIES.find((item) => item.id === 'witch')
  assert.equal(validateCoinItem('accessory', 'witch', '2027-10-15'), true)
  assert.equal(validateCoinItem('accessory', 'witch', '2027-07-15'), false)
  assert.deepEqual(shopRow('accessory', [witch], normalizePurse({}), '2027-10-15').map((item) => item.id), ['witch'])
  assert.equal(buyAccessory({ coins: 100 }, 'witch', '2027-10-15').miss || '', '')
  assert.equal(buyAccessory({ coins: 100 }, 'witch', '2027-07-15').miss, 'shop.miss.accessoryGone')
})

// Runs `body` in its own process with test cloud keys, the client's from(),
// rpc() and auth calls swapped for fakes. `calls` lists each query's table and
// chained ops; `answer(table, ops)` gives each query's result. Prints JSON.
function inFakeCloud(body) {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const url = (file) => pathToFileURL(path.join(root, file)).href
  const script = `
    const store = new Map()
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
    globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} }
    const { cloud } = await import(${JSON.stringify(url('src/lib/cloud.js'))})
    const db = cloud()
    const calls = []
    let answer = () => ({ data: null, error: null })
    const query = (table) => {
      const ops = []
      calls.push({ table, ops })
      const chain = new Proxy({}, {
        get(_, key) {
          if (key === 'then') return (ok, no) => Promise.resolve(answer(table, ops)).then(ok, no)
          return (...args) => { ops.push([key, ...args]); return chain }
        },
      })
      return chain
    }
    db.from = query
    db.rpc = (name) => query('rpc:' + name)
    db.auth.getSession = async () => ({ data: { session: { user: { id: 'user-a' } } } })
    db.auth.signOut = async (opts) => { calls.push({ table: 'signOut', ops: [opts] }); return { error: null } }
    const url = (file) => new URL(file, ${JSON.stringify(url('src/lib/'))}).href
    const out = await (async () => { ${body} })()
    console.log(JSON.stringify(out))
  `
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test' },
  })
  assert.equal(run.status, 0, run.stderr)
  return JSON.parse(run.stdout.trim().split('\n').pop())
}

await testAsync('readthrough 9: inbox fallback hands back the send state, kept elsewhere adds once', async () => {
  const out = inFakeCloud(`
    const { answerSend } = await import(url('people.js'))
    answer = (table, ops) => ops.some(([k]) => k === 'update') ? { data: [], error: null } : { data: { id: 's1', state: 'kept' }, error: null }
    return await answerSend('s1', true)
  `)
  assert.deepEqual(out, { miss: '', already: true, state: 'kept' })
  const { sendOnShelf } = await import('../src/lib/send-repeat.js')
  const id = '11111111-2222-3333-4444-555555555555'
  assert.equal(sendOnShelf([{ lamps: [] }, { lamps: [{ id: 'a', sendId: id }] }], id.toUpperCase()), true)
  assert.equal(sendOnShelf([{ lamps: [{ id: 'a' }] }], id), false)
  assert.equal(sendOnShelf([{ lamps: [{ id: 'a', sendId: '' }] }], ''), false)
})

await testAsync('readthrough 9: a due by Did clears only its own night, the same as the streak walk', async () => {
  const { dueThatNight } = await import('../src/lib/hall-feel.js')
  const { allClearTonight, countedTonightRows, dueTonight, faceReadyTonight } = await import('../src/lib/recurrence.js')
  const taxes = { id: 't', question: 'Taxes?', cadence: 'once', onceWhen: 'by', dueBy: '2026-10-15', createdOn: '2026-10-10', archived: false, askAfter: '' }
  const book = { id: 'b', dayFoldHour: 0, lamps: [taxes], answers: [{ lampId: 't', periodKey: 'once:t', status: 'yes', answeredAt: '2026-10-12T21:00:00' }] }
  const on12 = new Date(2026, 9, 12, 22, 0)
  const on13 = new Date(2026, 9, 13, 22, 0)
  assert.equal(allClearTonight(book, on12), true)
  // Streak credit and all clear agree on 10-13: neither counts.
  assert.equal(countedTonightRows(dueThatNight(book, '2026-10-13', on13)).length, 0)
  assert.equal(allClearTonight(book, on13), false)
  // Tonight still shows it answered, not asked again.
  assert.ok(dueTonight(book, on13).some((row) => row.lamp.id === 't' && row.answer?.status === 'yes'))
  assert.equal(faceReadyTonight(book, on13).length, 0)
})

await testAsync('readthrough 9: sign out everywhere clears every device push token first', async () => {
  const out = inFakeCloud(`
    const { signOutEverywhere } = await import(url('account.js'))
    await signOutEverywhere()
    return calls
  `)
  const all = out.findIndex((call) => call.table === 'devices' && call.ops.length === 2 && call.ops[0][0] === 'update' && call.ops[1][0] === 'eq' && call.ops[1][1] === 'user_id')
  assert.ok(all >= 0, JSON.stringify(out))
  assert.deepEqual(out[all].ops[0], ['update', { push_token: null }])
  assert.ok(all < out.findIndex((call) => call.table === 'signOut'))
})

await testAsync('readthrough 9: voice answers reach a Not yet and last night in grace', async () => {
  const { openTonight } = await import('../src/lib/voice-answer.js')
  const daily = { id: 'd', question: 'Did I stretch?', cadence: 'daily', createdOn: '2026-10-01', archived: false, askAfter: '' }
  const book = { id: 'b', dayFoldHour: 0, lamps: [daily], answers: [{ lampId: 'd', periodKey: '2026-10-13', status: 'skip', answeredAt: '2026-10-13T21:00:00' }] }
  const evening = openTonight(new Date(2026, 9, 13, 22, 0), { boards: [book] })
  assert.deepEqual(evening.map((row) => row.periodKey), ['2026-10-13'])
  const done = { ...book, answers: [{ lampId: 'd', periodKey: '2026-10-13', status: 'yes', answeredAt: '2026-10-13T21:00:00' }] }
  assert.equal(openTonight(new Date(2026, 9, 13, 22, 0), { boards: [done] }).length, 0)
  // 2am: last night's Not yet comes first, ahead of tonight's.
  const early = openTonight(new Date(2026, 9, 14, 2, 0), { boards: [book] })
  assert.deepEqual(early.map((row) => row.periodKey), ['2026-10-13', '2026-10-14'])
  const late = openTonight(new Date(2026, 9, 14, 7, 0), { boards: [book] })
  assert.deepEqual(late.map((row) => row.periodKey), ['2026-10-14', '2026-10-13'])
})

await testAsync('readthrough 9: export fails loudly on a query error', async () => {
  const run = (bad) => inFakeCloud(`
    const { exportAll } = await import(url('cloud-sync.js'))
    answer = (table) => (table === ${JSON.stringify(bad)} ? { data: null, error: { message: 'down' } } : { data: table === 'profiles' ? null : [], error: null })
    try { await exportAll(); return 'ok' } catch { return 'threw' }
  `)
  assert.equal(run('none'), 'ok')
  for (const table of ['profiles', 'devices', 'we_members', 'we_answers', 'sends']) assert.equal(run(table), 'threw', table)
  const account = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/lib/Account.jsx'), 'utf8')
  assert.match(account, /t\('confirm\.exportMiss'\)/)
  assert.match(account, /setTimeout\(\(\) => URL\.revokeObjectURL\(url\), 500\)/)
})

await testAsync('readthrough 9: a starter idea stays taken by its id in any words', async () => {
  const { hangStarter, ideaTaken } = await import('../src/lib/starters.js')
  const { normalizeLamp } = await import('../src/lib/board-json.js')
  const book = { id: 'b', lamps: [], answers: [] }
  const starter = starterList().find((item) => item.idea === 'pills')
  const added = hangStarter(book, starter, new Date(2026, 9, 14, 12))
  const lamp = added.lamps.find((item) => item.idea === 'pills')
  assert.ok(lamp, 'idea kept on the question')
  const renamed = { ...lamp, question: 'Did I nehmen Tabletten?', short: 'Tabletten' }
  assert.equal(ideaTaken([renamed], 'pills'), true)
  assert.equal(ideaTaken([renamed], 'water'), false)
  assert.equal(normalizeLamp({ ...lamp }).idea, 'pills')
  assert.equal(normalizeLamp({ ...lamp, idea: 'Bad idea!' }).idea, undefined)
})

await testAsync('readthrough 9: re-armed after the ask time, a high one keeps its 21:00 late note', async () => {
  const { upcomingPings } = await import('../src/lib/notify.js')
  const q = (id, extra = {}) => ({ id, question: id, cadence: 'daily', createdOn: '2026-10-01', archived: false, askAfter: '18:00', priority: 'high', ...extra })
  const book = { id: 'b1', dayFoldHour: 0, lamps: [q('a')], answers: [] }
  const tags = upcomingPings(book, new Date(2026, 9, 14, 19, 0)).map((fire) => fire.tag)
  assert.deepEqual(tags, ['a:2026-10-14:late'])
  assert.deepEqual(upcomingPings(book, new Date(2026, 9, 14, 12, 0)).map((fire) => fire.tag), ['a:2026-10-14', 'a:2026-10-14:late'])
  assert.deepEqual(upcomingPings(book, new Date(2026, 9, 14, 21, 30)), [])
  const pings = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../native/shim/native.js'), 'utf8')
  assert.ok(pings.includes("const rows = dueTonight(book, day).filter((row) => !row.answer || row.answer.status === 'skip')"), 'native keeps the late note after the ask time')
  assert.ok(pings.includes('if (afterQuiet(late).getTime() !== late.getTime()) continue'))
})

await testAsync('readthrough 9: a kept Did you saved on two phones merges to one question', async () => {
  const sendId = '0b6f3c2e-1a2b-4c3d-8e9f-0a1b2c3d4e5f'
  const kept = (id) => ({ id, question: 'Did you call?', cadence: 'daily', createdOn: '2026-10-01', archived: false, fromDidYou: true, sendId })
  const win = { currentId: 'b1', boards: [{ id: 'b1', dayFoldHour: 0, lamps: [kept('x1'), lamp('own1')], answers: [] }] }
  const lose = { currentId: 'b1', boards: [{ id: 'b1', dayFoldHour: 0, lamps: [kept('x2'), lamp('own2')], answers: [] }] }
  const merged = mergeShelves(win, lose, '2026-10-14T11', '2026-10-14T10')
  const ids = merged.boards[0].lamps.map((item) => item.id).sort()
  assert.deepEqual(ids, ['own1', 'own2', 'x1'])
})

await testAsync('readthrough 9: web reminder tags per question, worker respects off and quiet hours', async () => {
  const { upcomingPings } = await import('../src/lib/notify.js')
  const { swMayPing } = await import('../src/lib/quiet.js')
  const q = (id, extra = {}) => ({ id, question: id, cadence: 'daily', createdOn: '2026-10-01', archived: false, askAfter: '21:00', ...extra })
  const one = { id: 'b1', dayFoldHour: 0, lamps: [q('a'), q('b')], answers: [] }
  const two = { id: 'b2', dayFoldHour: 0, lamps: [q('c'), q('d', { priority: 'low' })], answers: [] }
  const now = new Date(2026, 9, 14, 12, 0)
  const fires = upcomingPings(one, now)
  assert.deepEqual(fires.map((fire) => fire.tag), ['a:2026-10-14', 'b:2026-10-14'])
  // Every board at once; low priority stays quiet.
  assert.deepEqual(upcomingPings([one, two], now).map((fire) => fire.id), ['a', 'b', 'c'])
  const sw = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/sw.js'), 'utf8')
  assert.ok(sw.includes('tag: `${row.lamp.id}:${row.periodKey}`'))
  assert.ok(sw.includes('swMayPing(await loadPrefsForSw(), now)'))
  assert.ok(sw.includes("new NavigationRoute(createHandlerBoundToURL('index.html')"))
  const at = new Date(2026, 9, 14, 23, 0)
  assert.equal(swMayPing(null, at), true)
  assert.equal(swMayPing({ pingsOff: ['reminders'] }, at), false)
  assert.equal(swMayPing({ pingsOff: [], quietOn: true, quietFrom: '22:00', quietTo: '07:00' }, at), false)
  assert.equal(swMayPing({ pingsOff: [], quietOn: true, quietFrom: '22:00', quietTo: '07:00' }, new Date(2026, 9, 14, 20, 0)), true)
})

await testAsync('readthrough 10: a high one with no time still gets the 21:00 late note, Not yet keeps it, low never', async () => {
  const { upcomingPings } = await import('../src/lib/notify.js')
  const q = (id, extra = {}) => ({ id, question: id, cadence: 'daily', createdOn: '2026-10-01', archived: false, priority: 'high', ...extra })
  const noon = new Date(2026, 9, 14, 12, 0)
  const book = { id: 'b1', dayFoldHour: 0, lamps: [q('a'), q('low', { priority: 'low' })], answers: [] }
  const fires = upcomingPings(book, noon)
  assert.deepEqual(fires.map((fire) => fire.tag), ['a:2026-10-14:late'])
  assert.equal(new Date(fires[0].at).getHours(), 21)
  // Not yet is not done: the last call stays. A Did drops it.
  const notYet = { ...book, answers: [{ lampId: 'a', periodKey: '2026-10-14', status: 'skip', answeredAt: '2026-10-14T11:00:00' }] }
  assert.deepEqual(upcomingPings(notYet, noon).map((fire) => fire.tag), ['a:2026-10-14:late'])
  const timed = { ...notYet, lamps: [q('a', { askAfter: '18:00' })] }
  assert.deepEqual(upcomingPings(timed, noon).map((fire) => fire.tag), ['a:2026-10-14:late'], 'no ask note for a Not yet row')
  const did = { ...book, answers: [{ lampId: 'a', periodKey: '2026-10-14', status: 'yes', answeredAt: '2026-10-14T11:00:00' }] }
  assert.deepEqual(upcomingPings(did, noon), [])
  const pings = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../native/shim/native.js'), 'utf8')
  assert.ok(pings.includes("filter((row) => !row.answer || row.answer.status === 'skip')"), 'native keeps Not yet rows')
  assert.ok(pings.includes('const at = match ? new Date(year, month - 1, date'),'native keeps the late note for no-time questions')
})

await testAsync('readthrough 10: the widget footer is not "Next at" while last night is still open', async () => {
  const book = {
    id: 't1',
    title: 'Home',
    dayFoldHour: 0,
    lamps: [{ id: 'late', question: 'Late one?', cadence: 'daily', archived: false, createdOn: '2020-01-01', askAfter: '21:00' }],
    answers: [],
  }
  const props = buildTonightWidgetProps(writeShelf({ currentId: 't1', boards: [book] }), new Date('2026-09-24T08:00:00'))
  assert.ok(props.items.length > 0, 'last night shows')
  assert.notEqual(props.footer, t('widget.tonight.nextAt', { time: clockWords('21:00') }))
})

test('readthrough 10: a widget-tap coin reply after an account switch writes nothing', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const url = (file) => pathToFileURL(path.join(root, file)).href
  const script = `
    import { registerHooks } from 'node:module'
    const fake = 'export function creditNightCoins() { return new Promise((ok) => { globalThis.payCoins = ok }) }; ' +
      'export function grantWeeklyGem() { return new Promise(() => {}) }; ' +
      'export const applyCoinBalanceToShelf = (shelf, n) => ({ ...shelf, coinBalance: n }); ' +
      'export const applyGemBalanceToShelf = (shelf) => shelf'
    registerHooks({
      resolve: (specifier, context, next) =>
        specifier === './wallet.js' && String(context.parentURL).endsWith('tap-earnings.js')
          ? { url: 'data:text/javascript,' + encodeURIComponent(fake), shortCircuit: true }
          : next(specifier, context),
    })
    const store = new Map([['did-i-last-user', 'user-a']])
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
    globalThis.window = { dispatchEvent() {} }
    const { returnEarnedCoins, takeEarnedCoins } = await import(${JSON.stringify(url('src/lib/purse.js'))})
    const { settleTapEarnings } = await import(${JSON.stringify(url('src/lib/tap-earnings.js'))})
    const clock = new Date(2026, 9, 2, 20)
    returnEarnedCoins('2026-10-02', 2, clock)
    const shelf = { currentId: 'b', boards: [{ id: 'b', lamps: [], answers: [] }] }
    let wrote = 0
    settleTapEarnings(shelf, shelf, clock, () => { wrote += 1 })
    store.set('did-i-last-user', 'user-b')
    globalThis.payCoins(40)
    await new Promise((ok) => setTimeout(ok, 20))
    console.log(JSON.stringify({ wrote, queued: takeEarnedCoins() }))
  `
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test' },
  })
  assert.equal(run.status, 0, run.stderr)
  assert.deepEqual(JSON.parse(run.stdout.trim().split('\n').pop()), { wrote: 0, queued: {} })
})

test('review 13: a tap right after sign in, before the user id lands, keeps its coins', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const url = (file) => pathToFileURL(path.join(root, file)).href
  const script = `
    import { registerHooks } from 'node:module'
    const fake = 'export function creditNightCoins() { return new Promise((ok) => { (globalThis.pays ||= []).push(ok) }) }; ' +
      'export function grantWeeklyGem() { return new Promise(() => {}) }; ' +
      'export const applyCoinBalanceToShelf = (shelf, n) => ({ ...shelf, coinBalance: n }); ' +
      'export const applyGemBalanceToShelf = (shelf) => shelf'
    registerHooks({
      resolve: (specifier, context, next) =>
        specifier === './wallet.js' && String(context.parentURL).endsWith('tap-earnings.js')
          ? { url: 'data:text/javascript,' + encodeURIComponent(fake), shortCircuit: true }
          : next(specifier, context),
    })
    const store = new Map([['did-i-last-user', '']])
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
    globalThis.window = { dispatchEvent() {} }
    const { returnEarnedCoins, takeEarnedCoins } = await import(${JSON.stringify(url('src/lib/purse.js'))})
    const { settleTapEarnings } = await import(${JSON.stringify(url('src/lib/tap-earnings.js'))})
    const clock = new Date(2026, 9, 2, 20)
    const shelf = { currentId: 'b', boards: [{ id: 'b', lamps: [], answers: [] }] }
    let wrote = 0
    // Failed credit: handed back, kept while the id is '', saved once it lands.
    returnEarnedCoins('2026-10-02', 2, clock)
    const keptBlank = store.has('did-i-earned-coins') === false
    store.set('did-i-last-user', 'user-a')
    settleTapEarnings(shelf, shelf, clock, () => { wrote += 1 })
    globalThis.pays[0](null)
    await new Promise((ok) => setTimeout(ok, 20))
    const saved = JSON.parse(store.get('did-i-earned-coins') || 'null')
    // Paid credit: the balance shows.
    settleTapEarnings(shelf, shelf, clock, () => { wrote += 1 })
    globalThis.pays[1](40)
    await new Promise((ok) => setTimeout(ok, 20))
    console.log(JSON.stringify({ keptBlank, saved, wrote, queued: takeEarnedCoins() }))
  `
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test' },
  })
  assert.equal(run.status, 0, run.stderr)
  assert.deepEqual(JSON.parse(run.stdout.trim().split('\n').pop()), {
    keptBlank: true,
    saved: { user: 'user-a', nights: { '2026-10-02': 2 } },
    wrote: 1,
    queued: {},
  })
})

await testAsync('review 13: a sign out with no last user drops queued coins; the id landing loads the saved queue', async () => {
  const { returnEarnedCoins, takeEarnedCoins } = await import('../src/lib/purse.js')
  const clock = new Date(2026, 9, 2, 20)
  localStorage.removeItem('did-i-last-user')
  localStorage.removeItem('did-i-earned-coins')
  takeEarnedCoins()
  // Queued while the id was '', then signed out before it landed.
  returnEarnedCoins('2026-10-02', 2, clock)
  sessionMissing()
  assert.deepEqual({ ...takeEarnedCoins() }, {}, 'no last user, no session: the queue empties')
  returnEarnedCoins('2026-10-02', 2, clock)
  sessionMissing()
  localStorage.setItem('did-i-last-user', 'user-b')
  assert.deepEqual({ ...takeEarnedCoins() }, {}, "A's coins do not reach B")

  // Cache built while the id was '', then the id lands: the saved queue loads and merges.
  localStorage.setItem('did-i-earned-coins', JSON.stringify({ user: 'user-c', nights: { '2026-10-01': 3 } }))
  localStorage.removeItem('did-i-last-user')
  takeEarnedCoins()
  returnEarnedCoins('2026-10-02', 2, clock)
  localStorage.setItem('did-i-last-user', 'user-c')
  assert.deepEqual({ ...takeEarnedCoins() }, { '2026-10-01': 3, '2026-10-02': 2 })
  localStorage.removeItem('did-i-last-user')
})

test('review 13: an early fatal error on a store launch stays in the app; on an OTA launch it reaches native', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const guardFile = path.join(root, 'native/fatal-guard.cjs')
  const run = (updates) => {
    const script = `
      const Module = require('node:module')
      const load = Module._load
      Module._load = function (request, ...rest) {
        if (request === 'expo-updates') { if (${JSON.stringify(updates)} === 'missing') throw new Error('no'); return ${JSON.stringify(updates)} }
        if (request === 'react-native-gesture-handler') return {}
        return load.call(this, request, ...rest)
      }
      let handler = null
      let native = 0
      global.__DEV__ = false
      global.ErrorUtils = { getGlobalHandler: () => () => { native += 1 }, setGlobalHandler: (h) => { handler = h } }
      require(${JSON.stringify(guardFile)})
      handler(new Error('boom'), true)
      console.log(JSON.stringify(native))
    `
    const out = spawnSync(process.execPath, ['-e', script], { cwd: root, encoding: 'utf8' })
    assert.equal(out.status, 0, out.stderr)
    return JSON.parse(out.stdout.trim())
  }
  assert.equal(run({ isEmbeddedLaunch: true }), 0)
  assert.equal(run('missing'), 0)
  assert.equal(run({ isEmbeddedLaunch: false }), 1)
})

test('live undo: drops only the exact answer that went, twice is free', () => {
  const a = { id: 'a1', lampId: 'x', periodKey: '2026-10-15', status: 'yes', answeredAt: '2026-10-15T20:00:00.000Z' }
  const shelf = { currentId: 'b1', boards: [{ id: 'b1', answers: [a] }] }
  const gone = [{ lamp: 'x', period: '2026-10-15', at: '2026-10-15T20:00:00.000Z', noteAt: '' }]
  const once = dropSentAnswers(shelf, gone)
  assert.equal(once.changed, 1)
  assert.equal(once.shelf.boards[0].answers.length, 0)
  assert.equal(dropSentAnswers(once.shelf, gone).changed, 0)
  // A tap made here after the one that was undone stays.
  const newer = { currentId: 'b1', boards: [{ id: 'b1', answers: [{ ...a, answeredAt: '2026-10-15T21:00:00.000Z' }] }] }
  assert.equal(dropSentAnswers(newer, gone).changed, 0)
  // Undo of a T1 tap puts the T0 answer back. The T0 row arrives first, then
  // the T1 delete: the restored T0 answer must stay.
  const t0 = { currentId: 'b1', boards: [{ id: 'b1', answers: [{ ...a, answeredAt: '2026-10-15T19:00:00.000Z' }] }] }
  assert.equal(dropSentAnswers(t0, gone).changed, 0)
  // Junk does nothing.
  assert.equal(dropSentAnswers(shelf, [{ lamp: 'x' }, null]).changed, 0)
  assert.equal(dropSentAnswers(shelf, 'nope').shelf, shelf)
})

test('live sql: realtime and social-live run before drop-tonight, deletes are not published', () => {
  const order = readFileSync('scripts/apply-all-sql.mjs', 'utf8')
  const files = [...order.matchAll(/'supabase\/([\w-]+\.sql)'/g)].map((m) => m[1])
  assert.ok(files.indexOf('answers.sql') < files.indexOf('realtime.sql'))
  assert.ok(files.indexOf('send-answers.sql') < files.indexOf('social-live.sql'))
  assert.ok(files.indexOf('realtime.sql') < files.indexOf('social-live.sql'))
  assert.match(readFileSync('supabase/realtime.sql', 'utf8'), /set \(publish = 'insert, update'\)/)
  const live = readFileSync('supabase/social-live.sql', 'utf8')
  assert.match(live, /create policy "didi own topic" on realtime\.messages\s+for select to authenticated/)
  assert.ok(!/on realtime\.messages\s+for (insert|all)/.test(live), 'clients cannot send on the topics')
  for (const fn of ['live_topic_mine', 'live_ping', 'live_we_answers', 'live_family_answers', 'live_send_answers', 'live_answer_gone', 'live_new_sends']) {
    assert.match(live, new RegExp(`function public\\.${fn}\\([^)]*\\)\\s+returns [\\w ]+\\s+language \\w+\\s+(stable\\s+)?security definer\\s+set search_path = public`), fn)
  }
  assert.ok(existsSync('supabase/tests/social-live.test.sql') && existsSync('supabase/tests/realtime.test.sql'))
})

test('answer keys and wakes: write-only key, same answer path, wake audience is live_ping', () => {
  const order = readFileSync('scripts/apply-all-sql.mjs', 'utf8')
  const files = [...order.matchAll(/'supabase\/([\w-]+\.sql)'/g)].map((m) => m[1])
  // wake-push.sql redefines live_ping; social-live.sql after it would drop the wakes.
  assert.ok(files.indexOf('consent-guards.sql') < files.indexOf('answer-keys.sql'))
  assert.ok(files.indexOf('social-live.sql') < files.indexOf('answer-keys.sql'))
  assert.ok(files.indexOf('answer-keys.sql') < files.indexOf('wake-push.sql'))
  assert.ok(files.indexOf('wake-push.sql') < files.indexOf('drop-tonight.sql'))
  const keys = readFileSync('supabase/answer-keys.sql', 'utf8')
  // The app and the key write through one function, so the merge rule is one.
  assert.match(keys, /function public\.put_answers\(rows jsonb\)[\s\S]*?return public\.put_answers_as\(\(select auth\.uid\(\)\), rows\)/)
  assert.match(keys, /revoke all on function public\.put_answers_as\(uuid, jsonb\) from public, anon, authenticated/)
  const body = keys.slice(keys.indexOf('function public.key_answer('))
  assert.ok(!/coins|wallet|purse|gems|sends|insert into public\.(?!answer_keys)/i.test(body.slice(0, body.indexOf('notify pgrst'))), 'a key writes answers only')
  assert.match(keys, /grant select \(id, device_key, created_at, last_used_at, revoked_at\) on public\.answer_keys to authenticated/)
  const wake = readFileSync('supabase/wake-push.sql', 'utf8')
  assert.match(wake, /if kind in \('we', 'family', 'send'\) then\s+perform public\.wake_devices\(who, null\)/)
  assert.ok(existsSync('supabase/tests/answer-keys.test.sql') && existsSync('supabase/tests/wake-push.test.sql'))
  // Sign out ends this device's key before the session goes.
  const account = readFileSync('src/lib/account.js', 'utf8')
  assert.match(account, /Promise\.all\(\[dropPushToken\(\), endAnswerKeys\(deviceKey\(\)\)\]\)\s+\/\/[^\n]*\n\s+await db\.auth\.signOut\(\{ scope: 'local' \}\)/)
})

test('the menu badge counts Did I did yous, the same as the inbox lists them', () => {
  const src = readFileSync(fileURLToPath(new URL('../src/lib/people.js', import.meta.url)), 'utf8')
  const look = src.slice(src.indexOf('async function pulseLook'), src.indexOf('function pulseWatch'))
  assert.match(look, /appSendsWaiting\(db, user\)/)
  assert.match(look, /const inbox = \(waiting\.count \?\? \(waiting\.data \|\| \[\]\)\.length\) \+ fromApp\.length/)
  // The badge comes in before the slower lookups, and a failed claim cannot stop it.
  assert.ok(look.indexOf('pulseEmit({ ...pulse.state, inbox, asks })') < look.indexOf("from('cheer_gifts')"))
  assert.ok(look.indexOf('try {') < look.indexOf('addAutoSends(db, adder)'))
  // A hung look expires, and only the look that set busy clears it.
  assert.match(look, /if \(pulse\.busy && Date\.now\(\) - pulse\.busyAt < PULSE_HUNG_MS\) return pulse\.busy/)
  assert.match(look, /if \(pulse\.busy === run\) pulse\.busy = null/)
})

test('the keyboard never covers a text box: every box is AppTextInput and the page follows it', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const walk = (dir) =>
    readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? walk(path.join(dir, d.name)) : /\.(jsx|tsx)$/.test(d.name) ? [path.join(dir, d.name)] : [],
    )
  const raw = walk('native').filter(
    (file) => !file.endsWith(path.join('components', 'ui.jsx')) && /<TextInput\b/.test(readFileSync(path.join(root, file), 'utf8')),
  )
  assert.deepEqual(raw, [])
  const ui = readFileSync(path.join(root, 'native/components/ui.jsx'), 'utf8')
  assert.match(ui, /onFocus=\{\(event\) => \{[^}]*fieldMoved\(\)/)
  const shell = readFileSync(path.join(root, 'native/components/BoardShell.jsx'), 'utf8')
  assert.match(shell, /onFieldMoved\(/)
  assert.match(shell, /keyboardDidShow', \(\) => followField\.current\(\)/)
})

await testAsync('the sign-in session moves into the encrypted store and never drops for want of the key', async () => {
  const { makeAuthStorage } = await import('../native/lib/auth-store.js')
  const mapStore = () => {
    const m = new Map()
    return {
      m,
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
      getString: (k) => (m.has(k) ? m.get(k) : undefined),
      set: (k, v) => m.set(k, String(v)),
      remove: (k) => m.delete(k),
    }
  }
  const keychain = new Map()
  let locked = false
  let keeps = true
  const secure = {
    AFTER_FIRST_UNLOCK: 'after-first-unlock',
    async getItemAsync(k) {
      if (locked) throw new Error('locked')
      return keychain.get(k) ?? null
    },
    async setItemAsync(k, v) {
      if (keeps) keychain.set(k, v)
    },
  }
  const crypto = { getRandomBytes: (n) => Uint8Array.from({ length: n }, (_, i) => i + 1) }
  const sealedFiles = new Map()
  const made = []
  const mmkv = {
    createMMKV({ id, encryptionKey, encryptionType }) {
      made.push({ id, encryptionKey, encryptionType })
      if (!sealedFiles.has(id)) sealedFiles.set(id, mapStore())
      return sealedFiles.get(id)
    },
  }
  const plain = mapStore()

  // An old phone: the session is in plain MMKV. The first read moves it.
  plain.setItem('did-i-auth', 'session-1')
  let store = makeAuthStorage({ secure, crypto, mmkv, plain: () => plain })
  assert.equal(await store.getItem('did-i-auth'), 'session-1')
  assert.equal(plain.getItem('did-i-auth'), null)
  assert.equal(sealedFiles.get('did-i-auth').getString('did-i-auth'), 'session-1')
  assert.equal(made[0].encryptionType, 'AES-256')
  assert.equal(made[0].encryptionKey.length, 32)

  // A refresh writes only to the sealed file.
  await store.setItem('did-i-auth', 'session-2')
  assert.equal(plain.getItem('did-i-auth'), null)
  assert.equal(await store.getItem('did-i-auth'), 'session-2')

  // Keychain locked (background after a reboot): the write lands in plain MMKV,
  // the session is not lost, and the next read with the key moves it in.
  locked = true
  store = makeAuthStorage({ secure, crypto, mmkv, plain: () => plain })
  await store.setItem('did-i-auth', 'session-3')
  assert.equal(plain.getItem('did-i-auth'), 'session-3')
  assert.equal(await store.getItem('did-i-auth'), 'session-3')
  locked = false
  assert.equal(await store.getItem('did-i-auth'), 'session-3')
  assert.equal(plain.getItem('did-i-auth'), null)
  assert.equal(sealedFiles.get('did-i-auth').getString('did-i-auth'), 'session-3')

  // Sign out clears both.
  plain.setItem('did-i-auth', 'stray')
  await store.removeItem('did-i-auth')
  assert.equal(await store.getItem('did-i-auth'), null)

  // Sign out while the Keychain is locked: once it unlocks, the sealed copy
  // goes too, so the person is not signed back in.
  await store.setItem('did-i-auth', 'session-old')
  locked = true
  store = makeAuthStorage({ secure, crypto, mmkv, plain: () => plain })
  await store.removeItem('did-i-auth')
  locked = false
  assert.equal(await store.getItem('did-i-auth'), null)
  assert.equal(sealedFiles.get('did-i-auth').getString('did-i-auth'), undefined)
  // Out and back in while locked: the new sign-in wins once it unlocks.
  await store.setItem('did-i-auth', 'session-a')
  locked = true
  store = makeAuthStorage({ secure, crypto, mmkv, plain: () => plain })
  await store.removeItem('did-i-auth')
  await store.setItem('did-i-auth', 'session-b')
  locked = false
  assert.equal(await store.getItem('did-i-auth'), 'session-b')
  await store.removeItem('did-i-auth')

  // A Keychain that does not keep the key: never seal with it, stay in plain.
  keychain.clear()
  keeps = false
  const before = made.length
  const fresh = mapStore()
  store = makeAuthStorage({ secure, crypto, mmkv, plain: () => fresh })
  await store.setItem('did-i-auth', 'session-4')
  assert.equal(made.length, before)
  assert.equal(fresh.getItem('did-i-auth'), 'session-4')

  // A binary without the modules works as before.
  const bare = mapStore()
  store = makeAuthStorage({ plain: () => bare })
  await store.setItem('did-i-auth', 'session-5')
  assert.equal(await store.getItem('did-i-auth'), 'session-5')
})

await testAsync('the watch count matches Today: every counted question, Did only, no grace cards', async () => {
  const { watchCount } = await import('../src/lib/watch-count.js')
  const { nightProgress } = await import('../src/lib/night-progress.js')
  const { dueTonight } = await import('../src/lib/recurrence.js')
  const lamps = [
    { id: 'a', question: 'A?', cadence: 'daily', archived: false, createdOn: '2020-01-01' },
    { id: 'b', question: 'B?', cadence: 'daily', archived: false, createdOn: '2020-01-01' },
    { id: 'c', question: 'C?', cadence: 'daily', archived: false, createdOn: '2020-01-01', askAfter: '21:00' },
    { id: 'd', question: 'D?', cadence: 'daily', archived: false, createdOn: '2020-01-01', askAfter: '21:00' },
  ]
  // What the watch draws, the way DidIWatchApp.swift / Cards.kt count it.
  const count = (answers, clock) => {
    const book = { id: 'w1', title: 'Home', dayFoldHour: 0, lamps, answers }
    const shelf = writeShelf({ currentId: 'w1', boards: [book] })
    const cards = buildTonightWidgetProps(shelf, clock)
      .items.filter((item) => !String(item.lampId).startsWith('we:'))
      .map((item) => ({ id: item.lampId, night: item.periodKey, status: item.status === 'yes' ? 'did' : item.status === 'skip' ? 'nope' : 'open' }))
    const { counted, done, later } = watchCount(shelf, cards, clock)
    const mine = cards.filter((card) => counted.has(`${card.id}|${card.night}`))
    const watch = { total: mine.length + done + later, answered: mine.filter((card) => card.status === 'did').length + done }
    const today = nightProgress(dueTonight(book, clock))
    assert.deepEqual(watch, { total: today.total, answered: today.answered }, `at ${clock.toISOString()}`)
    return watch
  }
  const on = (id, status, night = '2026-09-23') => ({ lampId: id, periodKey: night, status, answeredAt: `${night}T19:30:00` })
  assert.deepEqual(count([], new Date('2026-09-23T19:00:00')), { total: 4, answered: 0 })
  assert.deepEqual(count([on('a', 'yes')], new Date('2026-09-23T19:40:00')), { total: 4, answered: 1 })
  // A Not yet does not move the count, the same as Today's meter.
  assert.deepEqual(count([on('a', 'yes'), on('b', 'skip')], new Date('2026-09-23T20:00:00')), { total: 4, answered: 1 })
  assert.deepEqual(count([on('a', 'yes'), on('b', 'yes')], new Date('2026-09-23T21:05:00')), { total: 4, answered: 2 })
  assert.deepEqual(count(['a', 'b', 'c', 'd'].map((id) => on(id, 'yes')), new Date('2026-09-23T21:30:00')), { total: 4, answered: 4 })
  // After midnight, last night's open cards are on the watch but not in the count.
  assert.deepEqual(count([], new Date('2026-09-24T01:00:00')), { total: 4, answered: 0 })
  assert.equal(watchCount(null, []).done, 0)
})

await testAsync('one SQL file on its own never puts an older function back over a newer one', async () => {
  const { laterRedefinitions, sqlOrder } = await import('./sql-order.mjs')
  // known_people from blocks.sql over readthrough-12's dropped friends' pictures and looks.
  assert.ok(laterRedefinitions('supabase/blocks.sql').some((f) => f.name === 'known_people'))
  assert.deepEqual(laterRedefinitions('supabase/readthrough-12.sql').filter((f) => f.name === 'known_people'), [])
  const apply = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'apply-sql.mjs'), 'utf8')
  assert.match(apply, /laterRedefinitions\(file\)/)
  const all = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'apply-all-sql.mjs'), 'utf8')
  assert.match(all, /'--in-order'/)
  assert.ok(sqlOrder().length > 50)
})

await testAsync('flipping Did and Not yet on one question pays its coins once, and the 3-tap cap still holds', async () => {
  const { putAnswer } = await import('../src/lib/board-ops.js')
  const { normalizeAnswer } = await import('../src/lib/board-json.js')
  const clock = new Date('2026-10-18T21:00:00')
  const lamps = ['a', 'b', 'c', 'd'].map((id) => ({ id, question: id + '?', cadence: 'daily', archived: false, createdOn: '2020-01-01' }))
  let book = { id: 'f1', title: 'Home', dayFoldHour: 0, lamps, answers: [], coins: 0 }
  const row = (id) => ({ lamp: lamps.find((lamp) => lamp.id === id), periodKey: '2026-10-18', dateIso: '2026-10-18' })
  for (let i = 0; i < 5; i += 1) {
    book = putAnswer(book, row('a'), 'yes', clock)
    book = putAnswer(book, row('a'), 'skip', clock)
  }
  assert.equal(book.coins, 2)
  // The flipped one still counts: two more Dids pay, the fourth question does not.
  book = putAnswer(book, row('b'), 'yes', clock)
  book = putAnswer(book, row('c'), 'yes', clock)
  book = putAnswer(book, row('d'), 'yes', clock)
  assert.equal(book.coins, 6)
  // A Not yet first, then a Did, still pays.
  let fresh = { id: 'f2', title: 'Home', dayFoldHour: 0, lamps, answers: [], coins: 0 }
  fresh = putAnswer(fresh, row('a'), 'skip', clock)
  fresh = putAnswer(fresh, row('a'), 'yes', clock)
  assert.equal(fresh.coins, 2)
  // The mark survives a save.
  assert.equal(normalizeAnswer({ lampId: 'a', periodKey: 'x', status: 'skip', paid: true }).paid, true)
  assert.equal('paid' in normalizeAnswer({ lampId: 'a', periodKey: 'x', status: 'skip' }), false)
})

test('every missed day is saved as Not yet, not just yesterday', () => {
  const lamp = { id: 'm', question: 'M?', cadence: 'daily', archived: false, createdOn: '2026-10-01' }
  const nopes = (book) => book.answers.filter((a) => a.lampId === 'm' && a.status === 'skip').map((a) => a.periodKey).sort()
  const days = (from, to) => {
    const out = []
    for (let d = new Date(`${from}T12:00:00`); d <= new Date(`${to}T12:00:00`); d.setDate(d.getDate() + 1)) out.push(d.toISOString().slice(0, 10))
    return out
  }
  // Opened at noon on the 18th after 17 days away: the 1st to the 17th close.
  const away = closePastNights({ id: 'b', title: 'A', dayFoldHour: 0, lamps: [lamp], answers: [] }, new Date(2026, 9, 18, 12), [])
  assert.deepEqual(nopes(away), days('2026-10-01', '2026-10-17'))
  // An answered day stops the walk: what is older was closed back then.
  const did = { id: 'x', lampId: 'm', periodKey: '2026-10-10', status: 'yes', answeredAt: '2026-10-10T21:00:00', note: '' }
  const back = closePastNights({ id: 'b', title: 'A', dayFoldHour: 0, lamps: [lamp], answers: [did] }, new Date(2026, 9, 18, 12), [])
  assert.deepEqual(nopes(back), days('2026-10-11', '2026-10-17'))
  // Before 9am last night is still open (grace); the days before it close.
  const early = closePastNights({ id: 'b', title: 'A', dayFoldHour: 0, lamps: [lamp], answers: [did] }, new Date(2026, 9, 18, 7), [])
  assert.deepEqual(nopes(early), days('2026-10-11', '2026-10-16'))
  // No createdOn and no answers: only last night, never hundreds of nopes.
  const old = closePastNights({ id: 'b', title: 'A', dayFoldHour: 0, lamps: [{ ...lamp, createdOn: undefined }], answers: [] }, new Date(2026, 9, 18, 12), [])
  assert.deepEqual(nopes(old), ['2026-10-17'])
  // Running it again adds nothing.
  assert.equal(closePastNights(away, new Date(2026, 9, 18, 12), []), away)
})

test('an open sheet hides the screens behind it from TalkBack, and only while it is up', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const host = readFileSync(path.join(root, 'native/components/SheetHost.jsx'), 'utf8')
  // A Windows checkout has CRLF; the order check below looks for '\n'.
  const shell = readFileSync(path.join(root, 'native/AppShell.jsx'), 'utf8').replace(/\r\n/g, '\n')
  // Every publish tells the shell, closing (null) included.
  assert.match(host, /export function publishSheet\(next\) \{[^}]*upWatchers\.forEach/)
  assert.match(host, /accessibilityViewIsModal/)
  assert.match(shell, /onSheetUp\(setSheetUp\)/)
  assert.match(shell, /importantForAccessibility=\{Platform\.OS === 'android' && sheetUp \? 'no-hide-descendants' : 'auto'\}/)
  // The sheet layer itself is outside the hidden part.
  const hidden = shell.indexOf("no-hide-descendants")
  const close = shell.indexOf('</ScreenProps.Provider>\n      </View>', hidden)
  assert.ok(hidden > 0 && close > hidden, 'the screens wrapper closes after the stack')
  assert.ok(shell.indexOf('<SheetHost />', close) > close, 'SheetHost sits after the hidden screens, not inside them')
})

await testAsync('a Did on one phone and a Not yet on another still pays the night once', async () => {
  const { mergeBooks } = await import('../src/lib/shelf-merge.js')
  const { putAnswer } = await import('../src/lib/board-ops.js')
  const clock = new Date('2026-10-18T21:00:00')
  const lamp = { id: 'p', question: 'P?', cadence: 'daily', archived: false, createdOn: '2020-01-01' }
  const row = { lamp, periodKey: '2026-10-18', dateIso: '2026-10-18' }
  const base = { id: 'm1', title: 'Home', dayFoldHour: 0, lamps: [lamp], answers: [], coins: 0 }
  const phoneA = putAnswer(base, row, 'yes', clock)
  assert.equal(phoneA.coins, 2)
  const phoneB = { ...base, answers: [{ id: 'b1', lampId: 'p', periodKey: '2026-10-18', status: 'skip', answeredAt: '2026-10-18T21:30:00', note: '' }] }
  // B's Not yet is newer and wins, but the night stays counted as paid.
  const merged = mergeBooks(phoneB, phoneA)
  const answer = merged.answers.find((a) => a.lampId === 'p')
  assert.equal(answer.status, 'skip')
  assert.equal(answer.paid, true)
  const again = putAnswer({ ...merged, coins: phoneA.coins }, row, 'yes', new Date('2026-10-18T22:00:00'))
  assert.equal(again.coins, 2, 'the second Did does not pay')
})

await testAsync('an invite needs no typing: the link carries it, a paste or any spelling works, a new account is asked once', async () => {
  const { inviteFromPaste, isNewAccount } = await import('../src/lib/invite-link.js')
  const { formatInvite, cleanInvite } = await import('../src/lib/people.js')
  assert.equal(formatInvite('d93aq5lbs4'), 'D93AQ-5LBS4')
  assert.equal(cleanInvite('d93aq-5lbs4 '), 'D93AQ5LBS4')
  assert.equal(formatInvite('D93A'), 'D93A')
  assert.equal(inviteFromPaste('Join me on Did I and we both get gems: https://did-i.app/i/D93AQ5LBS4'), 'D93AQ5LBS4')
  assert.equal(inviteFromPaste(' d93aq-5lbs4 '), 'D93AQ5LBS4')
  assert.equal(inviteFromPaste('hello there world'), '')
  const now = Date.parse('2026-10-18T12:00:00Z')
  assert.equal(isNewAccount({ created_at: '2026-10-17T12:00:00Z' }, now), true)
  assert.equal(isNewAccount({ created_at: '2026-10-10T12:00:00Z' }, now), false)
  assert.equal(isNewAccount({}, now), false)
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const read = (file) => readFileSync(path.join(root, file), 'utf8')
  // The shared message leads with the link in every language.
  for (const file of readdirSync(path.join(root, 'src/locales'))) {
    assert.match(read(`src/locales/${file}`), /'people\.inviteLine': '[^']*\{link\}'/, `${file} invite line ends with the link`)
  }
  // One tap to share from Connect, an Invite friends row on People (not a card
  // over the lists); the code box on Connect, in the sign-up ask, and from a scanned invite.
  const social = read('native/screens/social.jsx')
  assert.equal((social.match(/<InviteCard colors=\{colors\} \/>/g) || []).length, 1)
  assert.match(social, /label=\{t\('invite\.cardTitle'\)\}[\s\S]{0,120}onPress=\{\(\) => goHash\('\/people\/refer'\)\}/)
  assert.match(social, /<InviteCodeSection colors=\{colors\} book=\{book\} onChange=\{onChange\} hideBar hideDone \/>/)
  assert.match(social, /<QrCode value=\{inviteLink\(invite\)\}/)
  assert.match(read('native/screens/ScanScreen.jsx'), /swapHash\('\/people\/refer', \{ id: invite \}\)/)
  assert.match(read('native/AppShell.jsx'), /<InviteAskHost /)
  // The server can say whose code it is; it runs before drop-tonight like every new file.
  const order = read('scripts/apply-all-sql.mjs')
  assert.ok(order.indexOf('invite-owner.sql') > 0 && order.indexOf('invite-owner.sql') < order.indexOf('drop-tonight.sql'))
})

test('every screen wears the look: a glow of its colour and a bar above the first card', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const shell = readFileSync(path.join(root, 'native/components/BoardShell.jsx'), 'utf8')
  assert.equal((shell.match(/<LookGlow colors=\{colors\} \/>/g) || []).length, 2, 'both the scrolling and the fixed page')
  assert.match(shell, /<LookMark colors=\{colors\} \/>/)
  // The page body is clear, so nothing paints over the glow.
  assert.match(shell, /const shellBg = styles\.clear/)
})

test('a friend request and its yes reach the other phone live, not on the 5 minute check', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const read = (file) => readFileSync(path.join(root, file), 'utf8')
  assert.match(read('src/lib/people.js'), /onVisible\(pulseLook, \['ask', 'friend', 'gift', 'familyInfo', 'weMembers'\]\)/)
  const sql = read('supabase/live-more.sql')
  assert.match(sql, /live_ping\(array\[r\.who\], 'friend', r\.id\)/)
  assert.match(sql, /after insert on public\.friend_links/)
  assert.match(sql, /after update on public\.friend_links/)
  for (const table of ['cheer_gifts', 'we_members', 'family_members', 'family_lamps', 'families', 'sends']) {
    assert.match(sql, new RegExp(`on public\\.${table}\\b`), `${table} pings`)
  }
  // Open screens read again on those pings.
  const social = read('native/screens/social.jsx')
  for (const kinds of ["['family', 'familyInfo']", "['send', 'sendMoved', 'friend']", "['ask', 'gift']", "['send', 'sendMoved']"]) {
    assert.ok(social.includes(`useLiveReload(${kinds}, load)`), kinds)
  }
  assert.match(read('native/screens/FamilyDetail.jsx'), /useLiveReload\(\['family', 'familyInfo'\], load\)/)
  const order = read('scripts/apply-all-sql.mjs')
  assert.ok(order.indexOf('social-live.sql') < order.indexOf('live-more.sql') && order.indexOf('live-more.sql') < order.indexOf('drop-tonight.sql'))
})

test('smooth screens: screen files warm after launch, the shelf is read once per change, lists do not redraw on every tap', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const read = (file) => readFileSync(path.join(root, file), 'utf8')
  assert.match(read('native/AppShell.jsx'), /setBooted\(true\)\s*\n\s*warmScreens\(\)/)
  assert.match(read('native/screens/ScreenRouter.jsx'), /export function warmScreens\(\)/)
  const cosmetic = read('native/components/Cosmetic.jsx')
  assert.match(cosmetic, /export const LookChip = memo\(LookChipArt\)/)
  assert.match(cosmetic, /export const CheerChip = memo\(CheerChipArt\)/)
  assert.match(read('native/screens/frames.jsx'), /const FrameTile = memo\(/)
  assert.match(read('native/components/SetBits.jsx'), /useNativeDriver: true/)
  assert.match(read('src/lib/board-shelf.js'), /if \(raw && raw === lastRaw && lastShelf\) return lastShelf/)
  // Long lists draw a page at a time; Did we keeps its totals; no JS-driven cheer tick or letter wave.
  const more = read('native/screens/more.jsx')
  assert.equal((more.match(/const page = useShown\(rows, query\)/g) || []).length, 2)
  const we = read('native/screens/we.jsx')
  assert.match(we, /useKept\(`we\.sums:/)
  assert.match(we, /useKept\(`we\.early:/)
  assert.ok(!/useNativeDriver: false/.test(read('native/components/DidLead.jsx')))
  assert.match(read('native/components/CheerBurst.jsx'), /useAnimatedProps\(\(\) => \(\{ strokeDashoffset/)
  assert.match(read('native/shim/reanimated-safe.cjs'), /useAnimatedProps\(fn\)/)
})

await testAsync('readShelf hands back the same shelf until storage changes, and sees a write from anywhere', async () => {
  const { readShelf, writeShelf } = await import('../src/lib/board-shelf.js')
  const first = readShelf()
  assert.equal(readShelf(), first, 'unchanged storage: the same object, no reparse')
  const next = writeShelf({ ...first, boards: first.boards.map((b, i) => (i ? b : { ...b, title: 'Changed here' })) })
  assert.equal(readShelf(), next)
  assert.equal(readShelf().boards[0].title, 'Changed here')
  // Something else writes the key directly (a widget task, another sync path).
  const raw = JSON.parse(localStorage.getItem('did-i-shelf'))
  raw.boards[0].title = 'Changed elsewhere'
  localStorage.setItem('did-i-shelf', JSON.stringify(raw))
  assert.equal(readShelf().boards[0].title, 'Changed elsewhere')
})

await testAsync('day nudges: 9:00 and 13:30 while open, none when all Did, an hour clear of reminders, under the iOS cap', async () => {
  const { dayNudges, DAY_NUDGE_TIMES } = await import('../src/lib/day-nudges.js')
  const { PING_KINDS } = await import('../src/lib/prefs.js')
  const { quietEnd } = await import('../src/lib/quiet.js')
  assert.deepEqual(DAY_NUDGE_TIMES, ['09:00', '13:30'])
  assert.ok(PING_KINDS.includes('day'), 'a switch in Settings, on unless turned off')
  const q = (id) => ({ id, question: id, cadence: 'daily', createdOn: '2026-10-01', archived: false })
  const book = { id: 'b', dayFoldHour: 0, lamps: [q('a'), q('b')], answers: [] }
  const now = new Date(2026, 9, 14, 8, 0)
  const all = dayNudges(book, now)
  assert.equal(all.length, 14, 'two a day for a week')
  assert.deepEqual([all[0].at.getHours(), all[0].at.getMinutes(), all[1].at.getHours(), all[1].at.getMinutes()], [9, 0, 13, 30])
  assert.ok(all.every((n) => n.line >= 1 && n.line <= 4))
  assert.ok(new Set(all.slice(0, 4).map((n) => n.line)).size > 1, 'the lines rotate')
  // Past 9:00 only the afternoon one is left today.
  assert.equal(dayNudges(book, new Date(2026, 9, 14, 10, 0))[0].at.getHours(), 13)
  // Every question Did today: no nudge today, the rest of the week stays.
  const done = { ...book, answers: ['a', 'b'].map((lampId) => ({ lampId, periodKey: '2026-10-14', status: 'yes' })) }
  const left = dayNudges(done, now)
  assert.equal(left.length, 12)
  assert.ok(left.every((n) => n.at.getDate() !== 14))
  // Not yet is not done, so it still nudges.
  const notYet = { ...book, answers: [{ lampId: 'a', periodKey: '2026-10-14', status: 'yes' }, { lampId: 'b', periodKey: '2026-10-14', status: 'skip' }] }
  assert.equal(dayNudges(notYet, now).length, 14)
  // No questions at all: nothing to nudge about.
  assert.equal(dayNudges({ ...book, lamps: [] }, now).length, 0)
  // A reminder at 9:45 keeps 9:00 quiet; one at 14:30 sits exactly an hour out, so 13:30 stays.
  const near = dayNudges(book, now, { days: 1, reminders: [new Date(2026, 9, 14, 9, 45), new Date(2026, 9, 14, 14, 30)] })
  assert.deepEqual(near.map((n) => n.at.getHours()), [13])
  // Quiet hours that cover the morning drop the 9:00 one instead of moving it.
  const quiet = { quietOn: true, quietFrom: '22:00', quietTo: '10:00' }
  assert.deepEqual(dayNudges(book, now, { days: 1, shift: (at) => quietEnd(at, quiet) }).map((n) => n.at.getHours()), [13])
  // A week of nudges plus question reminders still fits the 60 the phone keeps (iOS holds 64).
  const native = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../native/shim/native.js'), 'utf8')
  assert.match(native, /const PING_CAP = 60/)
  assert.match(native, /pingOn\('day'\)[\s\S]*dayNudges\(list, now, \{ days: PING_DAYS, reminders, shift: afterQuiet, times \}\)[\s\S]*notes\.length = Math\.min\(notes\.length, PING_CAP\)/)
  assert.ok(all.length <= 60)
})

await testAsync('morning ask: one-day questions for today, capped, never cut a streak, kept on the past day', async () => {
  const { addMorning, isTodayOnce, morningCount, morningOpen, MORNING_CAP } = await import('../src/lib/morning-ask.js')
  const { shouldShowMorningAsk } = await import('../src/lib/first-run.js')
  const { shelfStreak: streakOf } = await import('../src/lib/hall-feel.js')
  const { nightWhy } = await import('../src/lib/hall-pages.js')
  const { coinsFor } = await import('../src/lib/purse.js')
  const { normalizeLamp } = await import('../src/lib/board-json.js')
  const morning = new Date(2026, 9, 18, 8, 30)
  const yes = (lampId, periodKey) => ({ lampId, periodKey, status: 'yes', answeredAt: `${periodKey}T21:00:00` })
  const daily = { id: 'd', question: 'Walk?', cadence: 'daily', createdOn: '2026-10-10', archived: false }
  const base = { id: 'b', dayFoldHour: 0, lamps: [daily], answers: ['2026-10-16', '2026-10-17'].map((iso) => yes('d', iso)) }
  assert.equal(morningOpen(morning), true)
  assert.equal(morningOpen(new Date(2026, 9, 18, 12, 0)), false)
  assert.equal(addMorning(base, [base], '   ', morning).error, 'empty')
  assert.equal(addMorning(base, [base], 'walk?', morning).error, 'dupe', 'same words as a question already asked')
  const one = addMorning(base, [base], 'Call the dentist?', morning)
  assert.equal(one.lamp.cadence, 'once')
  assert.equal(one.lamp.onceOn, '2026-10-18')
  assert.ok(isTodayOnce(one.lamp, '2026-10-18'))
  assert.ok(normalizeLamp(one.lamp).morning && normalizeLamp(one.lamp).optional, 'the flags survive a save')
  assert.equal(addMorning(one.book, [one.book], 'call the  dentist?', morning).error, 'dupe')
  assert.equal(addMorning(one.book, [one.book], 'Call the dentist', morning).error, 'dupe', 'a missing ? is the same question')
  let full = base
  for (let i = 0; i < MORNING_CAP; i += 1) full = addMorning(full, [full], `Thing ${i}?`, morning).book
  assert.equal(morningCount([full], '2026-10-18'), MORNING_CAP)
  assert.equal(addMorning(full, [full], 'One more?', morning).error, 'full')
  // The card: Not today hides it for the day; an add hides it once Tonight is left.
  const ask = (state, more = {}) => shouldShowMorningAsk({ state, today: '2026-10-18', on: true, open: true, busy: false, addedHere: false, ...more })
  assert.equal(ask({}), true)
  assert.equal(ask({ offDay: '2026-10-18' }), false)
  assert.equal(ask({ offDay: '2026-10-17' }), true)
  assert.equal(ask({ addedDay: '2026-10-18' }), false)
  assert.equal(ask({ addedDay: '2026-10-18' }, { addedHere: true }), true)
  assert.equal(ask({}, { on: false }), false)
  assert.equal(ask({}, { open: false }), false)
  assert.equal(ask({}, { busy: true }), false)
  // Streak: an open, a Not yet and a Did one-day question never lower it.
  const night = new Date(2026, 9, 18, 21, 30)
  const before = streakOf([base], night)
  assert.equal(streakOf([one.book], night), before, 'open today')
  const doneToday = { ...one.book, answers: [...one.book.answers, yes('d', '2026-10-18')] }
  assert.equal(streakOf([doneToday], night), streakOf([{ ...base, answers: doneToday.answers }], night), 'the daily one alone clears the night')
  // Next day: yesterday's one-day question closed as Not yet and put away.
  const tomorrow = new Date(2026, 9, 19, 9, 0)
  const closed = closePastNights(doneToday, tomorrow)
  assert.ok(closed.lamps.find((l) => l.id === one.lamp.id).archived)
  assert.equal(streakOf([closed], tomorrow), streakOf([closePastNights({ ...base, answers: doneToday.answers }, tomorrow)], tomorrow), 'a Not yet on it does not break the streak')
  const why = nightWhy([closed], '2026-10-18', tomorrow)
  assert.equal(why.state, 'clear')
  assert.deepEqual(why.extras.map((row) => [row.lamp.id, row.answer?.status]), [[one.lamp.id, 'skip']], 'the past day keeps it with its Not yet')
  // A Did on it pays coins and shows as Did on that day.
  const did = putAnswer(doneToday, { lamp: one.lamp, periodKey: `once:${one.lamp.id}`, dateIso: '2026-10-18' }, 'yes', night)
  assert.ok(coinsFor('yes', doneToday, { lamp: one.lamp }, night) > 0)
  const later = closePastNights(did, tomorrow)
  assert.equal(nightWhy([later], '2026-10-18', tomorrow).extras[0].answer.status, 'yes')
  assert.ok(nightWhyLines(nightWhy([later], '2026-10-18', tomorrow)).some((line) => line.includes('Call the dentist')))
  assert.equal(streakOf([later], tomorrow), streakOf([closed], tomorrow))
  // The 9:00 nudge asks for today and opens the card; 13:30 is unchanged.
  const native = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../native/shim/native.js'), 'utf8')
  assert.match(native, /morning && nudge\.slot === 0/)
  // The card adds onto the live book, so a Did still in flight is not overwritten.
  const tonightSrc = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../native/screens/TonightScreen.jsx'), 'utf8')
  assert.ok(tonightSrc.includes('const live = (stack.shelf || []).find((item) => item.id === book.id) || book'))
  assert.ok(tonightSrc.includes('addMorning(live, '))
  // A time reminds once today, through the same reminders as any question; a past time is refused.
  const { upcomingPings } = await import('../src/lib/notify.js')
  assert.equal(addMorning(base, [base], 'Pills?', morning, '08:00').error, 'past')
  const timed = addMorning(base, [base], 'Pills?', morning, '10:15')
  assert.equal(timed.lamp.askAfter, '10:15')
  const fires = upcomingPings(timed.book, morning).filter((fire) => fire.id === timed.lamp.id)
  assert.equal(fires.length, 1, 'exactly one reminder today')
  assert.equal(new Date(fires[0].at).getHours(), 10)
  assert.equal(upcomingPings(one.book, morning).filter((fire) => fire.id === one.lamp.id).length, 0, 'no time, no reminder')
  // The time is only the reminder: on Tonight and the widget right away, answerable before it.
  const { waitingTonight, askAfterPassed, dueTonight } = await import('../src/lib/recurrence.js')
  assert.ok(askAfterPassed(timed.lamp, morning))
  assert.equal(waitingTonight(timed.book, morning).some((row) => row.lamp.id === timed.lamp.id), false)
  assert.ok(dueTonight(timed.book, morning).some((row) => row.lamp.id === timed.lamp.id))
  const { todayLabel } = await import('../src/lib/morning-ask.js')
  assert.match(todayLabel(timed.lamp), /^Today, 10:15/)
  assert.equal(todayLabel(one.lamp), 'Today')
  // Past its time it reminds no more; answered it reminds no more.
  assert.equal(upcomingPings(timed.book, new Date(2026, 9, 18, 10, 30)).filter((fire) => fire.id === timed.lamp.id).length, 0)
  const answered = putAnswer(timed.book, { lamp: timed.lamp, periodKey: `once:${timed.lamp.id}`, dateIso: '2026-10-18' }, 'yes', morning)
  assert.equal(upcomingPings(answered, morning).filter((fire) => fire.id === timed.lamp.id).length, 0)
  // A plain timed question still waits for its time.
  const plainTimed = { ...base, lamps: [{ ...daily, id: 'w', question: 'Late?', askAfter: '20:00' }] }
  assert.ok(waitingTonight(plainTimed, morning).some((row) => row.lamp.id === 'w'))
})

test('undo puts back one answer on the live folder and keeps the rest', async () => {
  const { undoneBook } = await import('../src/lib/useTonightStack.js?undo-live')
  const lamp = (id) => ({ id, question: id, cadence: 'daily', archived: false, createdOn: '2024-01-01' })
  const old = { id: 'b', coins: 4, lamps: [lamp('a'), lamp('c')], answers: [] }
  const live = {
    ...old,
    coins: 6,
    answers: [
      { id: 'x', lampId: 'a', periodKey: '2026-10-02', status: 'yes', paid: true },
      { id: 'y', lampId: 'c', periodKey: '2026-10-02', status: 'yes', paid: true },
    ],
  }
  const back = undoneBook(live, { book: old, after: { ...old, coins: 5 }, lampId: 'a', periodKey: '2026-10-02' })
  assert.deepEqual(back.answers.map((item) => item.lampId), ['c'], 'the other answer survives')
  assert.equal(back.coins, 5, 'only the undone tap coin goes; the other answer coin stays')
  const none = undoneBook({ ...live, coins: 0 }, { book: old, after: { ...old, coins: 9 }, lampId: 'a', periodKey: '2026-10-02' })
  assert.equal(none.coins, 0, 'never below zero')
  const kept = { id: 'z', lampId: 'a', periodKey: '2026-10-02', status: 'skip' }
  const was = undoneBook(live, { book: { ...old, answers: [kept] }, lampId: 'a', periodKey: '2026-10-02' })
  assert.deepEqual(was.answers.map((item) => item.id), ['y', 'z'], 'a nope before the did comes back')
})

test('signed in, did then undo then did pays once; signed out undo takes the coins back', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const url = (file) => pathToFileURL(path.join(root, file)).href
  const script = `
    const store = new Map([['did-i-last-user', 'user-a']])
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
    globalThis.window = { dispatchEvent() {} }
    const { putAnswer } = await import(${JSON.stringify(url('src/lib/board-ops.js'))})
    const { takeEarnedCoins } = await import(${JSON.stringify(url('src/lib/purse.js'))})
    const book = { id: 'b', lamps: [{ id: 'a', question: 'a', cadence: 'daily', archived: false, createdOn: '2024-01-01' }], answers: [], coins: 0 }
    const row = { lamp: book.lamps[0], periodKey: '2026-10-02' }
    const clock = new Date(2026, 9, 2, 20)
    putAnswer(book, row, 'yes', clock)
    putAnswer(book, row, 'yes', clock)
    console.log(JSON.stringify(takeEarnedCoins()))
  `
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test' },
  })
  assert.equal(run.status, 0, run.stderr)
  assert.deepEqual(JSON.parse(run.stdout.trim().split('\n').pop()), { '2026-10-02': 2 })
})

test('signed in, did then a restart then did still pays once', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const url = (file) => pathToFileURL(path.join(root, file)).href
  const script = (saved) => `
    const store = new Map(${saved})
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }
    globalThis.window = { dispatchEvent() {} }
    const { putAnswer } = await import(${JSON.stringify(url('src/lib/board-ops.js'))})
    const { takeEarnedCoins } = await import(${JSON.stringify(url('src/lib/purse.js'))})
    const book = { id: 'b', lamps: [{ id: 'a', question: 'a', cadence: 'daily', archived: false, createdOn: '2024-01-01' }], answers: [], coins: 0 }
    putAnswer(book, { lamp: book.lamps[0], periodKey: '2026-10-02' }, 'yes', new Date(2026, 9, 2, 20))
    console.log(JSON.stringify({ coins: takeEarnedCoins(), store: [...store] }))
  `
  const go = (saved) => {
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', script(saved)], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test' },
    })
    assert.equal(run.status, 0, run.stderr)
    return JSON.parse(run.stdout.trim().split('\n').pop())
  }
  const first = go(JSON.stringify([['did-i-last-user', 'user-a']]))
  assert.deepEqual(first.coins, { '2026-10-02': 2 })
  assert.deepEqual(go(JSON.stringify(first.store)).coins, {})
  const other = first.store.map(([k, v]) => [k, k === 'did-i-last-user' ? 'user-b' : v])
  assert.deepEqual(go(JSON.stringify(other)).coins, { '2026-10-02': 2 })
})

test('the streak-risk ping is skipped when quiet hours move it', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const native = readFileSync(path.join(root, 'native/shim/native.js'), 'utf8')
  assert.match(native, /if \(risk && !lateThen && afterQuiet\(new Date\(risk\.at\)\)\.getTime\(\) === riskAt\)/)
  // A 21:00 last call already buzzes then: no second streak note on top.
  assert.match(native, /lateThen = notes\.some\(\(note\) => note\.lateCall && note\.trigger\.date\.getTime\(\) === riskAt\)/)
})

test('family codes: six or ten pass, seven does not, ten is not cut', async () => {
  const { cleanCode, familyCodeOk } = await import('../src/lib/people.js?family-codes')
  assert.equal(cleanCode('abcd-efgh-23'), 'ABCDEFGH23')
  assert.ok(familyCodeOk(cleanCode('ABC234')))
  assert.ok(familyCodeOk(cleanCode('abcdefgh23')))
  assert.ok(!familyCodeOk(cleanCode('ABC2345')))
})

test('universal links use ios.associatedDomains (Expo drops the raw entitlement)', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const config = readFileSync(path.join(root, 'app.config.js'), 'utf8')
  assert.ok(config.includes("associatedDomains: ['applinks:did-i.app']"))
  assert.ok(!config.includes("'com.apple.developer.associated-domains'"), 'Expo strips this key from ios.entitlements, so links open the website')
})

await testAsync('did we slots: streak, best, answer night and early for daily and weekly cards', async () => {
  const { weSlotLocked, weBest, weDueOn, weEarly, weSlotOf, weStreak } = await import('../src/lib/did-we.js')
  const daily = (doneNights, startsOn = '2026-10-01') => ({ cadence: 'daily', weekdays: [], startsOn, doneNights })
  const weekly = (weekdays, doneNights, startsOn = '2026-09-01') => ({ cadence: 'weekly', weekdays, startsOn, doneNights })

  // Daily: each day is its own slot, as before.
  assert.equal(weStreak(daily(['2026-10-08', '2026-10-09', '2026-10-10']), '2026-10-11'), 3, 'tonight open does not break it')
  assert.equal(weStreak(daily(['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']), '2026-10-11'), 4)
  assert.equal(weStreak(daily(['2026-10-08', '2026-10-10']), '2026-10-11'), 1, 'a missed day ends the run')
  assert.equal(weStreak(daily(['2026-10-08']), '2026-10-11'), 0)
  assert.equal(weSlotOf(daily([]), '2026-10-11'), '2026-10-11')

  // Weekly on Sunday (2026-10-04 and 2026-10-11 are Sundays).
  const sun = (done) => weekly([0], done)
  assert.equal(weStreak(sun(['2026-09-27', '2026-10-04']), '2026-10-05'), 2, 'Monday after a done Sunday')
  assert.equal(weStreak(sun(['2026-09-27', '2026-10-04']), '2026-10-10'), 2, 'Saturday, slot still Oct 4')
  assert.equal(weStreak(sun(['2026-09-27', '2026-10-04']), '2026-10-11'), 2, 'due night open')
  assert.equal(weStreak(sun(['2026-09-27', '2026-10-04']), '2026-10-14'), 2, 'this week open, last week done')
  assert.equal(weStreak(sun(['2026-09-27', '2026-10-04', '2026-10-11']), '2026-10-14'), 3)
  assert.equal(weStreak(sun(['2026-09-20', '2026-10-04']), '2026-10-05'), 1, 'a missed week ends the run')
  assert.equal(weStreak(sun(['2026-09-27', '2026-10-11']), '2026-10-12'), 1)
  assert.equal(weStreak(sun(['2026-09-27', '2026-10-04']), '2026-10-18'), 0, 'a slot past undone is a miss')
  assert.equal(weSlotOf(sun([]), '2026-10-05'), '2026-10-04')

  // Weekly Monday and Thursday: 2026-10-01 is a Thursday.
  const two = (done) => weekly([1, 4], done, '2026-10-01')
  assert.equal(weStreak(two(['2026-10-01', '2026-10-05', '2026-10-08']), '2026-10-10'), 3, 'Saturday after Thursday')
  assert.equal(weStreak(two(['2026-10-01', '2026-10-05', '2026-10-08']), '2026-10-12'), 3, 'Monday open')
  assert.equal(weStreak(two(['2026-10-01', '2026-10-05', '2026-10-08']), '2026-10-13'), 3, 'Tuesday, Monday slot open')
  assert.equal(weStreak(two(['2026-10-01', '2026-10-08']), '2026-10-09'), 1, 'Monday missed')

  // Before the first due night: no slot, and answering goes on the first night.
  const late = weekly([0], [], '2026-10-11')
  assert.equal(weStreak(late, '2026-10-08'), 0)
  assert.equal(weSlotOf(late, '2026-10-08'), '')
  assert.equal(weDueOn(late, '2026-10-04'), false)

  // A week that crosses the end of daylight saving time (2026-11-01).
  assert.equal(weStreak(sun(['2026-10-25', '2026-11-01', '2026-11-08']), '2026-11-11'), 3)
  assert.equal(weSlotOf(sun([]), '2026-11-02'), '2026-11-01')
  assert.equal(weSlotOf(sun([]), '2026-11-07'), '2026-11-01')

  // The server's number wins when it sends one; the local count is the fallback.
  assert.equal(weStreak({ ...sun(['2026-10-04']), streak: 5 }, '2026-10-05'), 5)
  assert.equal(weStreak({ ...sun([]), streak: 0 }, '2026-10-05'), 0)
  assert.equal(weBest({ ...sun([]), best: 9 }), 9)
  assert.equal(weBest(sun(['2026-09-20', '2026-09-27', '2026-10-04', '2026-10-18', '2026-10-25'])), 3)
  assert.equal(weBest(daily(['2026-10-01', '2026-10-02', '2026-10-04'])), 2)

  // "Done it already" is only for a card with no open slot.
  assert.equal(weEarly({ due: true, slot: '2026-10-11' }, '2026-10-11'), false)
  assert.equal(weSlotLocked({ done: true, slot: '2026-10-04' }, '2026-10-08'), true, 'an older done slot is closed')
  assert.equal(weSlotLocked({ done: true, slot: '2026-10-04' }, '2026-10-04'), false)
  assert.equal(weSlotLocked({ done: true, slot: '2026-10-04' }, '2026-10-05'), false, 'last night can still change')
  assert.equal(weSlotLocked({ done: false, slot: '2026-10-04' }, '2026-10-08'), false)
  assert.equal(weEarly({ due: false }, '2026-10-05'), true, 'a server without slots')
  assert.equal(weEarly({ due: false, slot: '2026-10-11' }, '2026-10-08'), true, 'before the first night')
  assert.equal(weEarly({ due: false, slot: '2026-10-04', done: true }, '2026-10-08'), true, 'this week is done, so the next night can go early')
  assert.equal(weEarly({ due: false, slot: '2026-10-04' }, '2026-10-08'), false)
})

test('did we slots: the SQL keeps one rule for answer, tonight, claim and repair', () => {
  const read = (file) => readFileSync(path.join(checkRoot, file), 'utf8').replace(/\r\n/g, '\n')
  const order = read('scripts/apply-all-sql.mjs')
  assert.ok(order.indexOf('we-slots.sql') > order.indexOf('sweep-guards.sql'), 'we-slots.sql comes after the files it redefines')
  assert.ok(!order.includes('we-slot-repair.sql'), 'the repair is run once by hand, not by apply-all')
  const slots = read('supabase/we-slots.sql')
  for (const name of ['we_answer', 'we_tonight', 'we_claim', 'we_resettle', 'we_streaks']) {
    assert.match(slots, new RegExp(`function public\\.${name}\\(`))
  }
  assert.match(slots, /function public\.we_claim[\s\S]*we_streaks\(card, on_night\)/, 'the claim reads the same streak as tonight')
  assert.match(slots, /'streak', c\.my_streak/)
  assert.match(slots, /target <> on_night and target < current_date - 1 and want_status is distinct from 'did'/)
  assert.match(slots, /revoke all on function public\.we_streaks\(uuid, date\) from public, anon, authenticated/)
  const streaks = slots.slice(slots.indexOf('function public.we_streaks'), slots.indexOf('function public.we_resettle'))
  assert.match(streaks, /security definer[\s\S]*set search_path = public/)
  const repair = read('supabase/we-slot-repair.sql').replace(/--.*$/gm, '')
  assert.ok(!/\b(delete\s+from|update|truncate|drop)\s+(table\s+)?public\./i.test(repair), 'the repair only adds rows')
  assert.ok((repair.match(/on conflict do nothing/g) || []).length >= 4, 'every insert in the repair is idempotent')
  assert.ok(!/select public\.we_slot_repair\(\);/.test(repair), 'nothing calls the repair on apply')
  assert.match(repair, /b\.streak < s\.at/, 'only milestones the repair itself reached')
  assert.match(repair, /we_slot_repair_ran[\s\S]*enable row level security/)
})

test('morning ask time: picked time moves the first day nudge, bad values fall back', async () => {
  const { MORNING_AT_TIMES, dayNudges } = await import('../src/lib/day-nudges.js')
  const { readPrefs, writePrefs } = await import('../src/lib/prefs.js')
  assert.equal(MORNING_AT_TIMES[0], '05:00')
  assert.equal(MORNING_AT_TIMES.at(-1), '11:30')
  const book = { id: 'b', lamps: [{ id: 'q', question: 'Stretch', cadence: 'daily' }], answers: [] }
  const now = new Date(2026, 9, 20, 4, 0)
  const first = dayNudges([book], now, { days: 1, times: ['06:30', '13:30'] })[0]
  if (first) assert.equal(`${first.at.getHours()}:${first.at.getMinutes()}`, '6:30')
  assert.equal(readPrefs().morningAt, '08:00')
  writePrefs({ morningAt: '06:30' })
  assert.equal(readPrefs().morningAt, '06:30')
  writePrefs({ morningAt: '13:00' })
  assert.equal(readPrefs().morningAt, '08:00', 'only 5:00 to 11:30 on the half hour')
})

test('over-the-air updates load on a return to the app, only at a safe moment', () => {
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
  const read = (file) => readFileSync(path.join(root, file), 'utf8')
  const ota = read('native/lib/ota-refresh.js')
  assert.match(ota, /HALL_PATHS\.has\(path \|\| '\/'\)/, 'reloads only on Tonight or Home')
  assert.match(ota, /!sheetUp/, 'never under an open sheet')
  assert.match(ota, /Date\.now\(\) - back < FRESH_MS\) reloadIfSafe\(\)/, 'a slow download waits for the next return')
  assert.match(ota, /!__DEV__ && Updates\.isEnabled === true/, 'off in dev builds')
  assert.match(read('native/AppShell.jsx'), /useEffect\(\(\) => startOtaRefresh\(\), \[\]\)/)
})

// A Did we yes once went out with no push and nobody knew (2026-10-20). Every
// table now says how its people hear about a change: the function that queues
// the push, or why it stays quiet. A new table fails here until it is listed.
test('every table says how people hear about it: a push, or why not', () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
  const dir = path.join(root, 'supabase')
  const sql = readdirSync(dir).filter((f) => f.endsWith('.sql')).map((f) => readFileSync(path.join(dir, f), 'utf8')).join('\n').replace(/\r\n/g, '\n')
  const pushes = (fn) => sql.split(`function public.${fn}(`).slice(1).some((body) => body.split('$$;')[0].includes('into public.push_queue'))
  const pushed = {
    sends: 'queue_send_push queue_send_kept_push edit_send',
    friend_links: 'queue_ask_push queue_yes_push',
    we_members: 'queue_we_ask_push queue_we_joined_push',
    we_cards: 'queue_we_closed_push',
    we_answers: 'we_settle',
    we_nudges: 'we_nudge',
    family_members: 'queue_family_joined_push queue_family_left_push',
    profiles: 'queue_invite_used_push',
    app_sends: 'queue_app_send_push',
    did_you_link_claims: 'queue_link_kept_push',
    cheer_gifts: 'send_gift thank_gift',
    check_ons: 'queue_check_ons',
    family_answers: 'queue_family_summaries',
    shop_drop_days: 'queue_drop_pushes',
    report_actions: 'queue_report_removed_push',
  }
  const quiet = {
    'own data, no one else': 'admins answer_keys answer_log app_errors app_flags app_versions cleared_nights coin_night_grants devices gem_purchases iap_tries milestones shelves wake_kick wake_queue friend_notes auto_adds check_on_adds invite_looks we_streak_grants we_done tour_claims',
    'counters, caps and logs': 'check_on_pushed family_code_misses family_miss_days family_summary_sent friend_ask_log friend_id_misses push_queue push_to_counts send_counts we_done_pushed we_slot_repair_ran report_mail_queue shop_drop_sent',
    'catalogs': 'gift_catalog shop_catalog',
    'quiet on purpose: a block, a pass or a leave would tell someone they were dropped': 'blocks send_answers app_send_answers we_turns',
    'shown when opened, no event of its own': 'did_you_links we_links families family_lamps family_tags shared_notes we_notes reports waitlist',
  }
  for (const [table, fns] of Object.entries(pushed)) {
    for (const fn of fns.split(' ')) assert.ok(pushes(fn), `${table}: ${fn} should insert into push_queue`)
  }
  const known = new Set([...Object.keys(pushed), ...Object.values(quiet).flatMap((s) => s.split(' '))])
  const tables = [...new Set([...sql.matchAll(/create table (?:if not exists )?public\.(\w+)/g)].map((m) => m[1]))]
  const missing = tables.filter((t) => !known.has(t))
  assert.deepEqual(missing, [], `new tables need a push or a reason in this test: ${missing.join(', ')}`)
})

test('the Together widget keeps people still going even past 40, and counts everyone', async () => {
  const { buildTogetherWidgetProps } = await import('../src/lib/together-widget.js')
  const people = Array.from({ length: 50 }, (_, i) => ({ id: 'p' + i, name: 'P' + String(i).padStart(2, '0'), doneOn: i < 45 ? '2026-10-21' : null }))
  const props = buildTogetherWidgetProps(people, '2026-10-21')
  assert.equal(props.people.length, 40)
  assert.equal(props.people.filter((p) => !p.done).length, 5, 'all five still going are shown')
  assert.match(props.countLine, /45.*50/)
})

test('money and family SQL tests stay in the repo (run with npm run db:test)', () => {
  for (const name of ['coins-credit', 'delete-refund', 'family-guard']) {
    assert.ok(existsSync(path.join(checkRoot, `supabase/tests/${name}.test.sql`)), name)
  }
  assert.match(readFileSync(path.join(checkRoot, 'supabase/drop-tonight.sql'), 'utf8'), /Gifts waiting for you go back/)
})

test('a paused question stops counting misses from the day it was paused', async () => {
  const { toggleArchive } = await import('../src/lib/board-ops.js')
  const q = { ...lamp('p'), cadence: 'daily', createdOn: '2026-09-01' }
  const answers = Array.from({ length: 20 }, (_, i) => ({ id: 'a' + i, lampId: 'p', periodKey: `2026-10-${String(i + 1).padStart(2, '0')}`, status: 'yes', answeredAt: '2026-10-01T20:00:00.000Z', note: '' }))
  const paused = toggleArchive({ id: 'b', lamps: [q], answers }, q, new Date(2026, 9, 21, 12))
  const pq = paused.lamps[0]
  assert.equal(pq.pausedOn, '2026-10-21')
  const rec = lampRecord(paused, pq, '2026-10-31', 30)
  assert.equal(rec.asked - rec.did, 0, 'days after the pause are not misses')
  assert.equal(toggleArchive(paused, pq).lamps[0].pausedOn, undefined, 'resuming clears it')
  const { normalizeLamp } = await import('../src/lib/board-json.js')
  assert.equal(normalizeLamp(pq).pausedOn, '2026-10-21', 'the pause day survives a reload')
  const weeks = lampWeeks(paused, pq, '2026-11-04', 3)
  assert.equal(weeks.at(-1).due, 0, 'a week after the pause has nothing due')
  assert.equal(lampRecord(paused, pq, '2026-10-31', 30).streak, 20, 'pausing does not end the streak')
  const mq = { ...lamp('mm'), cadence: 'monthly', monthDay: 20, createdOn: '2026-01-01', archived: true, pausedOn: '2026-10-15' }
  const mrec = lampRecord({ id: 'b', lamps: [mq], answers: [] }, mq, '2026-10-31', 1)
  assert.equal(mrec.asked, 0, 'a month paused before its day is not a miss')
})

test('switching to monthly does not turn old daily months into misses', async () => {
  const { recentPeriodKeys } = await import('../src/lib/recurrence.js')
  const q = { ...lamp('m'), cadence: 'monthly', monthDay: 1, createdOn: '2026-03-01', was: [{ until: '2026-10-21', cadence: 'daily', weekdays: [], monthDay: '', everyN: '', everyNAnchor: '' }] }
  assert.deepEqual(recentPeriodKeys(q, '2026-10-21', 7), ['2026-10'])
})

test('the year view keeps the Did days of a question paused later', async () => {
  const { yearMonths } = await import('../src/lib/hall-pages.js')
  const q = { ...lamp('y'), createdOn: '2026-10-01', archived: true, pausedOn: '2026-10-10' }
  const book = { id: 'b', title: 'Home', lamps: [q], answers: [{ id: 'a', lampId: 'y', periodKey: '2026-10-05', status: 'yes', answeredAt: '2026-10-05T20:00:00.000Z', note: '' }] }
  const oct = yearMonths([book], 2026, new Date(2026, 9, 21, 12))[9]
  const day = (iso) => oct.nights.find((n) => n.iso === iso)
  assert.equal(day('2026-10-05').on, true, 'the Did day still shows')
  assert.equal(day('2026-10-12').miss, false, 'unanswered paused days are not misses')
  assert.equal(day('2026-10-06').miss, true, 'a miss before the pause still shows')
  const mq = { ...lamp('mo'), cadence: 'monthly', monthDay: 20, createdOn: '2026-01-01', archived: true, pausedOn: '2026-10-15' }
  const ans = ['2026-08', '2026-09'].map((k) => ({ id: k, lampId: 'mo', periodKey: k, status: 'yes', answeredAt: k + '-20T20:00:00.000Z', note: '' }))
  assert.equal(lampRecord({ id: 'b', lamps: [mq], answers: ans }, mq, '2026-10-31').streak, 2, 'a month paused before its day does not break the streak')
})

test('no date regex lost its backslashes (d{4} where \d{4} was meant)', () => {
  const bad = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(js|jsx|ts|tsx)$/.test(name) && /[\/(|]d\{\d/.test(readFileSync(full, 'utf8'))) bad.push(full)
    }
  }
  for (const dir of ['src', 'native', 'widgets']) walk(path.join(checkRoot, dir))
  assert.deepEqual(bad, [])
})

test('pausing a question does not erase its misses from the overall streak', async () => {
  const { shelfStreak: streakOf } = await import('../src/lib/hall-feel.js')
  const day = (d) => '2026-10-' + String(d).padStart(2, '0')
  const yes = (id, d) => ({ id: id + d, lampId: id, periodKey: day(d), status: 'yes', answeredAt: day(d) + 'T20:00:00.000Z', note: '' })
  const answers = []
  for (let d = 1; d <= 20; d += 1) {
    answers.push(yes('live', d))
    if (d !== 10 && d < 15) answers.push(yes('held', d))
  }
  const book = { id: 'b', title: 'Home', createdOn: day(1), lamps: [{ ...lamp('live'), createdOn: day(1) }, { ...lamp('held'), createdOn: day(1), archived: true, pausedOn: day(15) }], answers }
  assert.equal(streakOf([book], new Date(2026, 9, 20, 21)), 10, 'the miss on the 10th still ends the run')
})

// Keep this last: every test above counts, and any failure exits non-zero.
await Promise.all(pendingTests)
console.log(`\n${ran - failed} of ${ran} passed`)
if (failed) process.exit(1)
