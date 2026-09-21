import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { cloudSetUp, supabaseSqlUrl } from '../../src/lib/cloud.js'
import { didTonightLabels } from '../../src/lib/dit-board.js'
import { DIT_ENABLED } from '../../src/lib/features.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { passAlong } from '../../src/lib/native.js'
import {
  INVITE_COINS,
  INVITE_LOOK_AT,
  answerSend,
  askFriend,
  blockPerson,
  claimInvites,
  cleanCode,
  cleanHandle,
  cleanInvite,
  cleanName,
  dropFriend,
  giftCheer,
  inboxCount,
  joinFamily,
  listBlocks,
  listFamilies,
  listFriends,
  listInbox,
  listSent,
  makeFamily,
  myHandle,
  myInvite,
  personName,
  readMine,
  reportTonightLine,
  saveName,
  sayNo,
  sayYes,
  sendCheer,
  sendDidI,
  setPublicTonight,
  shareStreak,
  syncTonightBoard,
  takeBack,
  tonightWall,
  TONIGHT_CHEER_GEMS,
  cheerOn,
  unblockPerson,
  useInvite,
} from '../../src/lib/people.js'
import {
  CHEER_GEMS,
  FRIEND_CHEER_GEMS,
  fireCheer,
  giveCoins,
  normalizePurse,
  spendGems,
} from '../../src/lib/purse.js'
import { useOnline } from '../hooks/useOnline.js'
import { currentBook, readShelf } from '../../src/lib/board-shelf.js'
import { boardDate, formatBoardDate, isoDate } from '../../src/lib/recurrence.js'
import { BoardShell } from '../components/BoardShell.jsx'
import {
  DidButton,
  Field,
  KeyButton,
  Meta,
  Row,
} from '../components/ui.jsx'
import { useHallColors } from '../hooks/useHallColors.js'
import { goHash } from '../navigation/hash.js'
import { FamilyDetailScreen } from './FamilyDetail.jsx'
import { fonts } from '../theme.js'

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

