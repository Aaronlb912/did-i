import { takeDown, toggleArchive, undoBulkLamps } from '../../src/lib/board-ops.js'
import { t } from '../../src/lib/i18n.js'
import { goHash } from '../navigation/hash.js'
import { SetCap, SetCard, SetRow } from './SetBits.jsx'
import { publishSheet } from './SheetHost.jsx'
import { confirmDone } from '../lib/confirm.js'
import { showToast } from '../lib/toast-queue.js'

function deleteNote(book, lamp) {
  const taps = (book.answers || []).filter((item) => item.lampId === lamp.id).length
  if (taps === 0) return t('lamp.deleteNone')
  if (taps === 1) return t('lamp.deleteOne')
  return t('lamp.deleteSome', { n: taps })
}

// Stop asking and Delete, shared by the question page and its edit page.
// `onPaused` lets the edit page keep its unsaved draft in step with the pause.
export function LampManage({ book, lamp, colors, onChange, onPaused, onDuplicate }) {
  if (!lamp) return null

  function togglePause() {
    const next = toggleArchive(book, lamp)
    onChange(next)
    onPaused?.(!lamp.archived)
    if (lamp.archived) {
      confirmDone(t('confirm.questionResumed'))
      return
    }
    // Pausing can be taken back for a few seconds, like an answer.
    const before = book
    const now = Date.now()
    showToast({
      id: 'undo:pause',
      kind: 'undo',
      rev: now,
      label: t('confirm.questionPaused'),
      hint: t('tonight.undoTap'),
      until: now + 6000,
      total: 6000,
      onPress: () => {
        onChange(before)
        onPaused?.(false)
      },
    })
  }

  function askDelete() {
    publishSheet({
      title: t('lamp.deleteTitle'),
      body: deleteNote(book, lamp),
      goLabel: t('lamp.delete'),
      danger: true,
      closeLabel: t('lamp.keep'),
      colors,
      onClose: () => publishSheet(null),
      onGo: () => {
        publishSheet(null)
        // Like Select's delete, it can be taken back for a few seconds.
        const before = book
        const after = takeDown(book, lamp)
        const now = Date.now()
        onChange(after)
        goHash('/lamps')
        showToast({
          id: 'undo:delete',
          kind: 'undo',
          rev: now,
          label: t('confirm.questionRemoved'),
          hint: t('tonight.undoTap'),
          until: now + 6000,
          total: 6000,
          // Clears the delete's tombstone too, or sync would drop it again.
          onPress: () => onChange(undoBulkLamps([after], [before], [{ lampId: lamp.id }])[0] || before),
        })
      },
    })
  }

  return (
    <>
      <SetCap colors={colors}>{t('lamp.secManage')}</SetCap>
      <SetCard colors={colors}>
        {onDuplicate ? (
          <SetRow colors={colors} icon="copy" label={t('lamp.copy')} sub={t('lamp.copySub')} onPress={onDuplicate} />
        ) : null}
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
