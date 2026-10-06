import { useRef, useState } from 'react'
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Compose from '@expo/ui/jetpack-compose'
import * as SwiftUI from '@expo/ui/swift-ui'
import * as SwiftMods from '@expo/ui/swift-ui/modifiers'
import { useTheme } from '../../src/lib/prefs.js'
import { fonts } from '../theme.js'
import { SetPick, SetRow, SetSheet } from './SetBits.jsx'

// iOS: a short list opens as a pull-down menu on the row; a longer one as a
// sheet. Android always uses the sheet: its dropdown opened at the far left,
// away from the value on the right.
const MENU_MAX = 5

// The shims hand back a stand-in when the native views are missing from the
// binary. Then the row falls back to the plain React Native sheet.
const iosReady = Platform.OS === 'ios' && 'Menu' in SwiftUI && 'BottomSheet' in SwiftUI
const androidReady = Platform.OS === 'android' && 'DropdownMenu' in Compose && 'ModalBottomSheet' in Compose

/**
 * A settings row that picks one of `options` ({ id, label }).
 *
 * iOS: a UIMenu from the row, or a form sheet with a grabber and medium and
 * large detents. Android: a modal bottom sheet with a drag handle. Both sheets keep clear of the home
 * indicator.
 */
export function SetChoice({ label, sub, title, icon, tint, options, selected, onSelect, last, colors }) {
  const value = options.find((option) => option.id === selected)?.label || ''
  const kind = options.length <= MENU_MAX ? 'menu' : 'sheet'
  const props = { label, sub, title: title || label, icon, tint, value, options, selected, onSelect, last, colors }
  if (iosReady) return kind === 'menu' ? <IosMenu {...props} /> : <IosSheet {...props} />
  if (androidReady) return <AndroidSheet {...props} />
  return <PlainSheet {...props} />
}

function useScheme() {
  return useTheme() === 'light' ? 'light' : 'dark'
}

function IosMenu({ label, sub, icon, tint, value, options, selected, onSelect, last, colors }) {
  const { Host, Menu, Picker, Rectangle, Text: SwiftText } = SwiftUI
  const { contentShape, foregroundStyle, frame, pickerStyle, shapes, tag } = SwiftMods
  const scheme = useScheme()
  return (
    <View>
      <SetRow colors={colors} icon={icon} tint={tint} label={label} sub={sub} value={value} chevron last={last} />
      <Host style={StyleSheet.absoluteFill} colorScheme={scheme} seedColor={colors.on}>
        <Menu
          label={
            <Rectangle
              modifiers={[
                foregroundStyle('#00000000'),
                frame({ maxWidth: 100000, maxHeight: 100000 }),
                contentShape(shapes.rectangle()),
              ]}
            />
          }
        >
          <Picker selection={selected} onSelectionChange={onSelect} modifiers={[pickerStyle('inline')]}>
            {options.map((option) => (
              <SwiftText key={option.id} modifiers={[tag(option.id)]}>
                {option.label}
              </SwiftText>
            ))}
          </Picker>
        </Menu>
      </Host>
    </View>
  )
}

