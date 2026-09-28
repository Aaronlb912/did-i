import { fonts } from './fonts.js'

export { hallColors, LOOK_IDS, radius } from './palette.js'
export { fonts }

// One label style for every section header and field label in the app:
// sentence case, semibold, no mono/uppercase treatment. Replaces three
// slightly different micro-label styles that used to compete on screen.
export const sectionLabel = {
  fontFamily: fonts.ui,
  fontSize: 13,
  fontWeight: '600',
}

// A placeholder needs to read as empty, not as another line of ink. `hex`
// is a 6-digit --di-* token; `alpha` is 0-1.
export function withAlpha(hex, alpha) {
  const value = String(hex).replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
