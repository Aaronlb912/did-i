import { clockWords } from '../../src/lib/hall-pages.js'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { startTour } from '../lib/tour.js'
import { useEffect, useState } from 'react'
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { exportAll, pullAndMerge, useSync } from '../../src/lib/cloud-sync.js'
import { syncFailed } from '../../src/lib/sync-line.js'
import * as DocumentPicker from 'expo-document-picker'
import { t } from '../../src/lib/i18n.js'
import { setShareDiagnostics } from '../../src/lib/diagnostics.js'
import {
  CLOCK_IDS,
  LOCALE_IDS,
  THEME_IDS,
  usePrefs,
  writePrefs,
} from '../../src/lib/prefs.js'
import { ownedLookIds, readWidgetSettings } from '../../src/lib/widget-config.js'
import { applyWidgetPrefs } from '../../src/lib/widget-settings.js'
import { pinWidget, showWidgetHow } from '../lib/widget-pin.js'
import { signOutHere, useAccount } from '../../src/lib/account.js'
import { leaveAccount } from '../lib/leave-account.js'
import { SureModal } from './more.jsx'
import { readShelf } from '../../src/lib/board-shelf.js'
import { armLampPings } from '../../src/lib/notify.js'
import { feedbackMailto } from '../../src/lib/feedback.js'
import { legalEmail } from '../../src/lib/legal.js'
import { backupFileReady, shareBackupFile, shareCsv, shareShelf } from '../../src/lib/native.js'
import { restoreGemPurchases } from '../../src/lib/gem-buy.js'
import { answersCsv } from '../../src/lib/answers-csv.js'
import { mergeBackup } from '../../src/lib/shelf-merge.js'
import { zoneWords } from '../../src/lib/zone.js'
import { useHallColors } from '../hooks/useHallColors.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { BoardShell } from '../components/BoardShell.jsx'
import { SetChoice } from '../components/SetChoice.jsx'
import { SavableSetField } from '../components/SavableSetField.jsx'
import { KeyButton } from '../components/ui.jsx'
import { appVersionLines } from '../components/AppVersion.jsx'
import {
  SetCap,
  SetCard,
  SetNote,
  SetRow,
  SetSwitch,
} from '../components/SetBits.jsx'


export function PhoneSettingsScreen({ book, onChange }) {
  const colors = useHallColors(book)
  const [keeperDraft, setKeeperDraft] = useState(book?.keeperName || '')
  const [noteDraft, setNoteDraft] = useState(book?.inkNote || '')

  useEffect(() => {
    setKeeperDraft(book?.keeperName || '')
    setNoteDraft(book?.inkNote || '')
  }, [book?.keeperName, book?.inkNote])

  return (
    <BoardShell book={book} title={t('settings.title')} date={formatBoardDate(boardDate(new Date(), book.dayFoldHour))} colors={colors}>
      <SetNote colors={colors}>{t('settings.phoneBody')}</SetNote>

      <SetCap colors={colors}>{t('settings.title')}</SetCap>
      <SetCard colors={colors}>
        <SavableSetField
          colors={colors}
          label={t('settings.name')}
          placeholder={t('settings.namePh')}
          value={keeperDraft}
          savedValue={book?.keeperName || ''}
          onChangeText={setKeeperDraft}
          onSave={(keeperName) => {
            setKeeperDraft(keeperName)
            onChange({ ...book, keeperName })
          }}
        />
        <SavableSetField
          colors={colors}
          label={t('settings.note')}
          value={noteDraft}
          savedValue={book?.inkNote || ''}
          onChangeText={setNoteDraft}
          placeholder={t('settings.notePh')}
          multiline
          onSave={(inkNote) => {
            setNoteDraft(inkNote)
            onChange({ ...book, inkNote })
          }}
        />
      </SetCard>
    </BoardShell>
  )
}

// The widget's "same as folder" choice, next to look ids in one list.
const WIDGET_LOOK_TAG = ':folder'

