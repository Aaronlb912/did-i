// Which section Edit opens with, set just before going there ("Ask less often" opens When).
let next = ''

export function openEditAt(id) {
  next = id
}

export function takeEditFold() {
  const id = next
  next = ''
  return id
}
