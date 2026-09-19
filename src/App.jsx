import { useEffect, useState } from 'react'
import {
  Tonight,
  emptyBoard,
  normalizeBook,
  sampleBoard,
  sampleNowBoard,
  samplePracticeBoard,
  sampleShopBoard,
} from './lib/index.js'
import { ACHIEVEMENTS, unlockAchievements } from './lib/achievements.js'
import { freshMarks, noteOpen } from './lib/daily.js'
import {
  currentBook,
  dropBook,
  nextBoardTitle,
  putBook,
  readShelf,
  selectBook,
  writeShelf,
} from './lib/board-shelf.js'
import { commitBook, hangInto, takeDown } from './lib/board-ops.js'
import {
  armLampPings,
  checkPings,
  pingButtonLabel,
  pingSupport,
  requestPings,
} from './lib/notify.js'
import { bootNative, isNativeHall, listenNativeShell, shareBook } from './lib/native.js'
import { AllLamps } from './lib/AllLamps.jsx'
import { Feed } from './lib/Feed.jsx'
import { HangPage } from './lib/HangPage.jsx'
import { LampPage } from './lib/LampPage.jsx'
import { PingPlate } from './lib/PingPlate.jsx'
import { Boards } from './lib/Boards.jsx'
import { Profile } from './lib/Profile.jsx'
import { SearchLamps } from './lib/SearchLamps.jsx'
import { StatsPage } from './lib/StatsPage.jsx'
import { Streaks } from './lib/Streaks.jsx'
import { WeekGrid } from './lib/WeekGrid.jsx'
import { About } from './lib/About.jsx'
import { Help } from './lib/Help.jsx'
import { Ideas } from './lib/Ideas.jsx'
import { Later } from './lib/Later.jsx'
import { Enter } from './lib/Enter.jsx'
import { FirstNight } from './lib/FirstNight.jsx'
import { Home } from './lib/Home.jsx'
import { Marks } from './lib/Marks.jsx'
import { MarkToast } from './lib/MarkToast.jsx'
import { Welcome } from './lib/Welcome.jsx'
import { Shop } from './lib/Shop.jsx'
import { Collection } from './lib/Collection.jsx'
import { CheerBurst } from './lib/CheerBurst.jsx'
import { markWelcomeSeen, welcomeSeen } from './lib/hall-pages.js'
import { needsEnter } from './lib/session.js'
import { Door } from './site/Door.jsx'
import { Into } from './site/Into.jsx'
import { NameBoard } from './site/NameBoard.jsx'
import { Read } from './site/Read.jsx'
import { goHash, parseHash } from './site/hash.js'
import { t } from './lib/i18n.js'
import { applyPrefsToDocument, usePrefs } from './lib/prefs.js'
import { faceReadyTonight } from './lib/recurrence.js'
import { taggedCatchUp } from './lib/tags.js'
import './lib/did-i.css'
import './site/site.css'

const SITE = new Set(['/door', '/name', '/read', '/into'])
const HOME = new Set(['/', '/home'])
const HALL = new Set(['/', '/home', '/tonight'])

function needsTonightTap(boards, book, tagId) {
  const shelf = boards?.length ? boards : book ? [book] : []
  if (!shelf.length) return false
  const clock = new Date()
  const ready = tagId
    ? faceReadyTonight(book, clock).length > 0
    : shelf.some((item) => faceReadyTonight(item, clock).length > 0)
  return ready || taggedCatchUp(shelf, clock, tagId).length > 0
}

