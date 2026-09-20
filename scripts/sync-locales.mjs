// Merge gap translations into partial locale files. Run after editing
// scripts/locale-gaps/*.json or src/locales/en.js.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { en } from '../src/locales/en.js'
import { fr as frOld } from '../src/locales/fr.js'
import { de as deOld } from '../src/locales/de.js'
import { pt as ptOld } from '../src/locales/pt.js'
import { it as itOld } from '../src/locales/it.js'
import { zh as zhOld } from '../src/locales/zh.js'
import { ja as jaOld } from '../src/locales/ja.js'
import frGap from './locale-gaps/fr.json' with { type: 'json' }
import deGap from './locale-gaps/de.json' with { type: 'json' }
import ptGap from './locale-gaps/pt.json' with { type: 'json' }
import itGap from './locale-gaps/it.json' with { type: 'json' }
import zhGap from './locale-gaps/zh.json' with { type: 'json' }
import jaGap from './locale-gaps/ja.json' with { type: 'json' }

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../src/locales')

const targets = [
  ['fr', frOld, frGap],
  ['de', deOld, deGap],
  ['pt', ptOld, ptGap],
  ['it', itOld, itGap],
  ['zh', zhOld, zhGap],
  ['ja', jaOld, jaGap],
]

function esc(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
}

function lineFor(key, value) {
  const text = String(value)
  if (text.length <= 72 && !text.includes('\n')) {
    return `  '${key}': '${esc(text)}',`
  }
  return `  '${key}':\n    '${esc(text)}',`
}

function writeLocale(code, oldPack, gapPack) {
  const merged = {}
  for (const key of Object.keys(en)) {
    const old = oldPack[key]
    const gap = gapPack[key]
    if (gap != null && (old == null || old === en[key])) merged[key] = gap
    else if (old != null) merged[key] = old
    else merged[key] = en[key]
  }
  const lines = [`export const ${code} = {`]
  for (const key of Object.keys(en)) {
    lines.push(lineFor(key, merged[key]))
  }
  lines.push('}', '')
  fs.writeFileSync(path.join(outDir, `${code}.js`), lines.join('\n'))
  return Object.keys(merged).length
}

for (const [code, oldPack, gapPack] of targets) {
  const n = writeLocale(code, oldPack, gapPack)
  if (n !== Object.keys(en).length) {
    throw new Error(`${code}: expected ${Object.keys(en).length} keys, wrote ${n}`)
  }
  console.log(`${code}.js: ${n} keys`)
}
