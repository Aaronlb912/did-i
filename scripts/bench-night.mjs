// What one render of Tonight costs, against shelves of three sizes.
// Run with: node scripts/bench-night.mjs
//
// The last row is somebody who has used the app daily for a couple of
// years. A phone is several times slower than a laptop, so anything
// past a few milliseconds here is a dropped frame on a phone.

import { shelfHeat } from '../src/lib/hall-feel.js'
import { boardDate, dueTonight, isoDate } from '../src/lib/recurrence.js'

function makeShelf(tags, perTag, nights) {
  const boards = []
  for (let b = 0; b < tags; b += 1) {
    const lamps = []
    const answers = []
    for (let l = 0; l < perTag; l += 1) {
      const id = `di-${b}-${l}`
      lamps.push({
        id,
        question: `question ${l}`,
        short: '',
        kind: 'other',
        cadence: 'daily',
        weekdays: [],
        monthDay: '',
        everyN: '',
        everyNAnchor: '',
        onceOn: '',
        askAfter: '',
        slot: 'whenever',
        notes: '',
        priority: 'normal',
        notify: true,
        archived: false,
        createdOn: '2024-01-01',
      })
      for (let n = 1; n <= nights; n += 1) {
        const day = new Date()
        day.setDate(day.getDate() - n)
        answers.push({
          id: `ans-${b}-${l}-${n}`,
          lampId: id,
          periodKey: isoDate(day),
          status: 'yes',
          answeredAt: `${isoDate(day)}T20:00:00`,
          note: '',
        })
      }
    }
    boards.push({
      id: `board-${b}`,
      title: `Tag ${b}`,
      dayFoldHour: 0,
      lamps,
      answers,
      unlocked: [],
      opens: [],
      archived: false,
      coins: 0,
      gems: 0,
      cheers: ['lime'],
      looks: ['lime'],
    })
  }
  return boards
}

// The median of several rounds, not the average of one. A laptop with a
// dev server and a browser on it swings by a factor of two, and a check
// that fails at random is a check people learn to ignore.
function time(label, fn, rounds = 9, runs = 20) {
  for (let i = 0; i < runs; i += 1) fn()
  const each = []
  for (let round = 0; round < rounds; round += 1) {
    const start = process.hrtime.bigint()
    for (let i = 0; i < runs; i += 1) fn()
    each.push(Number(process.hrtime.bigint() - start) / 1e6 / runs)
  }
  each.sort((a, b) => a - b)
  const middle = each[Math.floor(each.length / 2)]
  console.log(`  ${label.padEnd(26)} ${middle.toFixed(2)} ms`)
  return middle
}

let worst = 0
for (const [tags, perTag, nights] of [
  [1, 6, 30],
  [4, 15, 90],
  [8, 25, 180],
]) {
  const shelf = makeShelf(tags, perTag, nights)
  const questions = tags * perTag
  console.log(`\n${tags} tags, ${questions} questions, ${questions * nights} answers`)
  const now = new Date()
  worst = Math.max(worst, time('streak over the shelf', () => shelfHeat(shelf, now, '')))
  worst = Math.max(
    worst,
    time('tonight over the shelf', () => shelf.forEach((book) => dueTonight(book, now))),
  )
  time('which night it is', () => boardDate(now))
}

console.log(`\nworst single call ${worst.toFixed(2)} ms`)
if (worst > 6) {
  console.error('too slow. something went back to scanning instead of looking up.')
  process.exit(1)
}
