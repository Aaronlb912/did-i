import { Dimensions, Image } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { addProof, removeProof, reportProof } from '../../src/lib/proofs.js'
import { publishSheet } from '../components/SheetHost.jsx'
import { confirmDone, confirmMiss } from './confirm.js'
import { canAddProof, pickProofBytes } from './proof-pick.js'

const DENIED = { 'camera-denied': 'avatar.cameraOff', 'photos-denied': 'avatar.photosOff', 'too-big': 'proof.tooBig' }

export { canAddProof }

// Choose or take a photo for a Did, then save it. A miss shows as a toast and
// the answer stays. target: { sendId } or { cardId }. ready: runs before the
// photo row is made (a Did you answer reaches the server first).
export function addProofFlow({ target, night, colors, ready, onDone }) {
  if (!canAddProof()) return
  async function go(from) {
    publishSheet(null)
    try {
      const bytes = await pickProofBytes(from)
      if (!bytes) return
      const out = await addProof(target, night, bytes, ready)
      if (out.miss) return confirmMiss(t(out.miss))
      confirmDone(t('proof.saved'))
      onDone?.()
    } catch (error) {
      confirmMiss(t(DENIED[error?.message] || 'proof.fail'))
    }
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

// The full view of one photo, in the app's sheet (not a Modal). The owner
// can remove it; anyone else can report it, which hides it for them at once.
export function openProofView({ row, mine, name, colors, onGone }) {
  const win = Dimensions.get('window')
  const preview = (
    <Image
      source={{ uri: row.url }}
      resizeMode="contain"
      accessibilityLabel={t('proof.viewA11y', { name })}
      style={{ width: win.width - 76, height: Math.round(win.height * 0.55) }}
    />
  )
  const close = () => publishSheet(null)
  const back = () => openProofView({ row, mine, name, colors, onGone })
  publishSheet({
    title: mine ? t('proof.yours') : t('proof.from', { name }),
    preview,
    colors,
    closeLabel: t('proof.close'),
    onClose: close,
    ...(mine
      ? {
          danger: true,
          goLabel: t('proof.remove'),
          onGo: () =>
            publishSheet({
              title: t('proof.removeTitle'),
              body: t('proof.removeBody'),
              danger: true,
              goLabel: t('proof.remove'),
              closeLabel: t('settings.neverMind'),
              colors,
              onClose: back,
              onGo: async () => {
                close()
                const out = await removeProof(row)
                if (out.miss) return confirmMiss(t(out.miss))
                confirmDone(t('proof.removed'))
                onGone?.()
              },
            }),
        }
      : {
          moreLabel: t('proof.report'),
          onMore: () =>
            publishSheet({
              title: t('proof.reportTitle'),
              body: t('proof.reportBody'),
              goLabel: t('proof.report'),
              closeLabel: t('settings.neverMind'),
              colors,
              onClose: back,
              onGo: async () => {
                close()
                const out = await reportProof(row.id)
                if (out.miss) return confirmMiss(t(out.miss))
                confirmDone(t('proof.reported'))
                onGone?.()
              },
            }),
        }),
  })
}
