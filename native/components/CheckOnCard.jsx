import { useEffect, useState } from 'react'
import { Animated, InteractionManager, StyleSheet, Text, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { inEnglish, t, tMiss } from '../../src/lib/i18n.js'
import { formatBoardDate } from '../../src/lib/recurrence.js'
import { listKnownPeople, personName } from '../../src/lib/people.js'
import {
  CHECK_ON_DEFAULT,
  checkOnFits,
  checkOnWhen,
  cleanMinute,
  minuteClock,
  readCheckOn,
  saveCheckOn,
  stopCheckOn,
} from '../../src/lib/check-on.js'
import { confirmDone, once } from '../lib/confirm.js'
import { useFadeIn } from '../lib/motion.jsx'
import { fonts } from '../theme.js'
import { DidButton, KeyButton, Meta } from './ui.jsx'

/**
 * "Ask a friend to check on me" on one of your own questions. One friend or
 * family member, one time. Says plainly that only the question's words go
 * to that person.
 */
export function CheckOnCard({ lamp, colors }) {
  const account = useAccount()
  const fits = Boolean(account.user) && checkOnFits(lamp)
  const [row, setRow] = useState(null)
  const [people, setPeople] = useState(null)
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState('')
  const [at, setAt] = useState(CHECK_ON_DEFAULT)
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')
  // The body is laid out from the first frame and fades in once the read lands.
  const [loaded, setLoaded] = useState(false)
  const fade = useFadeIn(loaded)

  useEffect(() => {
    if (!fits) return undefined
    let live = true
    // After the page has slid in, so the read and its redraw miss the transition.
    const task = InteractionManager.runAfterInteractions(() => Promise.all([readCheckOn(lamp.id), listKnownPeople().catch(() => [])])
      .then(([mine, known]) => {
        if (!live) return
        setRow(mine.row)
        setPeople(known)
        if (mine.miss && mine.miss !== 'off' && mine.miss !== 'out') setMiss(tMiss(mine.miss))
      })
      .catch(() => live && setMiss(t('people.reach')))
      .finally(() => live && setLoaded(true)))
    return () => {
      live = false
      task.cancel()
    }
  }, [fits, lamp?.id])

  if (!fits) return null
  const whenLine = whenText(checkOnWhen(lamp))
  const buddy = row ? (people || []).find((p) => p.user_id === row.buddy_id) : null
  const buddyName = personName(buddy) || t('people.someone')

  function start() {
    setPick(row?.buddy_id || '')
    setAt(row ? cleanMinute(row.at_minute) : CHECK_ON_DEFAULT)
    setMiss('')
    setOpen(true)
  }

  async function save() {
    if (!pick) return setMiss(t('checkOn.pickFirst'))
    setBusy(true)
    const res = await saveCheckOn(lamp, pick, at)
    setBusy(false)
    if (res.miss) return setMiss(tMiss(res.miss))
    const fresh = await readCheckOn(lamp.id)
    setRow(fresh.row)
    setOpen(false)
    confirmDone(t('checkOn.saved'))
  }

  async function stop() {
    setBusy(true)
    const res = await stopCheckOn(row.id)
    setBusy(false)
    if (res.miss) return setMiss(tMiss(res.miss))
    setRow(null)
    confirmDone(t('checkOn.stopped'))
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.lineSoft }]}>
      <Text style={[styles.title, { color: colors.ink }]}>{t('checkOn.title')}</Text>
      {whenLine ? <Meta colors={colors}>{whenLine}</Meta> : null}
      {!open ? (
      <Animated.View style={[styles.body, { opacity: fade }]} pointerEvents={loaded ? 'auto' : 'none'}>
      {!open && row ? (
        <>
          <Meta colors={colors}>{t('checkOn.isOn', { name: buddyName, time: minuteClock(row.at_minute) })}</Meta>
          <View style={styles.keys}>
            <KeyButton colors={colors} label={t('checkOn.change')} onPress={start} />
            <KeyButton colors={colors} danger label={t('checkOn.stop')} disabled={busy} onPress={() => once('check-on-stop', stop)} />
          </View>
        </>
      ) : null}
      {!open && !row ? (
        <>
          <Meta colors={colors}>{t('checkOn.sub')}</Meta>
          <View style={styles.keys}>
            <KeyButton colors={colors} label={t('checkOn.start')} onPress={start} />
          </View>
        </>
      ) : null}
      </Animated.View>
      ) : null}
      {open ? (
        <>
          <Text style={[styles.share, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.panel2 }]}>
            {t('checkOn.shareNote', { question: lamp.question })}
          </Text>
          {people && !people.length ? (
            <Meta colors={colors}>{t('checkOn.nobody')}</Meta>
          ) : (
            <View style={styles.keys}>
              {(people || []).map((p) => (
                <KeyButton
                  key={p.user_id}
                  colors={colors}
                  picked={pick === p.user_id}
                  label={personName(p) || t('people.noName')}
                  onPress={() => setPick(p.user_id)}
                />
              ))}
            </View>
          )}
          <Text style={[styles.cap, { color: colors.inkDim }]}>{t('checkOn.timeLabel')}</Text>
          <View style={styles.keys}>
            <KeyButton colors={colors} label="-30" onPress={() => setAt((m) => cleanMinute(m - 30))} />
            <Text style={[styles.time, { color: colors.ink }]} accessibilityLiveRegion="polite">
              {minuteClock(at)}
            </Text>
            <KeyButton colors={colors} label="+30" onPress={() => setAt((m) => cleanMinute(m + 30))} />
          </View>
          <View style={styles.keys}>
            <DidButton colors={colors} small label={t('checkOn.save')} disabled={busy} onPress={() => once('check-on-save', save)} />
            <KeyButton colors={colors} label={t('settings.neverMind')} onPress={() => setOpen(false)} />
          </View>
        </>
      ) : null}
      {miss ? <Meta colors={colors}>{miss}</Meta> : null}
    </View>
  )
}

// "12th" in English, the plain number elsewhere.
function monthDay(day) {
  if (!inEnglish()) return String(day)
  const tail = { one: 'st', two: 'nd', few: 'rd', other: 'th' }[new Intl.PluralRules('en-US', { type: 'ordinal' }).select(day)]
  return `${day}${tail || 'th'}`
}

// Which night the friend can hear, for questions that are not every night.
function whenText(when) {
  if (!when) return ''
  if (when.key === 'checkOn.whenMonthly') return t(when.key, { day: monthDay(when.day) })
  if (when.date) return t(when.key, { date: formatBoardDate(when.date) })
  if (when.n) return t(when.key, { n: when.n })
  return t(when.key)
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8, marginTop: 8 },
  title: { fontFamily: fonts.uiBold, fontSize: 15 },
  share: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, borderWidth: 1, borderRadius: 12, padding: 10 },
  body: { gap: 8 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  cap: { fontFamily: fonts.ui, fontSize: 12 },
  time: { fontFamily: fonts.uiBold, fontSize: 16, minWidth: 56, textAlign: 'center' },
})
