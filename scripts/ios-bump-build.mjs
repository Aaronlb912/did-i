// Takes the next iOS build number in app.json and pushes it, so a GitHub
// build and an Expo build never upload the same number to TestFlight.
// Both paths run this first: .github/workflows/ios-ipa.yml and npm run ios:build:store.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const git = (...args) => execFileSync('git', args, { stdio: 'inherit' })

git('pull', '--rebase', '--autostash')
const raw = readFileSync('app.json', 'utf8')
const app = JSON.parse(raw)
const next = String((Number.parseInt(app.expo.ios.buildNumber, 10) || 0) + 1)
app.expo.ios.buildNumber = next
const eol = raw.includes('\r\n') ? '\r\n' : '\n'
writeFileSync('app.json', JSON.stringify(app, null, 2).replace(/\n/g, eol) + eol)
git('add', 'app.json')
git('commit', '-m', `ios build ${next} [skip ci]`)
git('push')
console.log(`iOS build number ${next}`)
