// Run: npx vite --port 48760 (with VITE_WEB_APP_PUBLIC=true), then node scripts/store-shots/capture.mjs, then compose.mjs.
// Captures web-app screens with sample data for the store screenshots.
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
const OUT = fileURLToPath(new URL('./raw/', import.meta.url))
const BASE = 'http://127.0.0.1:48760/app'

const day = (back) => {
  // Today's date, so tonight's sample answers count on the day the shots are taken.
  const now = new Date()
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - back))
  return d.toISOString().slice(0, 10)
}
const lamps = [
  ['l-meds', 'Did I take my meds?', 'Health'],
  ['l-water', 'Did I drink enough water?', 'Health'],
  ['l-text', 'Did I text them back?', 'People'],
  ['l-skin', 'Did I do my skincare?', 'Health'],
  ['l-bill', 'Did I pay the bill?', 'Money'],
  ['l-charge', 'Did I charge my phone?', 'Home'],
].map(([id, question, kind]) => ({ id, question, kind, cadence: 'daily', archived: false, createdOn: '2026-09-01' }))
const answers = []
for (let back = 1; back <= 12; back++) for (const l of lamps) answers.push({ id: `a-${l.id}-${back}`, lampId: l.id, periodKey: day(back), status: 'yes', answeredAt: day(back) + 'T21:30:00.000Z', note: '' })
for (const id of ['l-meds', 'l-water']) answers.push({ id: `a-${id}-0`, lampId: id, periodKey: day(0), status: 'yes', answeredAt: day(0) + 'T20:10:00.000Z', note: '' })
const book = { id: 'board-shots', title: 'Home', lamps, answers, coins: 42, gems: 6, looks: ['lime'], lookOn: 'lime', buddies: ['owl'], buddyOn: 'owl' }

const seed = ({ shelf, prefs }) => {
  localStorage.setItem('did-i-auth-skip', '1')
  localStorage.setItem('did-i-shelf', JSON.stringify(shelf))
  localStorage.setItem('did-i-prefs', JSON.stringify(prefs))
}
const prefs = { theme: 'dark', locale: 'en', swipeIntroSeen: true, jewelKeySeen: true, openingSeen: true, diagnosticsAsked: true }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: 'dark', isMobile: true, hasTouch: true })
await ctx.addInitScript(seed, { shelf: { boards: [book] }, prefs })
const page = await ctx.newPage()
// Achievement toasts are real, but they cover the screen in a store shot.
const dismiss = async () => {
  for (let i = 0; i < 3; i++) {
    const ok = page.getByRole('button', { name: 'Ok', exact: true })
    if (!(await ok.count())) break
    await ok.first().click()
    await page.waitForTimeout(400)
  }
}
page.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 200)))
for (const route of (process.argv[2] || '/tonight,/lamps,/streaks,/calendar,/shop,/people,/family').split(',')) {
  await page.goto(`${BASE}#${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await dismiss()
  const name = route.replace(/\//g, '_') || 'root'
  await page.screenshot({ path: `${OUT}raw${name}.png` })
  console.log('shot', route)
}
// Mid-swipe: hold the card partway right, before the Did lands.
await page.goto(BASE + '#/tonight', { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await dismiss()
const box = await page.locator('text=Did I text them back?').first().boundingBox()
const x = box.x + box.width / 2
const y = box.y + box.height / 2
await page.mouse.move(x, y)
await page.mouse.down()
for (let i = 1; i <= 10; i++) { await page.mouse.move(x + i * 9, y + i * 0.6); await page.waitForTimeout(16) }
await page.waitForTimeout(250)
await page.screenshot({ path: OUT + 'raw_swipe.png' })
await page.mouse.move(x, y)
await page.mouse.up()
console.log('shot swipe')
await browser.close()
