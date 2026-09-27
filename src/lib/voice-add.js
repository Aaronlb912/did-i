// Words from a voice assistant ("Hey Google, create lock the back door in
// Did I") arrive through didi://add?q=... and prefill the Add screen once.

const FILLER = /^(please\s+)?((add|create|make|new)\s+)?((a|the)\s+)?((did i|question|reminder)\s*[:,-]?\s+)?/i

export function spokenQuestion(raw) {
  let text = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
  text = text.replace(FILLER, '')
  text = text.replace(/^did i\s+/i, '')
  text = text.replace(/[?.!\s]+$/, '').trim()
  return text.slice(0, 110)
}

let held = ''

export function holdSpoken(raw) {
  held = spokenQuestion(raw)
}

export function takeSpoken() {
  const out = held
  held = ''
  return out
}
