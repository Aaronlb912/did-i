import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { t } from '../../src/lib/i18n.js'
import { useTheme } from '../../src/lib/prefs.js'
import { canGoBack, goBack, onRoute } from '../navigation/hash.js'
import { HEADER_BAR, HEADER_FADE, useHeaderTop } from '../hooks/useHeaderSpace.js'
import { fonts } from '../theme.js'
import { BackChevron } from './BackChevron.jsx'
import { HEADER_BUTTON, HeaderButton, headerLift, headerSurface } from './HeaderButton.jsx'
import { MastMenuCog } from './MastMenu.jsx'
import { ProgressiveBlur } from './ProgressiveBlur.jsx'
import { PurseLine } from './PurseLine.jsx'
import { Slot } from './Slot.jsx'

function useShowBack(back) {
  const [show, setShow] = useState(() => back === true || (back !== false && canGoBack()))
  useEffect(() => {
    if (back === false) {
      setShow(false)
      return undefined
    }
    const sync = () => setShow(back === true || canGoBack())
    sync()
    return onRoute(sync)
  }, [back])
  return show
}

/**
 * The one header every screen wears. It floats over the screen, so content
 * scrolls under a blur that fades out below the row. Screens pad their
 * content by useHeaderSpace().
 *
 * back: 'auto' shows the chevron when there is history, true forces it.
 * titleSlot replaces the title text (Tonight uses it for rename-in-place).
 * menu renders the grid button and needs a MastMenuRoot above it.
 */
export function AppHeader({ colors, title, titleSlot, back = 'auto', purse, menu = false }) {
  const insets = useSafeAreaInsets()
  const top = useHeaderTop()
  const theme = useTheme()
  const showBack = useShowBack(back)

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Slot>
        <ProgressiveBlur
          height={top + HEADER_BAR + HEADER_FADE}
          color={colors.bg}
          tint={theme === 'light' ? 'light' : 'dark'}
        />
      </Slot>
      <View
        pointerEvents="box-none"
        style={[
          styles.row,
          { marginTop: top, paddingLeft: Math.max(16, insets.left + 16), paddingRight: Math.max(16, insets.right + 16) },
        ]}
      >
        {showBack ? (
          <HeaderButton colors={colors} onPress={() => goBack()} label={t('nav.back')}>
            <Slot>
              <BackChevron color={colors.ink} />
            </Slot>
          </HeaderButton>
        ) : null}
        <View style={styles.titleBox}>
          {titleSlot || (
            <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
          )}
        </View>
        {purse || menu ? (
          <View style={styles.actions}>
            {purse ? (
              <Slot>
                <View style={[styles.purse, headerSurface(colors)]}>
                  <PurseLine purse={purse} colors={colors} gemsLink mast />
                </View>
              </Slot>
            ) : null}
            {menu ? (
              <Slot>
                <MastMenuCog />
              </Slot>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  )
}

export const headerTitleStyle = {
  fontFamily: fonts.uiSemi,
  fontSize: 17,
  letterSpacing: -0.2,
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40, elevation: 12 },
  row: { height: HEADER_BAR, flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleBox: { flex: 1, minWidth: 0, justifyContent: 'center' },
  title: headerTitleStyle,
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  purse: {
    ...headerLift,
    height: HEADER_BUTTON,
    borderRadius: HEADER_BUTTON / 2,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
})
