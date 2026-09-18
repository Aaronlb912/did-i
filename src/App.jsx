import { useEffect, useState } from 'react'
import { Tonight, emptyBoard, normalizeBook, sampleBoard } from './lib/index.js'
import { unlockAchievements } from './lib/achievements.js'
import { Door } from './site/Door.jsx'
import { Into } from './site/Into.jsx'
import { NameBoard } from './site/NameBoard.jsx'
import { Read } from './site/Read.jsx'
import { goHash, readHash } from './site/hash.js'
import { closeSession, openSession, readSession } from './site/session.js'
import './lib/did-i.css'
import './site/site.css'

const STORAGE_KEY = 'did-i-board'
const KNOWN = new Set(['', '#', '#/', '#/name', '#/read', '#/tonight', '#/into'])

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return unlockAchievements(normalizeBook(JSON.parse(raw)), new Date())
  } catch {
    // ignore junk
  }
  return null
}

function writeStored(book) {
  try {
    if (!book) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(book))
  } catch {
    // Demo still runs if storage is blocked.
  }
}

function usePath() {
  const [path, setPath] = useState(readHash)

  useEffect(() => {
    function onHash() {
      if (!KNOWN.has(window.location.hash) && window.location.hash) {
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}#/`,
        )
      }
      setPath(readHash())
    }
    window.addEventListener('hashchange', onHash)
    onHash()
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return path
}

export default function App() {
  const [book, setBook] = useState(readStored)
  const [session, setSession] = useState(() => readSession().open)
  const path = usePath()
  const hasBoard = Boolean(book && book.lamps && (book.lamps.length || book.title))
  const view = path === '/tonight' && !session ? '/name' : path

  function change(next) {
    const normalized = unlockAchievements(normalizeBook(next), new Date())
    setBook(normalized)
    writeStored(normalized)
  }

  function enter() {
    openSession()
    setSession(true)
    goHash('/tonight')
  }

  function openSample() {
    change(sampleBoard())
    enter()
  }

  function openHere() {
    if (book) change(book)
    enter()
  }

  function startEmpty(title) {
    change({ ...emptyBoard(), title })
    enter()
  }

  function leave() {
    closeSession()
    setSession(false)
    goHash('/')
  }

  useEffect(() => {
    if (path === '/tonight' && !session) goHash('/name')
  }, [path, session])

  useEffect(() => {
    const titles = {
      '/': 'Did I',
      '/name': 'Name the board · Did I',
      '/read': 'How to use Did I',
      '/into': 'Drop into React · Did I',
      '/tonight': `${book?.title || 'Hall'} · Did I`,
    }
    document.title = titles[view] || 'Did I'
  }, [view, book])

  if (view === '/tonight') {
    const live = book || emptyBoard()
    return (
      <Tonight
        value={live}
        onChange={change}
        onResetSample={openSample}
        onLeave={leave}
        onRead={() => goHash('/read')}
      />
    )
  }

  if (view === '/name') {
    return (
      <NameBoard
        currentTitle={book?.title || ''}
        hasBoard={Boolean(book)}
        onOpenHere={openHere}
        onOpenSample={openSample}
        onStartEmpty={startEmpty}
      />
    )
  }
  if (view === '/read') return <Read />
  if (view === '/into') return <Into />
  return <Door hasBoard={hasBoard && session} title={book?.title || 'the hall'} />
}
