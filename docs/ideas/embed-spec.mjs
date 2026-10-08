// Puts docs/did-i-class-spec.md into the mockup page (between the SPEC
// markers), so the screens and the full spec live in one file.
// Run: node docs/ideas/embed-spec.mjs
import fs from 'node:fs'

const SPEC = new URL('../did-i-class-spec.md', import.meta.url)
const PAGE = new URL('./did-i-class.html', import.meta.url)

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')

function toHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out = []
  let i = 0
  const para = []
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`)
    para.length = 0
  }
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { flush(); i++; continue }
    if (/^---+$/.test(line.trim())) { flush(); out.push('<hr>'); i++; continue }
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      flush()
      const level = Math.min(4, h[1].length + 1)
      const text = h[2]
      const id = 'spec-' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`)
      i++
      continue
    }
    if (line.trim().startsWith('|')) {
      flush()
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++])
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const head = cells(rows[0])
      const body = rows.slice(2).map(cells)
      out.push(`<div class="tw"><table><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</table></div>`)
      continue
    }
    const li = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)
    if (li) {
      flush()
      const ordered = /\d+\./.test(li[2])
      const items = []
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)
        if (m) { items.push(m[3]); i++; continue }
        // A wrapped line continues the item above.
        if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) { items[items.length - 1] += ' ' + lines[i].trim(); i++; continue }
        break
      }
      const tag = ordered ? 'ol' : 'ul'
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`)
      continue
    }
    if (line.startsWith('>')) { flush(); out.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`); i++; continue }
    para.push(line.trim())
    i++
  }
  flush()
  return out.join('\n')
}

const md = fs.readFileSync(SPEC, 'utf8')
const html = toHtml(md)
let page = fs.readFileSync(PAGE, 'utf8')
const block = `<!--SPEC-->\n<section class="sec spec" id="spec">\n<span class="kick">The full spec</span>\n${html}\n</section>\n<!--/SPEC-->`
if (page.includes('<!--SPEC-->')) page = page.replace(/<!--SPEC-->[\s\S]*<!--\/SPEC-->/, block)
else page = page.replace('</div></body></html>', `${block}\n</div></body></html>`)
fs.writeFileSync(PAGE, page)
console.log('spec embedded', html.length, 'chars')
