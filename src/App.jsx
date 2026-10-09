import { Suspense, lazy, useEffect, useState } from 'react'
import { Tonight, emptyBoard, normalizeBook } from './lib/index.js'
import { marksToToast, unlockAchievements } from './lib/achievements.js'
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
import { commitBook } from './lib/achievements.js'
import { hangInto, takeDown } from './lib/board-ops.js'
import { blankLamp } from './lib/board-json.js'
import { keptLamp } from './lib/send-repeat.js'
import { boardDate, isoDate } from './lib/recurrence.js'
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
import { Enter } from './lib/Enter.jsx'
import { FirstNight } from './lib/FirstNight.jsx'
import { MarkToast } from './lib/MarkToast.jsx'
import { Welcome } from './lib/Welcome.jsx'
import { DidYouBanner } from './lib/DidYouBanner.jsx'
import { useAccount } from './lib/account.js'
import { useAutoAdd } from './lib/people.js'
import { AppNav } from './lib/AppNav.jsx'
import { showBottomNav } from './lib/app-nav.js'
import { forgetAnswerMarks } from './lib/answer-log.js'
import {
  SHELF_IN,
  bindForegroundSync,
  flushPushSoon,
  pullAndMerge,
  pushSoon,
} from './lib/cloud-sync.js'
import { stripDemoShelf } from './lib/demo-strip.js'
import { GiftArrived } from './lib/Gift.jsx'
import { CheerBurst } from './lib/CheerBurst.jsx'
import { markWelcomeSeen, welcomeSeen } from './lib/hall-pages.js'
import { needsEnter } from './lib/session.js'
import { goFromPush, goHash, parseHash } from './site/hash.js'
import { takeWebWeLink } from './lib/did-you-links.js'
import { goBack, syncNav } from './site/nav.js'
import { t } from './lib/i18n.js'
import { DiagnosticsAsk } from './lib/DiagnosticsAsk.jsx'
import { StreakMomentHost } from './lib/StreakMoment.jsx'
import {
  maybeStreakMiss,
  queueStreakMoment,
} from './lib/streak-moments.js'
import { applyPrefsToDocument, usePrefs } from './lib/prefs.js'
import { wallClock } from './lib/zone.js'
import { cloudSetUp } from './lib/cloud.js'
import { accountSessionOn } from './lib/session-id.js'
import {
  alignShelfPurse,
  mergePurses,
  spreadPurseFrom,
  weeklyGemBump,
} from './lib/purse.js'
import {
  applyCoinBalanceToShelf,
  applyGemBalanceToShelf,
  creditNightCoins,
  grantWeeklyGem,
} from './lib/wallet.js'
import './lib/did-i.css'
import './site/site.css'

