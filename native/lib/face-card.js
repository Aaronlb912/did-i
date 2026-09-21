import { StyleSheet } from 'react-native'
import { fonts, radius } from '../theme.js'

/** Shared face / swipe card chrome — keep in step with .di-face in did-i.css */
export const FACE_PAD_H = 19
export const FACE_PAD_TOP = 22
export const FACE_PAD_BOTTOM = 22
export const FACE_MIN_H = 168

export function faceCardStyle(colors, extra = null) {
  return [
    faceCardStyles.card,
    { backgroundColor: colors.panel, borderColor: colors.line },
    extra,
  ]
}

export const faceCardStyles = StyleSheet.create({
  card: {
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
    position: 'absolute',
    top: 16,
    right: 16,
    fontFamily: fonts.display,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
})
