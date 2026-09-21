// Keys to translate: npm run locales:missing [--export] [fr de ...]
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { en } from '../src/locales/en.js'
import { es } from '../src/locales/es.js'
import { fr } from '../src/locales/fr.js'
import { de } from '../src/locales/de.js'
import { pt } from '../src/locales/pt.js'
import { it } from '../src/locales/it.js'
import { zh } from '../src/locales/zh.js'
import { ja } from '../src/locales/ja.js'
import { ko } from '../src/locales/ko.js'
import {
  PARTIAL_LOCALES,
  SHIP_LOCALES,
  isLegalKey,
  keysSameAsEn,
  mayMatchEnglish,
} from './locale-shared.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const gapDir = path.join(__dirname, 'locale-gaps')

const packs = { es, fr, de, pt, it, zh, ja, ko }
const args = process.argv.slice(2)
const exportOut = args.includes('--export')
const verbose = args.includes('--verbose') || args.includes('-v')
const withLegal = args.includes('--legal')
const codes = args.filter((a) => !a.startsWith('--'))

function missingFor(code, pack) {
  const ship = SHIP_LOCALES.includes(code)
  let keys = keysSameAsEn(pack, en, { skipLegal: !withLegal, shipOnly: ship })
  if (!withLegal) {
    keys = keys.filter((key) => !isLegalKey(key))
  }
  return keys
}

function gapNeeds(code, key) {
  const gapPath = path.join(gapDir, `${code}.json`)
  if (!fs.existsSync(gapPath)) return true
  const gap = JSON.parse(fs.readFileSync(gapPath, 'utf8'))
  const value = gap[key]
  return value == null || value === en[key]
}

const targets =
  codes.length > 0 ? codes.filter((c) => c in packs) : [...SHIP_LOCALES, ...PARTIAL_LOCALES]

for (const code of targets) {
  const pack = packs[code]
  const missing = missingFor(code, pack)
  const gapOpen = PARTIAL_LOCALES.includes(code)
    ? missing.filter((key) => gapNeeds(code, key))
    : []

  console.log(
    `${code}: ${missing.length} untranslated${gapOpen ? `, ${gapOpen.length} open in locale-gaps` : ''}`,
  )

  if (verbose) {
    for (const key of missing) {
      const gapNote = gapOpen.includes(key) ? ' (gap)' : ''
      console.log(`  ${key}${gapNote}`)
    }
  }

  if (exportOut && missing.length) {
    const out = {}
    for (const key of missing) out[key] = en[key]
    const outPath = path.join(__dirname, `.pass-${code}.json`)
    fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`)
    console.log(`  wrote ${outPath}`)
  }
}
