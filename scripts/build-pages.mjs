process.env.GITHUB_PAGES = 'true'
process.env.VITE_BASE = process.env.VITE_BASE || '/'
import { spawnSync } from 'node:child_process'

const out = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'build'], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
})

process.exit(out.status || 0)
