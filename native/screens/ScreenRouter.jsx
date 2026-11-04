import { useEffect } from 'react'
import { readShelf } from '../../src/lib/board-shelf.js'
import { welcomeSeen } from '../../src/lib/hall-pages.js'
import { needsEnter } from '../../src/lib/session.js'
import { goHash, redirectFrom } from '../navigation/hash.js'
import { lazyScreen } from '../lib/lazy-screen.jsx'
import { afterIdle } from '../lib/launch-ready.js'
import { LegalScreen } from './LegalScreen.jsx'
import { LampScreen, QuestionsScreen } from './questions.jsx'
import { TonightScreen } from './TonightScreen.jsx'

// Everything off the two tabs loads the first time it opens.
const more = () => require('./more.jsx')
const AboutScreen = lazyScreen(more, 'AboutScreen')
const SeenScreen = lazyScreen(more, 'SeenScreen')
const AccountScreen = lazyScreen(more, 'AccountScreen')
const BoardsScreen = lazyScreen(more, 'BoardsScreen')
const CalendarScreen = lazyScreen(more, 'CalendarScreen')
const EnterScreen = lazyScreen(more, 'EnterScreen')
const FeedScreen = lazyScreen(more, 'FeedScreen')
const NotesScreen = lazyScreen(more, 'NotesScreen')
const FirstNightScreen = lazyScreen(more, 'FirstNightScreen')
const HelpScreen = lazyScreen(more, 'HelpScreen')
const IdeasScreen = lazyScreen(more, 'IdeasScreen')
const RecentScreen = lazyScreen(more, 'RecentScreen')
const LaterScreen = lazyScreen(more, 'LaterScreen')
const MarksScreen = lazyScreen(more, 'MarksScreen')
const PingScreen = lazyScreen(more, 'PingScreen')
const StatsScreen = lazyScreen(more, 'StatsScreen')
const StreaksScreen = lazyScreen(more, 'StreaksScreen')
const WeekGridScreen = lazyScreen(more, 'WeekGridScreen')
const WelcomeScreen = lazyScreen(more, 'WelcomeScreen')
const profile = () => require('./profile.jsx')
const PhoneSettingsScreen = lazyScreen(profile, 'PhoneSettingsScreen')
const ProfileScreen = lazyScreen(profile, 'ProfileScreen')
const we = () => require('./we.jsx')
const WeCardScreen = lazyScreen(we, 'WeCardScreen')
const WeHomeScreen = lazyScreen(we, 'WeHomeScreen')
const AddScreen = lazyScreen(() => require('./AddScreen.jsx'), 'AddScreen')
const RemindScreen = lazyScreen(() => require('./RemindScreen.jsx'), 'RemindScreen')
const shop = () => require('./shop.jsx')
const CollectionScreen = lazyScreen(shop, 'CollectionScreen')
const GemShopScreen = lazyScreen(shop, 'GemShopScreen')
const GiftScreen = lazyScreen(shop, 'GiftScreen')
const GiftsSentScreen = lazyScreen(shop, 'GiftsSentScreen')
const ShopAccessoriesScreen = lazyScreen(shop, 'ShopAccessoriesScreen')
const ShopBuddiesScreen = lazyScreen(shop, 'ShopBuddiesScreen')
const ShopCheersScreen = lazyScreen(shop, 'ShopCheersScreen')
const ShopLooksScreen = lazyScreen(shop, 'ShopLooksScreen')
const ShopScreen = lazyScreen(shop, 'ShopScreen')
const ShopFramesScreen = lazyScreen(() => require('./frames.jsx'), 'ShopFramesScreen')
const social = () => require('./social.jsx')
const FamilyScreen = lazyScreen(social, 'FamilyScreen')
const FriendScreen = lazyScreen(social, 'FriendScreen')
const FriendsScreen = lazyScreen(social, 'FriendsScreen')
const InboxScreen = lazyScreen(social, 'InboxScreen')
const PeopleConnectScreen = lazyScreen(social, 'PeopleConnectScreen')
const PeopleReferScreen = lazyScreen(social, 'PeopleReferScreen')
const PeopleScreen = lazyScreen(social, 'PeopleScreen')
const SentScreen = lazyScreen(social, 'SentScreen')
const ScanScreen = lazyScreen(() => require('./ScanScreen.jsx'), 'ScanScreen')

