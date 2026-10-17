// Writes the signed-updates certificate into the committed Android manifest,
// the same values app.config.js gives iOS at prebuild. Run once after making
// the key pair (docs/native-rebuild.md, Signed updates):
//   node scripts/updates-signing.mjs
// Safe to run again; with no certificate it removes the entries.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const manifest = 'android/app/src/main/AndroidManifest.xml'
const cert = 'certs/certificate.pem'
const CERT_KEY = 'expo.modules.updates.CODE_SIGNING_CERTIFICATE'
const META_KEY = 'expo.modules.updates.CODE_SIGNING_METADATA'

function attr(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '&#10;')
}

let xml = readFileSync(manifest, 'utf8')
xml = xml.replace(new RegExp(`\\s*<meta-data android:name="(${CERT_KEY}|${META_KEY})"[^>]*/>`, 'g'), '')

if (existsSync(cert)) {
  const pem = readFileSync(cert, 'utf8').trim()
  if (!/^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----$/.test(pem)) {
    console.error(`${cert} is not a PEM certificate`)
    process.exit(1)
  }
  const anchor = '<meta-data android:name="expo.modules.updates.EXPO_UPDATE_URL"'
  if (!xml.includes(anchor)) {
    console.error(`${manifest} has no expo-updates URL entry to sit next to`)
    process.exit(1)
  }
  const lines =
    `<meta-data android:name="${CERT_KEY}" android:value="${attr(pem)}"/>\n    ` +
    `<meta-data android:name="${META_KEY}" android:value="${attr(JSON.stringify({ keyid: 'main', alg: 'rsa-v1_5-sha256' }))}"/>\n    `
  xml = xml.replace(anchor, lines + anchor)
  console.log('Signed updates on in the Android manifest.')
} else {
  console.log(`No ${cert}: signed updates off in the Android manifest.`)
}
writeFileSync(manifest, xml)
