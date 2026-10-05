import { isAppForeground } from './app-foreground.js'
import { streakHitCopy } from './streak-copy.js'
import { pingOn } from './prefs.js'
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

export { isAppForeground }

export async function pingStreakHit(hit, dateIso) {
  if (!hit || !pingOn('streakHit') || typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false
  try {
    const copy = streakHitCopy(hit.n)
    new Notification(copy.title, {
      body: copy.body,
      tag: `streak-hit:${dateIso}`,
      icon: './icon-192.png',
    })
    return true
  } catch {
    return false
  }
}

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

// Answers as a spreadsheet file. Falls back to a download when the browser cannot share files.
export async function shareCsv(text) {
  const name = `did-i-answers-${boardDate(new Date(), 4)}.csv`
  const blob = new Blob([text], { type: 'text/csv' })
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], name, { type: 'text/csv' })
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Did I' })
      return
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 500)
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