// Screens off Tonight load on first visit so the first bundle stays small.
function screen(load, name) {
  return lazy(() => load().then((mod) => ({ default: mod[name] })))
}
const Feed = screen(() => import('./lib/Feed.jsx'), 'Feed')
const HangPage = screen(() => import('./lib/HangPage.jsx'), 'HangPage')
const LampPage = screen(() => import('./lib/LampPage.jsx'), 'LampPage')
const PingPlate = screen(() => import('./lib/PingPlate.jsx'), 'PingPlate')
const Boards = screen(() => import('./lib/Boards.jsx'), 'Boards')
const Profile = screen(() => import('./lib/Profile.jsx'), 'Profile')
const SearchLamps = screen(() => import('./lib/SearchLamps.jsx'), 'SearchLamps')
const StatsPage = screen(() => import('./lib/StatsPage.jsx'), 'StatsPage')
const Streaks = screen(() => import('./lib/Streaks.jsx'), 'Streaks')
const WeekGrid = screen(() => import('./lib/WeekGrid.jsx'), 'WeekGrid')
const Calendar = screen(() => import('./lib/Calendar.jsx'), 'Calendar')
const About = screen(() => import('./lib/About.jsx'), 'About')
const Help = screen(() => import('./lib/Help.jsx'), 'Help')
const Ideas = screen(() => import('./lib/Ideas.jsx'), 'Ideas')
const Later = screen(() => import('./lib/Later.jsx'), 'Later')
const Marks = screen(() => import('./lib/Marks.jsx'), 'Marks')
const GemShop = screen(() => import('./lib/GemShop.jsx'), 'GemShop')
const Shop = screen(() => import('./lib/Shop.jsx'), 'Shop')
const ShopCheers = screen(() => import('./lib/ShopCheers.jsx'), 'ShopCheers')
const ShopBuddies = screen(() => import('./lib/ShopBuddies.jsx'), 'ShopBuddies')
const ShopAccessories = screen(() => import('./lib/ShopAccessories.jsx'), 'ShopAccessories')
const ShopLooks = screen(() => import('./lib/ShopLooks.jsx'), 'ShopLooks')
const Account = screen(() => import('./lib/Account.jsx'), 'Account')
const PhoneSettings = screen(() => import('./lib/PhoneSettings.jsx'), 'PhoneSettings')
const People = screen(() => import('./lib/People.jsx'), 'People')
const PeopleConnect = screen(() => import('./lib/PeopleConnect.jsx'), 'PeopleConnect')
const PeopleRefer = screen(() => import('./lib/PeopleRefer.jsx'), 'PeopleRefer')
const Friends = screen(() => import('./lib/Friends.jsx'), 'Friends')
const Family = screen(() => import('./lib/Family.jsx'), 'Family')
const Inbox = screen(() => import('./lib/Inbox.jsx'), 'Inbox')
const Sent = screen(() => import('./lib/Sent.jsx'), 'Sent')
const DidYou = screen(() => import('./lib/DidYou.jsx'), 'DidYou')
const Collection = screen(() => import('./lib/Collection.jsx'), 'Collection')
const Privacy = screen(() => import('./lib/LegalDoc.jsx'), 'Privacy')
const Terms = screen(() => import('./lib/LegalDoc.jsx'), 'Terms')
const WeCard = screen(() => import('./lib/DidWe.jsx'), 'WeCard')
const WeHome = screen(() => import('./lib/DidWe.jsx'), 'WeHome')
const WeNew = screen(() => import('./lib/DidWe.jsx'), 'WeNew')
const Door = screen(() => import('./site/Door.jsx'), 'Door')
const Into = screen(() => import('./site/Into.jsx'), 'Into')
const NameBoard = screen(() => import('./site/NameBoard.jsx'), 'NameBoard')
const Read = screen(() => import('./site/Read.jsx'), 'Read')
const Gift = screen(() => import('./lib/Gift.jsx'), 'Gift')
const GiftsSent = screen(() => import('./lib/Gift.jsx'), 'GiftsSent')

const SITE = new Set(['/door', '/name', '/read', '/into'])
const HOME = new Set(['/', '/home'])
const HALL = new Set(['/', '/home', '/tonight'])
const DEMO_PURGE_KEY = 'did-i-demo-purge-1'

function purgeDemoOnce() {
  try {
    if (localStorage.getItem(DEMO_PURGE_KEY) === '1') return
    localStorage.setItem(DEMO_PURGE_KEY, '1')
  } catch {
    return
  }
  forgetAnswerMarks()
  writeShelf(stripDemoShelf(readShelf()))
}

