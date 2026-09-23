import { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { passAlong } from '../../src/lib/native.js'
import {
  addFamilyLamp,
  answerFamilyLamp,
  dropFamilyLamp,
  dropMember,
  editFamilyLamp,
  familyHistory,
  familyLampMeta,
  leaveFamily,
  listFamilyLamps,
  personName,
  readFamily,
  buyCheers,
  cheerFamily,
  readFriendCheers,
  setRole,
} from '../../src/lib/people.js'
import {
  FRIEND_CHEER_CAP,
  FRIEND_CHEER_GEMS,
  FRIEND_CHEERS_PER_GEM,
  fireCheer,
  friendCheerMissKey,
  normalizePurse,
} from '../../src/lib/purse.js'
import { addDaysIso, boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { offerMoreGems } from '../components/SheetHost.jsx'
import { ChipRow, DidButton, Field, KeyButton, Meta } from '../components/ui.jsx'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'

const EVERYONE = 'everyone'

function Cap({ children, colors }) {
  return <Text style={[styles.cap, { color: colors.inkDim }]}>{children}</Text>
}

export function FamilyDetailScreen({ book, onChange, familyId, colors }) {
  const account = useAccount()
  const purse = normalizePurse(book)
  const clock = new Date()
  const [fam, setFam] = useState(null)
  const [lamps, setLamps] = useState([])
  const [answers, setAnswers] = useState([])
  const [night, setNight] = useState(() => boardDate(clock, book.dayFoldHour))
  const [nights, setNights] = useState([])
  const [past, setPast] = useState([])
  const [edit, setEdit] = useState(null)
  const [ready, setReady] = useState(false)
  const [draft, setDraft] = useState('')
  const [forId, setForId] = useState(EVERYONE)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [stock, setStock] = useState(null)
  const cheersLeft = stock == null ? purse.friendCheers : stock

  const load = useCallback(async () => {
    if (!familyId || !account.user) {
      setReady(true)
      return
    }
    const row = await readFamily(familyId)
    setFam(row)
    if (row) {
      const key = boardDate(new Date(), row.fold_hour)
      setNight(key)
      const back = []
      for (let step = 6; step >= 0; step -= 1) back.push(addDaysIso(key, -step))
      setNights(back)
      const [tonightRows, pastRows, serverCheers] = await Promise.all([
        listFamilyLamps(familyId, key),
        familyHistory(familyId, back),
        readFriendCheers(),
      ])
      if (typeof serverCheers === 'number') setStock(serverCheers)
      setLamps(tonightRows.lamps)
      setAnswers(tonightRows.answers)
      setPast(pastRows)
    }
    setReady(true)
  }, [familyId, account.user])

  useEffect(() => {
    load()
  }, [load])

  function answerFor(lampId, userId) {
    return answers.find((row) => row.lamp_id === lampId && row.user_id === userId) || null
  }

  function whoFor(lamp) {
    if (!lamp.for_id) return t('family.everyone')
    const member = fam?.members.find((row) => row.user_id === lamp.for_id)
    if (!member) return t('family.someone')
    return member.you ? t('family.youAre') : personName(member.person) || t('family.someone')
  }

  function owing(lamp) {
    if (!fam) return []
    if (lamp.for_id) return fam.members.filter((row) => row.user_id === lamp.for_id)
    return fam.members
  }

  function mineToAnswer(lamp) {
    if (!fam) return false
    return !lamp.for_id || lamp.for_id === fam.youId
  }

  async function tap(lamp, status) {
    const { miss: why } = await answerFamilyLamp(fam.id, lamp.id, night, status)
    if (why) return setMiss(why)
    return load()
  }

  async function add() {
    if (!draft.trim()) return setMiss(t('family.blank'))
    const { miss: why } = await addFamilyLamp(
      fam.id,
      fam.tag?.id,
      draft,
      forId === EVERYONE ? null : forId,
    )
    if (why === 'notag') return setMiss(t('family.noTag'))
    if (why) return setMiss(why)
    setDraft('')
    setMiss('')
    return load()
  }

  if (!ready) {
    return <Meta colors={colors}>{t('family.loading')}</Meta>
  }

  if (!fam) {
    return (
      <>
        <Text style={[styles.title, { color: colors.ink }]}>{t('family.goneTitle')}</Text>
        <Meta colors={colors}>{t('family.goneBody')}</Meta>
        <DidButton colors={colors} label={t('family.back')} onPress={() => goHash('/people')} />
      </>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
      <Text style={[styles.title, { color: colors.ink }]}>{fam.name}</Text>
      <Pressable
        onPress={async () => {
          setMiss('')
          setSaid('')
          const how = await passAlong(
            t('family.codeInvite', { name: fam.name, code: fam.code }),
            fam.name,
          )
          if (how === 'shared') setSaid(t('people.shared'))
        }}
        style={[styles.codeRow, { borderColor: colors.line, backgroundColor: colors.panel }]}
      >
        <Text style={{ color: colors.ink }}>{t('family.codeLine', { code: fam.code })}</Text>
        <Text style={{ color: colors.inkDim, fontSize: 12 }}>{t('people.tapToSend')}</Text>
      </Pressable>

      <Cap colors={colors}>{t('family.tonight')}</Cap>
      {lamps.length ? (
        lamps.map((lamp) => {
          const crowd = owing(lamp)
          const done = crowd.filter((row) => {
            const answer = answerFor(lamp.id, row.user_id)
            return answer && answer.status !== 'skip'
          })
          const mine = mineToAnswer(lamp) ? answerFor(lamp.id, fam.youId) : null
          return (
            <View key={lamp.id} style={[styles.row, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.rowTitle, { color: colors.ink }]}>{lamp.question}</Text>
              <Text style={{ color: colors.inkDim, fontSize: 13 }}>
                {t('family.forWho', { who: whoFor(lamp) })}
                {lamp.cadence !== 'daily' ? ` · ${familyLampMeta(lamp)}` : ''}
                {' · '}
                {t('family.doneCount', { done: done.length, all: crowd.length })}
              </Text>
              {mineToAnswer(lamp) ? (
                <View style={styles.rowActions}>
                  <DidButton
                    small
                    colors={colors}
                    label={mine?.status === 'yes' ? t('family.did') : t('family.doIt')}
                    disabled={mine?.status === 'yes'}
                    onPress={() => tap(lamp, 'yes')}
                  />
                  <KeyButton colors={colors} label={t('family.nope')} onPress={() => tap(lamp, 'skip')} />
                </View>
              ) : (
                <Text style={{ color: colors.inkSoft }}>{done.length ? t('family.theirDone') : t('family.theirWait')}</Text>
              )}
              {fam.parent || lamp.made_by === fam.youId ? (
                <View style={styles.rowActions}>
                  <KeyButton colors={colors} label={t('family.edit')} onPress={() => setEdit({ id: lamp.id, text: lamp.question })} />
                  <KeyButton
                    colors={colors}
                    label={t('family.remove')}
                    onPress={async () => {
                      const { miss: why } = await dropFamilyLamp(lamp.id)
                      if (why) setMiss(why)
                      load()
                    }}
                  />
                </View>
              ) : null}
            </View>
          )
        })
      ) : (
        <Meta colors={colors}>{t('family.noLamps')}</Meta>
      )}

      <Cap colors={colors}>{fam.parent ? t('family.assign') : t('family.addYours')}</Cap>
      <Field colors={colors} label={t('family.what')} value={draft} onChangeText={setDraft} placeholder={t('family.whatPh')} />
      {fam.parent ? (
        <>
          <Text style={[styles.cap, { color: colors.inkDim }]}>{t('family.forWhoLabel')}</Text>
          <ChipRow
            colors={colors}
            value={forId}
            onPick={setForId}
            items={[
              { id: EVERYONE, label: t('family.everyone') },
              ...fam.members.map((row) => ({
                id: row.user_id,
                label: row.you ? t('family.youAre') : personName(row.person) || t('family.someone'),
              })),
            ]}
          />
        </>
      ) : null}
      <DidButton colors={colors} label={t('family.put')} onPress={add} />
      <Meta colors={colors}>{fam.parent ? t('family.assignHint') : t('family.kidHint')}</Meta>

      <Cap colors={colors}>{t('family.week')}</Cap>
      {fam.members.map((row) => {
        const done = nights.map((one) =>
          past.some(
            (item) => item.user_id === row.user_id && item.period_key === one && item.status !== 'skip',
          ),
        )
        return (
          <View key={row.user_id} style={[styles.row, { borderColor: colors.line }]}>
            <Text style={{ color: colors.ink, fontWeight: '600' }}>
              {row.you ? t('family.youAre') : personName(row.person) || t('family.someone')}
            </Text>
            <Text style={{ color: colors.inkDim }}>{t('family.weekCount', { n: done.filter(Boolean).length })}</Text>
            <View style={styles.dots}>
              {done.map((on, at) => (
                <View key={nights[at]} style={[styles.dot, { backgroundColor: on ? colors.on : colors.open }]} />
              ))}
            </View>
          </View>
        )
      })}
      <Meta colors={colors}>
        {t('family.weekFrom', { from: formatBoardDate(nights[0] || night), to: formatBoardDate(night) })}
      </Meta>

      <Cap colors={colors}>{t('friends.cheerStock', { n: cheersLeft })}</Cap>
      <Meta colors={colors}>{t('friends.cheerNote')}</Meta>
      <KeyButton
        colors={colors}
        disabled={cheersLeft + FRIEND_CHEERS_PER_GEM > FRIEND_CHEER_CAP}
        label={t('friends.cheerBuy')}
        onPress={async () => {
          if (purse.gems < FRIEND_CHEER_GEMS) {
            offerMoreGems(colors)
            return
          }
          setMiss('')
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
        }}
      />

      <Cap colors={colors}>{t('family.people')}</Cap>
      {fam.members.map((row) => (
        <View key={row.user_id} style={[styles.row, { borderColor: colors.line }]}>
          <Text style={{ color: colors.ink, fontWeight: '600' }}>
            {row.you ? t('family.youAre') : personName(row.person) || t('family.someone')}
          </Text>
          <Text style={{ color: colors.inkDim }}>{row.role === 'parent' ? t('people.parent') : t('people.kid')}</Text>
          <View style={styles.rowActions}>
            {!row.you && row.person?.done_on === night ? (
              <KeyButton
                colors={colors}
                disabled={cheersLeft < 1}
                label={t('friends.cheerUse')}
                onPress={async () => {
                  setMiss('')
                  setSaid('')
                  const sent = await cheerFamily(book, row.user_id, t('family.cheerNote'), purse.cheerOn)
                  const known = friendCheerMissKey(sent.miss)
                  if (known) return setMiss(t(known.key, known.vars))
                  if (sent.miss) return setMiss(tMiss(sent.miss))
                  setStock(normalizePurse(sent.book).friendCheers)
                  if (onChange) onChange(sent.book)
                  fireCheer(purse.cheerOn, 1)
                  return setSaid(
                    t('family.cheerSent', { name: personName(row.person) || t('family.someone') }),
                  )
                }}
              />
            ) : null}
            {fam.parent && !row.you ? (
              <>
                <KeyButton
                  colors={colors}
                  label={row.role === 'parent' ? t('family.makeKid') : t('family.makeParent')}
                  onPress={async () => {
                    const { miss: why } = await setRole(fam.id, row.user_id, row.role === 'parent' ? 'kid' : 'parent')
                    if (why === 'lastparent') setMiss(t('family.lastParent'))
                    else if (why) setMiss(why)
                    load()
                  }}
                />
                <KeyButton
                  colors={colors}
                  label={t('family.remove')}
                  onPress={async () => {
                    const { miss: why } = await dropMember(fam.id, row.user_id)
                    if (why === 'lastparent') setMiss(t('family.lastParent'))
                    else if (why) setMiss(why)
                    load()
                  }}
                />
              </>
            ) : null}
          </View>
        </View>
      ))}

      <KeyButton
        colors={colors}
        label={t('family.leave')}
        onPress={async () => {
          const { miss: why } = await leaveFamily(fam.id)
          if (why === 'lastparent') return setMiss(t('family.lastParentLeave'))
          if (why) return setMiss(why)
          goHash('/people')
        }}
      />

      {said ? <Meta colors={colors}>{said}</Meta> : null}
      {miss ? <Text style={{ color: colors.miss }}>{tMiss(miss)}</Text> : null}
      <Meta colors={colors}>{t('family.inviteHint', { code: fam.code })}</Meta>
      <KeyButton colors={colors} label={t('family.back')} onPress={() => goHash('/family')} />

      {edit ? (
      <Modal visible transparent animationType="fade" onRequestClose={() => setEdit(null)}>
        <Pressable style={styles.veil} onPress={() => setEdit(null)}>
          <Pressable style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.cap, { color: colors.on }]}>{t('family.edit')}</Text>
            <Field colors={colors} label={t('family.what')} value={edit?.text || ''} onChangeText={(text) => setEdit((prev) => ({ ...prev, text }))} />
            <DidButton
              colors={colors}
              label={t('family.save')}
              onPress={async () => {
                const { miss: why } = await editFamilyLamp(edit.id, edit.text)
                if (why === 'blank') return setMiss(t('family.blank'))
                if (why) setMiss(why)
                setEdit(null)
                load()
              }}
            />
            <KeyButton colors={colors} label={t('settings.neverMind')} onPress={() => setEdit(null)} />
          </Pressable>
        </Pressable>
      </Modal>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  cap: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 8 },
  title: { fontFamily: fonts.display, fontSize: 24, fontWeight: '700' },
  codeRow: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 4 },
  row: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8, marginBottom: 8 },
  rowTitle: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '600' },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  veil: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  pop: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
})
