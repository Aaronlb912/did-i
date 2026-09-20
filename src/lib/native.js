import { boardDate } from './recurrence.js'
import { readReduceMotion } from './useReduceMotion.js'

// Web build. Native uses native/shim/native.js via Metro.

export function isNativeHall() {
  return false
}

function reduceMotion() {
  return readReduceMotion()
}

export async function bootNative() {}

export async function checkNativePings() {
  return null
}

export async function requestNativePings() {
  return null
}

export async function scheduleNativePings() {}

export async function feelTap(kind) {
  if (reduceMotion()) return
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = kind === 'skip' ? 140 : kind === 'hall-on' ? 520 : 190
    gain.gain.setValueAtTime(kind === 'skip' ? 0.03 : 0.05, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.045)
    window.setTimeout(() => ctx.close(), 80)
  } catch {
    // No audio.
  }
}

export function playClick() {
  if (reduceMotion()) return
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 190
    gain.gain.setValueAtTime(0.05, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.045)
    window.setTimeout(() => ctx.close(), 80)
  } catch {
    // No audio.
  }
}

export async function passAlong(text, title) {
  const line = String(text || '')
  if (!line) return ''
  try {
    if (navigator.share) {
      await navigator.share({ title: title || 'Did I', text: line })
      return 'shared'
    }
  } catch {
    // They closed the sheet, or the browser will not do it. Copy instead.
  }
  try {
    await navigator.clipboard.writeText(line)
    return 'copied'
  } catch {
    return ''
  }
}

export async function shareShelf(shelf) {
  const stamp = boardDate(new Date(), 4)
  const text = JSON.stringify(shelf, null, 2)
  const blob = new Blob([text], { type: 'application/json' })
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], `did-i-${stamp}.json`, { type: 'application/json' })
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Did I' })
      return
    }
  }
  throw new Error('share-unavailable')
}

export async function shareBook(book) {
  const stamp = boardDate(new Date(), book.dayFoldHour)
  const slug =
    String(book.title || 'board')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'board'
  const text = JSON.stringify(book, null, 2)
  const blob = new Blob([text], { type: 'application/json' })
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], `${slug}-${stamp}.json`, { type: 'application/json' })
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: book.title || 'Did I' })
      return
    }
  }
  throw new Error('share-unavailable')
}

export function listenNativeShell() {
  return () => {}
}
