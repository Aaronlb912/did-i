import { useEffect, useState } from 'react'
import { Tonight, emptyBoard, normalizeBook, sampleBoard } from './lib/index.js'
import { unlockAchievements } from './lib/achievements.js'
import { saveBoardForSw } from './lib/board-store.js'
import {
  armLampPings,
  checkPings,
  pingButtonLabel,
  pingSupport,
  requestPings,
} from './lib/notify.js'
import { bootNative, isNativeHall, listenNativeShell, shareBook } from './lib/native.js'
import { Door } from './site/Door.jsx'
import { Into } from './site/Into.jsx'
import { NameBoard } from './site/NameBoard.jsx'
import { Read } from './site/Read.jsx'
import { goHash, parseHash } from './site/hash.js'
import './lib/did-i.css'
import './site/site.css'

const STORAGE_KEY = 'did-i-board'
const SITE = new Set(['/door', '/name', '/read', '/into'])

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
    // Hall still runs if storage is blocked.
  }
  saveBoardForSw(book)
}

function firstBook() {
  const stored = readStored()
  if (stored) return stored
  const fresh = emptyBoard()
  writeStored(fresh)
  return fresh
}

function useRoute() {
  const [route, setRoute] = useState(parseHash)

  useEffect(() => {
    function onHash() {
      setRoute(parseHash())
    }
    window.addEventListener('hashchange', onHash)
    onHash()
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return route
}

export default function App() {
  const [book, setBook] = useState(firstBook)
  const [pingState, setPingState] = useState(pingSupport)
  const [installEvent, setInstallEvent] = useState(null)
  const [nativeShare, setNativeShare] = useState(false)
  const route = useRoute()
  const path = route.path
  const hasBoard = Boolean(book && book.lamps && (book.lamps.length || book.title))
  const view = SITE.has(path) ? path : '/tonight'

  function change(next) {
    const normalized = unlockAchievements(normalizeBook(next), new Date())
    setBook(normalized)
    writeStored(normalized)
  }

  function openHall(face = '') {
    goHash('/', face)
  }

  function openSample() {
    change(sampleBoard())
    openHall()
  }

  function startEmpty(title) {
    change({ ...emptyBoard(), title: (title && title.trim()) || 'My hall' })
    openHall()
  }

  async function askPings() {
    const next = await requestPings()
    setPingState(next)
    if (next === 'granted' && book) armLampPings(book)
  }

  async function installHall() {
    if (!installEvent) return
    installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
  }

  async function sendCopy() {
    try {
      await shareBook(book)
    } catch {
      // Desktop download still works from the tray.
    }
  }

  useEffect(() => {
    if (book) {
      saveBoardForSw(book)
      armLampPings(book)
    }
  }, [book])

  useEffect(() => {
    checkPings().then(setPingState)
    setNativeShare(isNativeHall() || Boolean(navigator.share))
    bootNative()
    function onInstall(event) {
      event.preventDefault()
      setInstallEvent(event)
    }
    function onMessage(event) {
      if (event.data && event.data.type === 'did-i-open') {
        openHall(event.data.lampId || '')
      }
    }
    window.addEventListener('beforeinstallprompt', onInstall)
    navigator.serviceWorker?.addEventListener('message', onMessage)
    const stop = listenNativeShell({
      onBack() {
        const now = parseHash()
        if (SITE.has(now.path)) {
          goHash('/')
          return
        }
        window.dispatchEvent(new CustomEvent('did-i-back'))
      },
      onOpenLamp(lampId) {
        openHall(lampId || '')
      },
    })
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstall)
      navigator.serviceWorker?.removeEventListener('message', onMessage)
      stop()
    }
  }, [])

  useEffect(() => {
    const titles = {
      '/door': 'Did I',
      '/name': 'Name the board · Did I',
      '/read': 'How to use Did I',
      '/into': 'Drop into React · Did I',
      '/tonight': `${book?.title || 'Hall'} · Did I`,
    }
    document.title = titles[view] || `${book?.title || 'Hall'} · Did I`
  }, [view, book])

  const pingLabel = pingButtonLabel(pingState)
  const installLabel = installEvent ? 'Install' : ''

  if (!SITE.has(path)) {
    const live = book || emptyBoard()
    return (
      <Tonight
        value={live}
        onChange={change}
        onResetSample={openSample}
        onStartEmpty={() => startEmpty('My hall')}
        onLeave={() => goHash('/door')}
        onRead={() => goHash('/read')}
        onShare={nativeShare ? sendCopy : undefined}
        focusLampId={route.face}
        pingLabel={pingLabel}
        onAskPings={pingLabel ? askPings : undefined}
        installLabel={installLabel}
        onInstall={installEvent ? installHall : undefined}
      />
    )
  }

  if (view === '/name') {
    return (
      <NameBoard
        currentTitle={book?.title || ''}
        hasBoard={Boolean(book)}
        onOpenHere={() => openHall()}
        onOpenSample={openSample}
        onStartEmpty={startEmpty}
      />
    )
  }
  if (view === '/read') return <Read />
  if (view === '/into') return <Into />
  return (
    <Door
      hasBoard={hasBoard}
      title={book?.title || 'the hall'}
      canInstall={Boolean(installEvent)}
      onInstall={installHall}
    />
  )
}
