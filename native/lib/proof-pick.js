import { requireOptionalNativeModule } from 'expo'
import { PROOF_MAX_BYTES } from '../../src/lib/proofs.js'
import { clearCameraFor, noteCameraFor } from './camera-pending.js'

const LONG_EDGE = 1080

// Builds before 1.3.0 have no picker or manipulator. This JS reaches them
// over the air, so the Add photo row stays hidden until a build has both.
export function canAddProof() {
  return Boolean(
    requireOptionalNativeModule('ExponentImagePicker') && requireOptionalNativeModule('ExpoImageManipulator'),
  )
}

// One photo from the library or the camera, shrunk to 1080 pixels on its
// long edge and a JPEG under 400 KB. Returns the bytes, or null when the
// person backs out. Throws 'camera-denied' or 'photos-denied' when that
// access is off for Did I.
// `mark` ({ target, night }) is kept while the camera is open, so a photo
// taken after Android closed Did I is still added (camera-pending.js).
export async function pickProofBytes(from = 'library', mark = null) {
  if (!canAddProof()) return null
  const ImagePicker = require('expo-image-picker')
  const options = { mediaTypes: ['images'], allowsEditing: false, quality: 1 }
  let picked
  if (from === 'camera') {
    const ask = await ImagePicker.requestCameraPermissionsAsync()
    if (!ask?.granted) throw new Error('camera-denied')
    if (mark) noteCameraFor({ for: 'proof', ...mark })
    try {
      picked = await ImagePicker.launchCameraAsync(options)
    } finally {
      clearCameraFor()
    }
  } else {
    const ask = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!ask?.granted && ask?.accessPrivileges !== 'limited') throw new Error('photos-denied')
    picked = await ImagePicker.launchImageLibraryAsync(options)
  }
  if (picked.canceled || !picked.assets?.[0]?.uri) return null
  return shrinkProof(picked.assets[0])
}

export async function shrinkProof(asset) {
  const { manipulateAsync, SaveFormat } = require('expo-image-manipulator')
  const wide = (asset.width || 0) >= (asset.height || 0)
  // Smaller steps if a busy photo is still over the cap.
  for (const [edge, compress] of [[LONG_EDGE, 0.7], [LONG_EDGE, 0.5], [800, 0.45], [640, 0.4]]) {
    const big = Math.max(asset.width || 0, asset.height || 0)
    const actions = big > edge ? [{ resize: wide ? { width: edge } : { height: edge } }] : []
    const small = await manipulateAsync(asset.uri, actions, { compress, format: SaveFormat.JPEG })
    const bytes = await (await fetch(small.uri)).arrayBuffer()
    if (bytes.byteLength <= PROOF_MAX_BYTES) return bytes
  }
  throw new Error('too-big')
}
