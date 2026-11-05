import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { t } from '../../src/lib/i18n.js'
import { loadProofs } from '../../src/lib/proofs.js'
import { boardDate } from '../../src/lib/recurrence.js'
import { addProofFlow, canAddProof, openProofView } from '../lib/proof-flow.jsx'
import { sectionLabel } from '../theme.js'
import { ProofRow } from './ProofRow.jsx'
import { KeyButton } from './ui.jsx'

/**
 * Photos on tonight's Did we answers: Add photo after your Did, and the
 * photos of the others on the card (the server leaves out what you may not
 * see, including cards that show only a count). One read per page.
 */
export function WeProofs({ card, mine, colors }) {
  const uid = useAccount().user?.id
  const [rows, setRows] = useState([])
  const night = card.slot || boardDate()
  const load = useCallback(() => {
    let live = true
    loadProofs({ cardIds: [card.id] })
      .then((out) => {
        if (live && !out.miss) setRows(out.rows)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [card.id])
  useEffect(() => load(), [load, mine?.status])

  const tonight = rows.filter((row) => row.night === night)
  const mineHere = tonight.some((row) => row.owner_id === uid)
  const canAdd = card.due && mine?.status === 'did' && !mineHere && card.shows !== 'count' && canAddProof()
  if (!tonight.length && !canAdd) return null
  const nameOf = (id) => (id === uid ? t('we.you') : (card.people || []).find((p) => p.id === id)?.name || t('people.someone'))

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.inkDim }]}>{t('proof.title')}</Text>
      {tonight.map((row) => (
        <ProofRow
          key={row.id}
          row={row}
          name={nameOf(row.owner_id)}
          colors={colors}
          onOpen={() => openProofView({ row, mine: row.owner_id === uid, name: nameOf(row.owner_id), colors, onGone: load })}
        />
      ))}
      {canAdd ? (
        <KeyButton
          colors={colors}
          label={t('proof.add')}
          onPress={() => addProofFlow({ target: { cardId: card.id }, night, colors, onDone: load })}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 4, marginTop: 8 },
  label: { ...sectionLabel },
})
