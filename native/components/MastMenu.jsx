import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAccount } from '../../src/lib/account.js'
import { showMainNavInMenu } from '../../src/lib/app-nav.js'
import { DIT_ENABLED } from '../../src/lib/features.js'
import { t } from '../../src/lib/i18n.js'
import { feelTap } from '../../src/lib/native.js'
import { usePeopleCount } from '../../src/lib/people.js'
import { goHash, onRoute, readRoute } from '../navigation/hash.js'
import { fonts } from '../theme.js'
import { MenuIcon } from './MenuIcon.jsx'

const HOME_ON = new Set(['/', '/home', '/tonight', '/later'])
const QUESTIONS_ON = new Set(['/lamps', '/add', '/hang', '/lamp', '/search', '/ideas'])
const EVERYONE_ON = new Set(['/everyone'])
const PEOPLE_ON = new Set(['/people', '/people/connect', '/people/refer', '/friends', '/family', '/inbox', '/sent'])
const ADD_ON = new Set(['/add', '/hang'])
const SETTINGS_ON = new Set(['/settings', '/settings/phone', '/pings', '/about', '/help', '/privacy', '/terms'])

const MastMenuCtx = createContext(null)

function menuItems(showAdd, waiting) {
  const path = readRoute().path
  const items = []
  if (showMainNavInMenu(path)) {
    items.push(
      { key: 'home', path: '/tonight', label: t('nav.home'), on: HOME_ON.has(path), icon: 'home', stroke: true },
      {
        key: 'questions',
        path: '/lamps',
        label: t('nav.questions'),
        on: QUESTIONS_ON.has(path),
        icon: 'boards',
        stroke: true,
      },
    )
    if (DIT_ENABLED) {
      items.push({
        key: 'everyone',
        path: '/everyone',
        label: t('nav.everyone'),
        on: EVERYONE_ON.has(path),
        icon: 'people',
      })
    }
    items.push({ key: 'nav-divider', divider: true })
  }
  if (showAdd) {
    items.push({ key: 'add', path: '/add', label: t('tonight.add'), on: ADD_ON.has(path), icon: 'add', stroke: true })
  }
  items.push(
    {
      key: 'people',
      path: '/people',
      label: waiting ? t('people.cogWaiting', { n: waiting }) : t('people.cog'),
      on: PEOPLE_ON.has(path),
      pip: waiting > 0,
      icon: 'people',
    },
    { key: 'shop', path: '/shop', label: t('shop.cog'), on: path === '/shop', icon: 'shop' },
    { key: 'kit', path: '/kit', label: t('kit.cog'), on: path === '/kit', icon: 'collection' },
    {
      key: 'settings',
      path: '/settings',
      label: t('settings.cog'),
      on: SETTINGS_ON.has(path),
      icon: 'settings',
    },
  )
  return items
}

function menuIsOn(showAdd, waiting) {
  return menuItems(showAdd, waiting).some((item) => item.on)
}

let menuListen = null
let menuState = null

function publishMenu(next) {
  menuState = next
  menuListen?.(next)
}

export function MenuOverlayHost() {
  const [menu, setMenu] = useState(menuState)
  useEffect(() => {
    menuListen = setMenu
    setMenu(menuState)
    return () => {
      menuListen = null
    }
  }, [])
  if (!menu?.open) return null
  return (
    <View style={styles.host} pointerEvents="box-none">
      <MastMenuCtx.Provider value={menu}>
        <MastMenuSheet />
      </MastMenuCtx.Provider>
    </View>
  )
}

export function MastMenuRoot({ colors, showAdd = true, children }) {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((live) => !live), [])

  useEffect(() => {
    let path = readRoute().path
    return onRoute((route) => {
      if (route.path === path) return
      path = route.path
      setOpen(false)
    })
  }, [])

  const value = useMemo(
    () => ({ open, colors, showAdd, close, toggle }),
    [open, colors, showAdd, close, toggle],
  )

  useEffect(() => {
    publishMenu(open ? value : null)
  }, [open, value])

  useEffect(() => () => publishMenu(null), [])

  useEffect(() => {
    if (!open) return undefined
    function onBack(event) {
      close()
      event?.preventDefault?.()
    }
    window.addEventListener('did-i-back', onBack)
    return () => window.removeEventListener('did-i-back', onBack)
  }, [open, close])

  return (
    <MastMenuCtx.Provider value={value}>
      <View style={styles.root}>{children}</View>
      {open ? (
        <Modal
          visible
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={close}
        >
          <MastMenuSheet colors={colors} showAdd={showAdd} close={close} />
        </Modal>
      ) : null}
    </MastMenuCtx.Provider>
  )
}

