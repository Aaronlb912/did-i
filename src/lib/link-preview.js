// The text a message app shows for a did-i.app/d/CODE link. Message apps
// read the page without running it, so api/link-preview.js fills these into
// index.html on the server. English only: the reader's language is unknown.

function esc(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// found: { question, name } from look_up_did_you_link or look_up_we_link.
export function linkPreviewText(found, we) {
  if (!found?.question) return null
  const name = String(found.name || '').trim()
  const title = we
    ? name ? `${name} asked you to join a Did we` : 'Join a Did we'
    : name ? `${name} sent you a Did you` : 'A Did you from Did I'
  return { title, description: String(found.question).trim().slice(0, 200) }
}

export function withLinkPreview(html, { title, description, url }) {
  const set = (attr, key, value) => {
    const tag = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`)
    html = html.replace(tag, (_, a, b) => `${a}${esc(value)}${b}`)
  }
  set('property', 'og:title', title)
  set('name', 'twitter:title', title)
  set('property', 'og:description', description)
  set('name', 'twitter:description', description)
  set('name', 'description', description)
  set('property', 'og:url', url)
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, (_, a, b) => `${a}${esc(url)}${b}`)
}
