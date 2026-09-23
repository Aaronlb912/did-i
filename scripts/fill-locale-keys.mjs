import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { en } from '../src/locales/en.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const codes = ['fr', 'de', 'pt', 'it', 'zh', 'ja', 'ko']

for (const code of codes) {
  const file = path.join(__dirname, `../src/locales/${code}.js`)
  const mod = await import(`../src/locales/${code}.js?update=${Date.now()}`)
  const pack = mod[code]
  const missing = Object.keys(en).filter((k) => !(k in pack))
  if (!missing.length) {
    console.log(code, 'ok')
    continue
  }
  let text = fs.readFileSync(file, 'utf8')
  const lines = missing.map((k) => `  '${k}': ${JSON.stringify(en[k])},`)
  const idx = text.lastIndexOf('};')
  text = `${text.slice(0, idx)}${lines.join('\n')}\n${text.slice(idx)}`
  fs.writeFileSync(file, text)
  console.log(code, 'added', missing.length)
}
