import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import * as Compose from '@expo/ui/jetpack-compose'
import * as SwiftUI from '@expo/ui/swift-ui'
import * as SwiftMods from '@expo/ui/swift-ui/modifiers'
import { ripple } from '../lib/ripple.js'
import { fonts } from '../theme.js'

// Same readiness check SetChoice.jsx already trusts: Menu/BottomSheet and
// DropdownMenu/ModalBottomSheet only exist once each bridge's native views
// are really in the binary, and Picker/SegmentedButton ride the same bridge.
const iosReady = Platform.OS === 'ios' && 'Menu' in SwiftUI && 'BottomSheet' in SwiftUI && 'Picker' in SwiftUI
const androidReady = Platform.OS === 'android' && 'DropdownMenu' in Compose && 'ModalBottomSheet' in Compose && 'SingleChoiceSegmentedButtonRow' in Compose && 'SegmentedButton' in Compose

/**
 * A native segmented control: a SwiftUI segmented Picker on iOS, a Material 3
 * SingleChoiceSegmentedButtonRow on Android, and a plain styled row when
 * neither bridge's native views are in the current binary.
 */
export function KitSegment({ items, selected, onSelect, colors }) {
  if (iosReady) return <IosSegment items={items} selected={selected} onSelect={onSelect} colors={colors} />
  if (androidReady) return <AndroidSegment items={items} selected={selected} onSelect={onSelect} colors={colors} />
  return <PlainSegment items={items} selected={selected} onSelect={onSelect} colors={colors} />
}

function IosSegment({ items, selected, onSelect, colors }) {
  const { Host, Picker, Text: SwiftText } = SwiftUI
  const { pickerStyle, tag } = SwiftMods
  return (
    <Host matchContents={{ vertical: true }} style={styles.host} seedColor={colors.on}>
      <Picker selection={selected} onSelectionChange={onSelect} modifiers={[pickerStyle('segmented')]} label="">
        {items.map((item) => (
          <SwiftText key={item.id} modifiers={[tag(item.id)]}>
            {item.label}
          </SwiftText>
        ))}
      </Picker>
    </Host>
  )
}

function AndroidSegment({ items, selected, onSelect, colors }) {
  const { Host, SingleChoiceSegmentedButtonRow, SegmentedButton, Text: ComposeText } = Compose
  return (
    <Host matchContents={{ vertical: true }} style={styles.host}>
      <SingleChoiceSegmentedButtonRow>
        {items.map((item) => {
          const on = selected === item.id
          return (
            <SegmentedButton key={item.id} selected={on} onClick={() => onSelect(item.id)}>
              <SegmentedButton.Label>
                <ComposeText color={on ? colors.on : colors.ink}>{item.label}</ComposeText>
              </SegmentedButton.Label>
            </SegmentedButton>
          )
        })}
      </SingleChoiceSegmentedButtonRow>
    </Host>
  )
}

function PlainSegment({ items, selected, onSelect, colors }) {
  return (
    <View style={[styles.plain, { borderColor: colors.line, backgroundColor: colors.panel2 }]}>
      {items.map((item) => {
        const on = selected === item.id
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            android_ripple={ripple(`${colors.on}33`)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.plainSeg, on && { backgroundColor: colors.panel, borderColor: colors.onDeep }]}
          >
            <Text style={[styles.plainText, { color: on ? colors.on : colors.inkSoft }]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  host: { width: '100%', height: 36 },
  plain: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  plainSeg: {
    flex: 1,
    minHeight: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plainText: { fontFamily: fonts.ui, fontSize: 13, fontWeight: '600' },
})
