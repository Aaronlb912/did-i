import { NativeModules } from 'react-native'
import { applyWidgetTapsOnce, parseWidgetTapQueue } from '../src/lib/widget-tonight.js'
import { buddySvgFor } from '../widgets/android/DidITonightAndroidWidget.jsx'

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
  // The native tap paint cannot read the JS buddy table, so the markup rides along.
  const buddySvg = buddySvgFor(props.buddyId)
  const card = buddySvg ? { ...props, buddySvg } : props
  try {
    return Boolean(await mod.saveCard(JSON.stringify(card)))
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
  const taps = parseWidgetTapQueue(raw)
  if (!taps.length) return null
  const { shelf, failed } = applyWidgetTapsOnce(taps)
  if (failed.length) {
    try {
      await mod.restorePending?.(JSON.stringify(failed))
    } catch {
      // The rows are already off disk. The next open cannot see them.
    }
  }
  return shelf
}
