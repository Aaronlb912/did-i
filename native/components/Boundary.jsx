import { Component } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { feedbackMailto } from '../../src/lib/feedback.js'
import { legalEmail } from '../../src/lib/legal.js'
import { hallColors, fonts } from '../theme.js'
import * as Updates from '../shim/updates-safe.cjs'

// Same job as src/lib/Boundary.jsx on the web, and the same storage key
// so lastBreak() reads either one. Without this a thrown render is a
// blank phone and the only way out is force quitting.

const SEEN = 'did-i-last-break'

function note(error, info) {
  const line = {
    at: new Date().toISOString(),
    what: String(error?.message || error || 'unknown'),
    where: String(info?.componentStack || '').split('\n').slice(0, 4).join(' ').trim(),
    page: global.window?.location?.hash || '',
  }
  try {
    localStorage.setItem(SEEN, JSON.stringify(line))
  } catch {
    // Not worth failing twice over.
  }
  try {
    global.window?.dispatchEvent?.(new global.CustomEvent('did-i-broke', { detail: line }))
  } catch {
    // Same.
  }
  return line
}

export function lastBreak() {
  try {
    const raw = localStorage.getItem(SEEN)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// The lines a crash mail starts with: what broke and on which screen.
export function crashLines(line) {
  const out = []
  if (line?.what) out.push(t('feedback.crash', { what: String(line.what).slice(0, 300) }))
  if (line?.page) out.push(t('feedback.crashPage', { page: String(line.page).slice(0, 80) }))
  return out
}

export class Boundary extends Component {
  constructor(props) {
    super(props)
    this.state = { broke: null, where: '', noMail: false }
    this.tries = 0
  }

  // This screen sits outside the app tree, so nothing here may depend on it:
  // the full mail (version, sign-in, sync) is tried first and any failure
  // falls back to a plain mail with just what broke.
  async feedback() {
    const extra = crashLines(lastBreak())
    let sent = false
    try {
      sent = await require('../lib/feedback-mail.js').openFeedbackMail(extra)
    } catch {
      sent = false
    }
    if (!sent) {
      try {
        const url = feedbackMailto(extra)
        if (url) {
          await Linking.openURL(url)
          sent = true
        }
      } catch {
        sent = false
      }
    }
    this.setState({ noMail: !sent })
  }

  // A second break in a row would throw again on the same stored state:
  // restart the whole app instead of looping on this screen.
  again() {
    this.tries += 1
    if (this.tries > 1) {
      Promise.resolve()
        .then(() => Updates.reloadAsync())
        .catch(() => this.setState({ broke: null }))
      return
    }
    this.setState({ broke: null })
  }

  static getDerivedStateFromError(error) {
    return { broke: error }
  }

  componentDidCatch(error, info) {
    const line = note(error, info)
    this.setState({ where: line.where || '' })
  }

  render() {
    if (!this.state.broke) return this.props.children
    const colors = hallColors('lime', 'dark')
    return (
      <View style={[styles.shell, { backgroundColor: colors.bg }]}>
        <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <Text style={[styles.kicker, { color: colors.on }]}>{t('broke.kicker')}</Text>
          <Text style={[styles.title, { color: colors.ink }]}>{t('broke.title')}</Text>
          <Text style={[styles.body, { color: colors.inkSoft }]}>{t('broke.body')}</Text>
          {this.state.broke?.message ? (
            <Text style={[styles.detail, { color: colors.inkDim }]} selectable>
              {String(this.state.broke.message)}
            </Text>
          ) : null}
          {this.state.where ? (
            <Text style={[styles.detail, { color: colors.inkDim }]} selectable>
              {this.state.where}
            </Text>
          ) : null}
          {global.__didIReanimatedError || global.__didIGestureError || global.__didISvgError ? (
            <Text style={[styles.detail, { color: colors.inkDim }]} selectable>
              {[global.__didIReanimatedError, global.__didIGestureError, global.__didISvgError]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => this.again()}
            style={[styles.again, { backgroundColor: colors.on }]}
          >
            <Text style={[styles.againText, { color: colors.bg }]}>{t('broke.again')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => this.feedback()}
            style={[styles.send, { borderColor: colors.line }]}
          >
            <Text style={[styles.sendText, { color: colors.ink }]}>{t('feedback.send')}</Text>
          </Pressable>
          {this.state.noMail ? (
            <Text style={[styles.detail, { color: colors.inkDim }]} selectable>
              {t('feedback.noMail', { email: legalEmail() })}
            </Text>
          ) : null}
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  shell: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { borderWidth: 1, borderRadius: 18, padding: 22, gap: 12 },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: { fontFamily: fonts.display, fontSize: 26, fontWeight: '700' },
  body: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  detail: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18 },
  again: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  againText: { fontFamily: fonts.uiBold, fontSize: 15 },
  send: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 44,
    justifyContent: 'center',
  },
  sendText: { fontFamily: fonts.uiBold, fontSize: 15 },
})
