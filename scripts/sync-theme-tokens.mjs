// Verify native/theme.js LOOK_IDS matches look selectors in did-i.css.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { LOOK_IDS } from '../native/palette.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const css = fs.readFileSync(path.join(__dirname, '../src/lib/did-i.css'), 'utf8')
const fromCss = [...css.matchAll(/\.di-hall\[data-look='([^']+)'\]/g)].map((m) => m[1])
const cssLooks = [...new Set(fromCss)].sort()
const nativeLooks = [...LOOK_IDS].sort()

// lime is the default hall; CSS has no data-look selector for it.
const IMPLICIT = new Set(['lime'])
const missingInNative = cssLooks.filter((id) => !nativeLooks.includes(id))
const extraInNative = nativeLooks.filter((id) => !cssLooks.includes(id) && !IMPLICIT.has(id))

if (missingInNative.length || extraInNative.length) {
  console.error('theme drift between did-i.css and native/theme.js')
  if (missingInNative.length) console.error('  missing in theme.js:', missingInNative.join(', '))
  if (extraInNative.length) console.error('  extra in theme.js:', extraInNative.join(', '))
  process.exit(1)
}

console.log(`theme tokens ok: ${nativeLooks.length} looks`)