function firstShelf() {
  const shelf = readShelf()
  return {
    ...shelf,
    boards: shelf.boards.map((book) => unlockAchievements(book, new Date())),
  }
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
  const [shelf, setShelf] = useState(firstShelf)
  const book = currentBook(shelf)
  const [pingState, setPingState] = useState(pingSupport)
  const [installEvent, setInstallEvent] = useState(null)
  const [nativeShare, setNativeShare] = useState(false)
  const [markNote, setMarkNote] = useState(null)
  const route = useRoute()
  const prefs = usePrefs()
  const path = route.path
  const hasBoard = Boolean(book && book.lamps && (book.lamps.length || book.title))
  const view = SITE.has(path) ? path : path
  const live = book || emptyBoard()
  const emptyHall = (live.lamps || []).filter((lamp) => !lamp.archived).length === 0

  function persist(nextShelf) {
    const now = new Date()
    const before = currentBook(shelf)
    const written = writeShelf({
      ...nextShelf,
      boards: nextShelf.boards.map((item) => {
        let next = normalizeBook(item)
        if (next.id === nextShelf.currentId) next = noteOpen(next, now)
        return unlockAchievements(next, now)
      }),
    })
    const after = currentBook(written)
    if (after.id === before?.id) {
      const news = freshMarks(before?.unlocked, after?.unlocked)
      if (news.length && !after.quietMode) {
        const first = ACHIEVEMENTS.find((item) => item.id === news[0])
        if (first) setMarkNote(first)
      }
    }
    setShelf(written)
  }

  function change(next) {
    persist(putBook(shelf, { ...next, id: next.id || book.id }))
  }

  function saveLamp(target, lamp, fromBook, clock) {
    const when = clock || new Date()
    let next = shelf
    if (fromBook && fromBook.id !== target.id) {
      next = putBook(next, takeDown(fromBook, lamp))
    }
    persist(
      putBook(
        next,
        commitBook(hangInto(target, lamp, Boolean(fromBook && fromBook.id === target.id)), when),
      ),
    )
  }

  function switchBoard(id) {
    persist(selectBook(shelf, id))
  }

  const tagId = shelf.boards.some((item) => item.id === route.tag) ? route.tag : ''

  function setTag(id) {
    if (id) persist(selectBook(shelf, id))
    const stay = path === '/tonight' || path === '/lamps' || path === '/later' || path === '/home' ? path : '/'
    goHash(stay === '/home' ? '/' : stay, { tag: id || 'all', face: route.face })
  }

  function addBoard() {
    persist(
      putBook(shelf, {
        ...emptyBoard(),
        title: nextBoardTitle(shelf.boards),
        keeperName: live.keeperName,
      }),
    )
    return ''
  }

  function removeBoard(id) {
    persist(dropBook(shelf, id))
  }

  function openHall(face = '') {
    goHash(face ? '/tonight' : '/', face ? { face } : '')
  }

  function openSample() {
    const existing = shelf.boards.find((item) => item.title === 'Hayes Street')
    change({
      ...sampleBoard(),
      id: existing?.id || live.id,
      keeperName: live.keeperName || 'Jordan Hale',
    })
    markWelcomeSeen()
    openHall()
  }

  function addTestBoards() {
    const name = live.keeperName || 'Jordan Hale'
    const practice = { ...samplePracticeBoard(), keeperName: name }
    const shop = { ...sampleShopBoard(), keeperName: name }
    const nowBoard = { ...sampleNowBoard(), keeperName: name }
    persist({
      ...putBook(putBook(putBook(shelf, shop), practice), nowBoard),
      currentId: nowBoard.id,
    })
    markWelcomeSeen()
    goHash('/tonight')
  }

  function startEmpty(title, keeperName = '') {
    change({
      ...emptyBoard(),
      title: (title && title.trim()) || 'Did I',
      keeperName: (keeperName && keeperName.trim()) || live.keeperName,
    })
    markWelcomeSeen()
    goHash('/first')
  }

  function saveKeeper({ keeperName, title }) {
    change({
      ...live,
      keeperName: (keeperName && keeperName.trim()) || live.keeperName,
      title: (title && title.trim()) || live.title,
    })
    markWelcomeSeen()
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
    if (book) armLampPings(book)
  }, [book])

  useEffect(() => {
    if (SITE.has(path)) return
    const current = currentBook(shelf)
    if (noteOpen(current) === current) return
    persist(shelf)
  }, [path, shelf])

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
        if (now.path === '/welcome') {
          markWelcomeSeen()
          const empty = (book?.lamps || []).filter((lamp) => !lamp.archived).length === 0
          goHash(empty ? '/first' : '/')
          return
        }
        if (now.path === '/enter') {
          if (!needsEnter(book)) goHash('/')
          return
        }
        if (now.path === '/first') {
          goHash('/')
          return
        }
        if (SITE.has(now.path) || !HOME.has(now.path)) {
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
    applyPrefsToDocument(prefs)
    const board = book?.title || 'Did I'
    const titles = {
      '/door': t('title.door'),
      '/name': t('title.name'),
      '/read': t('title.read'),
      '/into': t('title.into'),
      '/home': t('title.home', { board }),
      '/tonight': t('title.home', { board }),
      '/enter': t('title.enter'),
      '/about': t('title.about'),
      '/lamps': t('title.questions'),
      '/week': t('title.week'),
      '/streaks': t('title.streaks'),
      '/stats': t('title.stats'),
      '/feed': t('title.feed'),
      '/search': t('title.search'),
      '/me': t('title.boards'),
      '/settings': t('title.settings'),
      '/add': t('title.add'),
      '/hang': t('title.add'),
      '/lamp': t('title.lamp'),
      '/welcome': t('title.door'),
      '/pings': t('title.pings'),
      '/help': t('title.help'),
      '/ideas': t('title.ideas'),
      '/later': t('title.later'),
      '/first': t('title.first'),
      '/marks': t('title.marks'),
      '/shop': t('title.shop'),
      '/kit': t('title.kit'),
    }
    document.title = titles[view] || t('title.home', { board })
  }, [view, book, prefs])

  const pingLabel = pingButtonLabel(pingState)
  const installLabel = installEvent ? 'Install' : ''
  const hallProps = {
    pingLabel,
    onAskPings: pingLabel ? askPings : undefined,
    installLabel,
    onInstall: installEvent ? installHall : undefined,
    onShare: nativeShare ? sendCopy : undefined,
    onStartEmpty: () =>
      change({
        ...emptyBoard(),
        id: live.id,
        title: live.title,
        keeperName: live.keeperName,
      }),
    onResetSample: openSample,
    onAddTestBoards: addTestBoards,
  }

  let inner = null
  if (view === '/name') {
    inner = (
      <NameBoard
        currentTitle={book?.title || ''}
        hasBoard={Boolean(book)}
        onOpenHere={() => openHall()}
        onOpenSample={openSample}
        onStartEmpty={startEmpty}
      />
    )
  } else if (view === '/read') {
    inner = <Read />
  } else if (view === '/into') {
    inner = <Into />
  } else if (view === '/door') {
    inner = (
      <Door
        hasBoard={hasBoard}
        title={book?.title || 'Did I'}
        canInstall={Boolean(installEvent)}
        onInstall={installHall}
      />
    )
  } else if (path === '/welcome') {
    inner = <Welcome book={live} />
  } else if (path === '/enter' || (needsEnter(live) && !SITE.has(path) && path !== '/welcome')) {
    inner = (
      <Enter
        book={live}
        onOpenSample={openSample}
        onSaveKeeper={saveKeeper}
        returnTo={path === '/enter' ? (emptyHall ? '/first' : '/') : path}
        returnFace={route.face}
      />
    )
  } else if (path === '/first' || (HALL.has(path) && emptyHall && !welcomeSeen())) {
    inner = <FirstNight book={live} onChange={change} />
  } else if (path === '/about') {
    inner = <About book={live} />
  } else if (path === '/help') {
    inner = <Help book={live} />
  } else if (path === '/ideas') {
    inner = <Ideas book={live} />
  } else if (path === '/later') {
    inner = <Later book={live} />
  } else if (path === '/marks') {
    inner = <Marks book={live} />
  } else if (path === '/shop') {
    inner = <Shop book={live} onChange={change} />
  } else if (path === '/kit') {
    inner = <Collection book={live} onChange={change} />
  } else if (path === '/add' || path === '/hang') {
    inner = (
      <HangPage
        book={live}
        boards={shelf.boards}
        onChange={change}
        onSaveTo={saveLamp}
        lampId={route.id}
        start={route.start}
      />
    )
  } else if (path === '/lamp') {
    inner = <LampPage book={live} onChange={change} lampId={route.id} />
  } else if (path === '/lamps') {
    inner = (
      <AllLamps
        book={live}
        boards={shelf.boards}
        tagId={tagId}
        onTag={setTag}
        onChange={change}
        onOpen={(boardId, lampId) => {
          if (boardId && boardId !== live.id) persist(selectBook(shelf, boardId))
          goHash('/lamp', { id: lampId })
        }}
      />
    )
  } else if (path === '/search') {
    inner = <SearchLamps book={live} />
  } else if (path === '/week') {
    inner = <WeekGrid book={live} />
  } else if (path === '/streaks') {
    inner = <Streaks book={live} />
  } else if (path === '/stats') {
    inner = <StatsPage book={live} />
  } else if (path === '/feed') {
    inner = <Feed book={live} />
  } else if (path === '/pings') {
    inner = (
      <PingPlate
        book={live}
        pingLabel={pingLabel}
        onAskPings={pingLabel ? askPings : undefined}
      />
    )
  } else if (path === '/me') {
    inner = (
      <Boards
        book={live}
        boards={shelf.boards}
        onSelect={switchBoard}
        onAdd={addBoard}
        onRemove={removeBoard}
        onChange={change}
      />
    )
  } else if (path === '/settings') {
    inner = <Profile book={live} onChange={change} {...hallProps} />
  } else if (path === '/tonight' || route.face || (path === '/' && needsTonightTap(shelf.boards, live, tagId))) {
    inner = (
      <Tonight
        value={live}
        boards={shelf.boards}
        tagId={tagId}
        onTag={setTag}
        onChange={change}
        focusLampId={route.face}
      />
    )
  } else {
    inner = (
      <Home
        book={live}
        boards={shelf.boards}
        tagId={tagId}
        onTag={setTag}
        onChange={change}
      />
    )
  }

  return (
    <>
      {inner}
      {SITE.has(path) ? null : (
        <MarkToast mark={markNote} onClose={() => setMarkNote(null)} />
      )}
      <CheerBurst />
    </>
  )
}
