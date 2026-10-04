import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FadeScroll } from '../components/FadeScroll.jsx'
import { AppState, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { cloudSetUp, supabaseSqlUrl } from '../../src/lib/cloud.js'
import { myDidYouLinks } from '../../src/lib/did-you-links.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { repeatLabel } from '../../src/lib/send-repeat.js'
import { passAlong } from '../../src/lib/native.js'
import {
  INVITE_GEMS_CAP,
  INVITE_LOOK_AT,
  invitePayoutNote,
  answerSend,
  reportSend,
  askByFriendId,
  cleanFriendId,
  formatFriendId,
  lookUpFriendId,
  myFriendId,
  blockPerson,
  claimInvites,
  cleanCode,
  doneTonight,
  friendAskNote,
  friendAskTitle,
  inboxCount,
  joinFamily,
  lookUpFamily,
  FAMILY_CODE_LEN,
  listBlocks,
  listFamilies,
  listFriends,
  listAutoAdds,
  listInbox,
  listSent,
  makeFamily,
  syncDisplayName,
  myInvite,
  personName,
  stillLinked,
  readMine,
  refreshPeople,
  sayNo,
  sayYes,
  sendCheer,
  buyCheers,
  cheerFriend,
  readFriendCheers,
  setAutoAdd,
  shareStreak,
  personById,
  sendsWith,
  takeBack,
  unblockPerson,
  unsendAsk,
  usePeoplePulse,
} from '../../src/lib/people.js'
import {
  FRIEND_CHEER_CAP,
  FRIEND_CHEER_GEMS,
  FRIEND_CHEERS_PER_GEM,
  fireCheer,
  friendCheerMissKey,
  applyInvitePayout,
  normalizePurse,
} from '../../src/lib/purse.js'
import { useKept } from '../hooks/useKept.js'
import { useOnline } from '../hooks/useOnline.js'
import { currentBook, readShelf } from '../../src/lib/board-shelf.js'
import { boardDate, formatBoardDate, isoDate } from '../../src/lib/recurrence.js'
import { BoardShell } from '../components/BoardShell.jsx'
import { confirmFriendCheers, offerMoreGems, publishSheet } from '../components/SheetHost.jsx'
import { InviteCodeSection } from '../components/InviteCodeSection.jsx'
import { WeAsks } from '../components/WeTonight.jsx'
import { InviteRewardBar } from '../components/InviteRewardBar.jsx'
import { Avatar, EmptyCard, PersonCard, SectionHead } from '../components/PersonCard.jsx'
import { SendSheet } from '../components/SendDidYou.jsx'
import { askRemoveFriend } from '../components/removeFriend.js'
import { KitSegment } from '../components/KitSegment.jsx'
import { ripple } from '../lib/ripple.js'
import { SetSwitch } from '../components/SetBits.jsx'
import {
  DidButton,
  Field,
  KeyButton,
  Meta,
  Row,
} from '../components/ui.jsx'
import { useHallColors } from '../hooks/useHallColors.js'
import { goHash } from '../navigation/hash.js'
import { confirmDone, once } from '../lib/confirm.js'
import { FamilyDetailScreen } from './FamilyDetail.jsx'
import { inviteLink } from '../../src/lib/invite-link.js'
import { fonts } from '../theme.js'
import { KeyboardLift } from '../components/KeyboardLift.jsx'
import { MenuIcon } from '../components/MenuIcon.jsx'
import { useAuthSignIn } from '../../src/lib/useAuthSignIn.js'
import { useWeTonight, weAskCount } from '../../src/lib/did-we.js'
import { AuthEmailCard } from '../components/AuthEmailCard.jsx'
import { QrCode } from '../components/QrCode.jsx'
import { friendQrLink, savePendingScan } from '../../src/lib/qr-links.js'
import { canScan } from './ScanScreen.jsx'

function ScreenShell({ book, title, children, colors }) {
  const live = book || currentBook(readShelf())
  const date = formatBoardDate(boardDate(new Date(), live.dayFoldHour))
  return (
    <BoardShell book={live} title={title} date={date} colors={colors}>
      {children}
    </BoardShell>
  )
}

function Cap({ children, colors }) {
  return <Text style={[styles.cap, { color: colors.inkDim }]}>{children}</Text>
}

function Miss({ children, colors }) {
  if (!children) return null
  return <Text style={[styles.miss, { color: colors.miss }]}>{children}</Text>
}

function OfflineLine({ colors }) {
  const online = useOnline()
  if (online) return null
  return <Meta colors={colors}>{t('people.offline')}</Meta>
}

function FriendMenu({ name, items, colors, onClose }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
        <Pressable
          accessible={false}
          style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.popKicker, { color: colors.on }]}>{name}</Text>
          {items.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => {
                onClose()
                item.onPress()
              }}
              style={({ pressed }) => [
                styles.menuRow,
                { borderColor: colors.lineSoft, backgroundColor: pressed ? colors.panel2 : 'transparent' },
              ]}
            >
              <Text style={[styles.menuRowText, { color: item.danger ? colors.miss : colors.ink }]}>{item.label}</Text>
            </Pressable>
          ))}
          <KeyButton colors={colors} label={t('settings.neverMind')} onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function BlockModal({ person, colors, onClose, onDone }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
        <Pressable
          accessible={false}
          style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.popKicker, { color: colors.on }]}>{t('block.block')}</Text>
          <Text style={[styles.popTitle, { color: colors.ink }]}>
            {t('block.title', { name: personName(person) || t('people.someone') })}
          </Text>
          <Meta colors={colors}>{t('block.body')}</Meta>
          <View style={styles.personActions}>
            <DidButton
              colors={colors}
              small
              label={t('block.yes')}
              onPress={async () => {
                onClose()
                const { miss: why } = await blockPerson(person.user_id)
                onDone(why)
              }}
            />
            <KeyButton
              colors={colors}
              label={t('block.andReport')}
              onPress={async () => {
                onClose()
                const { miss: why } = await blockPerson(person.user_id, 'reported from friends')
                onDone(why)
              }}
            />
            <KeyButton colors={colors} label={t('settings.neverMind')} onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// Ask before a friend action that can not be taken back with one tap.
function askFirst(colors, title, body, goLabel, onGo) {
  publishSheet({
    title,
    body,
    goLabel,
    closeLabel: t('settings.neverMind'),
    colors,
    onClose: () => publishSheet(null),
    onGo: async () => {
      publishSheet(null)
      await onGo()
    },
  })
}

function PreviewRow({ icon, title, body, colors }) {
  return (
    <View style={[styles.previewRow, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <View style={[styles.previewIcon, { backgroundColor: colors.panel2 }]}>
        <MenuIcon name={icon} color={colors.on} size={18} stroke />
      </View>
      <View style={styles.previewCopy}>
        <Text style={[styles.previewTitle, { color: colors.ink }]}>{title}</Text>
        <Text style={[styles.previewBody, { color: colors.inkDim }]}>{body}</Text>
      </View>
    </View>
  )
}

// A new friend is the moment a Did we makes sense: offer one, once per person.
function offerWeWith(person, colors) {
  const id = person?.user_id
  if (!id) return
  const key = 'did-i-we-offered'
  let seen = []
  try {
    seen = JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    seen = []
  }
  if (seen.includes(id)) return
  try {
    localStorage.setItem(key, JSON.stringify([...seen, id].slice(-200)))
  } catch {
    // ok
  }
  const name = personName(person) || t('people.someone')
  publishSheet({
    kicker: t('we.title'),
    title: t('we.friendTitle', { name }),
    body: t('we.friendBody'),
    goLabel: t('we.startWith', { name }),
    closeLabel: t('settings.neverMind'),
    colors,
    onClose: () => publishSheet(null),
    onGo: () => {
      publishSheet(null)
      goHash('/we/new', { id })
    },
  })
}

// Signed out, People was a dead end. A preview of what it does, then the
// full sign-in (Apple, Google and email) right here.
function NeedAccount({ kicker, title, colors }) {
  const auth = useAuthSignIn({})
  return (
    <ScreenShell title={title} colors={colors}>
      <Meta colors={colors}>{t('people.outBody')}</Meta>
      <Meta colors={colors}>{t('people.outComesAlong')}</Meta>
      <View style={styles.previewList}>
        <PreviewRow
          icon="people"
          title={t('people.previewCheerTitle')}
          body={t('people.previewCheerBody')}
          colors={colors}
        />
        <PreviewRow
          icon="home"
          title={t('people.previewFamilyTitle')}
          body={t('people.previewFamilyBody')}
          colors={colors}
        />
      </View>
      <AuthEmailCard colors={colors} auth={auth} body="" />
      <View style={styles.previewOther}>
        <KeyButton colors={colors} label={t('people.goAccount')} onPress={() => goHash('/account')} />
      </View>
    </ScreenShell>
  )
}

function CloudOff({ colors }) {
  return (
    <ScreenShell title={t('people.offTitle')} colors={colors}>
      <Meta colors={colors}>{t('people.offBody')}</Meta>
    </ScreenShell>
  )
}

function PersonRow({ title, note, colors, children, highlight }) {
  return (
    <View
      style={[
        styles.personRow,
        { borderColor: colors.line, backgroundColor: colors.panel },
        highlight ? styles.askRow : null,
      ]}
    >
      <View style={styles.personCopy}>
        <Text style={[styles.personTitle, { color: colors.ink }]}>{title}</Text>
        {note ? <Text style={[styles.personNote, { color: colors.inkDim }]}>{note}</Text> : null}
      </View>
      {children ? <View style={styles.personActions}>{children}</View> : null}
    </View>
  )
}

function friendLine(person) {
  if (!person?.share_streak) return t('people.quiet')
  if (person.done_on === isoDate(new Date())) return t('people.doneTonight')
  if (person.streak > 0) return t('people.streakN', { n: person.streak })
  return t('people.noStreak')
}

// The pill already says done tonight; the line under the name adds the streak.
function streakOnly(person) {
  return person?.streak > 0 ? t('people.streakN', { n: person.streak }) : ''
}

function sentState(state) {
  if (state === 'kept') return t('sent.kept')
  if (state === 'passed') return t('sent.passed')
  return t('sent.waiting')
}

function streakLine(row) {
  if (row.streak > 0) return t('all.streakN', { n: row.streak })
  return t('all.noStreak')
}

function Tile({ label, value, note, lit, onPress, colors }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: pressed ? colors.panel2 : lit ? colors.panel3 : colors.panel,
          borderColor: lit ? colors.on : colors.line,
        },
      ]}
    >
      <View style={styles.tileTop}>
        <Text style={[styles.tileLabel, { color: lit ? colors.on : colors.inkDim }]}>{label}</Text>
        <Text style={[styles.tileChev, { color: lit ? colors.on : colors.inkDim }]}>›</Text>
      </View>
      <Text style={[styles.tileValue, { color: colors.ink }]} numberOfLines={2}>
        {value}
      </Text>
      {note ? (
        <Text style={[styles.tileNote, { color: colors.inkDim }]} numberOfLines={2}>
          {note}
        </Text>
      ) : null}
    </Pressable>
  )
}

