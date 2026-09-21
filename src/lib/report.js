// Optional crash reporting. Set VITE_REPORT_URL to a POST endpoint.
// Boundary fires did-i-broke; this listener forwards the detail.

import { diagnosticsOn } from './diagnostics.js'
import { env } from './env.js'

const URL = env('VITE_REPORT_URL')

function payload(detail) {
  return {
    platform: globalThis.__didIPlatform || 'web',
    ...detail,
  }
}

export function sendError(detail) {
  if (!URL || !diagnosticsOn()) return
  send(payload(detail))
}

function send(detail) {
  if (!URL) return
  try {
    fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(detail),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Not worth failing twice over.
  }
}

function hookNativeErrors() {
  const errorUtils = globalThis.ErrorUtils
  if (!errorUtils?.setGlobalHandler) return
  const prev = errorUtils.getGlobalHandler?.()
  errorUtils.setGlobalHandler((error, isFatal) => {
    sendError({
      at: new Date().toISOString(),
      what: String(error?.message || error || 'error'),
      where: '',
      page: globalThis.window?.location?.hash || '',
      fatal: Boolean(isFatal),
    })
    if (typeof prev === 'function') prev(error, isFatal)
  })
}

export function hookErrorReport() {
  if (typeof window === 'undefined') return

  hookNativeErrors()

  window.addEventListener('did-i-broke', (event) => {
    sendError(event?.detail || {})
  })

  window.addEventListener('error', (event) => {
    sendError({
      at: new Date().toISOString(),
      what: String(event.message || 'error'),
      where: String(event.filename || ''),
      page: window.location.hash,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const why = event.reason
    sendError({
      at: new Date().toISOString(),
      what: String(why?.message || why || 'rejection'),
      where: '',
      page: window.location.hash,
    })
  })
}
