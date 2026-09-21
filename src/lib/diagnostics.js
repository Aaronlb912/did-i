import { readPrefs, writePrefs } from './prefs.js'

export function needsDiagnosticsAsk() {
  return !readPrefs().diagnosticsAsked
}

export function diagnosticsOn() {
  const prefs = readPrefs()
  return prefs.diagnosticsAsked && prefs.shareDiagnostics
}

export function setDiagnosticsAnswer(yes) {
  writePrefs({ diagnosticsAsked: true, shareDiagnostics: Boolean(yes) })
}

export function setShareDiagnostics(on) {
  const prefs = readPrefs()
  writePrefs({
    diagnosticsAsked: prefs.diagnosticsAsked || Boolean(on),
    shareDiagnostics: Boolean(on),
  })
}
