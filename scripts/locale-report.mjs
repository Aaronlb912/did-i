// Keys still identical to English (runtime would show English).
import { en } from '../src/locales/en.js'
import { es } from '../src/locales/es.js'
import { fr } from '../src/locales/fr.js'
import { de } from '../src/locales/de.js'
import { pt } from '../src/locales/pt.js'
import { it } from '../src/locales/it.js'
import { zh } from '../src/locales/zh.js'
import { ja } from '../src/locales/ja.js'
import { ko } from '../src/locales/ko.js'
import { keysSameAsEn, SHIP_LOCALES } from './locale-shared.mjs'

const packs = { es, fr, de, pt, it, zh, ja, ko }
const enKeys = Object.keys(en)

const args = new Set(process.argv.slice(2))
const verbose = args.has('--verbose') || args.has('-v')
const legal = args.has('--legal')

for (const [code, pack] of Object.entries(packs)) {
  const ship = SHIP_LOCALES.includes(code)
  let same = keysSameAsEn(pack, en, { skipLegal: !legal, shipOnly: ship })
  console.log(
    `${code}: ${same.length} / ${enKeys.length} same as English${ship ? ' (ship gaps)' : ''}`,
  )
  if (verbose && same.length) {
    for (const key of same) console.log(`  ${key}`)
  }
}
