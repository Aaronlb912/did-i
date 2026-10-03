// did-i.app/d/CODE (vercel.json rewrites it here): the site's own page, with
// the question and who sent it in the preview tags. Any miss serves the page
// unchanged, so the link still opens.
import { CLIENT_ENV } from '../env.client.js'
import { linkPreviewText, withLinkPreview } from '../src/lib/link-preview.js'

async function lookUp(code, we) {
  const url = process.env.VITE_SUPABASE_URL || CLIENT_ENV.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || CLIENT_ENV.VITE_SUPABASE_ANON_KEY
  const out = await fetch(`${url}/rest/v1/rpc/${we ? 'look_up_we_link' : 'look_up_did_you_link'}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!out.ok) return null
  const rows = await out.json()
  return Array.isArray(rows) ? rows[0] : rows
}

export default async function handler(req, res) {
  const code = String(req.query.code || '').toLowerCase()
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'did-i.app'
  const page = await fetch(`https://${host}/index.html`)
  let html = await page.text()
  if (/^(?:[a-z0-9]{10}|[a-z0-9]{12})$/.test(code)) {
    try {
      const text = linkPreviewText(await lookUp(code, code.length === 12), code.length === 12)
      if (text) html = withLinkPreview(html, { ...text, url: `https://did-i.app/d/${code}` })
    } catch {
      // The plain page still opens the link.
    }
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300')
  res.status(200).send(html)
}
