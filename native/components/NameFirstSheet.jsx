import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { t, tMiss } from '../../src/lib/i18n.js'
import { needsName, saveName } from '../../src/lib/people.js'
import { DidButton, Field } from './ui.jsx'
import { publishSheet } from './SheetHost.jsx'

function NameFirst({ colors, onSaved }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')
  async function save() {
    setBusy(true)
    setMiss('')
    const out = await saveName(name).catch(() => ({ miss: 'people.reach' }))
    setBusy(false)
    if (out.miss) return setMiss(tMiss(out.miss))
    return onSaved()
  }
  return (
    <View>
      <Field
        colors={colors}
        label={t('people.name')}
        placeholder={t('people.namePh')}
        value={name}
        onChangeText={setName}
        maxLength={40}
        autoCapitalize="words"
        autoFocus
      />
      {miss ? <Text style={[styles.miss, { color: colors.miss }]}>{miss}</Text> : null}
      <DidButton colors={colors} label={t('friendAsk.saveSend')} disabled={busy || !name.trim()} onPress={save} />
    </View>
  )
}

// Before a friend request: with no name the person asked only sees
// "Someone", and the server refuses it (supabase/friend-ask-name.sql).
// Resolves true when there is a name to send with, false when they backed out.
export async function nameFirst(colors) {
  if (!(await needsName().catch(() => false))) return true
  return new Promise((resolve) => {
    publishSheet({
      kicker: t('friendAsk.kicker'),
      title: t('friendAsk.nameTitle'),
      body: t('friendAsk.nameFirst'),
      content: (
        <NameFirst
          colors={colors}
          onSaved={() => {
            publishSheet(null)
            resolve(true)
          }}
        />
      ),
      closeLabel: t('friendAsk.dontSend'),
      colors,
      onClose: () => {
        publishSheet(null)
        resolve(false)
      },
    })
  })
}

const styles = StyleSheet.create({
  miss: { marginTop: 6, marginBottom: 6 },
})
