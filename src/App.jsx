import { useEffect, useState } from 'react'
import { Tonight, normalizeBook, sampleBoard } from './lib/index.js'

const STORAGE_KEY = 'did-i-board'

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return normalizeBook(JSON.parse(raw))
    return normalizeBook(sampleBoard())
  } catch {
    return normalizeBook(sampleBoard())
  }
}

function writeStored(book) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(book))
  } catch {
    // Demo still runs if storage is blocked.
  }
}

export default function App() {
  const [book, setBook] = useState(readStored)

  useEffect(() => {
    writeStored(book)
  }, [book])

  function change(next) {
    setBook(normalizeBook(next))
  }

  return (
    <Tonight
      value={book}
      onChange={change}
      onResetSample={() => change(sampleBoard())}
    />
  )
}
