// PreToolUse hook (Bash, filtered to `git commit*`): blocks the commit if
// `npm run check` (tests + night-math bench) fails.
const { execSync } = require('child_process')
try {
  execSync('npm run check', {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  })
  console.log('{}')
} catch (e) {
  const out = ((e.stdout || '') + (e.stderr || '')).toString().slice(-1500)
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: 'npm run check failed, commit blocked:\n' + out,
    },
  }))
}
