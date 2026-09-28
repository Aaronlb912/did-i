import { useRef, useState } from 'react'
import { Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Compose from '@expo/ui/jetpack-compose'
import * as SwiftUI from '@expo/ui/swift-ui'
import * as SwiftMods from '@expo/ui/swift-ui/modifiers'
import { useTheme } from '../../src/lib/prefs.js'
import { fonts } from '../theme.js'
import { SetPick, SetRow, SetSheet } from './SetBits.jsx'

// A short list opens as a pull-down menu on the row; a longer one as a sheet.
const MENU_MAX = 5

// The shims hand back a stand-in when the native views are missing from the
// binary. Then the row falls back to the plain React Native sheet.
const iosReady = Platform.OS === 'ios' && 'Menu' in SwiftUI && 'BottomSheet' in SwiftUI
const androidReady = Platform.OS === 'android' && 'DropdownMenu' in Compose && 'ModalBottomSheet' in Compose

/**
 * A settings row that picks one of `options` ({ id, label }).
 *
 * iOS: a UIMenu from the row, or a form sheet with a grabber and medium and
 * large detents. Android: a Material dropdown menu under the row, or a modal
 * bottom sheet with a drag handle. Both sheets keep clear of the home
 * indicator.
 */
export function SetChoice({ label, sub, title, options, selected, onSelect, last, colors }) {
  const value = options.find((option) => option.id === selected)?.label || ''
  const kind = options.length <= MENU_MAX ? 'menu' : 'sheet'
  const props = { label, sub, title: title || label, value, options, selected, onSelect, last, colors }
  if (iosReady) return kind === 'menu' ? <IosMenu {...props} /> : <IosSheet {...props} />
  if (androidReady) return kind === 'menu' ? <AndroidMenu {...props} /> : <AndroidSheet {...props} />
  return <PlainSheet {...props} />
}

function useScheme() {
  return useTheme() === 'light' ? 'light' : 'dark'
}

function IosMenu({ label, sub, value, options, selected, onSelect, last, colors }) {
  const { Host, Menu, Picker, Rectangle, Text: SwiftText } = SwiftUI
  const { contentShape, foregroundStyle, frame, pickerStyle, shapes, tag } = SwiftMods
  const scheme = useScheme()
  return (
    <View>
      <SetRow colors={colors} label={label} sub={sub} value={value} chevron last={last} />
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

function IosSheet({ label, sub, title, value, options, selected, onSelect, last, colors }) {
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
      <SetRow colors={colors} label={label} sub={sub} value={value} chevron last={last} onPress={() => setOpen(true)} />
      <Host style={styles.sheetHost} colorScheme={scheme} seedColor={colors.on}>
        <BottomSheet isPresented={open} onIsPresentedChange={setOpen}>
          <Form
            modifiers={[
              presentationDetents(['medium', 'large']),
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

function AndroidMenu({ label, sub, value, options, selected, onSelect, last, colors }) {
  const { DropdownMenu, DropdownMenuItem, Host, Text: ComposeText } = Compose
  const scheme = useScheme()
  const [open, setOpen] = useState(false)
  // The row stays a React Native row. The menu hangs from a one-pixel anchor
  // along its bottom edge, so it opens under the row the way Material's do.
  return (
    <View>
      <SetRow colors={colors} label={label} sub={sub} value={value} chevron last={last} onPress={() => setOpen(true)} />
      <Host style={styles.menuAnchor} colorScheme={scheme} pointerEvents="none">
        <DropdownMenu expanded={open} onDismissRequest={() => setOpen(false)} color={colors.panel2}>
          <DropdownMenu.Items>
            {options.map((option) => {
              const on = option.id === selected
              return (
                <DropdownMenuItem
                  key={option.id}
                  onClick={() => {
                    setOpen(false)
                    onSelect(option.id)
                  }}
                >
                  <DropdownMenuItem.Text>
                    <ComposeText color={on ? colors.on : colors.ink} style={{ fontSize: 16 }}>
                      {option.label}
                    </ComposeText>
                  </DropdownMenuItem.Text>
                  {on ? (
                    <DropdownMenuItem.TrailingIcon>
                      <ComposeText color={colors.on} style={{ fontSize: 16 }}>
                        ✓
                      </ComposeText>
                    </DropdownMenuItem.TrailingIcon>
                  ) : null}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenu.Items>
        </DropdownMenu>
      </Host>
    </View>
  )
}

function AndroidSheet({ label, sub, title, value, options, selected, onSelect, last, colors }) {
  const { Host, ModalBottomSheet, RNHostView } = Compose
  const scheme = useScheme()
  const insets = useSafeAreaInsets()
  // Hosted content sizes to itself, so give it the sheet's width (Material caps sheets at 640dp).
  const width = Math.min(useWindowDimensions().width, 640)
  const sheet = useRef(null)
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
      <SetRow colors={colors} label={label} sub={sub} value={value} chevron last={last} onPress={() => setOpen(true)} />
      {open ? (
        <Host style={styles.sheetHost} colorScheme={scheme}>
          <ModalBottomSheet
            ref={sheet}
            onDismissRequest={() => setOpen(false)}
            containerColor={colors.panel}
            showDragHandle
          >
            <RNHostView matchContents>
              <View style={[styles.sheetBody, { width, paddingBottom: insets.bottom + 8 }]}>
                <Text style={[styles.sheetTitle, { color: colors.ink }]}>{title}</Text>
                <ScrollView style={styles.sheetList}>
                  {options.map((option) => (
                    <SetPick
                      key={option.id}
                      colors={colors}
                      label={option.label}
                      on={option.id === selected}
                      onPress={() => pick(option.id)}
                    />
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

function PlainSheet({ label, sub, title, value, options, selected, onSelect, last, colors }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <SetRow colors={colors} label={label} sub={sub} value={value} chevron last={last} onPress={() => setOpen(true)} />
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
  menuAnchor: { position: 'absolute', left: 8, right: 8, bottom: 0, height: 1 },
  sheetHost: { position: 'absolute', width: 0, height: 0 },
  sheetBody: { paddingHorizontal: 8 },
  sheetTitle: { fontFamily: fonts.uiSemi, fontSize: 22, lineHeight: 28, paddingHorizontal: 16, paddingBottom: 12 },
  sheetList: { maxHeight: 480 },
})