export function ProfileScreen({ book, onChange, onImport, onStartEmpty, onSendCopy, page = '' }) {
  const colors = useHallColors(book)
  const prefs = usePrefs()
  const account = useAccount()
  const sync = useSync()
  const [loadNote, setLoadNote] = useState('')
  const widget = readWidgetSettings()
  const widgetShelf = readShelf()
  const widgetLooks = [...ownedLookIds(widgetShelf)].sort()

  const [loading, setLoading] = useState(false)
  const [outBusy, setOutBusy] = useState(false)
  const [sure, setSure] = useState(null)
  const [restoring, setRestoring] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [csvBusy, setCsvBusy] = useState(false)
  const [fileBusy, setFileBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)

  // Signed in, the copy is the whole account, like Account > Download my data.
  async function sendCopy() {
    if (sharing) return
    if (!account.user && onSendCopy) return onSendCopy()
    setSharing(true)
    try {
      const res = await shareShelf(account.user ? await exportAll() : readShelf())
      // Same line Account > Download my data keeps, so "last copy" stays true.
      if (res?.action !== 'dismissedAction') {
        try { localStorage.setItem('did-i-last-copy', new Date().toISOString()) } catch {}
      }
    } catch (error) {
      if (error?.name !== 'AbortError') confirmMiss(t(account.user ? 'confirm.exportMiss' : 'confirm.shareMiss'))
    } finally {
      setSharing(false)
    }
  }

  async function saveFile() {
    if (fileBusy) return
    setFileBusy(true)
    try {
      await shareBackupFile(account.user ? await exportAll() : readShelf())
      try { localStorage.setItem('did-i-last-copy', new Date().toISOString()) } catch {}
    } catch {
      confirmMiss(t('confirm.shareMiss'))
    } finally {
      setFileBusy(false)
    }
  }

  // Same steps and messages as Restore purchases in the shop.
  async function restore() {
    if (restoring) return
    if (account.ready && !account.user) {
      goHash('/account')
      return
    }
    setRestoring(true)
    try {
      const out = await restoreGemPurchases()
      if (out.miss === 'signin') confirmMiss(t('gems.restoreSignIn'))
      else if (out.miss === 'setup' || out.miss === 'app') confirmMiss(t('gems.restoreSetup'))
      else if (out.miss === 'pending') confirmDone(t('gems.pending'))
      else if (out.miss) confirmMiss(t('gems.restoreMiss'))
      else if (out.gems > 0) confirmDone(t('gems.restored', { n: out.gems }))
      else confirmDone(t('gems.restoreNone'))
    } catch {
      confirmMiss(t('gems.restoreMiss'))
    } finally {
      setRestoring(false)
    }
  }

  // Same sign out as the Account page, without the extra step there.
  async function signOut(force = false) {
    if (outBusy) return
    setOutBusy(true)
    const out = await leaveAccount('out', signOutHere, force)
    setOutBusy(false)
    if (out === 'unsaved') {
      setSure({ title: t('account.unsavedTitle'), body: t('account.unsavedBody'), yes: t('account.unsavedYes'), go: () => signOut(true) })
    }
  }

  async function pickFile() {
    if (loading) return
    setLoading(true)
    await loadFile()
    setLoading(false)
  }

  async function loadFile() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'] })
      if (picked.canceled || !picked.assets?.[0]?.uri) return
      const response = await fetch(picked.assets[0].uri)
      const parsed = JSON.parse(await response.text())
      const shelf = parsed?.shelf?.boards ? parsed.shelf : parsed?.boards ? parsed : null
      const one = !shelf && parsed?.lamps ? { currentId: parsed.id, boards: [parsed] } : null
      const coming = shelf || one
      if (!coming) {
        setLoadNote(t('settings.loadMiss'))
        return
      }
      const before = readShelf()
      const merged = mergeBackup(before, coming)
      if (onImport) onImport(merged)
      const count = (shelf, key) => shelf.boards.reduce((n, b) => n + (b[key] || []).length, 0)
      const q = Math.max(0, count(merged, 'lamps') - count(before, 'lamps'))
      const a = Math.max(0, count(merged, 'answers') - count(before, 'answers'))
      setLoadNote(q || a ? t('settings.loadOkBoth', { q, a }) : t('settings.loadSame'))
    } catch {
      setLoadNote(t('settings.loadMiss'))
    }
  }

  const date = formatBoardDate(boardDate(new Date(), book.dayFoldHour))

  // Things people rarely need: copies of the data, crash reports, phone
  // privacy, legal, version. One row on Settings opens them.
  if (page === 'more') {
    return (
      <BoardShell book={book} title={t('settings.yourData')} date={date} colors={colors}>
        <SetCard colors={colors}>
          <SetRow
            colors={colors}
            icon="note"
            tint={colors.inkSoft}
            label={t('settings.sendCopy')}
            sub={t('settings.sendCopySub')}
            value={sharing ? t('app.loading') : undefined}
            chevron
            onPress={sendCopy}
          />
          {backupFileReady() ? (
            <SetRow
              colors={colors}
              icon="note"
              tint={colors.inkSoft}
              label={t('settings.sendFile')}
              sub={t('settings.sendFileSub')}
              value={fileBusy ? t('app.loading') : undefined}
              chevron
              onPress={fileBusy ? undefined : saveFile}
            />
          ) : null}
          <SetRow
            colors={colors}
            icon="inbox"
            tint={colors.late}
            label={t('settings.loadCopy')}
            sub={t('settings.loadCopySub')}
            value={loading ? t('app.loading') : undefined}
            chevron
            onPress={loading ? undefined : pickFile}
          />
          <SetRow
            colors={colors}
            icon="table"
            tint={colors.on}
            label={t('settings.sendCsv')}
            sub={t('settings.sendCsvSub')}
            chevron
            value={csvBusy ? t('app.loading') : undefined}
            onPress={csvBusy ? undefined : () => {
              setCsvBusy(true)
              shareCsv(answersCsv(readShelf()))
                .catch(() => confirmMiss(t('confirm.shareMiss')))
                .finally(() => setCsvBusy(false))
            }}
          />
          <SetRow
            colors={colors}
            icon="shop"
            tint={colors.late}
            label={t('gems.restore')}
            value={restoring ? t('gems.restoring') : undefined}
            onPress={restoring ? undefined : restore}
            last
          />
        </SetCard>
        {!account.user ? <SetNote colors={colors}>{t('settings.sendCopyAcct')}</SetNote> : null}
        {loadNote ? <SetNote colors={colors}>{loadNote}</SetNote> : null}

        <SetCap colors={colors}>{t('settings.legal')}</SetCap>
        <SetCard colors={colors}>
          <SetRow colors={colors} icon="note" tint={colors.inkSoft} label={t('settings.privacy')} chevron onPress={() => goHash('/privacy')} />
          <SetRow colors={colors} icon="note" tint={colors.inkSoft} label={t('settings.terms')} chevron last onPress={() => goHash('/terms')} />
        </SetCard>
        {!legalEmail() ? <Text style={[styles.miss, { color: colors.miss }]}>{t('legal.operatorWarn')}</Text> : null}

        <Text style={[styles.version, { color: colors.inkDim }]} accessibilityRole="text">
          {appVersionLines().join(' · ')}
        </Text>
        <Text style={[styles.copyright, { color: colors.inkDim }]}>{t('legal.copyright')}</Text>
      </BoardShell>
    )
  }

  // One Settings page per group; the first page lists the groups.
  const shell = (title, kids) => (
    <BoardShell book={book} title={title} date={date} colors={colors}>
      {kids}
    </BoardShell>
  )

  if (page === 'look') {
    return shell(
      t('settings.look'),
      <>
      <SetCard colors={colors}>
        <SetChoice
          colors={colors}
          icon={prefs.theme === 'light' ? 'sun' : prefs.theme === 'dark' ? 'moon' : 'phone'}
          tint={colors.late}
          label={t('settings.theme')}
          options={THEME_IDS.map((id) => ({ id, label: t(`theme.${id}`) }))}
          selected={prefs.theme}
          onSelect={(id) => writePrefs({ theme: id })}
        />
        <SetChoice
          colors={colors}
          icon="globe"
          tint={colors.late}
          label={t('settings.language')}
          options={LOCALE_IDS.map((id) => ({ id, label: t(`lang.${id}`) }))}
          selected={prefs.locale}
          onSelect={(id) => {
            writePrefs({ locale: id })
            // Reminder text and buttons are in the old language until rebuilt.
            armLampPings(readShelf().boards).catch(() => {})
          }}
        />
        <SetSwitch
          colors={colors}
          icon="motion"
          tint={colors.on}
          label={t('settings.lessMotion')}
          sub={t('settings.lessMotionSub')}
          last
          on={prefs.lessMotion}
          onPress={() => writePrefs({ lessMotion: !prefs.lessMotion })}
        />
      </SetCard>

      <SetCap colors={colors}>{t('widget.settings.cap')}</SetCap>
      <SetCard colors={colors}>
        <SetChoice
          colors={colors}
          icon="palette"
          tint={colors.on}
          label={t('widget.settings.colors')}
          sub={t('widget.settings.lookSub')}
          options={[
            { id: WIDGET_LOOK_TAG, label: t('widget.settings.lookTag') },
            ...widgetLooks.map((id) => ({ id, label: t(`look.${id}.name`) })),
          ]}
          selected={widget.lookMode === 'tag' ? WIDGET_LOOK_TAG : widget.lookId}
          onSelect={(id) =>
            applyWidgetPrefs(
              id === WIDGET_LOOK_TAG ? { widgetLookMode: 'tag' } : { widgetLookMode: 'pick', widgetLookId: id },
            )
          }
        />
        <SetSwitch
          colors={colors}
          icon="filter"
          tint={colors.late}
          label={t('widget.settings.openOnly')}
          sub={t('widget.settings.openOnlySub')}
          on={widget.openOnly}
          onPress={() => applyWidgetPrefs({ widgetOpenOnly: !widget.openOnly })}
        />
        {Platform.OS === 'android' ? (
          <SetRow
            colors={colors}
            icon="add"
            tint={colors.on}
            label={t('widget.settings.pin')}
            sub={t('widget.settings.pinSub')}
            chevron
            onPress={() => pinWidget(colors)}
          />
        ) : null}
        <SetRow
          colors={colors}
          icon="grid"
          tint={colors.on}
          label={t('widget.settings.howAdd')}
          chevron
          last
          onPress={() => showWidgetHow(colors)}
        />
      </SetCard>
      </>,
    )
  }

  if (page === 'nights') {
    return shell(
      t('marks.section.nights'),
      <>
      <View style={styles.gap} />
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="moon"
          tint={colors.on}
          label={t('settings.foldLine')}
          sub={t('settings.foldGraceSub', { zone: zoneWords(), time: clockWords('09:00') })}
        />
        <SetChoice
          colors={colors}
          icon="clock"
          tint={colors.on}
          label={t('settings.clock')}
          options={CLOCK_IDS.map((id) => ({ id, label: t(`clock.${id}`) }))}
          selected={prefs.clock}
          onSelect={(id) => writePrefs({ clock: id })}
        />
        <SetSwitch
          colors={colors}
          icon="moon"
          tint={colors.on}
          label={t('settings.gentle')}
          sub={t('settings.gentleSub')}
          on={prefs.gentle}
          onPress={() => {
            writePrefs({ gentle: !prefs.gentle })
            armLampPings(readShelf().boards).catch(() => {})
          }}
        />
        <SetRow
          colors={colors}
          icon="folder"
          tint={colors.on}
          label={t('tags.aria')}
          sub={t('tags.openHint')}
          chevron
          onPress={() => goHash('/me')}
          last
        />
      </SetCard>

      <SetCap colors={colors}>{t('settings.history')}</SetCap>
      <SetCard colors={colors}>
        <SetSwitch
          colors={colors}
          icon="eye"
          tint={colors.late}
          label={t('settings.hideMarks')}
          sub={`${t('settings.hideMarksSub')} ${t('settings.hideMarksFolder')}`}
          on={Boolean(book?.quietMode)}
          onPress={() => onChange?.({ ...book, quietMode: !book.quietMode })}
        />
        <SetRow
          colors={colors}
          icon="calendar"
          tint={colors.on}
          label={t('settings.history')}
          sub={t('settings.calendarSub')}
          chevron
          onPress={() => goHash('/calendar')}
        />
        {/* The same pages, same names, as the Your history page lists. */}
        <SetRow
          colors={colors}
          icon="priority"
          tint={colors.on}
          label={t('streaks.title')}
          sub={t('stats.streaksSub')}
          chevron
          onPress={() => goHash('/streaks')}
        />
        <SetRow
          colors={colors}
          icon="week"
          tint={colors.on}
          label={t('streaks.seven')}
          sub={t('stats.sevenSub')}
          chevron
          onPress={() => goHash('/week')}
        />
        <SetRow
          colors={colors}
          icon="pen"
          tint={colors.inkSoft}
          label={t('notes.title')}
          sub={t('notes.sub')}
          chevron
          onPress={() => goHash('/notes')}
        />
        <SetRow
          colors={colors}
          icon="note"
          tint={colors.inkSoft}
          label={t('feed.title')}
          sub={t('settings.feedSub')}
          chevron
          onPress={() => goHash('/feed')}
        />
        <SetRow
          colors={colors}
          icon="flag"
          tint={colors.late}
          label={t('stats.marks')}
          sub={t('stats.marksSub')}
          chevron
          onPress={() => goHash('/marks')}
        />
        <SetRow
          colors={colors}
          icon="chart"
          tint={colors.on}
          label={t('stats.title')}
          sub={t('settings.statsSub')}
          chevron
          last
          onPress={() => goHash('/stats')}
        />
      </SetCard>
      </>,
    )
  }

  if (page === 'privacy') {
    return shell(
      t('settings.privacyChoices'),
      <>
      <View style={styles.gap} />
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="shield"
          label={t('seen.title')}
          sub={t('seen.sub')}
          chevron
          onPress={() => goHash('/settings/seen')}
        />
        <SetSwitch
          colors={colors}
          icon="shield"
          tint={colors.late}
          label={t('settings.diagnostics')}
          sub={t('settings.diagnosticsSub')}
          on={Boolean(prefs.shareDiagnostics)}
          onPress={() => setShareDiagnostics(!prefs.shareDiagnostics)}
        />
        <SetRow
          colors={colors}
          icon="shield"
          tint={colors.inkSoft}
          label={t('settings.phonePrivacy')}
          sub={Platform.OS === 'android' ? t('settings.phonePrivacySubAndroid') : t('settings.phonePrivacySub')}
          chevron
          last
          onPress={() => Linking.openSettings().catch(() => confirmMiss(t('confirm.miss')))}
        />
      </SetCard>
      </>,
    )
  }

  if (page === 'help') {
    return shell(
      t('settings.help'),
      <>
      <View style={styles.gap} />
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="help"
          tint={colors.on}
          label={t('settings.howDidIWorks')}
          chevron
          onPress={() => goHash('/help')}
        />
        <SetRow
          colors={colors}
          icon="mail"
          tint={colors.late}
          label={t('feedback.send')}
          sub={t('feedback.sub')}
          chevron
          onPress={() => {
            const url = feedbackMailto()
            // No mail app (or no address): say so instead of a dead tap.
            if (!url) return confirmMiss(t('confirm.miss'))
            return Linking.openURL(url).catch(() => confirmMiss(t('confirm.miss')))
          }}
        />
        <SetRow
          colors={colors}
          icon="play"
          tint={colors.on}
          label={t('settings.replayIntro')}
          chevron
          last
          onPress={() => startTour('basics', { replay: true })}
        />
      </SetCard>
      </>,
    )
  }

  const lookWords = [t(`theme.${prefs.theme}`), t(`lang.${prefs.locale}`)].join(' · ')
  return (
    <BoardShell book={book} title={t('settings.kicker')} date={date} colors={colors}>
      {account.email && syncFailed(sync) ? (
        <SetCard colors={colors}>
          <SetRow colors={colors} icon="settings" tint={colors.late} label={t('settings.syncMiss')} value={syncing ? t('app.loading') : undefined} last onPress={syncing ? undefined : () => {
            setSyncing(true)
            Promise.resolve(pullAndMerge())
              .catch(() => confirmMiss(t('tonight.syncMiss')))
              .finally(() => setSyncing(false))
          }} />
        </SetCard>
      ) : null}
      <View style={styles.gap} />
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="bell" tint={colors.late} label={t('settings.reminders')} sub={t('settings.remindersRowSub')} chevron onPress={() => goHash('/pings')} />
        <SetRow
          colors={colors}
          icon="person"
          tint={colors.on}
          label={t('settings.account')}
          sub={account.email ? t('settings.accountOnSub', { email: account.email }) : t('settings.accountOffSub')}
          value={account.email ? '' : t('settings.accountOff')}
          chevron
          onPress={() => goHash('/account')}
        />
        <SetRow colors={colors} icon="palette" tint={colors.late} label={t('settings.look')} sub={t('settings.lookRowSub')} value={lookWords} chevron onPress={() => goHash('/settings/look')} />
        <SetRow colors={colors} icon="moon" tint={colors.on} label={t('marks.section.nights')} sub={t('settings.nightsRowSub')} chevron onPress={() => goHash('/settings/nights')} />
        <SetRow colors={colors} icon="settings" tint={colors.inkSoft} label={t('settings.yourData')} sub={t('settings.moreSub')} chevron onPress={() => goHash('/settings/more')} />
        <SetRow colors={colors} icon="shield" tint={colors.inkSoft} label={t('settings.privacyChoices')} sub={t('settings.privacyRowSub')} chevron onPress={() => goHash('/settings/privacy')} />
        <SetRow colors={colors} icon="help" tint={colors.on} label={t('settings.help')} sub={t('settings.helpRowSub')} chevron last onPress={() => goHash('/settings/help')} />
      </SetCard>

      {account.user ? (
        <View style={styles.out}>
          <KeyButton colors={colors} label={t('account.out')} disabled={outBusy} onPress={() => setSure({ title: t('account.outSureTitle'), body: t('account.outSureBody'), yes: t('account.out'), go: () => signOut() })} />
          <Text style={[styles.who, { color: colors.inkDim }]} accessibilityLabel={`${t('account.who')} ${account.email}`}>
            {t('account.who')} {account.email}
          </Text>
        </View>
      ) : null}
      <SureModal
        sure={sure}
        colors={colors}
        onClose={() => setSure(null)}
        onGo={() => {
          const go = sure?.go
          setSure(null)
          if (typeof go === 'function') go()
        }}
      />
    </BoardShell>
  )
}

const styles = StyleSheet.create({
  gap: { height: 14 },
  out: { marginTop: 24, gap: 8 },
  who: { fontFamily: fonts.ui, fontSize: 13, textAlign: 'center' },
  version: { fontFamily: fonts.ui, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 16, marginBottom: 8 },
  copyright: { fontFamily: fonts.ui, fontSize: 11, lineHeight: 16, textAlign: 'center', marginBottom: 8 },
  miss: { fontFamily: fonts.ui, fontSize: 14, marginHorizontal: 3, marginTop: 4 },
  popKicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  popTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  popRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
})
