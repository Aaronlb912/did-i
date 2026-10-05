import { clockWords } from '../../src/lib/hall-pages.js'
import { useEffect, useState } from 'react'
import { Linking, Platform, StyleSheet, Text, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { t } from '../../src/lib/i18n.js'
import { confirmDone } from '../lib/confirm.js'
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
import { WIDGET_NAME } from '../../src/lib/widget-tonight.js'
import { useAccount } from '../../src/lib/account.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { feedbackMailto } from '../../src/lib/feedback.js'
import { legalEmail } from '../../src/lib/legal.js'
import { shareShelf } from '../../src/lib/native.js'
import { mergeShelves } from '../../src/lib/shelf-merge.js'
import { closeSession, hasPin } from '../../src/lib/session.js'
import { zoneWords } from '../../src/lib/zone.js'
import { useHallColors } from '../hooks/useHallColors.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { BoardShell } from '../components/BoardShell.jsx'
import { publishSheet } from '../components/SheetHost.jsx'
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

function showWidgetHow(colors) {
  publishSheet({
    title: t('widget.settings.howAdd'),
    body: t(Platform.OS === 'ios' ? 'widget.settings.howAddIos' : 'widget.settings.howAddAndroid'),
    closeLabel: t('settings.close'),
    colors,
    onClose: () => publishSheet(null),
  })
}

// Asks the launcher to put the widget on the home screen. Launchers that
// cannot (or a build without the call) get the steps instead.
async function pinWidget(colors) {
  let asked = false
  try {
    const mod = await import('react-native-android-widget')
    if (typeof mod?.requestPinWidget === 'function') {
      asked = await mod.requestPinWidget({ widgetName: WIDGET_NAME })
    }
  } catch {
    asked = false
  }
  if (!asked) showWidgetHow(colors)
}

export function PhoneSettingsScreen({ book, onChange }) {
  const colors = useHallColors(book)
  const account = useAccount()
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

      {/* Never signed in, there is nothing to sign out of. */}
      {account.user ? (
      <>
      <SetCap colors={colors}>{t('settings.danger')}</SetCap>
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="logout"
          label={t('settings.signOut')}
          note={hasPin() ? t('settings.signOutSubPin') : t('settings.signOutSub')}
          danger
          onPress={() => {
            closeSession()
            confirmDone(t('confirm.signedOut'))
            goHash('/enter')
          }}
        />
      </SetCard>
      </>
      ) : null}
    </BoardShell>
  )
}

// The widget's "same as folder" choice, next to look ids in one list.
const WIDGET_LOOK_TAG = ':folder'

