import { NativeModules } from 'react-native'
import { applyWidgetTapOnce } from '../src/lib/widget-tonight.js'

export async function loadAndroidWidgetCard() {
  const mod = NativeModules.WidgetTap
  if (!mod || typeof mod.loadCard !== 'function') return null
  try {
    const raw = String((await mod.loadCard()) || '').trim()
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export async function saveAndroidWidgetCard(props) {
  if (!props) return false
  const mod = NativeModules.WidgetTap
  if (!mod || typeof mod.saveCard !== 'function') return false
  try {
    return Boolean(await mod.saveCard(JSON.stringify(props)))
  } catch {
    return false
  }
}

export async function androidWidgetCardStamp() {
  const mod = NativeModules.WidgetTap
  if (!mod || typeof mod.cardStamp !== 'function') return ''
  try {
    return String((await mod.cardStamp()) || '')
  } catch {
    return ''
  }
}

export async function applyPendingAndroidWidgetTap() {
  const mod = NativeModules.WidgetTap
  if (!mod || typeof mod.takePending !== 'function') return null
  let raw = ''
  try {
    raw = await mod.takePending()
  } catch {
    return null
  }
  raw = String(raw || '').trim()
  if (!raw) return null
  let tap
  try {
    tap = JSON.parse(raw)
  } catch {
    return null
  }
  try {
    return applyWidgetTapOnce(tap.lampId, tap.kind, tap.night)
  } catch {
    try {
      await mod.restorePending?.(raw)
    } catch {
      // The row is already off disk. The next open cannot see it.
    }
    return null
  }
}
