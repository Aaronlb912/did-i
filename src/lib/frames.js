// Card frames: a layer around the card, never instead of a look. Any frame
// works with any look. Still frames cost coins, animated ones cost gems,
// earned ones come from your streak or friends who joined, seasonal ones are free while their
// season is open and kept after. Everyone owns First Light. The drawings
// live in native/components/frames/; this file is the catalog and the rules.
// Prices here must match supabase/shop-catalog.sql (a check keeps them equal).
// A frame with `from: 'YYYY-MM-DD'` stays out of the shop until that day, like
// the rest of a shop drop (docs/shop-drops.md).
import { boardDate } from './recurrence.js'

// The day Did I went live on the App Store, as 'YYYY-MM-DD'. Leave it empty
// until then. The Birthday frame opens each year on that date, for a week,
// starting with the first anniversary.
export const APP_LAUNCH = '2026-10-15'

function addDays(md, n) {
  const d = new Date(Date.UTC(2001, Number(md.slice(0, 2)) - 1, Number(md.slice(3, 5)) + n))
  return d.toISOString().slice(5, 10)
}

const LAUNCH_MD = APP_LAUNCH.length === 10 ? APP_LAUNCH.slice(5, 10) : ''

export const FRAME_KINDS = ['free', 'coin', 'gem', 'earned', 'season']
export const FREE_FRAME = 'first'

const coin = (id, coins, extra = {}) => ({ id, kind: 'coin', price: { coins }, coins, gems: 0, animated: false, season: null, earn: null, ...extra })
const gem = (id, gems, extra = {}) => ({ id, kind: 'gem', price: { gems }, coins: 0, gems, animated: true, season: null, earn: null, ...extra })
const earned = (id, earn, need, extra = {}) => ({ id, kind: 'earned', price: null, coins: 0, gems: 0, animated: id !== 'vine', season: null, earn, need, ...extra })
const season = (id, from, until, extra = {}) => ({ id, kind: 'season', price: null, coins: 0, gems: 0, animated: true, season: { from, until }, earn: null, ...extra })

