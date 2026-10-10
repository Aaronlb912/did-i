// did-i.app/d/CODE (vercel.json rewrites it here): the site's own page, with
// the question and who sent it in the preview tags. Any miss serves the page
// unchanged, so the link still opens.
import { CLIENT_ENV } from '../env.client.js'
import { endedPreviewText, linkPreviewText, previewLang, withLinkPreview } from '../src/lib/link-preview.js'

async function rpc(name, code) {
  const url = process.env.VITE_SUPABASE_URL || CLIENT_ENV.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || CLIENT_ENV.VITE_SUPABASE_ANON_KEY
  const out = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!out.ok) return null
  const rows = await out.json()
  return Array.isArray(rows) ? rows[0] : rows
}

const lookUp = (code, we) => rpc(we ? 'look_up_we_link' : 'look_up_did_you_link', code)

export default async function handler(req, res) {
  const code = String(req.query.code || '').toLowerCase()
  // Never the request's own Host header: anyone can set it. Production reads
  // did-i.app; a preview deployment reads its own Vercel address.
  const origin =
    process.env.VERCEL_ENV === 'production' || !process.env.VERCEL_URL
      ? 'https://did-i.app'
      : `https://${process.env.VERCEL_URL}`
  let html = ''
  try {
    const page = await fetch(`${origin}/index.html`)
    if (page.ok) html = await page.text()
  } catch {
    // Handled below.
  }
  if (!html) {
    // No page to fill in. Not cached, so the next try gets the real page.
    res.setHeader('Cache-Control', 'no-store')
    res.status(502).send('Could not load this link. Try again in a moment.')
    return
  }
  const lang = previewLang(req.headers?.['accept-language'])
  if (/^(?:[a-z0-9]{10}|[a-z0-9]{12})$/.test(code)) {
    try {
      const we = code.length === 12
      let text = linkPreviewText(await lookUp(code, we), we, lang)
      // A Did you link its maker ended says so.
      if (!text && !we && (await rpc('did_you_link_stopped', code)) === true) text = endedPreviewText(lang)
      if (text) html = withLinkPreview(html, { ...text, url: `https://did-i.app/d/${code}` })
    } catch {
      // The plain page still opens the link.
    }
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300')
  // One cached copy per language.
  res.setHeader('Vary', 'Accept-Language')
  res.setHeader('Content-Language', lang)
  res.status(200).send(html)
}