function IosSheet({ label, sub, title, icon, tint, value, options, selected, onSelect, last, colors }) {
  const { BottomSheet, Form, Host, Picker, Section, Text: SwiftText } = SwiftUI
  const {
    environment,
    labelsHidden,
    listRowBackground,
    pickerStyle,
    presentationBackground,
    presentationDetents,
    presentationDragIndicator,
    scrollContentBackground,
    tag,
  } = SwiftMods
  const scheme = useScheme()
  const [open, setOpen] = useState(false)
  // Like iOS's grouped sheets: in dark the sheet sits a step above the page.
  const sheetBg = scheme === 'dark' ? colors.panel : colors.bg
  const rowBg = scheme === 'dark' ? colors.panel2 : colors.panel
  return (
    <View>
      <SetRow colors={colors} icon={icon} tint={tint} label={label} sub={sub} value={value} chevron last={last} onPress={() => setOpen(true)} />
      <Host style={styles.sheetHost} colorScheme={scheme} seedColor={colors.on}>
        <BottomSheet isPresented={open} onIsPresentedChange={setOpen}>
          <Form
            modifiers={[
              // A long list (languages) opens tall, so every choice shows.
              presentationDetents(options.length > 7 ? ['large'] : ['medium', 'large']),
              presentationDragIndicator('visible'),
              // The sheet is its own window: it takes the app's theme and surfaces
              // here, since the system glass would follow the phone instead.
              environment('colorScheme', scheme),
              presentationBackground(sheetBg),
              scrollContentBackground('hidden'),
            ]}
          >
            <Section title={title}>
              <Picker
                selection={selected}
                onSelectionChange={(next) => {
                  onSelect(next)
                  setOpen(false)
                }}
                modifiers={[pickerStyle('inline'), labelsHidden(), listRowBackground(rowBg)]}
              >
                {options.map((option) => (
                  <SwiftText key={option.id} modifiers={[tag(option.id)]}>
                    {option.label}
                  </SwiftText>
                ))}
              </Picker>
            </Section>
          </Form>
        </BottomSheet>
      </Host>
    </View>
  )
}

function AndroidSheet({ label, sub, title, icon, tint, value, options, selected, onSelect, last, colors }) {
  const { Host, ModalBottomSheet, RNHostView } = Compose
  const scheme = useScheme()
  const insets = useSafeAreaInsets()
  // Hosted content sizes to itself, so give it the sheet's width (Material caps sheets at 640dp).
  const width = Math.min(useWindowDimensions().width, 640)
  const sheet = useRef(null)
  const list = useRef(null)
  const [open, setOpen] = useState(false)

  async function pick(id) {
    onSelect(id)
    try {
      await sheet.current?.hide()
    } catch {
      // Already gone.
    }
    setOpen(false)
  }

  return (
    <View>
      <SetRow colors={colors} icon={icon} tint={tint} label={label} sub={sub} value={value} chevron last={last} onPress={() => setOpen(true)} />
      {open ? (
        <Host style={styles.sheetHost} colorScheme={scheme}>
          <ModalBottomSheet
            ref={sheet}
            onDismissRequest={() => setOpen(false)}
            containerColor={colors.panel}
            showDragHandle
            // Opens at full height, so a long list (languages) shows whole.
            skipPartiallyExpanded
          >
            <RNHostView matchContents>
              <View style={[styles.sheetBody, { width, paddingBottom: insets.bottom + 8 }]}>
                <Text style={[styles.sheetTitle, { color: colors.ink }]}>{title}</Text>
                <ScrollView ref={list} style={styles.sheetList}>
                  {options.map((option) => (
                    <View
                      key={option.id}
                      // The checked row scrolls into view when the list is taller than the sheet.
                      onLayout={option.id === selected ? (event) => list.current?.scrollTo({ y: Math.max(0, event.nativeEvent.layout.y - 48), animated: false }) : undefined}
                    >
                      <SetPick
                        colors={colors}
                        label={option.label}
                        on={option.id === selected}
                        onPress={() => pick(option.id)}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            </RNHostView>
          </ModalBottomSheet>
        </Host>
      ) : null}
    </View>
  )
}

function PlainSheet({ label, sub, title, icon, tint, value, options, selected, onSelect, last, colors }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <SetRow colors={colors} icon={icon} tint={tint} label={label} sub={sub} value={value} chevron last={last} onPress={() => setOpen(true)} />
      {open ? (
        <SetSheet colors={colors} title={title} onClose={() => setOpen(false)}>
          {options.map((option) => (
            <SetPick
              key={option.id}
              colors={colors}
              label={option.label}
              on={option.id === selected}
              onPress={() => {
                onSelect(option.id)
                setOpen(false)
              }}
            />
          ))}
        </SetSheet>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  sheetHost: { position: 'absolute', width: 0, height: 0 },
  sheetBody: { paddingHorizontal: 8 },
  sheetTitle: { fontFamily: fonts.uiSemi, fontSize: 22, lineHeight: 28, paddingHorizontal: 16, paddingBottom: 12 },
  sheetList: { maxHeight: 480 },
})