export function ProfileScreen({ book, onChange, onImport, onStartEmpty, onSendCopy }) {
  const colors = useHallColors(book)
  const prefs = usePrefs()
  const account = useAccount()
  const [loadNote, setLoadNote] = useState('')
  const widget = readWidgetSettings()
  const widgetShelf = readShelf()
  const widgetLooks = [...ownedLookIds(widgetShelf)].sort()

  const [loading, setLoading] = useState(false)

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
      const merged = mergeShelves(before, coming, '', new Date().toISOString())
      if (onImport) onImport(merged)
      const was = before.boards.reduce((n, b) => n + (b.lamps || []).length, 0)
      const now = merged.boards.reduce((n, b) => n + (b.lamps || []).length, 0)
      setLoadNote(t('settings.loadOk', { n: Math.max(0, now - was) }))
    } catch {
      setLoadNote(t('settings.loadMiss'))
    }
  }

  return (
    <BoardShell book={book} title={t('settings.kicker')} date={formatBoardDate(boardDate(new Date(), book.dayFoldHour))} colors={colors}>

      <SetCap colors={colors}>{t('account.kicker')}</SetCap>
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="person"
          tint={colors.on}
          label={t('settings.account')}
          sub={account.email ? t('settings.accountSub') : t('settings.accountOffSub')}
          value={account.email || t('settings.accountOff')}
          chevron
          onPress={() => goHash('/account')}
        />
        <SetRow
          colors={colors}
          icon="people"
          tint={colors.late}
          label={t('people.kicker')}
          sub={t('people.rowSub')}
          chevron
          onPress={() => goHash('/people')}
        />
      </SetCard>

      <SetCap colors={colors}>{t('settings.look')}</SetCap>
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
          onSelect={(id) => writePrefs({ locale: id })}
        />
        <SetSwitch
          colors={colors}
          icon="motion"
          tint={colors.on}
          last
          label={t('settings.lessMotion')}
          on={prefs.lessMotion}
          onPress={() => writePrefs({ lessMotion: !prefs.lessMotion })}
        />
      </SetCard>

      <SetCap colors={colors}>{t('widget.settings.cap')}</SetCap>
      <SetCard colors={colors}>
        <SetChoice
          colors={colors}
          icon="grid"
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
          onPress={() => showWidgetHow(colors)}
        />
      </SetCard>

      <SetCap colors={colors}>{t('settings.tonight')}</SetCap>
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="clock"
          tint={colors.on}
          label={t('settings.fold')}
          sub={t('settings.foldGraceSub', { zone: zoneWords(), time: clockWords('09:00') })}
          value={t('settings.foldAt')}
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
        <SetRow
          colors={colors}
          icon="bell"
          tint={colors.late}
          label={t('settings.reminders')}
          chevron
          onPress={() => goHash('/pings')}
        />
        <SetSwitch
          colors={colors}
          icon="volume"
          tint={colors.on}
          label={t('settings.soundOn')}
          on={Boolean(book?.clickSound)}
          onPress={() => onChange?.({ ...book, clickSound: !book.clickSound })}
        />
        <SetSwitch
          colors={colors}
          icon="eye"
          tint={colors.late}
          label={t('settings.hideMarks')}
          on={Boolean(book?.quietMode)}
          onPress={() => onChange?.({ ...book, quietMode: !book.quietMode })}
        />
      </SetCard>

      <SetCap colors={colors}>{t('tags.aria')}</SetCap>
      <SetCard colors={colors}>
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
        <SetRow
          colors={colors}
          icon="collection"
          tint={colors.late}
          label={t('marks.kicker')}
          chevron
          onPress={() => goHash('/marks')}
        />
        <SetRow
          colors={colors}
          icon="calendar"
          tint={colors.on}
          label={t('boards.calendar')}
          sub={t('settings.calendarSub')}
          chevron
          onPress={() => goHash('/calendar')}
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
      </SetCard>

      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon="settings"
          tint={colors.inkSoft}
          label={t('settings.title')}
          sub={account.user ? t('settings.phoneSub') : t('settings.phoneSubOut')}
          chevron
          onPress={() => goHash('/settings/phone')}
        />
      </SetCard>

      <SetCap colors={colors}>{t('settings.yourData')}</SetCap>
      <SetCard colors={colors}>
        {onSendCopy ? (
          <SetRow
            colors={colors}
            icon="note"
            tint={colors.inkSoft}
            label={t('settings.sendCopy')}
            sub={t('settings.sendCopySub')}
            onPress={onSendCopy}
          />
        ) : (
          <SetRow
            colors={colors}
            icon="note"
            tint={colors.inkSoft}
            label={t('settings.sendCopy')}
            sub={t('settings.sendCopySub')}
            onPress={() => shareShelf(readShelf())}
          />
        )}
        <SetRow
          colors={colors}
          icon="inbox"
          tint={colors.late}
          label={t('settings.loadCopy')}
          sub={t('settings.loadCopySub')}
          onPress={loading ? undefined : pickFile}
          last
        />
      </SetCard>
      {loadNote ? <SetNote colors={colors}>{loadNote}</SetNote> : null}

      <SetCap colors={colors}>{t('settings.help')}</SetCap>
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
          icon="pen"
          tint={colors.late}
          label={t('feedback.send')}
          sub={t('feedback.sub')}
          onPress={() => {
            const url = feedbackMailto()
            if (url) Linking.openURL(url)
          }}
        />
        <SetRow
          colors={colors}
          icon="play"
          tint={colors.on}
          label={t('settings.replayIntro')}
          chevron
          last
          onPress={() => goHash('/welcome')}
        />
      </SetCard>

      <SetCap colors={colors}>{t('settings.privacyChoices')}</SetCap>
      <SetCard colors={colors}>
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
          onPress={() => Linking.openSettings()}
        />
      </SetCard>

      <SetCap colors={colors}>{t('settings.legal')}</SetCap>
      <SetCard colors={colors}>
        <SetRow colors={colors} icon="note" tint={colors.inkSoft} label={t('settings.privacy')} chevron onPress={() => goHash('/privacy')} />
        <SetRow colors={colors} icon="note" tint={colors.inkSoft} label={t('settings.terms')} chevron last onPress={() => goHash('/terms')} />
      </SetCard>
      {!legalEmail() ? <Text style={[styles.miss, { color: colors.miss }]}>{t('legal.operatorWarn')}</Text> : null}

      <SetCap colors={colors}>{t('settings.danger')}</SetCap>
      <SetCard colors={colors}>
        {onStartEmpty ? (
          <SetRow
            colors={colors}
            icon="warning"
            label={t('settings.emptyBoard')}
            sub={t('settings.clearFolderSub', { name: book?.title || '' })}
            danger
            last
            onPress={() =>
              publishSheet({
                kicker: t('settings.startOver'),
                title: t('settings.clearFolderTitle', { name: book?.title || '' }),
                body: t('settings.clearFolderBody', { name: book?.title || '' }),
                goLabel: t('settings.clearYes'),
                danger: true,
                closeLabel: t('settings.neverMind'),
                colors,
                onClose: () => publishSheet(null),
                onGo: () => {
                  publishSheet(null)
                  onStartEmpty()
                  confirmDone(t('confirm.startedOver'))
                },
              })
            }
          />
        ) : null}
      </SetCard>

      <Text style={[styles.version, { color: colors.inkDim }]} accessibilityRole="text">
        {appVersionLines().join(' · ')}
      </Text>
    </BoardShell>
  )
}

const styles = StyleSheet.create({
  version: { fontFamily: fonts.ui, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 16, marginBottom: 8 },
  miss: { fontFamily: fonts.ui, fontSize: 14, marginHorizontal: 3, marginTop: 4 },
  popKicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  popTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  popRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
})
