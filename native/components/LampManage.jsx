import { takeDown, toggleArchive } from '../../src/lib/board-ops.js'
import { t } from '../../src/lib/i18n.js'
import { goHash } from '../navigation/hash.js'
import { SetCap, SetCard, SetRow } from './SetBits.jsx'
import { publishSheet } from './SheetHost.jsx'

function deleteNote(book, lamp) {
  const taps = (book.answers || []).filter((item) => item.lampId === lamp.id).length
  if (taps === 0) return t('lamp.deleteNone')
  if (taps === 1) return t('lamp.deleteOne')
  return t('lamp.deleteSome', { n: taps })
}

// Stop asking and Delete, shared by the question page and its edit page.
// `onPaused` lets the edit page keep its unsaved draft in step with the pause.
export function LampManage({ book, lamp, colors, onChange, onPaused }) {
  if (!lamp) return null

  function togglePause() {
    const next = toggleArchive(book, lamp)
    onChange(next)
    onPaused?.(!lamp.archived)
  }

  function askDelete() {
    publishSheet({
      title: t('lamp.deleteTitle'),
      body: deleteNote(book, lamp),
      goLabel: t('lamp.delete'),
      closeLabel: t('lamp.keep'),
      colors,
      onClose: () => publishSheet(null),
      onGo: () => {
        publishSheet(null)
        onChange(takeDown(book, lamp))
        goHash('/lamps')
      },
    })
  }

  return (
    <>
      <SetCap colors={colors}>{t('lamp.secManage')}</SetCap>
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          icon={lamp.archived ? 'play' : 'pause'}
          label={lamp.archived ? t('lamp.askAgain') : t('lamp.stop')}
          sub={lamp.archived ? t('lamp.askAgainSub') : t('lamp.stopSub')}
          onPress={togglePause}
        />
        <SetRow
          colors={colors}
          icon="trash"
          label={t('lamp.delete')}
          sub={t('lamp.deleteSub')}
          danger
          last
          onPress={askDelete}
        />
      </SetCard>
    </>
  )
}
