// Start Metro for the phone dev client from a clean slate:
// stops whatever still holds the port (an old Metro keeps serving stale code),
// clears Metro's cache, and points a plugged-in Android phone or emulator at it.
//   npm run phone:dev            port 8083
//   npm run phone:dev -- 8081    another port
import { execSync, spawn, spawnSync } from 'node:child_process'

const port = Number(process.argv[2]) || 8083

function pidsOnPort() {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano -p tcp`, { encoding: 'utf8' })
      return [
        ...new Set(
          out
            .split(/\r?\n/)
            .filter((line) => line.includes('LISTENING') && new RegExp(`:${port}\\s`).test(line))
            .map((line) => line.trim().split(/\s+/).pop())
            .filter((pid) => pid && pid !== '0'),
        ),
      ]
    }
    return execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' }).split(/\s+/).filter(Boolean)
  } catch {
    return []
  }
}

for (const pid of pidsOnPort()) {
  console.log(`stopping old server on ${port} (pid ${pid})`)
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'ignore' })
  else spawnSync('kill', ['-9', pid], { stdio: 'ignore' })
}

// An emulator or USB phone reaches Metro on localhost through this.
const adb = spawnSync('adb', ['reverse', `tcp:${port}`, `tcp:${port}`], { stdio: 'ignore', shell: true })
if (adb.status === 0) console.log(`adb reverse tcp:${port} set`)

const child = spawn('npx', ['expo', 'start', '--dev-client', '--port', String(port), '--clear'], {
  stdio: 'inherit',
  shell: true,
})
child.on('exit', (code) => process.exit(code ?? 0))
