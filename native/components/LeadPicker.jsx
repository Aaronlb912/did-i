import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'
import { MenuIcon } from './MenuIcon.jsx'

// The three ways to start a question, picked by tapping its first words:
// Did I (yours), Did we (answered together), Did you (asked of a friend).
export const LEADS = [
  { id: 'i', title: 'tonight.didI', note: 'lead.iNote', icon: 'person' },
  { id: 'we', title: 'we.title', note: 'lead.weNote', icon: 'together' },
  { id: 'you', title: 'lead.you', note: 'lead.youNote', icon: 'inbox' },
]

export function LeadPicker({ value, onPick, onClose, colors, signedIn = true }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
        <Pressable
          accessible={false}
          onPress={(event) => event.stopPropagation()}
          style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}
        >
          <Text style={[styles.kicker, { color: colors.inkDim }]}>{t('lead.pick')}</Text>
          {LEADS.map((lead) => {
            const on = lead.id === value
            const needsAccount = lead.id !== 'i' && !signedIn
            const tint = lead.id === 'we' ? colors.we || colors.on : colors.on
            return (
              <Pressable
                key={lead.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => onPick(lead.id)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderColor: on ? tint : colors.line,
                    backgroundColor: pressed ? colors.panel2 : colors.panel,
                  },
                ]}
              >
                <View style={[styles.ico, { backgroundColor: colors.panel2 }]}>
                  <MenuIcon name={lead.icon} color={tint} size={18} stroke />
                </View>
                <View style={styles.copy}>
                  <Text style={[styles.title, { color: on ? tint : colors.ink }]}>{t(lead.title)}</Text>
                  <Text style={[styles.note, { color: colors.inkSoft }]}>
                    {needsAccount ? t(lead.id === 'you' ? 'lead.youNeedAccount' : 'we.needAccount') : t(lead.note)}
                  </Text>
                </View>
                {on ? <Text style={[styles.check, { color: tint }]}>✓</Text> : null}
              </Pressable>
            )
          })}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  veil: { flex: 1, justifyContent: 'center', padding: 20 },
  pop: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 8 },
  kicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 14, padding: 12 },
  ico: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.display, fontSize: 18, fontWeight: '700' },
  note: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  check: { fontFamily: fonts.uiBold, fontSize: 18 },
})
