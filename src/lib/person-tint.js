// A stable color per person: a hash of their id picks one of the theme's
// person1..person6 tokens, so the same friend is the same color everywhere.
export const PERSON_TINTS = 6

export function personTintIndex(id) {
  const text = String(id || '')
  let hash = 0
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0
  return (Math.abs(hash) % PERSON_TINTS) + 1
}

export function personTint(colors, id) {
  return colors?.[`person${personTintIndex(id)}`] || colors?.we || colors?.on
}