// A join code box that sits right under the family list, so joining a
// second or third family does not mean hunting through Connect.
function familyCodeMiss(why) {
  if (why === 'code') return t('people.codeShort')
  if (why === 'nofamily') return t('people.noFamily')
  if (why === 'tooMany') return t('friendId.tooMany')
  return tMiss(why)
}

// Look the code up first: "Join {family}? 3 people are in it." Nothing
// changes until Join.
function JoinFamilyCard({ colors, bare = false, scanned = '' }) {
  const [code, setCode] = useState('')
  const [miss, setMiss] = useState('')
  const [busy, setBusy] = useState(false)
  const [found, setFound] = useState(null)
  // A scanned family QR code: fill the box and look it up, same as Find.
  useEffect(() => {
    if (!scanned) return
    setCode(cleanCode(scanned))
    look(cleanCode(scanned))
  }, [scanned])
  async function look(typed = code) {
    setBusy(true)
    const result = await lookUpFamily(typed)
    setBusy(false)
    if (result.miss) return setMiss(familyCodeMiss(result.miss))
    setMiss('')
    return setFound(result)
  }
  async function join() {
    setBusy(true)
    const { miss: why, id } = await joinFamily(found.code)
    setBusy(false)
    if (why) return setMiss(familyCodeMiss(why))
    setCode('')
    setMiss('')
    setFound(null)
    confirmDone(t('confirm.joinedFamily', { name: found.name || t('people.familyOne') }))
    return goHash('/family', { id })
  }
  if (found) {
    const name = found.name || t('people.familyOne')
    return (
      <View style={bare ? styles.joinBare : [styles.famCard, { borderColor: colors.on, backgroundColor: colors.panel }]}>
        <Text style={[styles.popKicker, { color: colors.on }]}>{t('familyJoin.kicker')}</Text>
        <Text style={[styles.confirmName, { color: colors.ink }]}>{name}</Text>
        <Text style={[styles.confirmLine, { color: colors.inkSoft }]}>
          {found.already
            ? t('familyJoin.already', { name })
            : [
                found.members === 1 ? t('familyJoin.membersOne') : t('familyJoin.members', { n: found.members }),
                t('familyJoin.confirm', { name }),
              ].join(' ')}
        </Text>
        <Miss colors={colors}>{miss}</Miss>
        {found.already ? (
          <DidButton colors={colors} small label={t('familyJoin.open')} onPress={() => goHash('/family', { id: found.id })} />
        ) : (
          <DidButton colors={colors} small label={t('people.join')} disabled={busy} onPress={join} />
        )}
        <KeyButton
          colors={colors}
          label={found.already ? t('friendAsk.back') : t('familyJoin.dontJoin')}
          onPress={() => {
            setFound(null)
            setMiss('')
          }}
        />
      </View>
    )
  }
  return (
    <View style={bare ? styles.joinBare : [styles.famCard, styles.joinCard, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <View style={bare ? null : styles.joinField}>
        <Field
          colors={colors}
          label={t('people.joinCode')}
          value={code}
          onChangeText={(value) => setCode(cleanCode(value))}
          autoCapitalize="characters"
        />
        <Miss colors={colors}>{miss}</Miss>
      </View>
      <DidButton
        colors={colors}
        small
        label={t('friendId.find')}
        disabled={busy || code.length !== FAMILY_CODE_LEN}
        onPress={() => look()}
      />
      {canScan() ? <KeyButton colors={colors} label={t('qr.scan')} onPress={() => goHash('/scan')} /> : null}
    </View>
  )
}

// A small popup for the plus next to a section title.
function AddPop({ kicker, colors, onClose, children, noClose = false }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardLift>
        <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
          <Pressable
            accessible={false}
            style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={[styles.popKicker, { color: colors.on }]}>{kicker}</Text>
            {children}
            {noClose ? null : <KeyButton colors={colors} label={t('settings.close')} onPress={onClose} />}
          </Pressable>
        </Pressable>
      </KeyboardLift>
    </Modal>
  )
}

// "2 did you", "1 Did we invite", or "3 waiting" when both are there.
function inboxTileValue(didYous, weInvites) {
  if (didYous && weInvites) return t('people.waitingAll', { n: didYous + weInvites })
  if (didYous) return t('people.waiting', { n: didYous })
  if (weInvites) return weInvites === 1 ? t('people.weInviteOne') : t('people.weInvites', { n: weInvites })
  return t('people.inboxQuiet')
}

function friendIdMiss(why) {
  if (why === 'badId') return t('friendId.bad')
  if (why === 'nobody') return t('friendId.nobody')
  if (why === 'tooMany') return t('friendId.tooMany')
  return tMiss(why)
}

// Look a friend ID up first, then ask "Send a friend request to ...?".
// Nothing is sent until Send. Returns what both add screens need.
function useFriendAsk(onAsked) {
  const [found, setFound] = useState(null)
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')
  async function look(code) {
    setMiss('')
    setBusy(true)
    const result = await lookUpFriendId(code)
    setBusy(false)
    if (result.miss) return setMiss(friendIdMiss(result.miss))
    return setFound({ ...result, code })
  }
  async function send() {
    if (!found) return
    setMiss('')
    setBusy(true)
    const { miss: why, person } = await askByFriendId(found.code)
    setBusy(false)
    if (why) return setMiss(friendIdMiss(why))
    setFound(null)
    onAsked(t('people.asked', { name: personName(person || found.person) || t('people.someone') }))
  }
  return { found, busy, miss, look, send, cancel: () => { setFound(null); setMiss('') } }
}

function FriendConfirm({ ask, colors, onDone }) {
  const { found, busy, miss } = ask
  const name = personName(found.person) || t('people.someone')
  const state = found.state
  const line =
    state === 'friends'
      ? t('friendAsk.already', { name })
      : state === 'asked'
        ? t('friendAsk.pending', { name })
        : state === 'asksYou'
          ? t('friendAsk.asksYou', { name })
          : t('friendAsk.confirm', { name })
  return (
    <AddPop kicker={t('friendAsk.kicker')} colors={colors} onClose={ask.cancel} noClose>
      <View style={styles.confirmWho}>
        <Avatar person={found.person} colors={colors} size={52} />
        <View style={styles.confirmCopy}>
          <Text style={[styles.confirmName, { color: colors.ink }]} numberOfLines={1}>{name}</Text>
          <Text style={[styles.tileNote, { color: colors.inkDim }]}>{formatFriendId(found.code)}</Text>
        </View>
      </View>
      <Text style={[styles.confirmLine, { color: colors.inkSoft }]}>{line}</Text>
      <Miss colors={colors}>{miss}</Miss>
      {state === '' ? (
        <DidButton colors={colors} label={t('friendAsk.send')} disabled={busy} onPress={ask.send} />
      ) : null}
      {state === 'asksYou' ? (
        <DidButton
          colors={colors}
          label={t('friendAsk.seeRequest')}
          onPress={() => {
            ask.cancel()
            onDone?.()
            goHash('/friends')
          }}
        />
      ) : null}
      <KeyButton colors={colors} label={state === '' ? t('friendAsk.dontSend') : t('friendAsk.back')} onPress={ask.cancel} />
    </AddPop>
  )
}

// Add by friend ID.
function AddFriendPop({ colors, onClose, onAsked }) {
  const [draft, setDraft] = useState('')
  const [myId, setMyId] = useState('')
  const [showQr, setShowQr] = useState(false)
  const ask = useFriendAsk((words) => {
    onClose()
    onAsked(words)
  })
  useEffect(() => {
    let alive = true
    myFriendId().then((out) => {
      if (alive) setMyId(out.id || '')
    })
    return () => {
      alive = false
    }
  }, [])
  if (ask.found) return <FriendConfirm ask={ask} colors={colors} onDone={onClose} />
  return (
    <AddPop kicker={t('people.addOne')} colors={colors} onClose={onClose}>
      {/* Side by side: they scan yours, or you type or scan theirs. */}
      {myId ? (
        <KeyButton
          colors={colors}
          label={showQr ? t('qr.hideMine') : t('qr.showMine')}
          onPress={() => setShowQr((on) => !on)}
        />
      ) : null}
      {showQr ? (
        <View style={styles.qrBox}>
          <QrCode value={friendQrLink(myId)} size={180} label={t('qr.friendLabel')} />
          <Text style={[styles.tileNote, { color: colors.inkDim }]}>{formatFriendId(myId)}</Text>
        </View>
      ) : null}
      <Field
        colors={colors}
        label={t('friendId.add')}
        value={formatFriendId(draft)}
        onChangeText={(value) => setDraft(cleanFriendId(value))}
        keyboardType="number-pad"
      />
      <Miss colors={colors}>{ask.miss}</Miss>
      <DidButton
        colors={colors}
        label={t('friendId.find')}
        disabled={ask.busy || draft.length !== 12}
        onPress={() => ask.look(draft)}
      />
      {canScan() ? (
        <KeyButton
          colors={colors}
          label={t('qr.scan')}
          onPress={() => {
            onClose()
            goHash('/scan')
          }}
        />
      ) : null}
    </AddPop>
  )
}

export function PeopleScreen({ book, onChange }) {
  const colors = useHallColors()
  const account = useAccount()
  const [mine, setMine] = useKept(`people.mine:${account.user?.id}`, null)
  const [links, setLinks] = useKept(`people.links:${account.user?.id}`, { friends: [], asked: [], sent: [] })
  const [families, setFamilies] = useKept(`people.families:${account.user?.id}`, [])
  const [waiting, setWaiting] = useKept(`people.waiting:${account.user?.id}`, 0)
  // Did we invites open from the same Did you inbox, so the tile counts them too.
  const [weWaiting, setWeWaiting] = useKept(`people.weWaiting:${account.user?.id}`, 0)
  const [ready, setReady] = useKept(`people.ready:${account.user?.id}`, false)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [sheet, setSheet] = useState(null)
  const [tab, setTab] = useState('friends')

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      const [who, friendRows, famRows, count, weCount] = await Promise.all([
        readMine(),
        listFriends(),
        listFamilies(),
        inboxCount(),
        weAskCount().catch(() => 0),
      ])
      setMine(who)
      await syncDisplayName(book.keeperName)
      setLinks(friendRows)
      setFamilies(famRows)
      setWaiting(count)
      setWeWaiting(weCount)
      setMiss('')
    } catch {
      setMiss(t('people.reach'))
    }
    setReady(true)
  }, [account.user, book.keeperName])

  // The menu badge counts live; reload when a did you or friend ask comes or goes.
  const pulse = usePeoplePulse(account.user)
  useEffect(() => {
    load()
  }, [load, pulse.inbox, pulse.asks, pulse.friends, pulse.families])

  function say(words) {
    setMiss('')
    setSaid(words)
  }

  function answerAsk(id, yes, person) {
    return once(`ask:${id}`, () => answerAskNow(id, yes, person))
  }

  async function answerAskNow(id, yes, person) {
    const { miss: why } = yes ? await sayYes(id) : await sayNo(id)
    if (why) return setMiss(tMiss(why))
    if (yes) {
      say(t('confirm.nowFriends', { name: personName(person) || t('people.someone') }))
      offerWeWith(person, colors)
    } else say(t('confirm.askRemoved'))
    return load()
  }

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('people.kicker')} title={t('people.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('people.title')} colors={colors}>
        <Meta colors={colors}>{t('family.loading')}</Meta>
      </ScreenShell>
    )
  }

  const today = isoDate(new Date())
  // Only friends who share their streak can show done, so only they count.
  const sharing = links.friends.filter((row) => row.person?.share_streak !== false)
  const doneCount = sharing.filter((row) => doneTonight(row.person, today)).length

  return (
    <ScreenShell title={t('people.title')} colors={colors}>
      <OfflineLine colors={colors} />

      <View style={styles.tiles}>
        <Tile
          colors={colors}
          lit={waiting + weWaiting > 0}
          label={t('people.inboxTile')}
          value={inboxTileValue(waiting, weWaiting)}
          note={waiting ? t('people.waitingSub') : weWaiting ? t('people.weWaitingSub') : ''}
          onPress={() => goHash('/inbox')}
        />
        <Tile
          colors={colors}
          label={t('sent.kicker')}
          value={t('sent.tileValue')}
          note={t('sent.rowSub')}
          onPress={() => goHash('/sent')}
        />
      </View>

      <View style={styles.friendTabs}>
        <KitSegment
          items={[
            {
              id: 'friends',
              label: links.asked.length ? t('people.tabFriendsAsks', { n: links.asked.length }) : t('people.friends'),
            },
            { id: 'families', label: t('people.families') },
            { id: 'we', label: t('we.title') },
          ]}
          selected={tab}
          onSelect={setTab}
          colors={colors}
        />
      </View>

      {tab === 'friends' && links.asked.length ? (
        <>
          <SectionHead colors={colors} label={t('people.askBanner', { n: links.asked.length })} />
          {links.asked.map((row) => (
            <PersonCard
              key={row.id}
              colors={colors}
              highlight
              person={row.person}
              name={friendAskTitle(row.person) || t('people.someone')}
              line={friendAskNote(row.person)}
              actions={
                <>
                  <DidButton colors={colors} small label={t('people.yes')} onPress={() => answerAsk(row.id, true, row.person)} />
                  <KeyButton colors={colors} label={t('people.no')} onPress={() => askFirst(colors, t('people.noTitle', { name: personName(row.person) || t('people.someone') }), t('people.noBody'), t('people.no'), () => answerAsk(row.id, false))} />
                </>
              }
            />
          ))}
        </>
      ) : null}

      {tab === 'friends' ? (
        <>
      <SectionHead
        colors={colors}
        label={t('people.friends')}
        count={links.friends.length || null}
        link={t('people.seeAll')}
        onLink={() => goHash('/friends')}
        onAdd={links.friends.length ? () => setSheet({ kind: 'friend' }) : undefined}
        addLabel={t('people.addOne')}
      />
      {links.friends.length ? (
        <>
          <Text style={[styles.glance, { color: colors.inkSoft }]}>
            {sharing.length ? `${t('people.doneOf', { done: doneCount, n: sharing.length })} ` : ''}
            {t('people.stripHint')}
          </Text>
          <FadeScroll fade={colors.bg} contentContainerStyle={styles.strip}>
            {links.friends.map((row) => {
              const done = doneTonight(row.person, today)
              return (
                <Pressable
                  key={row.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${personName(row.person) || t('people.noName')}, ${friendLine(row.person)}`}
                  onPress={() => goHash('/friend', { id: row.person.user_id })}
                  style={styles.stripItem}
                >
                  <Avatar person={row.person} done={done} colors={colors} size={52} />
                  <Text style={[styles.stripName, { color: colors.ink }]} numberOfLines={personName(row.person) ? 1 : 2}>
                    {personName(row.person) || t('people.noName')}
                  </Text>
                  <Text style={[styles.stripLine, { color: done ? colors.on : colors.inkDim }]} numberOfLines={1}>
                    {done ? t('people.doneTonightShort') : t('people.notYet')}
                  </Text>
                </Pressable>
              )
            })}
          </FadeScroll>
        </>
      ) : (
        <EmptyCard colors={colors} title={t('people.noFriendsTitle')} body={t('people.noFriendsBody')}>
          <DidButton colors={colors} small label={t('people.connect')} onPress={() => goHash('/people/connect')} />
        </EmptyCard>
      )}
        </>
      ) : null}

      {tab === 'families' ? (
        <>
      <SectionHead
        colors={colors}
        label={t('people.families')}
        count={families.length || null}
        onAdd={families.length ? () => setSheet({ kind: 'family' }) : undefined}
        addLabel={t('people.join')}
      />
      {families.length ? (
        families.map((fam) => (
          <Pressable
            key={fam.id}
            accessibilityRole="button"
            onPress={() => goHash('/family', { id: fam.id })}
            style={({ pressed }) => [
              styles.famCard,
              { borderColor: colors.line, backgroundColor: pressed ? colors.panel2 : colors.panel },
            ]}
          >
            <Avatar person={{ display_name: fam.name }} colors={colors} />
            <View style={styles.famCopy}>
              <Text style={[styles.famName, { color: colors.ink }]} numberOfLines={1}>
                {fam.name}
              </Text>
              <Text style={[styles.famLine, { color: colors.inkDim }]}>
                {fam.role === 'parent' ? t('people.parent') : t('people.kid')}
              </Text>
            </View>
            <Text style={[styles.chev, { color: colors.inkDim }]}>›</Text>
          </Pressable>
        ))
      ) : (
        <EmptyCard colors={colors} title={t('people.noFamiliesTitle')} body={t('people.noFamiliesBody')}>
          <DidButton colors={colors} small label={t('people.startFamily')} onPress={() => goHash('/people/connect')} />
        </EmptyCard>
      )}
      {families.length ? null : <JoinFamilyCard colors={colors} />}
        </>
      ) : null}

      {tab === 'we' ? (
        <>
      <SectionHead colors={colors} label={t('we.title')} />
      <Row colors={colors} label={t('we.open')} note={t('we.empty')} onPress={() => goHash('/we')} />
      <Row
        colors={colors}
        label={t('didYouLink.textTitle')}
        note={t('didYouLink.textSub')}
        onPress={() => setSheet({ kind: 'send', person: null })}
      />
        </>
      ) : null}

      <SectionHead colors={colors} label={t('people.you')} />
      <Row
        colors={colors}
        label={t('people.name')}
        note={mine?.display_name || t('people.nameInAccount')}
        onPress={() => goHash('/account')}
      />
      <Row
        colors={colors}
        label={t('friendId.yours')}
        note={mine?.friend_id ? formatFriendId(mine.friend_id) : t('friendId.shareSub')}
        onPress={() => goHash('/people/connect')}
      />
      <Row
        colors={colors}
        label={t('people.connect')}
        note={t('people.connectSub')}
        onPress={() => goHash('/people/connect')}
      />

      {links.sent.length ? (
        <Meta colors={colors}>
          {t('people.outstanding', {
            names: links.sent.map((row) => personName(row.person)).filter(Boolean).join(', '),
          })}
        </Meta>
      ) : null}

      <Miss colors={colors}>{miss}</Miss>
      {said ? <Meta colors={colors}>{said}</Meta> : null}

      {sheet?.kind === 'send' ? (
        <SendSheet person={sheet.person} colors={colors} onClose={() => setSheet(null)} onSent={say} />
      ) : null}
      {sheet?.kind === 'friend' ? (
        <AddFriendPop colors={colors} onClose={() => setSheet(null)} onAsked={(words) => { say(words); load() }} />
      ) : null}
      {sheet?.kind === 'family' ? (
        <AddPop kicker={t('people.join')} colors={colors} onClose={() => setSheet(null)}>
          <JoinFamilyCard colors={colors} bare />
        </AddPop>
      ) : null}
    </ScreenShell>
  )
}

export function PeopleReferScreen({ book, onChange }) {
  const colors = useHallColors()
  const account = useAccount()
  const [invite, setInvite] = useKept(`refer.invite:${account.user?.id}`, '')
  const [joined, setJoined] = useKept(`refer.joined:${account.user?.id}`, 0)
  const [gemsPaid, setGemsPaid] = useKept(`refer.gems:${account.user?.id}`, 0)
  const [ready, setReady] = useKept(`refer.ready:${account.user?.id}`, false)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      const [code, who] = await Promise.all([myInvite(), readMine()])
      setInvite(code)
      setGemsPaid(Number(who?.invite_gems_paid) || 0)
      setMiss('')
    } catch {
      setMiss(t('people.reach'))
    }
    setReady(true)
  }, [account.user])

  const payOut = useCallback(async () => {
    if (!account.user) return
    try {
      const won = await claimInvites()
      setJoined(won.joined)
      const who = await readMine()
      setGemsPaid(Number(who?.invite_gems_paid) || 0)
      if (!won.gems && !won.looks.length) return
      if (onChange) onChange(applyInvitePayout(book, won))
      setSaid(invitePayoutNote(won))
    } catch {
      setMiss(t('people.reach'))
    }
  }, [account.user, book, onChange])

  useEffect(() => {
    load()
    payOut()
  }, [load, payOut])

  function say(words) {
    setMiss('')
    setSaid(words)
  }

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('people.refer')} title={t('people.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('people.refer')} colors={colors}>
        <Meta colors={colors}>{t('family.loading')}</Meta>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('people.refer')} colors={colors}>
      <OfflineLine colors={colors} />
      <Meta colors={colors}>{t('people.referBody')}</Meta>

      <InviteRewardBar colors={colors} gemsPaid={gemsPaid} joined={joined} />

      <Cap colors={colors}>{t('people.yourCode')}</Cap>
      <Row
        colors={colors}
        label={t('people.yourCode')}
        note={invite || '...'}
        onPress={
          invite
            ? async () => {
                const how = await passAlong(t('people.inviteLine', { code: invite, link: inviteLink(invite) }), t('people.invite'))
                if (how) say(t(how === 'copied' ? 'people.copied' : 'people.shared'))
                else setMiss(t('confirm.shareMiss'))
              }
            : undefined
        }
      />
      <Meta colors={colors}>
        {joined >= INVITE_LOOK_AT
          ? t('people.lookWon')
          : t('people.lookLeft', { n: INVITE_LOOK_AT - joined })}
      </Meta>
      <Meta colors={colors}>{t('people.inviteHint', { max: INVITE_GEMS_CAP, n: INVITE_LOOK_AT })}</Meta>

      <InviteCodeSection colors={colors} book={book} onChange={onChange} gemsPaid={gemsPaid} joined={joined} hideBar />

      <Miss colors={colors}>{miss}</Miss>
      {said ? <Meta colors={colors}>{said}</Meta> : null}
    </ScreenShell>
  )
}

export function PeopleConnectScreen({ book, route }) {
  const colors = useHallColors()
  const account = useAccount()
  const [famDraft, setFamDraft] = useState('')
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  // Everyone has a friend ID; it is the main way to add someone.
  const [myId, setMyId] = useState('')
  const [idDraft, setIdDraft] = useState('')
  const [showQr, setShowQr] = useState(false)
  const idAsk = useFriendAsk((words) => {
    setIdDraft('')
    say(words)
  })
  // Opened from a scanned QR code: route.id is friend:123456789012 or family:ABC123.
  const scan = String(route?.id || '')
  const scannedFriend = /^friend:(\d{12})$/.exec(scan)?.[1] || ''
  const scannedFamily = /^family:([A-Z0-9]{6})$/i.exec(scan)?.[1] || ''

  // Signed out: keep the scan, and the first signed-in open comes back here.
  useEffect(() => {
    if (scan && !account.user) savePendingScan(scan)
  }, [scan, account.user])

  useEffect(() => {
    if (!scannedFriend || !account.user) return
    setIdDraft(scannedFriend)
    idAsk.look(scannedFriend)
  }, [scannedFriend, route, account.user])

  useEffect(() => {
    if (!account.user) return undefined
    let alive = true
    myFriendId().then((out) => {
      if (alive) setMyId(out.id)
    })
    return () => {
      alive = false
    }
  }, [account.user])

  function say(words) {
    setMiss('')
    setSaid(words)
  }


  async function shareId() {
    const how = await passAlong(t('friendId.shareText', { id: formatFriendId(myId), link: friendQrLink(myId) }), t('friendId.title'))
    if (how === 'copied') say(t('friendId.copied'))
    else if (how === 'shared') say(t('people.shared'))
    else setMiss(t('confirm.shareMiss'))
  }

  async function newFamily() {
    const { miss: why, id } = await makeFamily(famDraft || t('people.familyOne'))
    if (why) return setMiss(tMiss(why))
    setFamDraft('')
    confirmDone(t('confirm.madeFamily', { name: famDraft || t('people.familyOne') }))
    return goHash('/family', { id })
  }


  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('people.connect')} title={t('people.outTitle')} colors={colors} />
  }

  return (
    <ScreenShell title={t('people.connect')} colors={colors}>
      <OfflineLine colors={colors} />
      <Meta colors={colors}>{t('people.connectBody')}</Meta>
      {/* A scanned family code: the Join box comes up top so it is not missed. */}
      {scannedFamily ? <JoinFamilyCard key={scan} colors={colors} scanned={scannedFamily} /> : null}

      <Row
        colors={colors}
        label={t('people.refer')}
        note={t('people.referSub')}
        onPress={() => goHash('/people/refer')}
      />

      <Cap colors={colors}>{t('people.addOne')}</Cap>
      <View style={[styles.groupCard, styles.groupPad, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <Field
          colors={colors}
          label={t('friendId.add')}
          value={formatFriendId(idDraft)}
          onChangeText={(value) => setIdDraft(cleanFriendId(value))}
          keyboardType="number-pad"
        />
        <Miss colors={colors}>{idAsk.found ? '' : idAsk.miss}</Miss>
        <DidButton
          colors={colors}
          label={t('friendId.find')}
          disabled={idAsk.busy || idDraft.length !== 12}
          onPress={() => idAsk.look(idDraft)}
        />
        {canScan() ? (
          <KeyButton colors={colors} label={t('qr.scan')} onPress={() => goHash('/scan')} />
        ) : null}
      </View>
      {idAsk.found ? <FriendConfirm ask={idAsk} colors={colors} /> : null}

      <View style={[styles.groupCard, styles.groupPad, styles.friendIdCard, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <Text style={[styles.tileNote, { color: colors.inkDim }]}>{t('friendId.yours')}</Text>
        <Text selectable style={[styles.friendId, { color: colors.ink }]}>
          {myId ? formatFriendId(myId) : t('family.loading')}
        </Text>
        <KeyButton colors={colors} label={t('friendId.share')} disabled={!myId} onPress={shareId} />
        {myId ? (
          <KeyButton
            colors={colors}
            label={showQr ? t('qr.hideMine') : t('qr.showMine')}
            onPress={() => setShowQr((on) => !on)}
          />
        ) : null}
        {showQr ? (
          <View style={styles.qrBox}>
            <QrCode value={friendQrLink(myId)} label={t('qr.friendLabel')} />
            <Meta colors={colors}>{t('qr.friendHint')}</Meta>
          </View>
        ) : null}
      </View>

      <Cap colors={colors}>{t('people.startFamily')}</Cap>
      <Field colors={colors} label={t('people.newFamily')} value={famDraft} onChangeText={setFamDraft} />
      <DidButton colors={colors} label={t('people.makeFamily')} onPress={newFamily} />
      <JoinFamilyCard colors={colors} bare />

      <Miss colors={colors}>{miss}</Miss>
      {said ? <Meta colors={colors}>{said}</Meta> : null}
    </ScreenShell>
  )
}

export function FriendsScreen({ book, onChange, highlightAsk = '' }) {
  const colors = useHallColors()
  const account = useAccount()
  const purse = normalizePurse(book)
  const [links, setLinks] = useKept(`friends.links:${account.user?.id}`, { friends: [], asked: [], sent: [] })
  const [blocks, setBlocks] = useKept(`friends.blocks:${account.user?.id}`, [])
  const [autoAdds, setAutoAdds] = useKept(`friends.auto:${account.user?.id}`, () => new Set())
  const [ready, setReady] = useKept(`friends.ready:${account.user?.id}`, false)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [sheet, setSheet] = useState(null)
  const [stock, setStock] = useState(null)
  // A friend request push lands on Requests.
  const [tab, setTab] = useState(highlightAsk ? 'requests' : '')
  const [blockedOpen, setBlockedOpen] = useState(false)
  const cheersLeft = stock == null ? purse.friendCheers : stock

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      const [friendRows, blockRows, serverCheers, autoRows] = await Promise.all([
        listFriends(),
        listBlocks(),
        readFriendCheers(),
        listAutoAdds(),
      ])
      setLinks(friendRows)
      setBlocks(blockRows)
      setAutoAdds(autoRows)
      if (typeof serverCheers === 'number') setStock(serverCheers)
      setMiss('')
    } catch {
      setMiss(t('people.reach'))
    }
    setReady(true)
  }, [account.user])

  // Someone removing you (or adding you) shows up without leaving the screen.
  const pulse = usePeoplePulse(account.user)
  useEffect(() => {
    load()
  }, [load, pulse.friends, pulse.asks])

  function say(words) {
    setMiss('')
    setSaid(words)
  }

  function answerAsk(id, yes, person) {
    return once(`ask:${id}`, () => answerAskNow(id, yes, person))
  }

  async function answerAskNow(id, yes, person) {
    setMiss('')
    const { miss: why } = yes ? await sayYes(id) : await sayNo(id)
    if (why) return setMiss(tMiss(why))
    if (yes) {
      say(t('confirm.nowFriends', { name: personName(person) || t('people.someone') }))
      offerWeWith(person, colors)
    } else say(t('confirm.askRemoved'))
    return load()
  }

  // Asks back and forth are dropped with the friendship; shared Did wes
  // stay until one of you leaves (we_on_unfriend).
  function cut(person) {
    setMiss('')
    askRemoveFriend({
      person,
      colors,
      onMiss: setMiss,
      onDone: (words) => {
        setSaid(words)
        load()
      },
    })
  }

  // A sent request can be taken back until they answer it.
  function unsend(row) {
    const name = personName(row.person) || t('people.someone')
    publishSheet({
      title: t('friends.unsendTitle', { name }),
      body: t('friends.unsendBody'),
      goLabel: t('friends.unsend'),
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
      onGo: async () => {
        publishSheet(null)
        setMiss('')
        const { miss: why } = await unsendAsk(row.id)
        if (why) return setMiss(tMiss(why))
        setSaid(t('friends.unsent', { name }))
        return load()
      },
    })
  }

  async function flipAuto(person) {
    const id = person.user_id
    const on = !autoAdds.has(id)
    // Show it at once; put it back if the save does not land.
    setAutoAdds((live) => {
      const next = new Set(live)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
    const { miss: why } = await setAutoAdd(id, on)
    if (!why) return
    setAutoAdds((live) => {
      const next = new Set(live)
      if (on) next.delete(id)
      else next.add(id)
      return next
    })
    setMiss(why === 'off' || why === 'out' ? tMiss(why) : t('friends.autoAddMiss'))
  }

  async function cheer(person) {
    const sent = await cheerFriend(book, person.user_id, purse.cheerOn)
    const known = friendCheerMissKey(sent.miss)
    if (known) return setMiss(t(known.key, known.vars))
    if (sent.miss) return setMiss(tMiss(sent.miss))
    setStock(normalizePurse(sent.book).friendCheers)
    if (onChange) onChange(sent.book)
    fireCheer(purse.cheerOn, 1)
    return say(t('family.cheerSent', { name: personName(person) || t('people.someone') }))
  }

  function gift(person) {
    goHash('/gift', { id: person.user_id })
  }

  function buyMore() {
    if (purse.gems < FRIEND_CHEER_GEMS) {
      offerMoreGems(colors)
      return
    }
    confirmFriendCheers(colors, buyNow)
  }

  function buyNow() {
    return once('buy-cheers', buyNowOnce)
  }

  async function buyNowOnce() {
    const bought = await buyCheers(book)
    if (bought.miss === 'gems') {
      offerMoreGems(colors)
      return
    }
    const known = friendCheerMissKey(bought.miss)
    if (known) return setMiss(t(known.key, known.vars))
    if (bought.miss) return setMiss(tMiss(bought.miss))
    setStock(normalizePurse(bought.book).friendCheers)
    if (onChange) onChange(bought.book)
    say(t('confirm.cheersBought', { n: FRIEND_CHEERS_PER_GEM }))
  }

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('people.friends')} title={t('people.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('friends.title', { n: 0 })} colors={colors}>
        <Meta colors={colors}>{t('family.loading')}</Meta>
      </ScreenShell>
    )
  }

  const today = isoDate(new Date())
  // Only friends who share their streak can show done, so only they count.
  const sharing = links.friends.filter((row) => row.person?.share_streak !== false)
  const doneCount = sharing.filter((row) => doneTonight(row.person, today)).length
  const requestCount = links.asked.length + links.sent.length
  const shown = tab || (links.asked.length ? 'requests' : 'friends')

  return (
    <ScreenShell title={t('friends.title', { n: links.friends.length })} colors={colors}>
      <OfflineLine colors={colors} />

      {sharing.length ? (
        <Text style={[styles.glance, { color: colors.inkSoft }]}>
          {t('people.doneOf', { done: doneCount, n: sharing.length })}
        </Text>
      ) : null}

      <View style={styles.friendTabs}>
        <KitSegment
          items={[
            { id: 'friends', label: t('people.friends') },
            {
              id: 'requests',
              label: requestCount ? t('friends.tabRequests', { n: requestCount }) : t('friends.requests'),
            },
          ]}
          selected={shown}
          onSelect={setTab}
          colors={colors}
        />
      </View>

      {shown === 'requests' ? (
        <>
      {requestCount ? null : <EmptyCard colors={colors} title={t('friends.noRequests')} body={t('friends.manage')} />}
      {links.asked.length ? (
        <>
          <SectionHead colors={colors} label={t('people.askBanner', { n: links.asked.length })} />
          {links.asked.map((row) => (
            <PersonCard
              key={row.id}
              colors={colors}
              highlight={highlightAsk ? row.id === highlightAsk : true}
              person={row.person}
              name={friendAskTitle(row.person) || t('people.someone')}
              line={friendAskNote(row.person)}
              actions={
                <>
                  <DidButton colors={colors} small label={t('people.yes')} onPress={() => answerAsk(row.id, true, row.person)} />
                  <KeyButton colors={colors} label={t('people.no')} onPress={() => askFirst(colors, t('people.noTitle', { name: personName(row.person) || t('people.someone') }), t('people.noBody'), t('people.no'), () => answerAsk(row.id, false))} />
                </>
              }
            />
          ))}
        </>
      ) : null}

      {links.sent.length ? (
        <>
          <SectionHead colors={colors} label={t('friends.waiting')} count={links.sent.length} />
          {links.sent.map((row) => (
            <PersonCard
              key={row.id}
              colors={colors}
              person={row.person}
              name={personName(row.person) || t('people.noName')}
              line={t('friends.notYet')}
              actions={<KeyButton colors={colors} label={t('friends.unsend')} onPress={() => unsend(row)} />}
            />
          ))}
        </>
      ) : null}
        </>
      ) : null}

      {shown === 'friends' ? (
        <>
      <View style={[styles.stockBar, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <View style={styles.stockCopy}>
          <Text style={[styles.stockValue, { color: colors.ink }]}>{t('friends.cheerStock', { n: cheersLeft })}</Text>
          <Text style={[styles.tileNote, { color: colors.inkDim }]}>{t('friends.cheerNote')}</Text>
        </View>
        <KeyButton
          colors={colors}
          disabled={cheersLeft + FRIEND_CHEERS_PER_GEM > FRIEND_CHEER_CAP}
          label={t('friends.cheerBuyShort')}
          onPress={buyMore}
        />
      </View>

      <SectionHead colors={colors} label={t('people.friends')} count={links.friends.length || null} />
      {links.friends.length ? (
        links.friends.map((row) => {
          const done = doneTonight(row.person, today)
          const auto = autoAdds.has(row.person.user_id)
          return (
            <PersonCard
              key={row.id}
              colors={colors}
              person={row.person}
              done={done}
              name={personName(row.person) || t('people.noName')}
              line={[done ? streakOnly(row.person) : friendLine(row.person), auto ? t('people.autoOnChip') : '']
                .filter(Boolean)
                .join(' · ')}
              pill={done ? t('people.doneTonightShort') : ''}
              pillOn={done}
              onOpen={() => goHash('/friend', { id: row.person.user_id })}
              actions={
                <>
                  <DidButton
                    colors={colors}
                    small
                    label={t('people.sendDidYou')}
                    onPress={() => setSheet({ person: row.person })}
                  />
                  <KeyButton
                    colors={colors}
                    disabled={cheersLeft < 1}
                    label={t('friends.cheerUse')}
                    onPress={() => cheer(row.person)}
                  />
                </>
              }
              more={
                <>
                  <SetSwitch
                    colors={colors}
                    label={t('friends.autoAdd')}
                    sub={auto ? t('friends.autoAddOn') : t('friends.autoAddOff')}
                    on={auto}
                    onPress={() => flipAuto(row.person)}
                  />
                  <View style={styles.personActions}>
                    <KeyButton
                      colors={colors}
                      label={t('gift.button')}
                      onPress={() => gift(row.person)}
                    />
                    <KeyButton colors={colors} label={t('people.drop')} onPress={() => cut(row.person)} />
                    <KeyButton colors={colors} label={t('block.block')} onPress={() => setConfirm(row.person)} />
                  </View>
                </>
              }
            />
          )
        })
      ) : (
        <EmptyCard colors={colors} title={t('people.noFriendsTitle')} body={t('people.noFriendsBody')}>
          <DidButton colors={colors} small label={t('people.connect')} onPress={() => goHash('/people/connect')} />
        </EmptyCard>
      )}
        </>
      ) : null}

      {links.friends.length ? (
        <DidButton colors={colors} label={t('people.connect')} onPress={() => goHash('/people/connect')} />
      ) : null}
      <KeyButton colors={colors} label={t('people.back')} onPress={() => goHash('/people')} />

      {blocks.length ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: blockedOpen }}
            onPress={() => setBlockedOpen((open) => !open)}
            style={({ pressed }) => [
              styles.famCard,
              { borderColor: colors.line, backgroundColor: pressed ? colors.panel2 : colors.panel },
            ]}
          >
            <View style={styles.famCopy}>
              <Text style={[styles.famName, { color: colors.ink }]}>{t('block.list')} · {blocks.length}</Text>
              <Text style={[styles.famLine, { color: colors.inkDim }]}>{t('block.cannotReach')}</Text>
            </View>
            <Text style={[styles.chev, { color: colors.inkDim }]}>{blockedOpen ? '⌄' : '›'}</Text>
          </Pressable>
          {blockedOpen ? blocks.map((row) => (
            <PersonCard
              key={row.user_id}
              colors={colors}
              person={row}
              name={row.display_name || t('people.noName')}
              line={t('block.cannotReach')}
              actions={
                <KeyButton
                  colors={colors}
                  label={t('block.unblock')}
                  onPress={() =>
                    askFirst(colors, t('block.unblockTitle', { name: row.display_name || t('people.someone') }), t('block.unblockBody'), t('block.unblock'), async () => {
                      const { miss: why } = await unblockPerson(row.user_id)
                      if (why) setMiss(tMiss(why))
                      load()
                    })
                  }
                />
              }
            />
          )) : null}
        </>
      ) : null}

      <Miss colors={colors}>{miss}</Miss>
      {said ? <Meta colors={colors}>{said}</Meta> : null}

      {sheet ? (
        <SendSheet person={sheet.person} colors={colors} onClose={() => setSheet(null)} onSent={say} />
      ) : null}
      {confirm ? (
        <BlockModal
          person={confirm}
          colors={colors}
          onClose={() => setConfirm(null)}
          onDone={(why) => {
            if (why) setMiss(tMiss(why))
            else say(t('confirm.blocked', { name: personName(confirm) || t('people.someone') }))
            load()
          }}
        />
      ) : null}
    </ScreenShell>
  )
}

function FamilyListScreen({ colors }) {
  const account = useAccount()
  const [families, setFamilies] = useKept(`people.families:${account.user?.id}`, [])
  const [pop, setPop] = useState(false)
  const [ready, setReady] = useKept(`families.ready:${account.user?.id}`, false)

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    setFamilies(await listFamilies())
    setReady(true)
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('family.kicker')} title={t('people.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('people.families')} colors={colors}>
        <Meta colors={colors}>{t('family.loading')}</Meta>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('people.families')} colors={colors}>
      <OfflineLine colors={colors} />
      <SectionHead
        colors={colors}
        label={t('people.families')}
        count={families.length || null}
        onAdd={families.length ? () => setPop(true) : undefined}
        addLabel={t('people.join')}
      />
      {families.length ? (
        families.map((fam) => (
          <Pressable
            key={fam.id}
            accessibilityRole="button"
            onPress={() => goHash('/family', { id: fam.id })}
            style={({ pressed }) => [
              styles.famCard,
              { borderColor: colors.line, backgroundColor: pressed ? colors.panel2 : colors.panel },
            ]}
          >
            <Avatar person={{ display_name: fam.name }} colors={colors} />
            <View style={styles.famCopy}>
              <Text style={[styles.famName, { color: colors.ink }]} numberOfLines={1}>
                {fam.name}
              </Text>
              <Text style={[styles.famLine, { color: colors.inkDim }]}>
                {fam.role === 'parent' ? t('people.parent') : t('people.kid')}
              </Text>
            </View>
            <Text style={[styles.chev, { color: colors.inkDim }]}>›</Text>
          </Pressable>
        ))
      ) : (
        <EmptyCard colors={colors} title={t('people.noFamiliesTitle')} body={t('people.noFamiliesBody')}>
          <DidButton colors={colors} small label={t('people.startFamily')} onPress={() => goHash('/people/connect')} />
        </EmptyCard>
      )}
      {families.length ? null : <JoinFamilyCard colors={colors} />}
      {pop ? (
        <AddPop kicker={t('people.join')} colors={colors} onClose={() => setPop(false)}>
          <JoinFamilyCard colors={colors} bare />
        </AddPop>
      ) : null}
      <KeyButton colors={colors} label={t('family.back')} onPress={() => goHash('/people')} />
    </ScreenShell>
  )
}

// One friend or family member: did yous both ways and the Did wes you
// share. Opened by tapping their card on Friends or in a family.
export function FriendScreen({ route }) {
  const colors = useHallColors()
  const account = useAccount()
  const otherId = route?.id || ''
  const [person, setPerson] = useKept(`friend.person:${otherId}`, { user_id: otherId })
  const [sends, setSends] = useState({ mine: [], theirs: [], miss: '' })
  const [keptLinks, setKeptLinks] = useState([])
  const [ready, setReady] = useState(false)
  const [sheet, setSheet] = useState(null)
  const [said, setSaid] = useState('')
  const [bigPhoto, setBigPhoto] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [menu, setMenu] = useState(false)
  // No longer friends or family (removed, or an old notification).
  const [gone, setGone] = useState(false)
  const [tab, setTab] = useState('')
  const { cards } = useWeTonight(account.user)

  const load = useCallback(async () => {
    if (!account.user || !otherId) return
    const [who, both, linked, made] = await Promise.all([
      personById(otherId),
      sendsWith(otherId),
      stillLinked(otherId),
      myDidYouLinks().catch(() => []),
    ])
    setKeptLinks(made.filter((link) => link.kept.some((row) => row.user_id === otherId)))
    setPerson(who)
    setSends(both)
    setGone(linked === false)
    setReady(true)
  }, [account.user, otherId])

  useEffect(() => {
    load()
  }, [load])

  if (!account.user) return <NeedAccount kicker={t('people.friends')} title={t('people.outTitle')} colors={colors} />
  const name = personName(person) || t('people.someone')
  const shownName = personName(person) || t('people.noName')
  const together = (cards || []).filter((card) =>
    (card.people || []).some((p) => p.id === otherId && p.state !== 'left'),
  )

  const shown =
    tab ||
    (sends.theirs.some((send) => send.state === 'sent')
      ? 'theirs'
      : sends.theirs.length
        ? 'theirs'
        : sends.mine.length || keptLinks.length
          ? 'mine'
          : together.length
            ? 'we'
            : 'theirs')

  if (gone) {
    return (
      <ScreenShell title={shownName} colors={colors}>
        <EmptyCard colors={colors} title={t('friend.goneTitle', { name })} body={t('friend.goneBody')}>
          <DidButton colors={colors} small label={t('people.seeAll')} onPress={() => goHash('/friends')} />
        </EmptyCard>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={shownName} colors={colors}>
      <OfflineLine colors={colors} />
      <View style={[styles.confirmWho, styles.friendCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <Pressable
          disabled={!person?.avatar_url}
          onPress={() => setBigPhoto(true)}
          accessibilityRole="imagebutton"
          accessibilityLabel={t('friend.photoBig', { name })}
        >
          <Avatar person={person} done={doneTonight(person)} colors={colors} size={52} />
        </Pressable>
        <View style={styles.confirmCopy}>
          <Text style={[styles.confirmName, { color: colors.ink }]} numberOfLines={1}>{shownName}</Text>
          <Text style={[styles.tileNote, { color: colors.inkDim }]}>{friendLine(person)}</Text>
        </View>
        <Pressable
          onPress={() => setMenu(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('friend.more', { name })}
          style={({ pressed }) => [styles.moreBtn, { borderColor: colors.line, backgroundColor: pressed ? colors.panel2 : colors.panel }]}
        >
          <Text style={[styles.moreText, { color: colors.inkSoft }]}>⋯</Text>
        </Pressable>
      </View>
      {bigPhoto && person?.avatar_url ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setBigPhoto(false)}>
          <Pressable
            style={[styles.veil, styles.photoVeil, { backgroundColor: colors.veil }]}
            onPress={() => setBigPhoto(false)}
            accessibilityRole="button"
            accessibilityLabel={t('settings.close')}
          >
            <Image source={{ uri: person.avatar_url }} style={styles.bigPhoto} resizeMode="cover" />
            <Text style={[styles.confirmName, { color: colors.ink }]}>{name}</Text>
          </Pressable>
        </Modal>
      ) : null}
      <View style={styles.friendActions}>
        <View style={styles.friendAction}>
          <DidButton colors={colors} label={t('friend.sendDidYou')} onPress={() => setSheet({ person })} />
          <Text style={[styles.friendHint, { color: colors.inkDim }]}>{t('friend.didYouHint', { name })}</Text>
        </View>
        <View style={styles.friendAction}>
          <Pressable
            onPress={() => goHash('/we/new', { id: otherId })}
            android_ripple={ripple(`${colors.on}33`)}
            accessibilityRole="button"
            accessibilityLabel={t('friend.startDidWe')}
            style={[styles.friendWe, { borderColor: colors.line, backgroundColor: colors.panel2 }]}
          >
            <Text style={[styles.friendWeText, { color: colors.ink }]}>{t('friend.startDidWe')}</Text>
          </Pressable>
          <Text style={[styles.friendHint, { color: colors.inkDim }]}>{t('friend.didWeHint')}</Text>
        </View>
      </View>
      {said ? <Meta colors={colors}>{said}</Meta> : null}
      {menu ? (
        <FriendMenu
          name={name}
          colors={colors}
          onClose={() => setMenu(false)}
          items={[
            {
              key: 'drop',
              label: t('people.drop'),
              onPress: () =>
                askRemoveFriend({
                  person,
                  colors,
                  onMiss: setSaid,
                  onDone: (words) => {
                    confirmDone(words)
                    goHash('/friends')
                  },
                }),
            },
            { key: 'block', label: t('block.block'), danger: true, onPress: () => setBlocking(true) },
            ...(person.avatar_url
              ? [
                  {
                    key: 'photo',
                    label: t('avatar.report'),
                    danger: true,
                    onPress: () =>
                      publishSheet({
                        title: t('avatar.reportTitle', { name }),
                        body: t('avatar.reportBody'),
                        goLabel: t('avatar.report'),
                        closeLabel: t('settings.neverMind'),
                        colors,
                        onClose: () => publishSheet(null),
                        onGo: async () => {
                          publishSheet(null)
                          const { miss: why } = await blockPerson(otherId, 'photo')
                          if (why) return setSaid(tMiss(why))
                          confirmDone(t('confirm.blocked', { name }))
                          return goHash('/friends')
                        },
                      }),
                  },
                ]
              : []),
          ]}
        />
      ) : null}
      {blocking ? (
        <BlockModal
          person={person}
          colors={colors}
          onClose={() => setBlocking(false)}
          onDone={(why) => {
            if (why) return setSaid(tMiss(why))
            confirmDone(t('confirm.blocked', { name }))
            return goHash('/friends')
          }}
        />
      ) : null}

      <View style={styles.friendTabs}>
        <KitSegment
          items={[
            { id: 'theirs', label: t('friend.tabTheirs', { n: sends.theirs.length }) },
            { id: 'mine', label: t('friend.tabMine', { n: sends.mine.length + keptLinks.length }) },
            { id: 'we', label: t('friend.tabWe', { n: together.length }) },
          ]}
          selected={shown}
          onSelect={setTab}
          colors={colors}
        />
      </View>
      {shown === 'theirs' ? (
        <>
      {sends.theirs.length ? (
        sends.theirs.map((send) => (
          <PersonRow
            key={send.id}
            colors={colors}
            title={send.question}
            note={[repeatLabel(send.repeat), theirSendState(send.state)].filter(Boolean).join(' · ')}
          >
            {send.state === 'sent' ? (
              <KeyButton colors={colors} label={t('inbox.kicker')} onPress={() => goHash('/inbox')} />
            ) : null}
          </PersonRow>
        ))
      ) : (
        <Meta colors={colors}>{ready ? t('friend.theySentNone', { name }) : t('family.loading')}</Meta>
      )}

        </>
      ) : null}
      {shown === 'mine' ? (
        <>
      {sends.mine.length || keptLinks.length ? (
        [...keptLinks.map((link) => (
          <PersonRow key={link.code} colors={colors} title={link.question} note={t('friend.linkKept')} />
        )), ...sends.mine.map((send) => (
          <PersonRow
            key={send.id}
            colors={colors}
            title={send.question}
            note={[repeatLabel(send.repeat), sentState(send.state)].filter(Boolean).join(' · ')}
          >
            {send.state === 'sent' ? (
              <KeyButton
                colors={colors}
                label={t('sent.takeBack')}
                onPress={async () => {
                  const { miss: why } = await takeBack(send.id)
                  setSaid(why ? tMiss(why) : '')
                  load()
                }}
              />
            ) : null}
          </PersonRow>
        ))]
      ) : (
        <Meta colors={colors}>{ready ? t('friend.youSentNone', { name }) : t('family.loading')}</Meta>
      )}
        </>
      ) : null}
      {shown === 'we' ? (
        <>
      {together.length ? (
        together.map((card) => (
          <Row
            key={card.id}
            colors={colors}
            label={card.question}
            note={card.myState === 'asked' ? t('we.asked') : ''}
            onPress={() => goHash('/we', { id: card.id })}
          />
        ))
      ) : (
        <Meta colors={colors}>{t('friend.togetherNone', { name })}</Meta>
      )}
        </>
      ) : null}

      {sheet?.person ? (
        <SendSheet
          person={sheet.person}
          colors={colors}
          onClose={() => setSheet(null)}
          onSent={(words) => {
            setSaid(words)
            load()
          }}
        />
      ) : null}
    </ScreenShell>
  )
}

// A did you they sent you, from your side.
function theirSendState(state) {
  if (state === 'kept') return t('friend.youKept')
  if (state === 'passed') return t('friend.youPassed')
  return t('friend.waitingOnYou')
}

export function FamilyScreen({ book, onChange, route }) {
  const colors = useHallColors()
  const familyId = route?.id || ''
  if (familyId) {
    return (
      <BoardShell book={book} title={t('family.kicker')} date={formatBoardDate(boardDate(new Date(), book.dayFoldHour))} colors={colors}>
        <FamilyDetailScreen book={book} onChange={onChange} familyId={familyId} colors={colors} />
      </BoardShell>
    )
  }
  return <FamilyListScreen colors={colors} />
}

export function InboxScreen({ book, onChange, onKeep, route }) {
  const colors = useHallColors()
  const account = useAccount()
  const [rows, setRows] = useKept(`inbox.rows:${account.user?.id}`, [])
  const [ready, setReady] = useKept(`inbox.ready:${account.user?.id}`, false)
  const [miss, setMiss] = useState('')
  const [menu, setMenu] = useState(null)
  // Keep or Pass tapped on the notification: keep:<send id> or pass:<send id>.
  const fromPush = /^(keep|pass):([0-9a-f-]{36})$/.exec(String(route?.id || ''))
  const pushDone = useRef(false)

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      // Family did yous and allowed friends go onto tonight first.
      await refreshPeople()
      setRows(await listInbox())
      setMiss('')
    } catch {
      setMiss(t('people.reach'))
    }
    setReady(true)
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!fromPush || pushDone.current || !ready) return
    const row = rows.find((item) => item.id === fromPush[2])
    if (!row) return
    pushDone.current = true
    answer(row, fromPush[1] === 'keep')
  }, [rows, ready])

  // One answer at a time per row, so a double tap cannot keep it twice.
  const answering = useRef(new Set())
  async function answer(row, keep) {
    if (answering.current.has(row.id)) return
    answering.current.add(row.id)
    setMiss('')
    const { miss: why } = await answerSend(row.id, keep)
    answering.current.delete(row.id)
    if (why) return setMiss(tMiss(why))
    if (keep && row.kind === 'cheer' && row.cheer_id) fireCheer(row.cheer_id, 1)
    if (keep && row.kind === 'todo' && onKeep) onKeep(row)
    if (row.kind === 'todo') confirmDone(keep ? t('didYouLink.added') : t('confirm.passed'))
    return load()
  }

  // Filed with the question and taken out of the inbox. Blocking stays on
  // the person's sheet.
  function report(row) {
    publishSheet({
      title: t('we.reportTitle'),
      body: t('we.reportBody'),
      goLabel: t('we.report'),
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
      onGo: async () => {
        publishSheet(null)
        const { miss: why } = await reportSend(row.id)
        if (why) setMiss(tMiss(why))
        else confirmDone(t('we.reported'))
        load()
      },
    })
  }

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('inbox.kicker')} title={t('inbox.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('inbox.title')} colors={colors}>
        <Meta colors={colors}>{t('family.loading')}</Meta>
      </ScreenShell>
    )
  }
  if (!rows.length) {
    return (
      <ScreenShell title={t('inbox.emptyTitle')} colors={colors}>
        <WeAsks colors={colors} />
        <Meta colors={colors}>{t('inbox.emptyBody')}</Meta>
        <Meta colors={colors}>{t('inbox.autoNote')}</Meta>
        <DidButton colors={colors} label={t('inbox.goPeople')} onPress={() => goHash('/people')} />
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('inbox.title')} colors={colors}>
      <OfflineLine colors={colors} />
      <WeAsks colors={colors} />
      <Meta colors={colors}>{t('inbox.hintAll')}</Meta>
      {rows.map((row) => (
        <PersonRow
          key={row.id}
          colors={colors}
          title={row.kind === 'cheer' ? t('inbox.aCheer') : row.question}
          note={[t('inbox.from', { name: personName(row.person) || t('people.someone') }), repeatLabel(row.repeat), row.note]
            .filter(Boolean)
            .join(' · ')}
        >
          <DidButton
            colors={colors}
            small
            label={row.kind === 'cheer' ? t('inbox.thanks') : t('inbox.keep')}
            onPress={() => answer(row, true)}
          />
          {row.kind === 'todo' ? (
            <Pressable
              onPress={() => setMenu(row)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('inbox.more')}
              style={({ pressed }) => [styles.moreBtn, { borderColor: colors.line, backgroundColor: pressed ? colors.panel2 : colors.panel }]}
            >
              <Text style={[styles.moreText, { color: colors.inkSoft }]}>⋯</Text>
            </Pressable>
          ) : null}
        </PersonRow>
      ))}
      {menu ? (
        <FriendMenu
          name={menu.question}
          colors={colors}
          onClose={() => setMenu(null)}
          items={[
            { key: 'pass', label: t('inbox.pass'), onPress: () => answer(menu, false) },
            ...(menu.appSend ? [] : [{ key: 'report', label: t('we.report'), danger: true, onPress: () => report(menu) }]),
          ]}
        />
      ) : null}
      <Miss colors={colors}>{miss}</Miss>
    </ScreenShell>
  )
}

export function SentScreen({ book, onChange }) {
  const colors = useHallColors()
  const account = useAccount()
  const [rows, setRows] = useKept(`sent.rows:${account.user?.id}`, [])
  const [links, setLinks] = useKept(`sent.links:${account.user?.id}`, [])
  const [ready, setReady] = useKept(`sent.ready:${account.user?.id}`, false)
  const [miss, setMiss] = useState('')

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      const [sent, made] = await Promise.all([listSent(), myDidYouLinks()])
      setRows(sent)
      setLinks(made)
      setMiss('')
    } catch {
      setMiss(t('people.reach'))
    }
    setReady(true)
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('sent.kicker')} title={t('people.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('sent.title')} colors={colors}>
        <Meta colors={colors}>{t('family.loading')}</Meta>
      </ScreenShell>
    )
  }
  if (!rows.length && !links.length) {
    return (
      <ScreenShell title={t('sent.title')} colors={colors}>
        <EmptyCard colors={colors} title={t('sent.emptyTitle')} body={t('sent.emptyBody')}>
          <DidButton colors={colors} small label={t('sent.goFriends')} onPress={() => goHash('/friends')} />
        </EmptyCard>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('sent.title')} colors={colors}>
      <OfflineLine colors={colors} />
      <View style={[styles.groupCard, styles.groupPad, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <Text style={[styles.famName, { color: colors.ink }]}>{t('sent.count', { n: rows.length + links.length })}</Text>
        <Text style={[styles.famLine, { color: colors.inkDim }]}>{t('sent.hint')}</Text>
      </View>
      {rows.length ? (
      <View style={[styles.groupCard, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      {rows.map((row, at) => (
        <View key={row.id} style={[styles.groupRow, at ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line } : null]}>
          <View style={styles.personCopy}>
            <Text style={[styles.personTitle, { color: colors.ink }]}>{row.kind === 'cheer' ? t('inbox.aCheer') : row.question}</Text>
            <Text style={[styles.personNote, { color: colors.inkDim }]}>
              {[t('sent.to', { name: personName(row.person) || t('people.someone') }), repeatLabel(row.repeat), sentState(row.state)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          {row.state === 'sent' ? (
            <KeyButton
              colors={colors}
              label={t('sent.takeBack')}
              onPress={async () => {
                setMiss('')
                const { miss: why } = await takeBack(row.id)
                if (why) setMiss(tMiss(why))
                else confirmDone(t('confirm.takenBack'))
                load()
              }}
            />
          ) : null}
        </View>
      ))}
      </View>
      ) : null}
      {links.length ? (
        <>
          <Cap colors={colors}>{t('sent.linksCap')}</Cap>
          <View style={[styles.groupCard, { borderColor: colors.line, backgroundColor: colors.panel }]}>
            {links.map((link, at) => (
              <View key={link.code} style={[styles.groupRow, at ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line } : null]}>
                <View style={styles.personCopy}>
                  <Text style={[styles.personTitle, { color: colors.ink }]}>{link.question}</Text>
                  <Text style={[styles.personNote, { color: colors.inkDim }]}>{linkKeptLine(link)}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}
      <Miss colors={colors}>{miss}</Miss>
    </ScreenShell>
  )
}

// Who kept a Did you you shared as a link.
function linkKeptLine(link) {
  if (!link.kept.length) return t('sent.keptNone')
  return t('sent.keptBy', { names: link.kept.map((row) => row.name || t('sent.keptAnon')).join(', ') })
}

const styles = StyleSheet.create({
  groupCard: { borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  groupPad: { padding: 14, gap: 8 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  previewList:{ gap: 8, marginTop: 12, marginBottom: 4 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  previewIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  previewCopy: { flex: 1, minWidth: 0, gap: 2 },
  previewTitle: { fontFamily: fonts.uiSemi, fontSize: 14 },
  previewBody: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  previewOther: { marginTop: 14 },
  joinCard: { alignItems: 'flex-end' },
  joinBare: { gap: 4 },
  joinField: { flex: 1 },
  cap: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  miss: { fontFamily: fonts.ui, fontSize: 14 },
  personRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 8,
  },
  askRow: {
    borderWidth: 2,
  },
  personCopy: { gap: 4 },
  personTitle: { fontFamily: fonts.uiSemi, fontSize: 15 },
  personNote: { fontFamily: fonts.ui, fontSize: 13 },
  personActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moreBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontFamily: fonts.uiBold, fontSize: 20, lineHeight: 22 },
  menuRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 14, paddingHorizontal: 4, borderRadius: 8 },
  menuRowText: { fontFamily: fonts.uiSemi, fontSize: 16 },
  wallRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  wallCopy: { flex: 1, gap: 4 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineLabel: { fontFamily: fonts.ui, fontSize: 13, flex: 1 },
  flagBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  cheerTally: { fontFamily: fonts.ui, fontSize: 13 },
  veil: { flex: 1, justifyContent: 'center', padding: 20 },
  pop: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
  popKicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  confirmWho: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  friendCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 16 },
  friendActions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  friendAction: { flex: 1, flexBasis: 0 },
  friendWe: { borderRadius: 999, minHeight: 48, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  friendWeText: { fontFamily: fonts.uiBold, fontSize: 15 },
  friendTabs: { marginBottom: 12 },
  friendHint: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 8, paddingHorizontal: 4 },
  confirmCopy: { flex: 1, minWidth: 0, gap: 2 },
  confirmName: { fontFamily: fonts.uiBold, fontSize: 18 },
  confirmLine: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  tiles: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  tile: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 14, gap: 4, minHeight: 96 },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileChev: { fontFamily: fonts.ui, fontSize: 20, lineHeight: 20 },
  tileLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  tileValue: { fontFamily: fonts.uiBold, fontSize: 16, lineHeight: 21 },
  tileNote: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  friendIdCard: { gap: 6, alignItems: 'flex-start' },
  photoVeil: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  bigPhoto: { width: 280, height: 280, borderRadius: 140 },
  qrBox: { alignSelf: 'stretch', alignItems: 'center', gap: 8, paddingVertical: 8 },
  friendId: { fontFamily: fonts.mono, fontSize: 22, letterSpacing: 1 },
  glance: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  strip: { gap: 14, paddingRight: 8, paddingBottom: 4 },
  stripItem: { width: 64, alignItems: 'center', gap: 4 },
  stripName: { fontFamily: fonts.uiSemi, fontSize: 12, maxWidth: 64, textAlign: 'center' },
  stripLine: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase', maxWidth: 64 },
  famCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  famCopy: { flex: 1, minWidth: 0, gap: 3 },
  famName: { fontFamily: fonts.uiBold, fontSize: 16 },
  famLine: { fontFamily: fonts.ui, fontSize: 13 },
  chev: { fontFamily: fonts.ui, fontSize: 22 },
  stockBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  stockCopy: { flex: 1, minWidth: 0, gap: 3 },
  stockValue: { fontFamily: fonts.uiBold, fontSize: 16 },
  popTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700' },
})
