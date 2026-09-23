// Pre-build sweep: unit checks, web build, Metro bundles. Exit non-zero on failure.
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const cwd = path.join(root, '..')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

function run(label, cmd, args, extra = {}) {
  process.stdout.write(`\n— ${label}\n`)
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32', ...extra })
  if (result.status !== 0) {
    console.error(`\nSweep stopped: ${label} failed (exit ${result.status})`)
    process.exit(result.status || 1)
  }
}

run('npm run check', npm, ['run', 'check'])
run('npm run build', npm, ['run', 'build'])
run('expo export ios', npx, ['expo', 'export', '--platform', 'ios', '--output-dir', '.expo-sweep-ios'])
run('expo export android', npx, ['expo', 'export', '--platform', 'android', '--output-dir', '.expo-sweep-android'])
console.log('\nSweep clean: check, web build, iOS and Android Metro bundles.')
