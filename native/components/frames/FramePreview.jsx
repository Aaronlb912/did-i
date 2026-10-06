// placeholder: replaced by feat/frames-art
import { View } from 'react-native'

export function FramePreview({ colors, size = 56 }) {
  return <View style={{ width: size, height: size * 1.25, borderRadius: 8, borderWidth: 1, borderColor: colors?.line, backgroundColor: colors?.panel }} />
}