const RAW = [
  { id: 'first', kind: 'free', price: null, coins: 0, gems: 0, animated: false, season: null, earn: null },
  coin('thin', 30),
  coin('double', 40),
  coin('dotted', 40),
  coin('washi', 60),
  coin('pixel', 50),
  coin('stitch', 70),
  coin('polaroid', 80),
  coin('wood', 80),
  coin('flowers', 80),
  coin('comic', 90),
  coin('moon', 100),
  coin('filigree', 120),
  coin('deco', 120),
  coin('marble', 120),
  gem('glow', 3),
  gem('silver', 3),
  gem('neon', 3),
  gem('fireflies', 3),
  gem('shoot', 3),
  gem('glass', 3),
  gem('gold', 3),
  gem('const', 3),
  gem('ring', 3),
  gem('aurora', 3),
  earned('vine', 'streak', 3),
  earned('ember', 'streak', 30),
  earned('gems', 'streak', 7),
  earned('frost', 'freeze', 1),
  // The server gives it at 20 friends joined (claim_invites); never sold.
  earned('bloom', 'refer', 20),
  coin('ticket', 80),
  coin('notebook', 60),
  coin('postage', 90),
  coin('bamboo', 80),
  coin('chalk', 70),
  coin('quilt', 120),
  coin('rope', 90),
  // Living gem frames (2026-10-07): each reacts to tonight, the swipe, the
  // streak or the evening (native/components/frames/art-living.jsx).
  gem('street', 3),
  gem('lights', 3),
  gem('train', 3),
  gem('garden', 3),
  gem('dusk', 3),
  gem('globe', 3),
  gem('doodle', 3),
  gem('swipe', 3),
  // From the frame bank (docs/ideas/frames-bank.html), 2026-10-07.
  gem('galaxy', 3),
  gem('neonheart', 3),
  gem('storm', 3),
  earned('royal', 'streak', 100),
  earned('wrapped', 'gifts', 10),
  season('hearts', '02-01', '02-14'),
  season('clover', '03-10', '03-20', { animated: false }),
  season('fireworks', '12-31', '01-02', { also: { from: '07-01', until: '07-07' } }),
  season('sunny', '06-21', '07-31'),
  season('web', '10-01', '10-31'),
  season('leaves', '11-01', '11-30'),
  season('snow', '12-01', '12-31'),
  season('sakura', '03-15', '04-15'),
  // Drop 2026-11-06.
  coin('fullhouse', 110, { from: '2026-11-06' }),
  gem('orchard', 3, { from: '2026-11-06' }),
  earned('hundred', 'streak', 100, { from: '2026-11-06' }),
  // Drop 2026-11-20.
  coin('linked', 90, { from: '2026-11-20' }),
  gem('bedtime', 3, { from: '2026-11-20' }),
  season('countdown', '12-01', '12-24', { from: '2026-11-20' }),
  // Drop 2026-12-04.
  coin('knit', 100, { from: '2026-12-04' }),
  gem('window', 3, { from: '2026-12-04' }),
  earned('candles', 'streak', 14, { from: '2026-12-04' }),
  // Drop 2026-12-18.
  coin('ginger', 110, { from: '2026-12-18' }),
  gem('snowman', 3, { from: '2026-12-18' }),
  season('solstice', '12-20', '12-22', { from: '2026-12-18' }),
  // Drop 2027-01-01.
  coin('mosaic', 120, { from: '2027-01-01' }),
  gem('domino', 3, { from: '2027-01-01' }),
  season('fresh', '01-01', '01-07', { from: '2027-01-01' }),
  // Drop 2027-01-15.
  coin('origami', 90, { from: '2027-01-15' }),
  gem('aquarium', 3, { from: '2027-01-15' }),
  earned('books', 'streak', 21, { from: '2027-01-15' }),
  // Drop 2027-01-29.
  coin('lace', 90, { from: '2027-01-29' }),
  gem('boats', 3, { from: '2027-01-29' }),
  season('thaw', '02-20', '03-05', { from: '2027-01-29' }),
  // Did I's birthday: hidden until APP_LAUNCH is set.
  LAUNCH_MD ? season('bday', LAUNCH_MD, addDays(LAUNCH_MD, 6), { firstYear: Number(APP_LAUNCH.slice(0, 4)) + 1 }) : season('bday', '01-01', '01-01', { hidden: true }),
]

// Every gem frame costs 3; these four are the showpieces.
const LEGENDARY = new Set(['gold', 'const', 'ring', 'aurora'])

export function frameRarity(frame) {
  if (!frame) return ''
  if (frame.kind === 'coin') return frame.coins >= 80 ? 'rare' : 'common'
  if (frame.kind === 'gem') return LEGENDARY.has(frame.id) ? 'legendary' : 'epic'
  if (frame.kind === 'earned') return 'earned'
  if (frame.kind === 'season') return 'seasonal'
  return 'free'
}

export const FRAMES = RAW.map((frame) => ({ ...frame, rarity: frameRarity(frame) }))
export const FRAME_IDS = new Set(FRAMES.map((frame) => frame.id))
const BY_ID = new Map(FRAMES.map((frame) => [frame.id, frame]))

export function frameById(id) {
  return BY_ID.get(String(id || '')) || null
}

// What the shop lists: everything but hidden ones.
export const SHOWN_FRAMES = FRAMES.filter((frame) => !frame.hidden)

// Out once its drop day has come.
export function frameLive(frame, today = boardDate(new Date())) {
  return Boolean(frame) && (!frame.from || frame.from <= today)
}

// SHOWN_FRAMES that are out today.
export function shownFrames(today) {
  return SHOWN_FRAMES.filter((frame) => frameLive(frame, today))
}

export function frameText(id, field) {
  return `frame.${id}.${field}`
}

function monthDay(today) {
  return String(today || '').slice(5, 10)
}

// Open from `from` to `until`, both days included. A window that wraps the
// new year (from > until) is open at either end.
function inWindow(win, md) {
  if (win.from <= win.until) return md >= win.from && md <= win.until
  return md >= win.from || md <= win.until
}

