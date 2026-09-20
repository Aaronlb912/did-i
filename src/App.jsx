import { useEffect, useState } from 'react'
import {
  Tonight,
  emptyBoard,
  normalizeBook,
  sampleNowBoard,
} from './lib/index.js'
import { unlockAchievements } from './lib/achievements.js'
import { closePastNights, closeShelfPastNights, freshMarks, noteOpen } from './lib/daily.js'
import {
  currentBook,
  downloadShelf,
  dropBook,
  mergeSameTitles,
  parkEmptyTags,
  nextBoardTitle,
  putBook,
  readShelf,
  selectBook,
  writeShelf,
} from './lib/board-shelf.js'
import { commitBook, hangInto, takeDown } from './lib/board-ops.js'
import { blankLamp } from './lib/board-json.js'
import { isoDate } from './lib/recurrence.js'
import {
  armLampPings,
  checkPings,
  pingButtonLabel,
  pingSupport,
  requestPings,
} from './lib/notify.js'
import { bootNative, isNativeHall, listenNativeShell, shareShelf } from './lib/native.js'
import { startPush } from './lib/push.js'
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
import { Calendar } from './lib/Calendar.jsx'
import { About } from './lib/About.jsx'
import { Privacy, Terms } from './lib/LegalDoc.jsx'
import { Help } from './lib/Help.jsx'
import { Ideas } from './lib/Ideas.jsx'
import { Later } from './lib/Later.jsx'
import { Enter } from './lib/Enter.jsx'
import { FirstNight } from './lib/FirstNight.jsx'
import { Marks } from './lib/Marks.jsx'
import { MarkToast } from './lib/MarkToast.jsx'
import { Welcome } from './lib/Welcome.jsx'
import { GemShop } from './lib/GemShop.jsx'
import { Shop } from './lib/Shop.jsx'
import { ShopCheers } from './lib/ShopCheers.jsx'
import { ShopBuddies } from './lib/ShopBuddies.jsx'
import { ShopLooks } from './lib/ShopLooks.jsx'
import { Account } from './lib/Account.jsx'
import { People } from './lib/People.jsx'
import { Friends } from './lib/Friends.jsx'
import { Family } from './lib/Family.jsx'
import { Inbox } from './lib/Inbox.jsx'
import { Sent } from './lib/Sent.jsx'
import { Everyone } from './lib/Everyone.jsx'
import { AppNav } from './lib/AppNav.jsx'
import { SHELF_IN, pullAndMerge, pushSoon } from './lib/cloud-sync.js'
import { Collection } from './lib/Collection.jsx'
import { CheerBurst } from './lib/CheerBurst.jsx'
import { markWelcomeSeen, welcomeSeen } from './lib/hall-pages.js'
import { needsEnter, openSession } from './lib/session.js'
import { Door } from './site/Door.jsx'
import { Into } from './site/Into.jsx'
import { NameBoard } from './site/NameBoard.jsx'
import { Read } from './site/Read.jsx'
import { goHash, parseHash } from './site/hash.js'
import { goBack, syncNav } from './site/nav.js'
import { t } from './lib/i18n.js'
import { applyPrefsToDocument, usePrefs } from './lib/prefs.js'
import { DIT_ENABLED } from './lib/features.js'
import { wallClock } from './lib/zone.js'
import { alignShelfPurse, spreadPurseFrom, weeklyGemBump } from './lib/purse.js'
import './lib/did-i.css'
import './site/site.css'

const SITE = new Set(['/door', '/name', '/read', '/into'])
const HOME = new Set(['/', '/home'])
const HALL = new Set(['/', '/home', '/tonight'])
const READY_KEY = 'did-i-ready-1'

function wipeDemoOnce() {
  try {
    if (localStorage.getItem(READY_KEY) === '1') return
    localStorage.setItem(READY_KEY, '1')
  } catch {
    return
  }
  const old = readShelf()
  const name = currentBook(old)?.keeperName || ''
  const book = { ...emptyBoard(), title: 'Did I', keeperName: name }
  writeShelf({ currentId: book.id, boards: [book] })
  try {
    localStorage.removeItem('did-i-welcome')
  } catch {
    // First night can show again.
  }
}

function firstShelf() {
  wipeDemoOnce()
  const now = new Date()
  const shelf = writeShelf(alignShelfPurse(readShelf()))
  return {
    ...shelf,
    boards: shelf.boards.map((book) => unlockAchievements(closePastNights(book, now), now)),
  }
}

