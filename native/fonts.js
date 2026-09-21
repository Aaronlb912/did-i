import { Platform } from 'react-native'

const nativeFonts = {
  ui: 'Inter_500Medium',
  uiRegular: 'Inter_400Regular',
  uiSemi: 'Inter_600SemiBold',
  uiBold: 'Inter_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  display: 'Inter_700Bold',
}

const webFonts = {
  ui: 'Inter',
  uiRegular: 'Inter',
  uiSemi: 'Inter',
  uiBold: 'Inter',
  mono: 'JetBrains Mono',
  monoMedium: 'JetBrains Mono',
  display: 'Inter',
}

export const fonts = Platform.OS === 'web' ? webFonts : nativeFonts
