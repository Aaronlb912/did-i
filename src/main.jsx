import { Capacitor } from '@capacitor/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import Root from './Root.jsx'
import { Boundary } from './lib/Boundary.jsx'
import { applyPrefsToDocument, readPrefs } from './lib/prefs.js'
import { hookErrorReport } from './lib/report.js'

applyPrefsToDocument(readPrefs())
hookErrorReport()

if (Capacitor.isNativePlatform()) {
  navigator.serviceWorker?.getRegistrations?.().then((regs) => {
    regs.forEach((reg) => reg.unregister())
  })
  if (typeof caches !== 'undefined') {
    caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)))
  }
} else {
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Boundary>
      <Root />
    </Boundary>
  </StrictMode>,
)
