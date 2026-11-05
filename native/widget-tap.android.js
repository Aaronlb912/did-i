import { NativeModules } from 'react-native'
import { applyWidgetTapsOnce, buildTonightWidgetProps, parseWidgetTapQueue } from '../src/lib/widget-tonight.js'
import { readShelf } from '../src/lib/board-shelf.js'
import { buddySvgFor } from '../widgets/android/DidITonightAndroidWidget.jsx'
import { dropSnoozed } from './shim/native.js'
import { noteTaken } from './watch-sync.js'
import { enrichTonightWidgetProps } from './widget-sync.js'

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
  const buddySvg = buddySvgFor(props.buddyId, props.buddyWorn, props.colors?.on)
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
  const { shelf, failed, kept, refused } = applyWidgetTapsOnce(taps)
  // Wear OS taps are in this queue: tell the watch which ones the phone has.
  const back = [...failed, ...kept]
  for (const tap of taps) if (!failed.includes(tap)) noteTaken(tap.sent || tap.at)
  for (const tap of taps) {
    if (failed.includes(tap)) continue
    const id = String(tap.id || '')
    dropSnoozed(id.startsWith('we:') ? { weId: id.slice(3) } : { lampId: id }).catch(() => {})
  }
  if (back.length) {
    try {
      await mod.restorePending?.(JSON.stringify(back))
    } catch {
      // The rows are already off disk. The next open cannot see them.
    }
  }
  // A refused tap was never saved, but the widget card already moved past it.
  // Draw the card again from the shelf so it never shows an answer the app lacks.
  if (refused) {
    try {
      const current = readShelf()
      await saveAndroidWidgetCard(enrichTonightWidgetProps(current, buildTonightWidgetProps(current)))
    } catch {
      // The next redraw reads the shelf.
    }
  }
  return shelf
}

// Native alarms redraw the widget at each ask time still to come tonight.
export async function armAndroidWidgetAskTimes(times) {
  const mod = NativeModules.WidgetTap
  if (!mod || typeof mod.armAskTimes !== 'function') return false
  try {
    return Boolean(await mod.armAskTimes((times || []).map((date) => date.getTime())))
  } catch {
    return false
  }
}
