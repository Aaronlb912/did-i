// Two phones, one account. Run: node scripts/check-merge.mjs
import { mergeShelves } from '../src/lib/shelf-merge.js'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}

let bad = 0
function ok(label, got, want) {
  const pass = JSON.stringify(got) === JSON.stringify(want)
  if (!pass) bad += 1
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${label}${pass ? '' : `\n     got ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`}`)
}

const lampA = { id: 'di-a', question: 'Did I lock the back door?', cadence: 'daily', createdOn: '2026-09-01' }
const lampB = { id: 'di-b', question: 'Did I take the pills?', cadence: 'daily', createdOn: '2026-09-02' }

const phoneOne = {
  currentId: 'board-1',
  boards: [
    {
      id: 'board-1',
      title: 'House',
      keeperName: 'Aaron',
      lamps: [lampA],
      answers: [{ id: 'ans-1', lampId: 'di-a', periodKey: '2026-09-18', status: 'yes', answeredAt: '2026-09-18T21:00:00' }],
      coins: 20,
      gems: 4,
      cheers: ['lime', 'tape'],
      looks: ['lime'],
    },
  ],
}

const phoneTwo = {
  currentId: 'board-1',
  boards: [
    {
      id: 'board-1',
      title: 'Casa',
      keeperName: 'A',
      lamps: [lampB],
      answers: [{ id: 'ans-2', lampId: 'di-b', periodKey: '2026-09-17', status: 'yes', answeredAt: '2026-09-17T20:00:00' }],
      coins: 8,
      gems: 1,
      cheers: ['lime', 'paper'],
      looks: ['lime', 'brass'],
    },
  ],
}

const merged = mergeShelves(phoneOne, phoneTwo, '2026-09-19T10:00:00Z', '2026-09-18T10:00:00Z')
const book = merged.boards[0]

ok('both questions survive', book.lamps.map((l) => l.id).sort(), ['di-a', 'di-b'])
ok('both answers survive', book.answers.length, 2)
ok('newer phone names the tag', book.title, 'House')
ok('coins keep the higher count', book.coins, 20)
ok('gems keep the higher count', book.gems, 4)
ok('cheers combine', book.cheers.sort(), ['lime', 'paper', 'tape'])
ok('looks combine', book.looks.sort(), ['brass', 'lime'])

// Same night answered two ways. The later tap wins.
const clash = mergeShelves(
  {
    currentId: 'board-1',
    boards: [{ id: 'board-1', title: 'House', lamps: [lampA], answers: [{ id: 'x', lampId: 'di-a', periodKey: '2026-09-18', status: 'skip', answeredAt: '2026-09-18T19:00:00' }] }],
  },
  {
    currentId: 'board-1',
    boards: [{ id: 'board-1', title: 'House', lamps: [lampA], answers: [{ id: 'y', lampId: 'di-a', periodKey: '2026-09-18', status: 'yes', answeredAt: '2026-09-18T22:30:00' }] }],
  },
  '2026-09-19T10:00:00Z',
  '2026-09-18T10:00:00Z',
)
ok('later tap wins the night', clash.boards[0].answers[0].status, 'yes')
ok('one answer per night', clash.boards[0].answers.length, 1)

// A fresh phone signing in should just take the account.
const fresh = mergeShelves({ currentId: '', boards: [] }, phoneTwo, '', '2026-09-18T10:00:00Z')
ok('empty phone takes the account', fresh.boards[0].lamps.length, 1)

// No account yet. Keep what is on the phone.
const solo = mergeShelves(phoneOne, null, '2026-09-19T10:00:00Z', '')
ok('no account keeps the phone', solo.boards[0].lamps.length, 1)

console.log(bad ? `\n${bad} failed` : '\nall good')
process.exit(bad ? 1 : 0)