function SendSheet({ person, colors, onClose, onSent }) {
  const [question, setQuestion] = useState('')
  const [note, setNote] = useState('')
  const [miss, setMiss] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    if (!question.trim()) {
      setMiss(t('people.sendBlank'))
      return
    }
    setBusy(true)
    const { miss: why } = await sendDidI(person.user_id, question, note)
    setBusy(false)
    if (why === 'already') return setMiss(t('people.sendAlready'))
    if (why) return setMiss(tMiss(why))
    onSent(t('people.sentTo', { name: personName(person) }))
    onClose()
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
        <Pressable
          style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.popKicker, { color: colors.on }]}>{t('people.sendTitle')}</Text>
          <Meta colors={colors}>{t('people.sendHint', { name: personName(person) })}</Meta>
          <Field colors={colors} label={t('people.sendWhat')} value={question} onChangeText={setQuestion} />
          <Field colors={colors} label={t('people.sendNote')} value={note} onChangeText={setNote} />
          <Miss colors={colors}>{miss}</Miss>
          <View style={styles.personActions}>
            <DidButton colors={colors} small label={t('people.send')} disabled={busy} onPress={send} />
            <KeyButton colors={colors} label={t('settings.neverMind')} onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function BlockModal({ person, colors, onClose, onDone }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
        <Pressable
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

function NeedAccount({ kicker, title, colors }) {
  return (
    <ScreenShell title={title} colors={colors}>
      <Meta colors={colors}>{t('people.outBody')}</Meta>
      <DidButton colors={colors} label={t('people.goAccount')} onPress={() => goHash('/account')} />
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

function PersonRow({ title, note, colors, children }) {
  return (
    <View style={[styles.personRow, { borderColor: colors.line, backgroundColor: colors.panel }]}>
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

function sentState(state) {
  if (state === 'kept') return t('sent.kept')
  if (state === 'passed') return t('sent.passed')
  return t('sent.waiting')
}

function streakLine(row) {
  if (row.streak > 0) return t('all.streakN', { n: row.streak })
  return t('all.noStreak')
}

export function PeopleScreen({ book, onChange }) {
  const colors = useHallColors()
  const account = useAccount()
  const [mine, setMine] = useState(null)
  const [links, setLinks] = useState({ friends: [], asked: [], sent: [] })
  const [families, setFamilies] = useState([])
  const [waiting, setWaiting] = useState(0)
  const [invite, setInvite] = useState('')
  const [joined, setJoined] = useState(0)
  const [inviteDraft, setInviteDraft] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const [handle, setHandle] = useState('')
  const [addDraft, setAddDraft] = useState('')
  const [famDraft, setFamDraft] = useState('')
  const [codeDraft, setCodeDraft] = useState('')
  const [ready, setReady] = useState(false)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [sheet, setSheet] = useState(null)

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      const [who, friendRows, famRows, count, code, tag] = await Promise.all([
        readMine(),
        listFriends(),
        listFamilies(),
        inboxCount(),
        myInvite(),
        myHandle(),
      ])
      setMine(who)
      setNameDraft(who?.display_name || '')
      setHandle(tag || who?.handle || '')
      setLinks(friendRows)
      setFamilies(famRows)
      setWaiting(count)
      setInvite(code)
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
      if (!won.coins && !won.looks.length) return
      if (onChange) onChange(giveCoins(book, won.coins, won.looks))
      setSaid(
        won.looks.length
          ? t('people.wonLook', { coins: won.coins })
          : t('people.wonCoins', { coins: won.coins }),
      )
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

  async function keepName() {
    const { miss: why, name } = await saveName(nameDraft)
    if (why) return setMiss(tMiss(why))
    setNameDraft(name)
    say(t('people.nameSaved'))
    return load()
  }

  async function redeem() {
    const { miss: why } = await useInvite(inviteDraft)
    if (why === 'code') return setMiss(t('people.inviteShort'))
    if (why === 'nobody') return setMiss(t('people.noInvite'))
    if (why === 'self') return setMiss(t('people.ownInvite'))
    if (why === 'used') return setMiss(t('people.inviteUsed'))
    if (why) return setMiss(tMiss(why))
    setInviteDraft('')
    await payOut()
    return load()
  }

  async function ask() {
    const { miss: why, person } = await askFriend(addDraft)
    if (why === 'short') return setMiss(t('people.handleShort'))
    if (why === 'nobody') return setMiss(t('people.noOne', { handle: cleanHandle(addDraft) }))
    if (why) return setMiss(tMiss(why))
    setAddDraft('')
    say(t('people.asked', { name: personName(person) }))
    return load()
  }

  async function answerAsk(id, yes) {
    const { miss: why } = yes ? await sayYes(id) : await sayNo(id)
    if (why) return setMiss(tMiss(why))
    return load()
  }

  async function newFamily() {
    const { miss: why, id } = await makeFamily(famDraft || t('people.familyOne'))
    if (why) return setMiss(tMiss(why))
    setFamDraft('')
    return goHash('/family', { id })
  }

  async function join() {
    const { miss: why, id } = await joinFamily(codeDraft)
    if (why === 'code') return setMiss(t('people.codeShort'))
    if (why === 'nofamily') return setMiss(t('people.noFamily'))
    if (why) return setMiss(tMiss(why))
    setCodeDraft('')
    return goHash('/family', { id })
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

  return (
    <ScreenShell title={t('people.title')} colors={colors}>
      <OfflineLine colors={colors} />

      <Cap colors={colors}>{t('inbox.kicker')}</Cap>
      <Row
        colors={colors}
        label={waiting ? t('people.waiting', { n: waiting }) : t('inbox.kicker')}
        note={waiting ? t('people.waitingSub') : t('people.inboxQuiet')}
        onPress={() => goHash('/inbox')}
      />
      <Row colors={colors} label={t('sent.kicker')} note={t('sent.rowSub')} onPress={() => goHash('/sent')} />

      <Cap colors={colors}>{t('people.friends')}</Cap>
      {links.friends.length ? (
        links.friends.slice(0, 6).map((row) => (
          <PersonRow
            key={row.id}
            colors={colors}
            title={personName(row.person) || t('people.someone')}
            note={friendLine(row.person)}
          >
            <DidButton
              colors={colors}
              small
              label={t('people.sendShort')}
              onPress={() => setSheet({ kind: 'send', person: row.person })}
            />
          </PersonRow>
        ))
      ) : (
        <Meta colors={colors}>{t('people.noFriends')}</Meta>
      )}
      <Row
        colors={colors}
        label={t('friends.title', { n: links.friends.length })}
        note={t('friends.seeSub')}
        onPress={() => goHash('/friends')}
      />

      <Cap colors={colors}>{t('people.families')}</Cap>
      {families.length ? (
        families.map((fam) => (
          <Row
            key={fam.id}
            colors={colors}
            label={fam.name}
            note={fam.role === 'parent' ? t('people.parent') : t('people.kid')}
            onPress={() => goHash('/family', { id: fam.id })}
          />
        ))
      ) : (
        <Meta colors={colors}>{t('people.noFamilies')}</Meta>
      )}

      <Cap colors={colors}>{t('people.you')}</Cap>
      <Field
        colors={colors}
        label={t('people.name')}
        value={nameDraft}
        onChangeText={(value) => setNameDraft(cleanName(value))}
        onSubmitEditing={keepName}
      />
      <Row colors={colors} label={t('people.handle')} note={handle ? `@${handle}` : '...'} />
      {DIT_ENABLED ? (
        <>
          <Row
            colors={colors}
            label={t('people.shareStreak')}
            note={t('people.shareStreakSub')}
            onPress={async () => {
              await shareStreak(!mine?.share_streak)
              load()
            }}
          />
          <Row
            colors={colors}
            label={t('all.showing')}
            note={t('all.joinBody')}
            onPress={async () => {
              await setPublicTonight(!mine?.public_tonight)
              load()
            }}
          />
          <Row colors={colors} label={t('all.kicker')} note={t('all.listCap')} onPress={() => goHash('/everyone')} />
        </>
      ) : null}
      <Meta colors={colors}>{t('people.handleHint')}</Meta>

      <Cap colors={colors}>{t('people.invite')}</Cap>
      <Row
        colors={colors}
        label={t('people.yourCode')}
        note={invite || '...'}
        onPress={
          invite
            ? async () => {
                const how = await passAlong(t('people.inviteLine', { code: invite }), t('people.invite'))
                if (how) say(t(how === 'copied' ? 'people.copied' : 'people.shared'))
              }
            : undefined
        }
      />
      <Meta colors={colors}>
        {joined >= INVITE_LOOK_AT
          ? t('people.lookWon')
          : t('people.lookLeft', { n: INVITE_LOOK_AT - joined })}
      </Meta>
      <Meta colors={colors}>{t('people.inviteHint', { coins: INVITE_COINS, n: INVITE_LOOK_AT })}</Meta>

      {mine && !mine.invited_by ? (
        <>
          <Field
            colors={colors}
            label={t('people.gotCode')}
            value={inviteDraft}
            onChangeText={(value) => setInviteDraft(cleanInvite(value))}
            autoCapitalize="characters"
          />
          <DidButton colors={colors} label={t('people.useCode')} onPress={redeem} />
        </>
      ) : null}

      {links.asked.length ? (
        <>
          <Cap colors={colors}>{t('people.asks')}</Cap>
          {links.asked.map((row) => (
            <PersonRow
              key={row.id}
              colors={colors}
              title={personName(row.person) || t('people.someone')}
              note={t('people.wantsIn')}
            >
              <DidButton colors={colors} small label={t('people.yes')} onPress={() => answerAsk(row.id, true)} />
              <KeyButton colors={colors} label={t('people.no')} onPress={() => answerAsk(row.id, false)} />
            </PersonRow>
          ))}
        </>
      ) : null}

      <Cap colors={colors}>{t('people.addOne')}</Cap>
      <Field colors={colors} label={t('people.add')} value={addDraft} onChangeText={setAddDraft} />
      <DidButton colors={colors} label={t('people.askOne')} onPress={ask} />

      <Cap colors={colors}>{t('people.startFamily')}</Cap>
      <Field colors={colors} label={t('people.newFamily')} value={famDraft} onChangeText={setFamDraft} />
      <DidButton colors={colors} label={t('people.makeFamily')} onPress={newFamily} />
      <Field
        colors={colors}
        label={t('people.joinCode')}
        value={codeDraft}
        onChangeText={(value) => setCodeDraft(cleanCode(value))}
        autoCapitalize="characters"
      />
      <DidButton colors={colors} label={t('people.join')} onPress={join} />

      <Miss colors={colors}>{miss}</Miss>
      {said ? <Meta colors={colors}>{said}</Meta> : null}

      {sheet?.kind === 'send' ? (
        <SendSheet
          person={sheet.person}
          colors={colors}
          onClose={() => setSheet(null)}
          onSent={say}
        />
      ) : null}
    </ScreenShell>
  )
}

export function FriendsScreen({ book, onChange }) {
  const colors = useHallColors()
  const account = useAccount()
  const purse = normalizePurse(book)
  const [links, setLinks] = useState({ friends: [], asked: [], sent: [] })
  const [blocks, setBlocks] = useState([])
  const [addDraft, setAddDraft] = useState('')
  const [ready, setReady] = useState(false)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      const [friendRows, blockRows] = await Promise.all([listFriends(), listBlocks()])
      setLinks(friendRows)
      setBlocks(blockRows)
      setMiss('')
    } catch {
      setMiss(t('people.reach'))
    }
    setReady(true)
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])

  async function ask() {
    setMiss('')
    const { miss: why, person } = await askFriend(addDraft)
    if (why === 'short') return setMiss(t('people.handleShort'))
    if (why === 'nobody') return setMiss(t('people.noOne', { handle: cleanHandle(addDraft) }))
    if (why) return setMiss(tMiss(why))
    setAddDraft('')
    setSaid(t('people.asked', { name: personName(person) }))
    return load()
  }

  async function answerAsk(id, yes) {
    setMiss('')
    const { miss: why } = yes ? await sayYes(id) : await sayNo(id)
    if (why) return setMiss(tMiss(why))
    return load()
  }

  async function cut(person) {
    setMiss('')
    const { miss: why } = await dropFriend(person.user_id)
    if (why) return setMiss(tMiss(why))
    setSaid(t('people.dropped', { name: personName(person) }))
    return load()
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

  return (
    <ScreenShell title={t('friends.title', { n: links.friends.length })} colors={colors}>
      <OfflineLine colors={colors} />
      {links.friends.length ? (
        <>
          <Cap colors={colors}>{t('people.friends')}</Cap>
          {links.friends.map((row) => (
            <PersonRow
              key={row.id}
              colors={colors}
              title={personName(row.person) || t('people.someone')}
              note={
                row.person?.handle
                  ? `@${row.person.handle} · ${friendLine(row.person)}`
                  : friendLine(row.person)
              }
            >
              <KeyButton colors={colors} label={t('people.drop')} onPress={() => cut(row.person)} />
              <KeyButton
                colors={colors}
                label={t('friends.cheer', { n: FRIEND_CHEER_GEMS })}
                onPress={async () => {
                  const spent = spendGems(book, FRIEND_CHEER_GEMS)
                  if (spent.miss) return setMiss(t('friends.needGems', { n: FRIEND_CHEER_GEMS }))
                  const { miss: why } = await sendCheer(row.person.user_id, '', purse.cheerOn)
                  if (why) return setMiss(tMiss(why))
                  if (onChange) onChange(spent.book)
                  fireCheer(purse.cheerOn, 1)
                  setMiss('')
                }}
              />
              <KeyButton
                colors={colors}
                label={t('friends.gift', { n: CHEER_GEMS })}
                onPress={async () => {
                  const pick = purse.cheers.find((id) => id !== 'lime') || purse.cheerOn
                  const spent = spendGems(book, CHEER_GEMS)
                  if (spent.miss) return setMiss(t('friends.needGems', { n: CHEER_GEMS }))
                  const { miss: why } = await giftCheer(row.person.user_id, pick)
                  if (why === 'giftCap') return setMiss(t('friends.giftCap'))
                  if (why) return setMiss(tMiss(why))
                  if (onChange) onChange(spent.book)
                  setSaid(t('friends.giftSent', { name: personName(row.person) || t('people.someone') }))
                }}
              />
              <KeyButton colors={colors} label={t('block.block')} onPress={() => setConfirm(row.person)} />
            </PersonRow>
          ))}
        </>
      ) : (
        <Meta colors={colors}>{t('people.noFriends')}</Meta>
      )}

      {links.asked.length ? (
        <>
          <Cap colors={colors}>{t('people.asks')}</Cap>
          {links.asked.map((row) => (
            <PersonRow
              key={row.id}
              colors={colors}
              title={personName(row.person) || t('people.someone')}
              note={t('people.wantsIn')}
            >
              <DidButton colors={colors} small label={t('people.yes')} onPress={() => answerAsk(row.id, true)} />
              <KeyButton colors={colors} label={t('people.no')} onPress={() => answerAsk(row.id, false)} />
            </PersonRow>
          ))}
        </>
      ) : null}

      {links.sent.length ? (
        <>
          <Cap colors={colors}>{t('friends.waiting')}</Cap>
          {links.sent.map((row) => (
            <PersonRow
              key={row.id}
              colors={colors}
              title={personName(row.person) || t('people.someone')}
              note={t('friends.notYet')}
            />
          ))}
        </>
      ) : null}

      <Cap colors={colors}>{t('people.addOne')}</Cap>
      <Field colors={colors} label={t('people.add')} value={addDraft} onChangeText={setAddDraft} />
      <DidButton colors={colors} label={t('people.askOne')} onPress={ask} />
      {blocks.length ? (
        <>
          <Cap colors={colors}>{t('block.list')}</Cap>
          {blocks.map((row) => (
            <PersonRow
              key={row.user_id}
              colors={colors}
              title={row.display_name || (row.handle ? `@${row.handle}` : t('people.someone'))}
              note={t('block.cannotReach')}
            >
              <KeyButton
                colors={colors}
                label={t('block.unblock')}
                onPress={async () => {
                  const { miss: why } = await unblockPerson(row.user_id)
                  if (why) setMiss(tMiss(why))
                  load()
                }}
              />
            </PersonRow>
          ))}
        </>
      ) : null}

      <Miss colors={colors}>{miss}</Miss>
      {said ? <Meta colors={colors}>{said}</Meta> : null}
      <KeyButton colors={colors} label={t('friends.manage')} onPress={() => goHash('/people')} />

      {confirm ? (
        <BlockModal
          person={confirm}
          colors={colors}
          onClose={() => setConfirm(null)}
          onDone={(why) => {
            if (why) setMiss(tMiss(why))
            load()
          }}
        />
      ) : null}
    </ScreenShell>
  )
}

function FamilyListScreen({ colors }) {
  const account = useAccount()
  const [families, setFamilies] = useState([])
  const [famDraft, setFamDraft] = useState('')
  const [codeDraft, setCodeDraft] = useState('')
  const [ready, setReady] = useState(false)
  const [miss, setMiss] = useState('')

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

  async function newFamily() {
    setMiss('')
    const { miss: why, id } = await makeFamily(famDraft || t('people.familyOne'))
    if (why) return setMiss(tMiss(why))
    setFamDraft('')
    if (id) return goHash('/family', { id })
    return load()
  }

  async function join() {
    setMiss('')
    const { miss: why, id } = await joinFamily(codeDraft)
    if (why === 'code') return setMiss(t('people.codeShort'))
    if (why === 'nofamily') return setMiss(t('people.noFamily'))
    if (why) return setMiss(tMiss(why))
    setCodeDraft('')
    if (id) return goHash('/family', { id })
    return load()
  }

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
      {families.length ? (
        <>
          <Cap colors={colors}>{t('people.families')}</Cap>
          {families.map((fam) => (
            <Row
              key={fam.id}
              colors={colors}
              label={fam.name}
              note={fam.role === 'parent' ? t('people.parent') : t('people.kid')}
              onPress={() => goHash('/family', { id: fam.id })}
            />
          ))}
        </>
      ) : (
        <Meta colors={colors}>{t('people.noFamilies')}</Meta>
      )}

      <Cap colors={colors}>{t('people.startFamily')}</Cap>
      <Field colors={colors} label={t('people.newFamily')} value={famDraft} onChangeText={setFamDraft} />
      <DidButton colors={colors} label={t('people.makeFamily')} onPress={newFamily} />
      <Field
        colors={colors}
        label={t('people.joinCode')}
        value={codeDraft}
        onChangeText={(value) => setCodeDraft(cleanCode(value))}
      />
      <DidButton colors={colors} label={t('people.join')} onPress={join} />
      <Miss colors={colors}>{miss}</Miss>
      <KeyButton colors={colors} label={t('family.back')} onPress={() => goHash('/people')} />
    </ScreenShell>
  )
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

export function InboxScreen({ book, onChange, onKeep }) {
  const colors = useHallColors()
  const account = useAccount()
  const [rows, setRows] = useState([])
  const [ready, setReady] = useState(false)
  const [miss, setMiss] = useState('')

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
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

  async function answer(row, keep) {
    setMiss('')
    const { miss: why } = await answerSend(row.id, keep)
    if (why) return setMiss(tMiss(why))
    if (keep && row.kind === 'cheer' && row.cheer_id) fireCheer(row.cheer_id, 1)
    if (keep && row.kind === 'todo' && onKeep) onKeep(row.question)
    return load()
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
        <Meta colors={colors}>{t('inbox.emptyBody')}</Meta>
        <DidButton colors={colors} label={t('inbox.goPeople')} onPress={() => goHash('/people')} />
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('inbox.title')} colors={colors}>
      <OfflineLine colors={colors} />
      <Meta colors={colors}>{t('inbox.hint')}</Meta>
      {rows.map((row) => (
        <PersonRow
          key={row.id}
          colors={colors}
          title={row.kind === 'cheer' ? t('inbox.aCheer') : row.question}
          note={`${t('inbox.from', { name: personName(row.person) || t('people.someone') })}${row.note ? ` · ${row.note}` : ''}`}
        >
          <DidButton
            colors={colors}
            small
            label={row.kind === 'cheer' ? t('inbox.thanks') : t('inbox.keep')}
            onPress={() => answer(row, true)}
          />
          {row.kind === 'todo' ? (
            <KeyButton colors={colors} label={t('inbox.pass')} onPress={() => answer(row, false)} />
          ) : null}
        </PersonRow>
      ))}
      <Miss colors={colors}>{miss}</Miss>
    </ScreenShell>
  )
}

export function SentScreen({ book, onChange }) {
  const colors = useHallColors()
  const account = useAccount()
  const [rows, setRows] = useState([])
  const [ready, setReady] = useState(false)
  const [miss, setMiss] = useState('')

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      setRows(await listSent())
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
  if (!rows.length) {
    return (
      <ScreenShell title={t('sent.emptyTitle')} colors={colors}>
        <Meta colors={colors}>{t('sent.emptyBody')}</Meta>
        <DidButton colors={colors} label={t('sent.goFriends')} onPress={() => goHash('/friends')} />
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('sent.title')} colors={colors}>
      <OfflineLine colors={colors} />
      <Meta colors={colors}>{t('sent.hint')}</Meta>
      {rows.map((row) => (
        <PersonRow
          key={row.id}
          colors={colors}
          title={row.kind === 'cheer' ? t('inbox.aCheer') : row.question}
          note={`${t('sent.to', { name: personName(row.person) || t('people.someone') })} · ${sentState(row.state)}`}
        >
          {row.state === 'sent' ? (
            <KeyButton
              colors={colors}
              label={t('sent.takeBack')}
              onPress={async () => {
                setMiss('')
                const { miss: why } = await takeBack(row.id)
                if (why) setMiss(tMiss(why))
                load()
              }}
            />
          ) : null}
        </PersonRow>
      ))}
      <Miss colors={colors}>{miss}</Miss>
    </ScreenShell>
  )
}

export function EveryoneScreen({ book, boards = [], onChange, now }) {
  const colors = useHallColors()
  const account = useAccount()
  const clock = now || new Date()
  const night = boardDate(clock)
  const purse = normalizePurse(book)
  const shelf = { boards: boards.length ? boards : book ? [book] : [], currentId: book?.id }

  const [mine, setMine] = useState(null)
  const [rows, setRows] = useState([])
  const [tally, setTally] = useState(0)
  const [ready, setReady] = useState(false)
  const [setup, setSetup] = useState(false)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')

  const sorted = useMemo(() => [...rows].sort((a, b) => Number(b.you) - Number(a.you)), [rows])

  const load = useCallback(async () => {
    if (!DIT_ENABLED || !cloudSetUp() || !account.user) {
      setReady(true)
      return
    }
    const [who, wall] = await Promise.all([readMine(), tonightWall(night)])
    setMine(who)
    setRows(wall.rows)
    setTally(wall.tally)
    setSetup(wall.miss === 'setup')
    if (wall.miss && wall.miss !== 'off' && wall.miss !== 'setup') setMiss(tMiss(wall.miss))
    setReady(true)
  }, [account.user, night])

  useEffect(() => {
    load()
    const timer = setInterval(load, 300000)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load()
    })
    return () => {
      clearInterval(timer)
      sub.remove()
    }
  }, [load])

  async function flip(on) {
    setMiss('')
    const { miss: why } = await setPublicTonight(on)
    if (why === 'setup') return setSetup(true)
    if (why) return setMiss(tMiss(why))
    if (on && mine?.done_on === night) {
      await syncTonightBoard(didTonightLabels(shelf, night), night)
    }
    setSaid(on ? t('all.nowOn') : t('all.nowOff'))
    return load()
  }

  async function flag(line) {
    setMiss('')
    const { miss: why } = await reportTonightLine(line.id)
    if (why) return setMiss(tMiss(why))
    setSaid(t('all.reported'))
    return load()
  }

  async function cheer(row) {
    setMiss('')
    if (purse.gems < TONIGHT_CHEER_GEMS) return setMiss(t('all.needGems', { n: TONIGHT_CHEER_GEMS }))
    const { miss: why, fresh } = await cheerOn(row.user_id, night)
    if (why === 'setup') return setSetup(true)
    if (why) return setMiss(tMiss(why))
    if (!fresh) return setMiss(t('all.cheeredAlready'))
    const spent = spendGems(book, TONIGHT_CHEER_GEMS)
    if (spent.miss) return setMiss(t('all.needGems', { n: TONIGHT_CHEER_GEMS }))
    if (onChange) onChange(spent.book)
    fireCheer(purse.cheerOn, 1)
    setSaid(t('all.cheerSent', { name: personName(row) || t('all.someone') }))
    return load()
  }

  if (!DIT_ENABLED) {
    return (
      <ScreenShell title={t('nav.everyone')} colors={colors}>
        <Meta colors={colors}>{t('people.offTitle')}</Meta>
        <Meta colors={colors}>{t('all.offBody')}</Meta>
        <DidButton colors={colors} label={t('inbox.goPeople')} onPress={() => goHash('/people')} />
      </ScreenShell>
    )
  }

  if (!cloudSetUp()) {
    return (
      <ScreenShell title={t('all.offTitle')} colors={colors}>
        <Meta colors={colors}>{t('all.offBody')}</Meta>
      </ScreenShell>
    )
  }

  if (!account.user) {
    return <NeedAccount kicker={t('all.kicker')} title={t('all.outTitle')} colors={colors} />
  }

  if (!ready) {
    return (
      <ScreenShell title={t('all.kicker')} colors={colors}>
        <Meta colors={colors}>{t('all.loading')}</Meta>
      </ScreenShell>
    )
  }

  if (setup) {
    const sqlUrl = supabaseSqlUrl()
    return (
      <ScreenShell title={t('all.setupTitle')} colors={colors}>
        <Meta colors={colors}>{t('all.setupBody')}</Meta>
        {sqlUrl ? (
          <DidButton colors={colors} label={t('all.setupOpen')} onPress={() => Linking.openURL(sqlUrl)} />
        ) : null}
        <KeyButton colors={colors} label={t('family.back')} onPress={() => goHash('/people')} />
      </ScreenShell>
    )
  }

  const showing = Boolean(mine?.public_tonight)

  return (
    <ScreenShell
      book={book}
      title={tally === 1 ? t('all.tallyOne') : t('all.tally', { n: tally })}
      colors={colors}
    >
      <OfflineLine colors={colors} />
      {!showing ? (
        <>
          <Meta colors={colors}>{t('all.joinTitle')}</Meta>
          <Meta colors={colors}>{t('all.joinBody')}</Meta>
          <DidButton colors={colors} label={t('all.join')} onPress={() => flip(true)} />
        </>
      ) : (
        <Meta colors={colors}>{t('all.boardHint')}</Meta>
      )}

      <Cap colors={colors}>{t('all.listCap')}</Cap>
      {sorted.length ? (
        sorted.map((row) => (
          <View
            key={row.user_id}
            style={[
              styles.wallRow,
              { borderColor: colors.line, backgroundColor: row.you ? colors.panel2 : colors.panel },
            ]}
          >
            <View style={styles.wallCopy}>
              <Text style={[styles.personTitle, { color: colors.ink }]}>
                {row.you ? t('all.you') : personName(row) || t('all.someone')}
              </Text>
              <Text style={[styles.personNote, { color: colors.inkDim }]}>{streakLine(row)}</Text>
              {(row.lines || []).map((line) => (
                <View key={line.id} style={styles.lineRow}>
                  <Text style={[styles.lineLabel, { color: colors.inkSoft }]}>{line.label}</Text>
                  {row.you ? null : (
                    <Pressable onPress={() => flag(line)} style={styles.flagBtn}>
                      <Text style={{ color: colors.inkDim }}>!</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
            {row.you ? (
              <Text style={[styles.cheerTally, { color: colors.inkSoft }]}>
                {row.cheers ? t('all.cheersN', { n: row.cheers }) : ''}
              </Text>
            ) : (
              <KeyButton
                colors={colors}
                label={row.cheered ? t('all.cheered', { n: row.cheers }) : t('all.cheer', { n: TONIGHT_CHEER_GEMS })}
                onPress={() => cheer(row)}
              />
            )}
          </View>
        ))
      ) : (
        <Meta colors={colors}>{t('all.nobody')}</Meta>
      )}

      {showing ? (
        <>
          <Cap colors={colors}>{t('all.youCap')}</Cap>
          <Row colors={colors} label={t('all.showing')} note={t('all.showingSub')} onPress={() => flip(false)} />
          <Meta colors={colors}>{t('all.privacy')}</Meta>
        </>
      ) : null}

      <Miss colors={colors}>{miss}</Miss>
      {said ? <Meta colors={colors}>{said}</Meta> : null}
      <KeyButton colors={colors} label={t('family.back')} onPress={() => goHash('/people')} />
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
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
  personCopy: { gap: 4 },
  personTitle: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '600' },
  personNote: { fontFamily: fonts.ui, fontSize: 13 },
  personActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  popTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700' },
})
