// Stop stale ngrok and Metro on 8081 before expo:dev.
import { execSync, spawnSync } from 'node:child_process'
import { platform } from 'node:os'

const PORT = 8081

function killNgrok() {
  if (platform() === 'win32') {
    spawnSync('taskkill', ['/F', '/IM', 'ngrok.exe'], { stdio: 'ignore' })
    return
  }
  spawnSync('pkill', ['-f', 'ngrok'], { stdio: 'ignore' })
}

function killPort(port) {
  if (platform() === 'win32') {
    try {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' })
      const pids = new Set()
      for (const line of out.split('\n')) {
        if (!line.includes('LISTENING')) continue
        const pid = line.trim().split(/\s+/).pop()
        if (pid && /^\d+$/.test(pid)) pids.add(pid)
      }
      for (const pid of pids) {
        spawnSync('taskkill', ['/F', '/PID', pid], { stdio: 'ignore' })
      }
    } catch {
      // nothing listening
    }
    return
  }
  spawnSync('sh', ['-c', `lsof -ti:${port} | xargs kill -9 2>/dev/null || true`], { stdio: 'ignore' })
}

killNgrok()
killPort(PORT)
console.log(`Cleared stale ngrok and port ${PORT}.`)
