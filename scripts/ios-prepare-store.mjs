// Preflight for EAS production iOS with widgets. Exit 1 on check failures.
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const sweep = process.argv.includes('--sweep')

const hasPlist = existsSync(path.join(root, 'GoogleService-Info.plist'))
const credsUrl =
  'https://expo.dev/accounts/abryant/projects/did-i/credentials/ios/com.aaronbryant.didi'

console.log('\nDid I — iOS store build (widgets on)\n')

if (hasPlist) {
  console.log('ok   GoogleService-Info.plist at repo root (.easignore uploads it to EAS)')
} else {
  console.log(
    'note GoogleService-Info.plist missing at repo root. Run npm run ios:plist:pull, or set the GOOGLE_SERVICES_PLIST file env on EAS.',
  )
  console.log('     Run: npx eas env:list --environment production')
}

console.log('\nApple (widgets store build — once per team):')
console.log('  • Identifiers: com.aaronbryant.didi + com.aaronbryant.didi.widgets')
console.log('  • Both → App Groups → group.com.aaronbryant.didi (Enabled App Groups (1))')
console.log('  • Widget name in app.config must match createWidget: DidITonight')
console.log('  • Details: docs/widgets.md\n')

console.log('Before the next widgets store build (every time EAS reused a stale main profile):')
console.log(`  1. Open ${credsUrl}`)
console.log('  2. Provisioning Profile → Remove (main app only)')
console.log('  3. PowerShell (not Cursor agent):')
console.log("       $env:CI=''")
console.log('       npm run ios:build:store:first')
console.log('  4. After Finished: npm run ios:submit\n')

console.log('CI must be unset so EAS can regenerate the main profile with App Groups.\n')

process.stdout.write('Running npm run check…\n')
const check = spawnSync(npm, ['run', 'check'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (check.status !== 0) {
  process.exit(check.status || 1)
}

process.stdout.write('\nRunning store lint…\n')
const lint = spawnSync(process.execPath, ['scripts/lint-store.mjs'], {
  cwd: root,
  stdio: 'inherit',
})
if (lint.status !== 0) process.exit(lint.status || 1)

process.stdout.write('\nRunning typecheck…\n')
const tsc = spawnSync(npx, ['tsc', '-p', 'tsconfig.store.json', '--noEmit'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (tsc.status !== 0) process.exit(tsc.status || 1)

process.stdout.write('\nExporting the iOS bundle Hermes will ship…\n')
const exported = spawnSync(npx, ['expo', 'export', '--platform', 'ios', '--output-dir', '.expo-export-ios'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (exported.status !== 0) process.exit(exported.status || 1)

if (sweep) {
  process.stdout.write('\nRunning npm run sweep…\n')
  const sw = spawnSync(npm, ['run', 'sweep'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (sw.status !== 0) {
    process.exit(sw.status || 1)
  }
}

console.log('\nReady to build. Use ios:build:store:first after removing the stale profile.\n')
