// Optional crash reporting. Set VITE_REPORT_URL to a POST endpoint.
// Boundary fires did-i-broke; this listener forwards the detail.

const URL = String(import.meta.env?.VITE_REPORT_URL || '').trim()

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

export function hookErrorReport() {
  if (typeof window === 'undefined') return

  window.addEventListener('did-i-broke', (event) => {
    send(event?.detail || {})
  })

  window.addEventListener('error', (event) => {
    send({
      at: new Date().toISOString(),
      what: String(event.message || 'error'),
      where: String(event.filename || ''),
      page: window.location.hash,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const why = event.reason
    send({
      at: new Date().toISOString(),
      what: String(why?.message || why || 'rejection'),
      where: '',
      page: window.location.hash,
    })
  })
}