// Each screen file runs the first time it is required, and a big one (more,
// shop, social are ~3000 lines with their imports) held up the first open of
// any screen in it, so the push started late. After launch, require them one
// per idle slot, most used first, so every first open is already warm.
const WARM = [social, more, shop, profile, we, () => require('./AddScreen.jsx'), () => require('./frames.jsx'), () => require('./ScanScreen.jsx')]
let warmed = false
export function warmScreens() {
  if (warmed) return
  warmed = true
  const next = (at) => {
    if (at >= WARM.length) return
    afterIdle(() => {
      try {
        WARM[at]()
      } catch {
        // Opening the screen will show the same error, where it can be handled.
      }
      setTimeout(() => next(at + 1), 120)
    })
  }
  setTimeout(() => next(0), 1500)
}

const HALL = new Set(['/', '/home', '/tonight'])

// Redirect after render; calling goHash while rendering updates AppShell
// mid-render, which React warns about. The hall stays mounted under every
// pushed screen, so only the screen on top may redirect.
function freshHall() {
  const empty = readShelf().boards.every(
    (item) => (item.lamps || []).filter((lamp) => !lamp.archived).length === 0,
  )
  return empty && !welcomeSeen()
}

function GoTo({ path, from }) {
  useEffect(() => redirectFrom(from, path, freshHall), [from, path])
  return null
}

