import { Platform } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { saveAvatar } from '../../src/lib/avatar.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { cloud } from '../../src/lib/cloud.js'
import { addProof } from '../../src/lib/proofs.js'
import { pushSendAnswers } from '../../src/lib/send-answers.js'
import { readAccountUserId } from '../../src/lib/session-id.js'
import { confirmDone, confirmMiss } from './confirm.js'

// On a phone low on memory, Android can close Did I while the camera is open.
// What the photo was for is kept until the camera returns; on the next start
// the photo is picked up from expo-image-picker and saved.
const KEY = 'did-i-camera-for'
const FRESH_MS = 60 * 60 * 1000

export function noteCameraFor(mark) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...mark, uid: readAccountUserId(), at: Date.now() }))
  } catch {
    // ok
  }
}

export function clearCameraFor() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ok
  }
}

function readMark() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}

// Run once signed in, with that account's id. Cleared first, so it never runs
// twice for one photo; another account never gets it.
export async function finishCameraPhoto(userId) {
  const mark = readMark()
  if (!mark) return
  clearCameraFor()
  if (Platform.OS !== 'android' || Date.now() - (mark.at || 0) > FRESH_MS || !mark.uid || mark.uid !== userId) return
  try {
    const { canAddProof, shrinkProof } = require('./proof-pick.js')
    if (!canAddProof()) return
    const pending = await require('expo-image-picker').getPendingResultAsync()
    const result = Array.isArray(pending) ? pending[0] : pending
    const asset = result && !result.canceled ? result.assets?.[0] : null
    if (!asset?.uri) return
    if (mark.for === 'avatar') {
      const { shrinkAvatar } = require('./avatar-pick.js')
      const out = await saveAvatar(await shrinkAvatar(asset))
      if (out?.miss) return confirmMiss(t('avatar.saveFail'))
      confirmDone(t('confirm.photoSaved'))
    } else if (mark.for === 'proof' && mark.target && mark.night) {
      // A Did you photo needs the answer on the server first, like the Did toast.
      const ready = mark.target.sendId
        ? async () => {
            const db = cloud()
            const { data } = (await db?.auth.getSession()) || {}
            if (data?.session?.user) await pushSendAnswers(db, data.session.user, readShelf())
          }
        : undefined
      const out = await addProof(mark.target, mark.night, await shrinkProof(asset), ready)
      if (out?.miss) return confirmMiss(t(out.miss))
      confirmDone(t('proof.saved'))
    }
  } catch (error) {
    confirmMiss(t(mark.for === 'avatar' ? 'avatar.saveFail' : error?.message === 'too-big' ? 'proof.tooBig' : 'proof.fail'))
  }
}
