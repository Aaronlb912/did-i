// Print deep links and adb steps so dev clients can reach Metro.
import { spawnSync } from 'node:child_process'

const NGROK = 'http://127.0.0.1:4040/api/tunnels'
const PORT = 8081

async function metroUp(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/status`)
    return res.ok
  } catch {
    return false
  }
}

async function tunnelUrl() {
  try {
    const res = await fetch(NGROK)
    const data = await res.json()
    const hit = (data.tunnels || []).find((t) => String(t.config?.addr || '').includes(`:${PORT}`))
    return hit?.public_url || ''
  } catch {
    return ''
  }
}

function enc(url) {
  return encodeURIComponent(url)
}

const up = await metroUp(PORT)
const tunnel = await tunnelUrl()
const extra = []
for (const p of [8082, 8083]) {
  if (await metroUp(p)) extra.push(p)
}

console.log('')
if (!up) {
  console.log('Metro is not running on port', PORT)
  console.log('Start it first:  npm run expo:dev')
  console.log('')
  process.exit(1)
}

console.log('Metro is up on port', PORT)
if (tunnel) console.log('Tunnel:', tunnel)
if (extra.length) {
  console.log('')
  console.log('WARNING: extra Metro on port', extra.join(', '), '— kill those terminals.')
  console.log('Only one npm run expo:dev should run, on 8081.')
}
console.log('')
console.log('Android emulator (USB debugging):')
console.log('  adb reverse tcp:8081 tcp:8081')
console.log(`  adb shell am start -a android.intent.action.VIEW -d "didi://expo-development-client/?url=${enc('http://127.0.0.1:8081')}"`)
console.log('')
console.log('Physical Android or iPhone (paste in dev client → Enter URL manually):')
console.log(' ', tunnel || '(no tunnel — run npm run expo:dev and wait for Tunnel ready)')
if (tunnel) {
  console.log('')
  console.log('Or open this link on the phone:')
  console.log(`  didi://expo-development-client/?url=${enc(tunnel)}`)
}
console.log('')

const adb = spawnSync('adb', ['reverse', `tcp:${PORT}`, `tcp:${PORT}`], { encoding: 'utf8' })
if (!adb.error && adb.status === 0) {
  console.log('adb reverse set for emulator.')
}