// A frame may have a second window (`also`), e.g. fireworks at New Year and in July.
export function seasonOpen(frame, today) {
  const win = frame?.season
  if (!win || frame.hidden) return false
  if (frame.firstYear && Number(String(today).slice(0, 4)) < frame.firstYear) return false
  const md = monthDay(today)
  if (!/^\d{2}-\d{2}$/.test(md)) return false
  return inWindow(win, md) || Boolean(frame.also && inWindow(frame.also, md))
}

// The next day a season opens, today or later, as YYYY-MM-DD.
export function seasonNextText(frame, today) {
  const win = frame?.season
  if (!win) return ''
  if (seasonOpen(frame, today)) return String(today).slice(0, 10)
  const year = Number(String(today).slice(0, 4)) || new Date().getFullYear()
  const md = monthDay(today)
  const next = (from) => (md < from ? `${year}-${from}` : `${year + 1}-${from}`)
  const a = next(win.from)
  if (!frame.also) return a
  const b = next(frame.also.from)
  return a < b ? a : b
}

// Only coin and gem frames are ever sold, and only from their drop day.
export function frameForSale(id, today) {
  const frame = frameById(id)
  return Boolean(frame && (frame.kind === 'coin' || frame.kind === 'gem') && frameLive(frame, today))
}

export function isSoldFrame(id) {
  return frameForSale(id)
}

// Earned now, from what the shelf shows tonight.
export function frameEarned(frame, ctx = {}) {
  if (!frame || frame.kind !== 'earned') return false
  if (frame.earn === 'streak') return (Number(ctx.bestStreak) || 0) >= frame.need
  if (frame.earn === 'freeze') return Boolean(ctx.everFrozen)
  if (frame.earn === 'gifts') return (Number(ctx.giftsSent) || 0) >= frame.need
  // 'refer' is never earned here: claim_invites puts it on the owned list.
  return false
}

// "12 of 30" for a frame that is not earned yet.
export function frameProgress(frame, ctx = {}) {
  if (!frame || frame.kind !== 'earned') return null
  if (frame.earn === 'streak') {
    // Counts the streak you are on (the one So far shows); the best run only decides earned.
    const run = ctx.streak ?? ctx.bestStreak
    return { n: Math.min(frame.need, Math.max(0, Number(run) || 0)), of: frame.need }
  }
  if (frame.earn === 'refer') return { n: Math.min(frame.need, Math.max(0, Number(ctx.joined) || 0)), of: frame.need }
  if (frame.earn === 'gifts') return { n: Math.min(frame.need, Math.max(0, Number(ctx.giftsSent) || 0)), of: frame.need }
  return { n: ctx.everFrozen ? 1 : 0, of: 1 }
}

// Kept ids: bought (coin, gem), earned once and kept, or a seasonal one
// claimed. A seasonal id stays forever once it is in the list.
export function normalizeFrames(list) {
  if (!Array.isArray(list)) return []
  return [...new Set(list.map((id) => String(id)).filter((id) => FRAME_IDS.has(id) && id !== FREE_FRAME))]
}

export function framesOwned(purse, ctx = {}) {
  const owned = new Set([FREE_FRAME, ...normalizeFrames(purse?.frames)])
  for (const frame of FRAMES) {
    if (frameEarned(frame, ctx)) owned.add(frame.id)
  }
  return owned
}

// The worn id, or '' for no frame. Only an id you own counts.
export function wornFrame(purse, ctx = {}) {
  const id = String(purse?.frame || '')
  if (!id || !FRAME_IDS.has(id)) return ''
  return framesOwned(purse, ctx).has(id) ? id : ''
}

// What `frame` keeps after a normalize: a known id in the owned list (or the
// free one, or an earned one already stored). Earned-by-streak ids that were
// never stored stay worn only while they are earned (wornFrame checks).
export function normalizeWornFrame(raw, frames) {
  const id = String(raw || '')
  if (!id || !FRAME_IDS.has(id)) return ''
  if (id === FREE_FRAME || frames.includes(id)) return id
  if (frameById(id)?.kind === 'earned') return id
  return ''
}

