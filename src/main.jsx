import { Capacitor } from '@capacitor/core'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import { applyPrefsToDocument, readPrefs } from './lib/prefs.js'

applyPrefsToDocument(readPrefs())

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
    <App />
  </StrictMode>,
)
