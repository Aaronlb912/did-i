import { Component } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { hallColors, fonts } from '../theme.js'

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
  return line
}

export class Boundary extends Component {
  constructor(props) {
    super(props)
    this.state = { broke: null }
  }

  static getDerivedStateFromError(error) {
    return { broke: error }
  }

  componentDidCatch(error, info) {
    note(error, info)
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
          <Pressable
            onPress={() => this.setState({ broke: null })}
            style={[styles.again, { backgroundColor: colors.on }]}
          >
            <Text style={[styles.againText, { color: colors.bg }]}>{t('broke.again')}</Text>
          </Pressable>
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
  again: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  againText: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '700' },
})
