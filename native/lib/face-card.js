import { StyleSheet } from 'react-native'
import { fonts, radius } from '../theme.js'

/** Shared face / swipe card chrome — keep in step with .di-face in did-i.css */
export const FACE_PAD_H = 19
export const FACE_PAD_TOP = 22
export const FACE_PAD_BOTTOM = 22
export const FACE_MIN_H = 168

export function faceCardStyle(colors, extra = null) {
  const gemCard = extra && extra.borderColor === 'transparent'
  return [
    faceCardStyles.card,
    { backgroundColor: colors.panel, borderColor: gemCard ? 'transparent' : colors.line },
    extra,
  ]
}

export const faceCardStyles = StyleSheet.create({
  gemShell: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  card: {
    position: 'relative',
    borderWidth: 1,
    borderRadius: radius.r,
    overflow: 'hidden',
    paddingHorizontal: FACE_PAD_H,
    paddingTop: FACE_PAD_TOP,
    paddingBottom: FACE_PAD_BOTTOM,
    minHeight: FACE_MIN_H,
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
  },
  meta: {
    fontFamily: fonts.ui,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  stampDid: {
    position: 'absolute',
    top: 16,
    left: 16,
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  stampNope: {
    // Clear of the buddy in the top right corner; "Not yet" is wider than the old word.
    position: 'absolute',
    top: 16,
    right: 64,
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
})
