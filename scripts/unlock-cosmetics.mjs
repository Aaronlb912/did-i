// Admin: unlock all shop cosmetics on an account shelf.
// Usage: node scripts/unlock-cosmetics.mjs aaronlb59@gmail.com

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { ACHIEVEMENTS } from '../src/lib/achievements.js'
import { normalizeShelf } from '../src/lib/board-shelf.js'
import { emptyBoard } from '../src/lib/board-json.js'
import {
  BUDDIES,
  CHEERS,
  CHEER_STAGE_MAX,
  LOOKS,
  alignShelfPurse,
  stampPurse,
} from '../src/lib/purse.js'

function loadEnvLocal() {
  const path = resolve('.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue
    const cut = line.indexOf('=')
    const key = line.slice(0, cut).trim()
    const val = line.slice(cut + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}

async function query(sql) {
  const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SB_PAT
  const ref =
    process.env.SUPABASE_PROJECT_REF ||
    (process.env.VITE_SUPABASE_URL || '').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ||
    'lsvvxslgizihbktqoybt'
  if (!token) throw new Error('Set SUPABASE_ACCESS_TOKEN in .env.local')
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 2000)}`)
  return text ? JSON.parse(text) : []
}

export function unlockCosmeticsShelf(raw) {
  const lookIds = LOOKS.map((item) => item.id)
  const cheerIds = CHEERS.map((item) => item.id)
  const buddyIds = BUDDIES.map((item) => item.id)
  const cheerStages = Object.fromEntries(cheerIds.map((id) => [id, CHEER_STAGE_MAX]))
  const cheerPlayStages = Object.fromEntries(cheerIds.map((id) => [id, CHEER_STAGE_MAX]))
  const marks = ACHIEVEMENTS.map((item) => item.id)
  const purse = {
    coins: 9999,
    gems: 999,
    looks: lookIds,
    cheers: cheerIds,
    buddies: buddyIds,
    cheerStages,
    cheerPlayStages,
    cheerStage: CHEER_STAGE_MAX,
    cheerUses: 999,
  }
  const shelf = normalizeShelf(raw || {})
  const boards = shelf.boards?.length ? shelf.boards : [emptyBoard()]
  const next = {
    ...shelf,
    boards: boards.map((book) =>
      stampPurse({ ...book, unlocked: marks }, purse),
    ),
  }
  return alignShelfPurse(next)
}

loadEnvLocal()

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/unlock-cosmetics.mjs <email>')
  process.exit(1)
}

const safe = email.replace(/'/g, "''")
const rows = await query(`
  select u.id, s.doc
  from auth.users u
  left join public.shelves s on s.user_id = u.id
  where lower(u.email) = lower('${safe}')
`)
if (!rows.length) {
  console.error('user not found')
  process.exit(1)
}

const userId = rows[0].id
const unlocked = unlockCosmeticsShelf(rows[0].doc || { boards: [] })
const text = JSON.stringify(unlocked).replace(/'/g, "''")

await query(`
  insert into public.shelves (user_id, doc, saved_at, updated_at)
  values ('${userId}', '${text}'::jsonb, now(), now())
  on conflict (user_id) do update
  set doc = excluded.doc, saved_at = now(), updated_at = now();
`)

const purse = unlocked
console.log(
  JSON.stringify({
    userId,
    email,
    looks: purse.looks?.length || 0,
    cheers: purse.cheers?.length || 0,
    buddies: purse.buddies?.length || 0,
    coins: purse.coins,
    gems: purse.gems,
    boards: unlocked.boards?.length || 0,
  }),
)