function MastMenuSheet({ colors, showAdd, close }) {
  const insets = useSafeAreaInsets()
  const account = useAccount()
  const waiting = usePeopleCount(account.user)
  const items = menuItems(showAdd, waiting)
  const [live, setLive] = useState(false)
  const on = menuIsOn(showAdd, waiting)

  useEffect(() => {
    const timer = setTimeout(() => setLive(true), 280)
    return () => clearTimeout(timer)
  }, [])

  return (
    <View style={styles.modalFill}>
    <View style={styles.backdrop} pointerEvents="box-none">
      <Pressable
        pointerEvents={live ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.veil }]}
        onPress={close}
        accessibilityLabel={t('mast.menuClose')}
        accessibilityRole="button"
      />
      <Pressable
        onPress={() => {
          feelTap()
          close()
        }}
        hitSlop={12}
        style={[
          styles.cog,
          styles.cogOverlay,
          {
            top: insets.top + 8,
            right: Math.max(16, insets.right + 16),
            borderColor: on ? colors.onDeep : colors.line,
            backgroundColor: on ? colors.panel3 : colors.panel2,
          },
        ]}
        accessibilityLabel={t('mast.menuClose')}
        accessibilityRole="button"
      >
        <MenuIcon name="grid" color={on ? colors.on : colors.inkSoft} size={16} />
        {waiting > 0 ? <View style={[styles.menuPip, { backgroundColor: colors.on }]} /> : null}
      </Pressable>
      <View
        style={[
          styles.panel,
          {
            top: insets.top + 54,
            right: Math.max(16, insets.right + 16),
            backgroundColor: colors.panel,
            borderColor: colors.line,
          },
        ]}
      >
          {items.map((item) =>
            item.divider ? (
              <View key={item.key} style={[styles.divider, { backgroundColor: colors.line }]} />
            ) : (
              <Pressable
                key={item.key}
                onPress={() => {
                  feelTap()
                  close()
                  goHash(item.path)
                }}
                style={[styles.row, item.on && { backgroundColor: colors.panel3 }]}
              >
                <View style={styles.ico}>
                  <MenuIcon
                    name={item.icon}
                    color={item.on ? colors.on : colors.inkSoft}
                    stroke={item.stroke}
                    size={18}
                  />
                </View>
                <Text style={[styles.label, { color: item.on ? colors.on : colors.ink }]}>{item.label}</Text>
                {item.pip ? <View style={[styles.pip, { backgroundColor: colors.on }]} /> : null}
              </Pressable>
            ),
          )}
      </View>
    </View>
    </View>
  )
}

function useMenu() {
  const ctx = useContext(MastMenuCtx)
  if (!ctx) throw new Error('MastMenuCog outside MastMenuRoot')
  return ctx
}

export function MastMenuCog() {
  const { open, colors, showAdd, toggle } = useMenu()
  const account = useAccount()
  const waiting = usePeopleCount(account.user)
  const on = menuIsOn(showAdd, waiting)

  return (
    <Pressable
      onPress={() => {
        feelTap()
        toggle()
      }}
      hitSlop={12}
      style={[
        styles.cog,
        {
          borderColor: on ? colors.onDeep : colors.line,
          backgroundColor: on ? colors.panel3 : colors.panel2,
        },
      ]}
      accessibilityLabel={t('mast.menu')}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
    >
      <MenuIcon name="grid" color={on ? colors.on : colors.inkSoft} size={16} />
      {waiting > 0 ? <View style={[styles.menuPip, { backgroundColor: colors.on }]} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  modalFill: { flex: 1 },
  host: { ...StyleSheet.absoluteFillObject, zIndex: 200, elevation: 40 },
  backdrop: { ...StyleSheet.absoluteFillObject, zIndex: 80, elevation: 28 },
  panel: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 14,
    minWidth: 240,
    maxWidth: 288,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.42,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  divider: { height: 1, marginHorizontal: 12, marginVertical: 4 },
  row: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ico: { width: 22, alignItems: 'center' },
  label: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '600', flex: 1 },
  pip: { width: 8, height: 8, borderRadius: 4 },
  cog: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 30,
  },
  cogOverlay: {
    position: 'absolute',
    zIndex: 90,
    elevation: 32,
  },
  menuPip: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
})