function useRoute() {
  const [route, setRoute] = useState(parseHash)

  useEffect(() => {
    function onHash() {
      syncNav()
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
  const emptyHall = shelf.boards.every(
    (item) => (item.lamps || []).filter((lamp) => !lamp.archived).length === 0,
  )
  const showNav =
    !SITE.has(path) &&
    path !== '/welcome' &&
    path !== '/enter' &&
    path !== '/first' &&
    !(needsEnter(live) && !SITE.has(path) && path !== '/welcome') &&
    !(HALL.has(path) && emptyHall && !welcomeSeen())

  function persist(nextShelf) {
    const now = new Date()
    const before = currentBook(shelf)
    const bumped = weeklyGemBump(nextShelf, shelf, now)
    const mapped = bumped.boards.map((item) => {
      let next = normalizeBook(item)
      next = closePastNights(next, now)
      if (next.id === nextShelf.currentId) next = noteOpen(next, now)
      return unlockAchievements(next, now)
    })
    const drafted = parkEmptyTags(mergeSameTitles({ ...bumped, boards: mapped }))
    const current = drafted.boards.find((item) => item.id === drafted.currentId) || drafted.boards[0]
    const written = writeShelf(spreadPurseFrom(drafted, current))
    const after = currentBook(written)
    if (after.id === before?.id) {
      const news = freshMarks(before?.unlocked, after?.unlocked)
      if (news.length && !after.quietMode) {
        if (news[0]) setMarkNote({ id: news[0] })
      }
    }
    setShelf(written)
    pushSoon(written)
  }

  function change(next) {
    persist(putBook(shelf, { ...next, id: next.id || book.id }))
  }

  function saveLamp(target, lamp, fromBook, clock) {
    const when = clock || new Date()
    const source = fromBook && Array.isArray(fromBook.lamps) ? fromBook : null
    let next = shelf
    let dest = target
    if (source && source.id !== target.id) {
      const answers = (source.answers || []).filter((item) => item.lampId === lamp.id)
      next = putBook(next, takeDown(source, lamp))
      dest = {
        ...hangInto(target, lamp, false),
        answers: [...(target.answers || []).filter((item) => item.lampId !== lamp.id), ...answers],
      }
    } else {
      dest = hangInto(target, lamp, Boolean(source && source.id === target.id))
    }
    persist(putBook(next, commitBook(dest, when)))
  }

  // A Did I a friend sent, kept. It lands on the open tag as a normal question.
  function keepSent(question) {
    const text = String(question || '').trim()
    if (!text) return
    saveLamp(live, { ...blankLamp(), question: text, cadence: 'once', onceOn: isoDate(new Date()) })
  }

  function switchBoard(id) {
    persist(selectBook(shelf, id))
  }

  const tagId = shelf.boards.some((item) => item.id === route.tag && !item.archived)
    ? route.tag
    : ''

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
    if (tagId === id || route.tag === id) goHash(path === '/lamps' ? '/lamps' : '/', { tag: 'all' })
  }

  function openHall(face = '') {
    goHash(face ? '/tonight' : '/', face ? { face } : '')
  }

  function openDemo() {
    const name = live.keeperName || ''
    const nowBoard = normalizeBook({ ...sampleNowBoard(), keeperName: name })
    openSession()
    markWelcomeSeen()
    persist({
      currentId: nowBoard.id,
      boards: [nowBoard],
    })
    goHash('/tonight', { tag: nowBoard.id })
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
    const shelf = readShelf()
    try {
      await shareShelf(shelf)
    } catch {
      downloadShelf(shelf)
    }
  }

  useEffect(() => {
    if (book) armLampPings(book)
  }, [book])

  useEffect(() => {
    if (SITE.has(path)) return
    const current = currentBook(shelf)
    const closed = closePastNights(current, new Date())
    if (closed !== current) {
      persist(putBook(shelf, closed))
      return
    }
    if (noteOpen(current) === current) return
    persist(shelf)
  }, [path, shelf])

  useEffect(() => {
    if (SITE.has(path)) return undefined
    let timeout = 0

    function onNight() {
      const fresh = readShelf()
      const now = new Date()
      const closed = closeShelfPastNights(fresh, now)
      const same = closed.boards.every((book, i) => book === fresh.boards[i])
      if (same) {
        const current = currentBook(fresh)
        if (noteOpen(current, now) === current) return
        persist(fresh)
      } else {
        persist(closed)
      }
      arm()
    }

    function arm() {
      window.clearTimeout(timeout)
      const local = wallClock(new Date())
      const next = new Date(local)
      next.setDate(next.getDate() + 1)
      next.setHours(0, 0, 1, 0)
      timeout = window.setTimeout(onNight, Math.max(1000, next.getTime() - Date.now()))
    }

    function onShow() {
      if (document.visibilityState === 'visible') onNight()
    }

    arm()
    document.addEventListener('visibilitychange', onShow)
    return () => {
      window.clearTimeout(timeout)
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [path])

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
    function onShelfIn(event) {
      if (event.detail) setShelf(event.detail)
    }
    function onWake() {
      if (document.visibilityState === 'visible') pullAndMerge()
    }
    window.addEventListener('beforeinstallprompt', onInstall)
    window.addEventListener(SHELF_IN, onShelfIn)
    document.addEventListener('visibilitychange', onWake)
    navigator.serviceWorker?.addEventListener('message', onMessage)
    pullAndMerge()
    // Does nothing until Firebase is set up. See docs/push.md.
    startPush((where) => goHash(where))
    const stop = listenNativeShell({
      onBack() {
        const empty = (book?.lamps || []).filter((lamp) => !lamp.archived).length === 0
        goBack({ emptyHall: empty, needsEnter: needsEnter(book) })
      },
      onOpenLamp(lampId) {
        openHall(lampId || '')
      },
    })
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstall)
      window.removeEventListener(SHELF_IN, onShelfIn)
      document.removeEventListener('visibilitychange', onWake)
      navigator.serviceWorker?.removeEventListener('message', onMessage)
      stop()
    }
  }, [])

  useEffect(() => {
    if (!DIT_ENABLED && path === '/everyone') goHash('/')
  }, [path])

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
      '/calendar': t('title.calendar'),
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
      '/privacy': t('title.privacy'),
      '/terms': t('title.terms'),
      '/ideas': t('title.ideas'),
      '/later': t('title.later'),
      '/first': t('title.first'),
      '/marks': t('title.marks'),
      '/shop': t('title.shop'),
      '/shop/looks': t('title.shopLooks'),
      '/shop/cheers': t('title.shopCheers'),
      '/shop/buddies': t('title.shopBuddies'),
      '/gems': t('title.gems'),
      '/kit': t('title.kit'),
      '/account': t('title.account'),
      '/everyone': t('title.everyone'),
    }
    document.title = titles[view] || t('title.home', { board })
  }, [view, book, prefs])

  const pingLabel = pingButtonLabel(pingState)
  const hallProps = {
    pingLabel,
    onAskPings: pingLabel ? askPings : undefined,
    onInstall: installEvent ? installHall : undefined,
    onImport: (next) => persist(next),
    onStartEmpty: () =>
      change({
        ...emptyBoard(),
        id: live.id,
        title: live.title,
        keeperName: live.keeperName,
      }),
    onLoadDemo: openDemo,
    onSendCopy: sendCopy,
  }

  let inner = null
  if (view === '/name') {
    inner = (
      <NameBoard
        currentTitle={book?.title || ''}
        hasBoard={Boolean(book)}
        onOpenHere={() => openHall()}
        onOpenSample={openDemo}
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
        onOpenSample={openDemo}
        onSaveKeeper={saveKeeper}
        returnTo={path === '/enter' ? (emptyHall ? '/first' : '/') : path}
        returnFace={route.face}
      />
    )
  } else if (path === '/first' || (HALL.has(path) && emptyHall && !welcomeSeen())) {
    inner = <FirstNight book={live} onChange={change} onLoadDemo={openDemo} />
  } else if (path === '/about') {
    inner = <About book={live} />
  } else if (path === '/help') {
    inner = <Help book={live} />
  } else if (path === '/privacy') {
    inner = <Privacy book={live} />
  } else if (path === '/terms') {
    inner = <Terms book={live} />
  } else if (path === '/ideas') {
    inner = <Ideas book={live} />
  } else if (path === '/later') {
    inner = <Later book={live} />
  } else if (path === '/marks') {
    inner = <Marks book={live} />
  } else if (path === '/shop') {
    inner = <Shop book={live} />
  } else if (path === '/shop/looks') {
    inner = <ShopLooks book={live} onChange={change} />
  } else if (path === '/shop/cheers') {
    inner = <ShopCheers book={live} onChange={change} />
  } else if (path === '/shop/buddies') {
    inner = <ShopBuddies book={live} onChange={change} />
  } else if (path === '/gems') {
    inner = <GemShop book={live} />
  } else if (path === '/kit') {
    inner = <Collection book={live} onChange={change} />
  } else if (path === '/account') {
    inner = <Account book={live} onChange={change} />
  } else if (path === '/people') {
    inner = <People book={live} onChange={change} />
  } else if (path === '/friends') {
    inner = <Friends book={live} onChange={change} />
  } else if (path === '/family') {
    inner = <Family book={live} onChange={change} familyId={route.id} />
  } else if (path === '/inbox') {
    inner = <Inbox book={live} onKeep={keepSent} />
  } else if (path === '/sent') {
    inner = <Sent book={live} />
  } else if (path === '/everyone' && DIT_ENABLED) {
    inner = <Everyone book={live} boards={shelf.boards} onChange={change} />
  } else if (path === '/add' || path === '/hang') {
    inner = (
      <HangPage
        book={live}
        boards={shelf.boards}
        onChange={change}
        onSaveTo={saveLamp}
        lampId={route.id}
        copyId={route.copy}
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
  } else if (path === '/calendar') {
    inner = <Calendar book={live} boards={shelf.boards} tagId={tagId} />
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
    inner = (
      <Profile
        book={live}
        onChange={change}
        {...hallProps}
      />
    )
  } else if (path === '/tonight' || path === '/' || path === '/home' || route.face) {
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
      <Tonight
        value={live}
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
      {showNav ? <AppNav /> : null}
      {SITE.has(path) ? null : (
        <MarkToast mark={markNote} onClose={() => setMarkNote(null)} />
      )}
      <CheerBurst />
    </>
  )
}
