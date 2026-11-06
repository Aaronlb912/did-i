import NetInfo from '@react-native-community/netinfo'
import { useState } from 'react'
import { Dimensions, Image, Linking, Platform, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { formatBoardDate } from '../../src/lib/recurrence.js'
import { addProof, freshProofUrl, removeProof, reportProof } from '../../src/lib/proofs.js'
import { publishSheet } from '../components/SheetHost.jsx'
import { DidButton } from '../components/ui.jsx'
import { fonts } from '../theme.js'
import { confirmDone, confirmMiss, once } from './confirm.js'
import { dropToast, showToast } from './toast-queue.js'
import { canAddProof, pickProofBytes } from './proof-pick.js'

const DENIED = { 'camera-denied': 'avatar.cameraOff', 'photos-denied': 'avatar.photosOff', 'too-big': 'proof.tooBig' }

export { canAddProof }

// Choose or take a photo for a Did, then save it. A miss shows as a toast and
// the answer stays. target: { sendId } or { cardId }. ready: runs before the
// photo row is made (a Did you answer reaches the server first).
export function addProofFlow({ target, night, colors, ready, onDone }) {
  if (!canAddProof()) return
  const deny = (key) => {
    publishSheet({
      title: t('proof.deniedTitle'),
      body: t(key),
      content: <DidButton colors={colors} label={t('proof.openSettings')} onPress={() => Linking.openSettings().catch(() => confirmMiss(t('confirm.miss')))} />,
      closeLabel: t('proof.close'),
      colors,
      onClose: () => publishSheet(null),
    })
  }
  function go(from) {
    publishSheet(null)
    return once('proof-add', async () => {
      showToast({ id: 'proof-sending', kind: 'done', text: t('proof.sending'), ms: 60000 })
      try {
        const net = await NetInfo.fetch().catch(() => null)
        if (net && (!net.isConnected || net.isInternetReachable === false)) {
          dropToast('proof-sending')
          return confirmMiss(t('proof.offline'))
        }
        const bytes = await pickProofBytes(from, { target, night })
        if (!bytes) return
        const out = await addProof(target, night, bytes, ready)
        dropToast('proof-sending')
        if (out.miss) return confirmMiss(t(out.miss))
        confirmDone(t('proof.saved'))
        onDone?.()
      } catch (error) {
        dropToast('proof-sending')
        const key = DENIED[error?.message]
        if (error?.message === 'camera-denied' || error?.message === 'photos-denied') return deny(key)
        confirmMiss(t(key || 'proof.fail'))
      } finally {
        dropToast('proof-sending')
      }
    })
  }
  publishSheet({
    title: t('proof.add'),
    goLabel: t('proof.choose'),
    onGo: () => go('library'),
    moreLabel: t('proof.take'),
    onMore: () => go('camera'),
    closeLabel: t('settings.neverMind'),
    colors,
    onClose: () => publishSheet(null),
  })
}

// Remove and report each ask first. back: where Never mind returns to.
export function askRemoveProof({ row, colors, back, onGone }) {
  publishSheet({
    title: t('proof.removeTitle'),
    body: t('proof.removeBody'),
    danger: true,
    goLabel: t('proof.remove'),
    closeLabel: t('settings.neverMind'),
    colors,
    onClose: back,
    onGo: async () => {
      publishSheet(null)
      const out = await removeProof(row)
      if (out.miss) return confirmMiss(t(out.miss))
      confirmDone(t('proof.removed'))
      onGone?.()
    },
  })
}

export function askReportProof({ row, colors, back, onGone }) {
  publishSheet({
    title: t('proof.reportTitle'),
    body: t('proof.reportBody'),
    goLabel: t('proof.report'),
    closeLabel: t('settings.neverMind'),
    colors,
    onClose: back,
    onGo: async () => {
      publishSheet(null)
      const out = await reportProof(row.id)
      if (out.miss) return confirmMiss(t(out.miss))
      confirmDone(t('proof.reported'))
      onGone?.()
    },
  })
}

// The photo as a file in the share sheet. The signed link is downloaded to
// the cache first, since sharing needs a file on the phone.
export async function shareProof(row) {
  let target = null
  try {
    const FileSystem = require('expo-file-system')
    const Sharing = require('expo-sharing')
    if (typeof FileSystem.File?.downloadFileAsync !== 'function' || !(await Sharing.isAvailableAsync())) throw new Error('no share')
    target = new FileSystem.File(FileSystem.Paths.cache, `did-i-photo-${row.id}.jpg`)
    if (target.exists) target.delete()
    // The link in the list may be an hour old; make a new one.
    const url = (await freshProofUrl(row)) || row.url
    const file = await FileSystem.File.downloadFileAsync(url, target)
    await Sharing.shareAsync(file.uri, { mimeType: 'image/jpeg', dialogTitle: t('photos.share'), UTI: 'public.jpeg' })
  } catch (error) {
    if (!/cancel|dismiss/i.test(String(error?.message || ''))) confirmMiss(t('photos.shareFail'))
  } finally {
    try {
      if (target?.exists) target.delete()
    } catch {
      // The cache is cleared by the system anyway.
    }
  }
}

// Hidden on a build without the media library module, and on Android 10 and
// below, where saving needs the storage permission the manifest removes.
export function canSaveProof() {
  if (Platform.OS === 'android' && Number(Platform.Version) < 30) return false
  try {
    return Boolean(require('expo-media-library').Asset)
  } catch {
    return false
  }
}

// Save the photo to the phone's library. Add-only permission; denied shows the
// Settings sheet. Same download as shareProof, deleted when done.
export async function saveProof(row, colors) {
  let target = null
  try {
    const MediaLibrary = require('expo-media-library')
    const FileSystem = require('expo-file-system')
    if (!MediaLibrary.Asset || typeof FileSystem.File?.downloadFileAsync !== 'function') throw new Error('no save')
    const ask = await MediaLibrary.requestPermissionsAsync(true)
    if (!ask?.granted) {
      publishSheet({
        title: t('proof.deniedTitle'),
        body: t('photos.saveOff'),
        content: <DidButton colors={colors} label={t('proof.openSettings')} onPress={() => Linking.openSettings().catch(() => confirmMiss(t('confirm.miss')))} />,
        closeLabel: t('proof.close'),
        colors,
        onClose: () => publishSheet(null),
      })
      return
    }
    target = new FileSystem.File(FileSystem.Paths.cache, `did-i-save-${row.id}.jpg`)
    if (target.exists) target.delete()
    const url = (await freshProofUrl(row)) || row.url
    const file = await FileSystem.File.downloadFileAsync(url, target)
    await MediaLibrary.Asset.create(file.uri)
    confirmDone(t('photos.saved'))
  } catch {
    confirmMiss(t('photos.saveFail'))
  } finally {
    try {
      if (target?.exists) target.delete()
    } catch {
      // The cache is cleared by the system anyway.
    }
  }
}

// One fresh link on a load miss (the one in the list may have expired), then a plain note.
function ProofImage({ row, name, size, colors }) {
  const [uri, setUri] = useState(row.url)
  const [tried, setTried] = useState(false)
  const [gone, setGone] = useState(false)
  if (gone) {
    return (
      <View style={[size, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel2, borderRadius: 12 }]}>
        <Text style={{ color: colors.inkSoft, fontFamily: fonts.ui, fontSize: 15 }}>{t('proof.gone')}</Text>
      </View>
    )
  }
  return (
    <Image
      source={{ uri }}
      resizeMode="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('photos.thumbA11y', { name, day: formatBoardDate(row.night) })}
      style={size}
      onError={async () => {
        if (tried) return setGone(true)
        setTried(true)
        const fresh = await freshProofUrl(row).catch(() => '')
        if (fresh) setUri(fresh)
        else setGone(true)
      }}
    />
  )
}

// The full view of one photo, in the app's sheet (not a Modal). The owner
// can remove it; anyone else can report it, which hides it for them at once.
export function openProofView({ row, mine, name, colors, onGone }) {
  const win = Dimensions.get('window')
  const size = { width: win.width - 76, height: Math.round(win.height * 0.55) }
  const preview = <ProofImage row={row} name={name} size={size} colors={colors} />
  const back = () => openProofView({ row, mine, name, colors, onGone })
  publishSheet({
    title: mine ? t('proof.yours') : t('proof.from', { name }),
    preview,
    colors,
    closeLabel: t('proof.close'),
    onClose: () => publishSheet(null),
    ...(mine
      ? { danger: true, goLabel: t('proof.remove'), onGo: () => askRemoveProof({ row, colors, back, onGone }) }
      : { moreLabel: t('proof.report'), onMore: () => askReportProof({ row, colors, back, onGone }) }),
  })
}
