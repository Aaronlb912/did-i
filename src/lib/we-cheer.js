// Cheering someone on a Did we: the same friend or family cheer as on their
// sheet in Friends and family (stored cheers, bought with gems, capped by the
// server), started from the card.
import { useState } from 'react'
import { t, tMiss } from './i18n.js'
import { cheerFamily, cheerFriend } from './people.js'
import { fireCheer, friendCheerMissKey, normalizePurse } from './purse.js'

export function useWeCheer(book, onChange) {
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  const [miss, setMiss] = useState('')

  async function cheer(person) {
    if (!book || !onChange || busy) return
    const cheerOn = normalizePurse(book).cheerOn
    setBusy(person.id)
    setMiss('')
    // Friends first; someone only in your family goes the family way.
    let sent = await cheerFriend(book, person.id, cheerOn)
    if (sent.miss === 'notFriend') sent = await cheerFamily(book, person.id, '', cheerOn)
    setBusy('')
    const known = friendCheerMissKey(sent.miss)
    if (known) return setMiss(t(known.key, known.vars))
    if (sent.miss) return setMiss(tMiss(sent.miss))
    onChange(sent.book)
    if (cheerOn) fireCheer(cheerOn, 1)
    return setNote(t('family.cheerSent', { name: person.name || t('people.someone') }))
  }

  return { cheer, busy, note, miss, can: Boolean(book && onChange) }
}
