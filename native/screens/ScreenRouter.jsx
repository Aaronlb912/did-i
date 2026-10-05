import { useEffect } from 'react'
import { readShelf } from '../../src/lib/board-shelf.js'
import { welcomeSeen } from '../../src/lib/hall-pages.js'
import { needsEnter } from '../../src/lib/session.js'
import { goHash, redirectFrom } from '../navigation/hash.js'
import { LegalScreen } from './LegalScreen.jsx'
import {
  AboutScreen,
  AccountScreen,
  BoardsScreen,
  CalendarScreen,
  EnterScreen,
  FeedScreen,
  FirstNightScreen,
  HelpScreen,
  IdeasScreen,
  LaterScreen,
  MarksScreen,
  PingScreen,
  StatsScreen,
  StreaksScreen,
  WeekGridScreen,
  WelcomeScreen,
} from './more.jsx'
import { PhoneSettingsScreen, ProfileScreen } from './profile.jsx'
import { WeCardScreen, WeHomeScreen } from './we.jsx'
import { AddScreen } from './AddScreen.jsx'
import { LampScreen, QuestionsScreen, SearchScreen } from './questions.jsx'
import {
  CollectionScreen,
  GemShopScreen,
  GiftScreen,
  GiftsSentScreen,
  ShopAccessoriesScreen,
  ShopBuddiesScreen,
  ShopCheersScreen,
  ShopLooksScreen,
  ShopScreen,
} from './shop.jsx'
import {
  FamilyScreen,
  FriendScreen,
  FriendsScreen,
  InboxScreen,
  PeopleConnectScreen,
  PeopleReferScreen,
  PeopleScreen,
  SentScreen,
} from './social.jsx'
import { TonightScreen } from './TonightScreen.jsx'
import { ScanScreen } from './ScanScreen.jsx'

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
  onImport,
  onStartEmpty,
  onSendCopy,
  onAskPings,
  pingLabel,
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
        onSaveKeeper={(patch) => change({ ...book, ...patch })}
        onEraseHere={onImport}
        returnTo={path === '/enter' ? undefined : path}
      />
    )
  }
  if (path === '/first') return <FirstNightScreen book={book} onChange={change} />
  // Go to /first itself, not just its screen, so the tab bar stays hidden there.
  if (HALL.has(path) && emptyHall && !welcomeSeen()) return <GoTo path="/first" from={path} />
  if (path === '/about') return <AboutScreen book={book} />
  if (path === '/help') return <HelpScreen />
  if (path === '/ideas') return <IdeasScreen />
  if (path === '/later') return <LaterScreen book={book} />
  if (path === '/marks') return <MarksScreen book={book} boards={boards} />
  if (path === '/shop') return <ShopScreen book={book} onChange={change} />
  if (path === '/shop/looks') return <ShopLooksScreen book={book} onChange={change} />
  if (path === '/shop/cheers') return <ShopCheersScreen book={book} onChange={change} />
  if (path === '/shop/buddies') return <ShopBuddiesScreen book={book} onChange={change} />
  if (path === '/shop/accessories') return <ShopAccessoriesScreen book={book} onChange={change} />
  if (path === '/gems') return <GemShopScreen book={book} />
  if (path === '/gifts') return <GiftsSentScreen book={book} />
  if (path === '/gift') return <GiftScreen key={route.id} book={book} onChange={change} toId={route.id} />
  if (path === '/kit') return <CollectionScreen key={route.id} book={book} onChange={change} startTab={route.id} />
  if (path === '/account') return <AccountScreen book={book} onChange={change} />
  if (path === '/people') return <PeopleScreen book={book} onChange={change} />
  if (path === '/scan') return <ScanScreen />
  if (path === '/people/refer') return <PeopleReferScreen book={book} onChange={change} />
  if (path === '/people/connect') return <PeopleConnectScreen key={route.id} book={book} onChange={change} route={route} />
  if (path === '/friends') return <FriendsScreen book={book} onChange={change} highlightAsk={route.id} />
  if (path === '/family') return <FamilyScreen book={book} onChange={change} route={route} />
  if (path === '/friend') return <FriendScreen route={route} />
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
  if (path === '/search') return <SearchScreen book={book} />
  if (path === '/week') return <WeekGridScreen book={book} boards={boards} tagId={tagId} />
  if (path === '/calendar') return <CalendarScreen book={book} boards={boards} tagId={tagId} />
  if (path === '/streaks') return <StreaksScreen book={book} boards={boards} tagId={tagId} />
  if (path === '/stats') return <StatsScreen book={book} boards={boards} tagId={tagId} />
  if (path === '/feed') return <FeedScreen book={book} boards={boards} tagId={tagId} />
  if (path === '/pings') return <PingScreen book={book} onChange={change} onAskPings={onAskPings} pingLabel={pingLabel} />
  if (path === '/me') {
    return (
      <BoardsScreen
        book={book}
        boards={boards}
        onSelect={switchBoard}
        onAdd={addBoard}
        onRemove={removeBoard}
        onChange={change}
        onStartEmpty={onStartEmpty}
      />
    )
  }
  if (path === '/settings') {
    return (
      <ProfileScreen
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
      focusLampId={route.face}
      focusKey={route.focusAt}
    />
  )
}
