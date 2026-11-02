// The look and buddy a shelf is wearing, falling back to the defaults.
export function activeLook(book) {
  if (!book) return 'lime'
  const looks = Array.isArray(book.looks) ? book.looks : ['lime']
  const pick = String(book.lookOn || 'lime')
  return looks.includes(pick) ? pick : 'lime'
}

export function activeBuddy(book) {
  if (!book) return ''
  const buddies = Array.isArray(book.buddies) ? book.buddies : []
  const pick = String(book.buddyOn || '')
  return buddies.includes(pick) ? pick : ''
}
