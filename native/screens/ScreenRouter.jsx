import { useEffect } from 'react'
import { welcomeSeen } from '../../src/lib/hall-pages.js'
import { needsEnter } from '../../src/lib/session.js'
import { goHash } from '../navigation/hash.js'
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
import { HangScreen, LampScreen, QuestionsScreen, SearchScreen } from './questions.jsx'
import {
  CollectionScreen,
  GemShopScreen,
  ShopBuddiesScreen,
  ShopCheersScreen,
  ShopLooksScreen,
  ShopScreen,
} from './shop.jsx'
import {
  FamilyScreen,
  FriendsScreen,
  InboxScreen,
  PeopleConnectScreen,
  PeopleReferScreen,
  PeopleScreen,
  SentScreen,
} from './social.jsx'
import { TonightScreen } from './TonightScreen.jsx'

const HALL = new Set(['/', '/home', '/tonight'])

// Redirect after render; calling goHash while rendering updates AppShell
// mid-render, which React warns about.
function GoTo({ path }) {
  useEffect(() => {
    goHash(path)
  }, [path])
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
        returnTo={path === '/enter' ? undefined : path}
      />
    )
  }
  if (path === '/first' || (HALL.has(path) && emptyHall && !welcomeSeen())) {
    return <FirstNightScreen book={book} onChange={change} />
  }
  if (path === '/about') return <AboutScreen book={book} />
  if (path === '/help') return <HelpScreen />
  if (path === '/ideas') return <IdeasScreen />
  if (path === '/later') return <LaterScreen book={book} />
  if (path === '/marks') return <MarksScreen book={book} />
  if (path === '/shop') return <ShopScreen book={book} onChange={change} />
  if (path === '/shop/looks') return <ShopLooksScreen book={book} onChange={change} />
  if (path === '/shop/cheers') return <ShopCheersScreen book={book} onChange={change} />
  if (path === '/shop/buddies') return <ShopBuddiesScreen book={book} onChange={change} />
  if (path === '/gems') return <GemShopScreen book={book} />
  if (path === '/kit') return <CollectionScreen book={book} onChange={change} />
  if (path === '/account') return <AccountScreen book={book} onChange={change} />
  if (path === '/people') return <PeopleScreen book={book} onChange={change} />
  if (path === '/people/refer') return <PeopleReferScreen book={book} onChange={change} />
  if (path === '/people/connect') return <PeopleConnectScreen book={book} onChange={change} />
  if (path === '/friends') return <FriendsScreen book={book} onChange={change} highlightAsk={route.id} />
  if (path === '/family') return <FamilyScreen book={book} onChange={change} route={route} />
  if (path === '/inbox') return <InboxScreen book={book} onChange={change} onKeep={keepSent} />
  if (path === '/sent') return <SentScreen book={book} onChange={change} />
  if (path === '/add' || path === '/hang') {
    return (
      <HangScreen
        book={book}
        boards={boards}
        onChange={change}
        onSaveTo={saveLamp}
        route={route}
      />
    )
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
  if (path === '/week') return <WeekGridScreen book={book} />
  if (path === '/calendar') return <CalendarScreen book={book} boards={boards} tagId={tagId} />
  if (path === '/streaks') return <StreaksScreen book={book} />
  if (path === '/stats') return <StatsScreen book={book} />
  if (path === '/feed') return <FeedScreen book={book} />
  if (path === '/pings') return <PingScreen book={book} onAskPings={onAskPings} pingLabel={pingLabel} />
  if (path === '/me') {
    return (
      <BoardsScreen
        book={book}
        boards={boards}
        onSelect={switchBoard}
        onAdd={addBoard}
        onRemove={removeBoard}
        onChange={change}
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
    />
  )
}
