// Strings still in English in each language (the app would show English).
//   npm run locales:report            counts
//   npm run locales:report -- -v      lists the keys
//   npm run locales:report -- --save  rewrites scripts/locale-english.json, the
//                                     list npm test allows to stay English
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
import { englishLeft } from './locale-shared.mjs'

const packs = { es, fr, de, pt, it, zh, ja, ko }
const enKeys = Object.keys(en)
const args = new Set(process.argv.slice(2))
const verbose = args.has('--verbose') || args.has('-v')
const save = args.has('--save')
const listed = {}

for (const [code, pack] of Object.entries(packs)) {
  const same = englishLeft(pack, en)
  listed[code] = same
  console.log(`${code}: ${same.length} / ${enKeys.length} still English`)
  if (verbose) for (const key of same) console.log(`  ${key}`)
}

if (save) {
  const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'locale-english.json')
  fs.writeFileSync(out, `${JSON.stringify(listed, null, 2)}\n`)
  console.log(`wrote ${path.relative(process.cwd(), out)}`)
}