export function ScreenRouter({
  route,
  book,
  shelf,
  tagId,
  change,
  changeBooks,
  setTag,
  saveLamp,
  keepSent,
  switchBoard,
  addBoard,
  removeBoard,
  reorderBoards,
  onImport,
  onStartEmpty,
  onSendCopy,
  onAskPings,
  pingLabel,
  firstAdd,
}) {
  const path = route.path
  const boards = shelf.boards
  const emptyHall = boards.every(
    (item) => (item.lamps || []).filter((lamp) => !lamp.archived).length === 0,
  )
  if (path === '/privacy') return <LegalScreen kind="privacy" book={book} />
  if (path === '/terms') return <LegalScreen kind="terms" book={book} />
  if (path === '/welcome') return <WelcomeScreen book={book} />
  if (path === '/enter' || (needsEnter(book) && path !== '/welcome' && path !== '/first')) {
    return (
      <EnterScreen
        book={book}
        onSaveKeeper={(patch) => change({ ...book, ...patch, ...(patch?.title && patch.title !== book.title ? { at: new Date().toISOString() } : {}) })}
        onEraseHere={onImport}
        returnTo={path === '/enter' ? undefined : path}
      />
    )
  }
  if (path === '/first') return <FirstNightScreen book={book} onChange={change} />
  // Go to /first itself, not just its screen, so the tab bar stays hidden there.
  if (HALL.has(path) && emptyHall && !welcomeSeen()) return <GoTo path="/first" from={path} />
  if (path === '/about') return <AboutScreen book={book} />
  if (path === '/settings/seen') return <SeenScreen book={book} />
  if (path === '/help') return <HelpScreen />
  if (path === '/ideas') return <IdeasScreen />
  if (path === '/recent') return <RecentScreen />
  if (path === '/later') return <LaterScreen book={book} />
  if (path === '/marks') return <MarksScreen book={book} boards={boards} />
  if (path === '/shop') return <ShopScreen book={book} onChange={change} />
  if (path === '/shop/looks') return <ShopLooksScreen book={book} onChange={change} />
  if (path === '/shop/cheers') return <ShopCheersScreen book={book} onChange={change} />
  if (path === '/shop/buddies') return <ShopBuddiesScreen book={book} onChange={change} />
  if (path === '/shop/accessories') return <ShopAccessoriesScreen book={book} onChange={change} />
  if (path === '/shop/frames') return <ShopFramesScreen book={book} onChange={change} />
  if (path === '/gems') return <GemShopScreen book={book} />
  if (path === '/gifts') return <GiftsSentScreen book={book} />
  if (path === '/gift') return <GiftScreen key={route.id} book={book} onChange={change} toId={route.id} />
  if (path === '/kit') return <CollectionScreen key={route.id} book={book} onChange={change} startTab={route.id} />
  if (path === '/account') return <AccountScreen book={book} onChange={change} />
  if (path === '/people') return <PeopleScreen book={book} onChange={change} />
  if (path === '/scan') return <ScanScreen />
  if (path === '/people/refer') return <PeopleReferScreen key={route.id} book={book} onChange={change} route={route} />
  if (path === '/people/connect') return <PeopleConnectScreen key={route.id} book={book} onChange={change} route={route} />
  if (path === '/friends') return <FriendsScreen book={book} onChange={change} highlightAsk={route.id} />
  if (path === '/family') return <FamilyScreen book={book} onChange={change} route={route} />
  if (path === '/friend') return <FriendScreen book={book} onChange={change} route={route} />
  if (path === '/inbox') return <InboxScreen key={route.id} book={book} onChange={change} onKeep={keepSent} route={route} />
  if (path === '/sent') return <SentScreen book={book} onChange={change} />
  // /we/new: start is an idea to fill in, id a person to ask. /we: the Did we
  // home, or one card's page with an id.
  if (path === '/we/new') {
    return <AddScreen mode="we" book={book} boards={boards} onChange={change} onSaveTo={saveLamp} route={route} />
  }
  if (path === '/we') {
    return route.id ? (
      <WeCardScreen book={book} cardId={route.id} onChange={change} />
    ) : (
      <WeHomeScreen book={book} onChange={change} />
    )
  }
  if (path === '/add' || path === '/hang') {
    return <AddScreen book={book} boards={boards} onChange={change} onSaveTo={saveLamp} route={route} />
  }
  if (path === '/remind') return <RemindScreen book={book} route={route} />
  if (path === '/lamp') {
    return <LampScreen book={book} boards={boards} onChange={change} route={route} />
  }
  if (path === '/lamps') {
    return (
      <QuestionsScreen
        book={book}
        boards={boards}
        tagId={tagId}
        onTag={setTag}
        onChange={change}
        onChangeBooks={changeBooks}
        onOpen={(boardId, lampId) => {
          if (boardId && boardId !== book.id) switchBoard(boardId)
          goHash('/lamp', { id: lampId })
        }}
      />
    )
  }
  if (path === '/search') return <GoTo path="/lamps" from={path} />
  if (path === '/week') return <WeekGridScreen book={book} boards={boards} tagId={tagId} />
  if (path === '/calendar') return <CalendarScreen key={route.id || ''} book={book} boards={boards} tagId={tagId} route={route} onChangeBooks={changeBooks} />
  if (path === '/streaks') return <StreaksScreen book={book} boards={boards} tagId={tagId} />
  if (path === '/stats') return <StatsScreen book={book} boards={boards} tagId={tagId} />
  if (path === '/feed') return <FeedScreen book={book} boards={boards} tagId={tagId} />
  if (path === '/notes') return <NotesScreen book={book} boards={boards} />
  if (path === '/pings') return <PingScreen book={book} boards={shelf.boards} onChange={change} onAskPings={onAskPings} pingLabel={pingLabel} />
  if (path === '/me') {
    return (
      <BoardsScreen
        book={book}
        boards={boards}
        onSelect={switchBoard}
        onAdd={addBoard}
        onRemove={removeBoard}
        onReorder={reorderBoards}
        onChange={change}
        onChangeBooks={changeBooks}
        onStartEmpty={onStartEmpty}
      />
    )
  }
  const settingsPage = { '/settings/more': 'more', '/settings/look': 'look', '/settings/nights': 'nights', '/settings/privacy': 'privacy', '/settings/help': 'help' }[path]
  if (path === '/settings' || settingsPage) {
    return (
      <ProfileScreen
        page={settingsPage || ''}
        book={book}
        onChange={change}
        onImport={onImport}
        onStartEmpty={onStartEmpty}
        onSendCopy={onSendCopy}
      />
    )
  }
  if (path === '/settings/phone') {
    return <PhoneSettingsScreen book={book} onChange={change} />
  }

  return (
    <TonightScreen
      book={book}
      boards={boards}
      tagId={tagId}
      onTag={setTag}
      onChange={change}
      onKeep={keepSent}
      focusLampId={route.face}
      focusKey={route.focusAt}
      firstAdd={firstAdd}
      onAskPings={onAskPings}
      pingLabel={pingLabel}
    />
  )
}