function firstShelf() {
  purgeDemoOnce()
  const now = new Date()
  const shelf = writeShelf(alignShelfPurse(readShelf()))
  const boards = shelf.boards.map((book) => unlockAchievements(closePastNights(book, now), now))
  const miss = maybeStreakMiss(boards, now)
  if (miss) queueStreakMoment(miss, miss.dateIso)
  return { ...shelf, boards }
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
  const showNav = !SITE.has(path) && showBottomNav(path)
  const account = useAccount()
  // Signed in after opening a Did we link on the web: back to its join page.
  useEffect(() => {
    if (!account.user) return
    const code = takeWebWeLink()
    if (code) goHash('/we', { link: code })
  }, [account.user])

  function persist(nextShelf) {
    const now = new Date()
    const before = currentBook(shelf)
    const coinsBefore = mergePurses(shelf.boards).coins
    const bumped = weeklyGemBump(nextShelf, shelf, now, { accountSync: accountSessionOn() })
    const mapped = bumped.boards.map((item) => {
      let next = normalizeBook(item)
      next = closePastNights(next, now)
      if (next.id === nextShelf.currentId) next = noteOpen(next, now)
      return unlockAchievements(next, now)
    })
    const drafted = parkEmptyTags(mergeSameTitles({ ...bumped, boards: mapped }))
    const current = drafted.boards.find((item) => item.id === drafted.currentId) || drafted.boards[0]
    const written = writeShelf(spreadPurseFrom(drafted, current))
    const miss = maybeStreakMiss(written.boards, now)
    if (miss) queueStreakMoment(miss, miss.dateIso)
    const after = currentBook(written)
    if (after.id === before?.id) {
      const news = freshMarks(before?.unlocked, after?.unlocked)
      if (news.length && !after.quietMode) {
        const [toast] = marksToToast(news)
        if (toast) setMarkNote(toast)
      }
    }
    setShelf(written)
    pushSoon(written)
    const fold = written.boards.find((b) => b.id === written.currentId)?.dayFoldHour ?? 0
    const coinsAfter = mergePurses(written.boards).coins
    if (cloudSetUp() && coinsAfter > coinsBefore) {
      creditNightCoins(boardDate(now, fold), coinsAfter - coinsBefore).then((bal) => {
        if (bal == null) return
        const synced = writeShelf(applyCoinBalanceToShelf(readShelf(), bal))
        setShelf(synced)
        pushSoon(synced)
      })
    }
    if (accountSessionOn() && bumped.gemWeek && bumped.gemWeek !== (shelf.gemWeek || '')) {
      grantWeeklyGem(bumped.gemWeek).then((bal) => {
        if (bal == null) return
        const synced = writeShelf(applyGemBalanceToShelf(readShelf(), bal))
        setShelf(synced)
        pushSoon(synced)
      })
    }
  }

  function change(next) {
    persist(putBook(shelf, { ...next, id: next.id || book.id }))
  }

  // Several folders at once, for example a bulk edit on Questions.
  function changeBooks(books) {
    if (!books.length) return
    persist(books.reduce((next, one) => putBook(next, one), shelf))
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

  // A did you kept from the inbox, or several added on their own, land on
  // the open folder in one write: tonight only, or on the sender's repeat.
  function keepSent(questions) {
    const clock = new Date()
    const lamps = [].concat(questions).map((item) => keptLamp(item, clock, live.dayFoldHour)).filter(Boolean)
    if (!lamps.length) return
    let dest = live
    for (const lamp of lamps) {
      dest = hangInto(dest, lamp, false)
    }
    persist(putBook(shelf, commitBook(dest, clock)))
  }

  useAutoAdd(account.user, keepSent)

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
    function onLeave() {
      flushPushSoon()
    }
    window.addEventListener('beforeinstallprompt', onInstall)
    window.addEventListener(SHELF_IN, onShelfIn)
    window.addEventListener('pagehide', onLeave)
    window.addEventListener('beforeunload', onLeave)
    navigator.serviceWorker?.addEventListener('message', onMessage)
    bindForegroundSync()
    pullAndMerge()
    // Does nothing until Firebase is set up. See docs/push.md.
    startPush((where) => goFromPush(where))
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
      window.removeEventListener('pagehide', onLeave)
      window.removeEventListener('beforeunload', onLeave)
      navigator.serviceWorker?.removeEventListener('message', onMessage)
      stop()
    }
  }, [])

  useEffect(() => {
  }, [path])

  useEffect(() => {
    applyPrefsToDocument(prefs)
    const titles = {
      '/door': t('title.door'),
      '/name': t('title.name'),
      '/read': t('title.read'),
      '/into': t('title.into'),
      '/home': t('title.homePage'),
      '/tonight': t('title.homePage'),
      '/friends': t('title.friends'),
      '/people': t('title.people'),
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
      '/shop/accessories': t('title.shopAccessories'),
      '/gems': t('title.gems'),
      '/kit': t('title.kit'),
      '/account': t('title.account'),
      '/we': t('we.title'),
      '/we/new': t('we.newTitle'),
      '/you': t('lead.youTitle'),
    }
    document.title = titles[view] || 'Did I'
  }, [view, book, prefs])

  const pingLabel = pingButtonLabel(pingState)
  const hallProps = {
    pingLabel,
    onAskPings: pingLabel ? askPings : undefined,
    onImport: (next) => persist(next),
    onStartEmpty: () =>
      change({
        ...emptyBoard(),
        id: live.id,
        title: live.title,
        keeperName: live.keeperName,
      }),
    onSendCopy: sendCopy,
  }

  let inner = null
  if (view === '/name') {
    inner = (
      <NameBoard
        currentTitle={book?.title || ''}
        hasBoard={Boolean(book)}
        onOpenHere={() => openHall()}
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
        onSaveKeeper={saveKeeper}
        onEraseHere={(next) => persist(next)}
        returnTo={path === '/enter' ? undefined : path}
        returnFace={route.face}
      />
    )
  } else if (path === '/first' || (HALL.has(path) && emptyHall && !welcomeSeen())) {
    // Move to /first itself so the tab bar stays hidden until the first question is in.
    if (path !== '/first') queueMicrotask(() => goHash('/first'))
    inner = <FirstNight book={live} onChange={change} />
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
    inner = <Marks book={live} boards={shelf.boards} />
  } else if (path === '/shop') {
    inner = <Shop book={live} />
  } else if (path === '/shop/looks') {
    inner = <ShopLooks book={live} onChange={change} />
  } else if (path === '/shop/cheers') {
    inner = <ShopCheers book={live} onChange={change} />
  } else if (path === '/shop/buddies') {
    inner = <ShopBuddies book={live} onChange={change} />
  } else if (path === '/shop/accessories') {
    inner = <ShopAccessories book={live} onChange={change} />
  } else if (path === '/gifts') {
    inner = <GiftsSent book={live} />
  } else if (path === '/gift') {
    inner = <Gift key={route.id} book={live} onChange={change} toId={route.id} />
  } else if (path === '/gems') {
    inner = <GemShop book={live} />
  } else if (path === '/kit') {
    inner = <Collection key={route.id} book={live} onChange={change} startTab={route.id} />
  } else if (path === '/account') {
    inner = <Account book={live} onChange={change} />
  } else if (path === '/people') {
    inner = <People book={live} onChange={change} />
  } else if (path === '/people/refer') {
    inner = <PeopleRefer book={live} onChange={change} />
  } else if (path === '/people/connect') {
    inner = <PeopleConnect book={live} onChange={change} />
  } else if (path === '/friends') {
    inner = <Friends book={live} onChange={change} highlightAsk={route.id} />
  } else if (path === '/family') {
    inner = <Family book={live} onChange={change} familyId={route.id} />
  } else if (path === '/inbox') {
    inner = <Inbox book={live} onKeep={keepSent} />
  } else if (path === '/sent') {
    inner = <Sent book={live} />
  } else if (path === '/we/new') {
    inner = <WeNew book={live} start={route.start} withId={route.id} />
  } else if (path === '/you') {
    inner = <DidYou book={live} start={route.start} withId={route.id} />
  } else if (path === '/we') {
    inner = route.id ? (
      <WeCard book={live} cardId={route.id} onChange={change} />
    ) : (
      <WeHome book={live} onChange={change} link={route.link} />
    )
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
    inner = <LampPage book={live} boards={shelf.boards} onChange={change} lampId={route.id} />
  } else if (path === '/lamps') {
    inner = (
      <AllLamps
        book={live}
        boards={shelf.boards}
        tagId={tagId}
        onTag={setTag}
        onChange={change}
        onChangeBooks={changeBooks}
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
    inner = (
      <Calendar book={live} boards={shelf.boards} tagId={tagId} />
    )
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
        onStartEmpty={hallProps.onStartEmpty}
      />
    )
  } else if (path === '/settings' || path === '/settings/more') {
    inner = (
      <Profile
        page={path === '/settings/more' ? 'more' : ''}
        book={live}
        onChange={change}
        {...hallProps}
      />
    )
  } else if (path === '/settings/phone') {
    inner = <PhoneSettings book={live} onChange={change} />
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
      <Suspense fallback={<p className="di-set-note di-page-loading" role="status">{t('app.loading')}</p>}>{inner}</Suspense>
      {showNav ? <AppNav /> : null}
      {SITE.has(path) ? null : (
        <MarkToast mark={markNote} onClose={() => setMarkNote(null)} />
      )}
      {SITE.has(path) ? null : <DidYouBanner path={path} />}
      {SITE.has(path) || !live ? null : <GiftArrived book={live} onChange={change} />}
      <CheerBurst />
      {/* Asked only once first run is done and a question is in. */}
      {emptyHall || path === '/first' || SITE.has(path) ? null : <DiagnosticsAsk />}
      <StreakMomentHost />
    </>
  )
}
