import { useCallback, useEffect, useState } from 'react'
import { claimInvites, cleanInvite, invitePayoutNote, readMine, useInvite } from './people.js'
import { applyInvitePayout } from './purse.js'
import { t, tMiss } from './i18n.js'

export function useReferralCode({ book, onChange }) {
  const [draft, setDraft] = useState('')
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [locked, setLocked] = useState(null)
  const [gemsPaid, setGemsPaid] = useState(0)
  const [joined, setJoined] = useState(0)

  const refresh = useCallback(async () => {
    const who = await readMine()
    setLocked(Boolean(who?.invited_by))
    setGemsPaid(Number(who?.invite_gems_paid) || 0)
    const won = await claimInvites()
    setJoined(won.joined)
    if (won.gems > 0) {
      const again = await readMine()
      setGemsPaid(Number(again?.invite_gems_paid) || 0)
    }
    return who
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  function note(words) {
    setMiss('')
    setSaid(words)
  }

  async function redeem() {
    const { miss: why } = await useInvite(draft)
    if (why === 'code') return setMiss(t('people.inviteShort'))
    if (why === 'nobody') return setMiss(t('people.noInvite'))
    if (why === 'self') return setMiss(t('people.ownInvite'))
    if (why === 'used') return setMiss(t('people.inviteUsed'))
    if (why) return setMiss(tMiss(why))
    setDraft('')
    const won = await claimInvites()
    if (onChange && (won.gems || won.looks.length)) {
      onChange(applyInvitePayout(book, won))
    }
    await refresh()
    const words = invitePayoutNote(won)
    if (words) {
      note(words)
      return
    }
    note(t('people.inviteOk'))
  }

  return {
    draft,
    setDraft: (value) => setDraft(cleanInvite(value)),
    miss,
    said,
    locked,
    gemsPaid,
    joined,
    redeem,
    refresh,
    note,
  }
}
