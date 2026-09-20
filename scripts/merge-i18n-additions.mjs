import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { additionsEn, additionsEs } from './i18n-additions.mjs'
import { legalEn, legalEs } from './legal-i18n.mjs'
import { webEn, webEs } from './web-marketing.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localeDir = path.join(__dirname, '../src/locales')
const gapDir = path.join(__dirname, 'locale-gaps')

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

async function mergePack(code, additions) {
  const mod = await import(`../src/locales/${code}.js?update=${Date.now()}`)
  const existing = mod[code]
  const merged = { ...existing, ...additions }
  const newKeys = Object.keys(additions).filter((key) => !(key in existing))
  const keys = [...Object.keys(existing), ...newKeys]
  const lines = [`export const ${code} = {`]
  for (const key of keys) {
    lines.push(lineFor(key, merged[key]))
  }
  lines.push('}', '')
  fs.writeFileSync(path.join(localeDir, `${code}.js`), lines.join('\n'))
  return merged
}

function updateGap(code, additions) {
  const gapPath = path.join(gapDir, `${code}.json`)
  const gap = fs.existsSync(gapPath) ? JSON.parse(fs.readFileSync(gapPath, 'utf8')) : {}
  let added = 0
  for (const [key, value] of Object.entries(additions)) {
    if (!(key in gap)) {
      gap[key] = value
      added += 1
    }
  }
  if (added) fs.writeFileSync(gapPath, `${JSON.stringify(gap, null, 2)}\n`)
  return added
}

const enPack = await mergePack('en', { ...additionsEn, ...legalEn, ...webEn })
await mergePack('es', { ...additionsEs, ...legalEs, ...webEs })

for (const code of ['fr', 'de', 'pt', 'it', 'zh', 'ja']) {
  const n = updateGap(code, { ...additionsEn, ...legalEn, ...webEn })
  console.log(`gap ${code}: +${n} keys (en placeholder until translated)`)
}

console.log(`en.js: ${Object.keys(enPack).length} keys`)
