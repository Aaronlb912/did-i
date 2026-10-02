import { requireOptionalNativeModule } from 'expo'

const SIDE = 384

// Builds before 1.3.0 have no photo picker. The JS for this ships to them
// over the air, so nothing here loads the picker until a build has it.
export function canPickAvatar() {
  return Boolean(
    requireOptionalNativeModule('ExponentImagePicker') && requireOptionalNativeModule('ExpoImageManipulator'),
  )
}

// The camera came in the same build as the picker.
export function canTakePhoto() {
  return canPickAvatar()
}

// One photo from the library or the camera, square-cropped, shrunk to a small
// JPEG. Returns the bytes, or null when the person backs out. Throws
// 'camera-denied' or 'photos-denied' when that access is turned off for Did I.
export async function pickAvatarBytes(from = 'library') {
  if (!canPickAvatar()) return null
  const ImagePicker = require('expo-image-picker')
  const { manipulateAsync, SaveFormat } = require('expo-image-manipulator')
  const options = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 }
  let picked
  if (from === 'camera') {
    const ask = await ImagePicker.requestCameraPermissionsAsync()
    if (!ask?.granted) throw new Error('camera-denied')
    picked = await ImagePicker.launchCameraAsync({ ...options, cameraType: ImagePicker.CameraType?.front })
  } else {
    // Ask first, so the phone's own photo access prompt comes before the
    // library opens. "Limited" access counts as yes.
    const ask = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!ask?.granted && ask?.accessPrivileges !== 'limited') throw new Error('photos-denied')
    picked = await ImagePicker.launchImageLibraryAsync(options)
  }
  if (picked.canceled || !picked.assets?.[0]?.uri) return null
  const asset = picked.assets[0]
  const actions = []
  // The crop screen should hand back a square; make sure of it.
  if (asset.width && asset.height && asset.width !== asset.height) {
    const side = Math.min(asset.width, asset.height)
    actions.push({
      crop: {
        originX: Math.floor((asset.width - side) / 2),
        originY: Math.floor((asset.height - side) / 2),
        width: side,
        height: side,
      },
    })
  }
  actions.push({ resize: { width: SIDE, height: SIDE } })
  const small = await manipulateAsync(asset.uri, actions, { compress: 0.8, format: SaveFormat.JPEG })
  const response = await fetch(small.uri)
  return response.arrayBuffer()
}
