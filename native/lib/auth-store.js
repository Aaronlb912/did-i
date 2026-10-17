// Where the phone keeps the sign-in session (the Supabase access and refresh
// tokens). They used to sit in plain MMKV with everything else, readable from
// a backup or a rooted phone. Now they live in their own MMKV file encrypted
// with AES-256, and its key lives in the Keychain (iOS) or the Keystore
// (Android) through expo-secure-store.
//
// The key is readable after the phone's first unlock, so widget taps and
// silent wakes in the background still sign in. If the key cannot be read
// (a binary without the modules, the Keychain locked after a reboot), the
// session falls back to plain MMKV, and the next read with the key moves it
// into the encrypted file. A sign-in is never dropped for want of the key.

const KEY_NAME = 'did-i-auth-key'
const BOX_ID = 'did-i-auth'

function hex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function nativeDeps() {
  try {
    return {
      secure: require('expo-secure-store'),
      crypto: require('expo-crypto'),
      mmkv: require('react-native-mmkv'),
    }
  } catch {
    return {}
  }
}

// deps: { secure, crypto, mmkv } (the native modules) and plain (MMKV
// behind localStorage). Passed in so scripts/check.mjs can run it.
export function makeAuthStorage({ secure: Secure, crypto: Crypto, mmkv, plain = () => globalThis.localStorage || null } = {}) {
  async function openBox() {
    try {
      if (!Secure?.getItemAsync || !Crypto?.getRandomBytes || !mmkv?.createMMKV) return null
      const opts = { keychainAccessible: Secure.AFTER_FIRST_UNLOCK }
      let key = await Secure.getItemAsync(KEY_NAME, opts)
      if (!key) {
        // 16 random bytes as 32 hex characters: a 32-byte AES-256 key.
        key = hex(Crypto.getRandomBytes(16))
        await Secure.setItemAsync(KEY_NAME, key, opts)
        // Only use a key the Keychain really kept, or the file could be sealed
        // with a key that is gone on the next launch.
        if ((await Secure.getItemAsync(KEY_NAME, opts)) !== key) return null
      }
      return mmkv.createMMKV({ id: BOX_ID, encryptionKey: key, encryptionType: 'AES-256' })
    } catch {
      return null
    }
  }

  let opening = null
  function box() {
    if (!opening) {
      opening = openBox().then((found) => {
        // A miss is tried again on the next read (the Keychain may unlock).
        if (!found) opening = null
        return found
      })
    }
    return opening
  }

  // The storage Supabase auth reads and writes (src/lib/cloud.js).
  return {
    async getItem(name) {
      const sealed = await box()
      const loose = plain()?.getItem(name) ?? null
      if (!sealed) return loose
      // Anything still in plain MMKV is newer than the sealed copy: it is only
      // written there when the key could not be read. Move it in.
      if (loose != null) {
        sealed.set(name, loose)
        plain()?.removeItem(name)
        return loose
      }
      return sealed.getString(name) ?? null
    },
    async setItem(name, value) {
      const sealed = await box()
      if (!sealed) {
        plain()?.setItem(name, value)
        return
      }
      sealed.set(name, value)
      plain()?.removeItem(name)
    },
    async removeItem(name) {
      const sealed = await box()
      sealed?.remove(name)
      plain()?.removeItem(name)
    },
  }
}

export const authStorage = makeAuthStorage(nativeDeps())
