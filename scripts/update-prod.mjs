// npm run update:prod: publish JS to phones on the production channel. With
// signed updates on (certs/certificate.pem), signs with keys/private-key.pem
// and refuses to publish without it (docs/native-rebuild.md, Signed updates).

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const args = ['eas-cli', 'update', '--channel', 'production', '--environment', 'production', ...process.argv.slice(2)]
if (existsSync('certs/certificate.pem')) {
  if (!existsSync('keys/private-key.pem')) {
    console.error('Signed updates are on but keys/private-key.pem is missing. Not publishing an unsigned update.')
    process.exit(1)
  }
  args.push('--private-key-path', 'keys/private-key.pem')
}
const run = spawnSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(run.status ?? 1)