// Earned frames not in the list yet: store them so they stay after a streak ends.
export function framesToKeep(purse, ctx = {}) {
  const have = new Set(normalizeFrames(purse?.frames))
  return FRAMES.filter((frame) => frameEarned(frame, ctx) && !have.has(frame.id)).map((frame) => frame.id)
}

export function keepEarnedFrames(book, ctx = {}) {
  const add = framesToKeep(book, ctx)
  if (!add.length) return book
  return { ...book, frames: normalizeFrames([...(book?.frames || []), ...add]) }
}

const FRAMES_TOASTED_KEY = 'did-i-frames-toasted'

/**
 * Earned frames to announce: the ones `after` gained over `before` that this
 * device has not shown yet. `seen` null is the first run: nothing old is
 * shown, only what was gained just now.
 */
export function framesToAnnounce(before, after, seen) {
  const had = new Set(normalizeFrames(before))
  const shown = new Set(Array.isArray(seen) ? seen : [])
  return normalizeFrames(after).filter((id) => !had.has(id) && !shown.has(id) && frameById(id)?.kind === 'earned')
}

/** framesToAnnounce with this device's list, which then holds every earned frame in `after`. */
export function takeFramesToAnnounce(before, after) {
  try {
    const raw = localStorage.getItem(FRAMES_TOASTED_KEY)
    const seen = raw == null ? null : JSON.parse(raw)
    const fresh = framesToAnnounce(before, after, seen)
    const all = new Set([...(Array.isArray(seen) ? seen : []), ...normalizeFrames(after).filter((id) => frameById(id)?.kind === 'earned')])
    localStorage.setItem(FRAMES_TOASTED_KEY, JSON.stringify([...all]))
    return fresh
  } catch {
    return []
  }
}

// A free claim while the season is open. Kept after.
export function claimFrame(book, id, today) {
  const frame = frameById(id)
  const frames = normalizeFrames(book?.frames)
  if (!frame || frame.kind !== 'season') return { book, miss: 'shop.miss.buyFail' }
  if (frames.includes(id)) return { book: { ...book, frames, frame: id }, miss: '' }
  if (!seasonOpen(frame, today) || !frameLive(frame, today)) return { book, miss: 'frames.miss.closed' }
  return { book: { ...book, frames: [...frames, id], frame: id }, miss: '' }
}

// Puts a frame on, or takes it off when it is already on. '' is no frame.
export function wearFrame(book, id, ctx = {}) {
  const want = String(id || '')
  if (!want) return { book: { ...book, frame: '' }, miss: '' }
  if (!framesOwned(book, ctx).has(want)) return { book, miss: 'frames.miss.notOwned' }
  const on = String(book?.frame || '') === want
  return { book: { ...book, frame: on ? '' : want }, miss: '' }
}

// Signed out: coins or gems come off this phone. Signed in, coin-shop.js
// asks the server first.
export function buyFrameLocal(book, id) {
  const frame = frameById(id)
  const frames = normalizeFrames(book?.frames)
  if (!frame || !frameForSale(id)) return { book, miss: 'frames.miss.notSold' }
  if (frames.includes(id)) return { book: { ...book, frames, frame: id }, miss: '' }
  const coins = Math.max(0, Math.floor(Number(book?.coins) || 0))
  const gems = Math.max(0, Math.floor(Number(book?.gems) || 0))
  if (frame.coins && coins < frame.coins) return { book, miss: 'shop.miss.needCoins', missN: frame.coins }
  if (frame.gems && gems < frame.gems) return { book, miss: 'shop.miss.needGems', missN: frame.gems }
  return {
    book: { ...book, coins: coins - frame.coins, gems: gems - frame.gems, frames: [...frames, id], frame: id },
    miss: '',
  }
}

// Server lists replace only the frames of their own currency.
export function withServerFrames(frames, kind, serverIds) {
  const keep = normalizeFrames(frames).filter((id) => frameById(id)?.kind !== kind)
  const from = normalizeFrames(serverIds).filter((id) => frameById(id)?.kind === kind)
  return [...new Set([...keep, ...from])]
}
