// Merge scripts/locale-pass/{code}.mjs into locale-gaps/*.json, then sync.
// Legal keys are skipped unless you pass --legal (lawyer review first).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pathToFileURL } from 'url'
import { en } from '../src/locales/en.js'
import { isLegalKey } from './locale-shared.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const passDir = path.join(__dirname, 'locale-pass')
const gapDir = path.join(__dirname, 'locale-gaps')

const args = new Set(process.argv.slice(2))
const withLegal = args.has('--legal')
const codes = process.argv
  .slice(2)
  .filter((a) => !a.startsWith('--'))

async function main() {
  const files = fs.readdirSync(passDir).filter((f) => f.endsWith('.mjs'))
  const targets = codes.length ? codes : files.map((f) => f.replace('.mjs', ''))

  for (const code of targets) {
    const passPath = path.join(passDir, `${code}.mjs`)
    if (!fs.existsSync(passPath)) {
      console.warn(`skip ${code}: no ${passPath}`)
      continue
    }
    const mod = await import(pathToFileURL(passPath).href)
    const pass = mod.pass
    if (!pass) throw new Error(`${code}: missing export pass`)

    const gapPath = path.join(gapDir, `${code}.json`)
    const gap = fs.existsSync(gapPath) ? JSON.parse(fs.readFileSync(gapPath, 'utf8')) : {}
    let touched = 0
    let skippedLegal = 0

    for (const [key, value] of Object.entries(pass)) {
      if (!withLegal && isLegalKey(key)) {
        skippedLegal += 1
        continue
      }
      if (value === en[key]) continue
      gap[key] = value
      touched += 1
    }

    fs.writeFileSync(gapPath, `${JSON.stringify(gap, null, 2)}\n`)
    console.log(`${code}: ${touched} gap keys updated${skippedLegal ? `, ${skippedLegal} legal skipped` : ''}`)
  }

  const { spawnSync } = await import('child_process')
  const sync = spawnSync('node', ['scripts/sync-locales.mjs'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  })
  if (sync.status !== 0) process.exit(sync.status || 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
