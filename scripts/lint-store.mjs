// Patterns that pass a simulator and then throw on a TestFlight binary.
// `import X from 'mod'` compiles to `require(mod).default`. If that require
// is undefined, or a getter throws, the screen named in the boundary dies.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.expo-export-ios',
  'dist',
  'android',
  'ios',
  '.expo',
])

const ALLOW_EXACT = new Set([
  'react',
  'react-native',
  'expo',
  'expo-modules-core',
  'expo-build-properties',
  '@expo/config',
  '@expo/config-plugins',
])

const ALLOW_PREFIX = ['@react-navigation/', '@supabase/', '@expo-google-fonts/', 'react/']

const HOSTS = [
  'native/components/CheerBurstHost.jsx',
  'native/components/AppNavHost.jsx',
  'native/components/SwipeBackShellHost.jsx',
  'native/components/SwipeCardHost.jsx',
]

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = path.join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (/\.(js|jsx|cjs|mjs|ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}

function packageName(spec) {
  if (!spec || spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('@/')) return ''
  if (spec.startsWith('@')) {
    const parts = spec.split('/')
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec
  }
  return spec.split('/')[0]
}

function isNativePackage(name) {
  if (!name) return false
  if (ALLOW_EXACT.has(name)) return false
  if (ALLOW_PREFIX.some((prefix) => name.startsWith(prefix))) return false
  return (
    name.startsWith('expo-') ||
    name.startsWith('react-native-') ||
    name.startsWith('@react-native') ||
    name.startsWith('@expo/')
  )
}

function shimmed(name, spec, keys) {
  if (keys.has(spec) || keys.has(name)) return true
  for (const key of keys) {
    if (spec === key || spec.startsWith(`${key}/`)) return true
  }
  return false
}

function specsIn(text) {
  const specs = []
  const patterns = [
    /(?:import|export)\s+(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) specs.push(match[1])
  }
  return specs
}

export function lintStore(repo) {
  const problems = []
  const metro = readFileSync(path.join(repo, 'metro.config.cjs'), 'utf8')
  const keys = new Set()
  for (const match of metro.matchAll(/\['([^']+)',\s*'[^']+\.cjs'\]/g)) keys.add(match[1])
  if (!keys.size) problems.push('metro.config.cjs has no NATIVE_SHIMS entries')

  const files = walk(repo, [])
  for (const file of files) {
    const rel = path.relative(repo, file).replace(/\\/g, '/')
    const text = readFileSync(file, 'utf8')

    if (rel.startsWith('native/') && /from ['"](?:\.\.\/)+src\/[^'"]+\.jsx['"]/.test(text)) {
      problems.push(`${rel} imports a web JSX module. Split the helper into a .js file.`)
    }

    if (
      !rel.endsWith('native/shim/reanimated-safe.cjs') &&
      /createAnimatedComponent\(\s*(?:Svg|Path|Circle|Ellipse|Line|Polygon|Rect|G|Text)\b/.test(text)
    ) {
      problems.push(`${rel} animates an SVG part. That reads .default on the store build. Draw it plain.`)
    }

    if (rel.startsWith('native/shim/') && /require\(\s*[^'")\s]/.test(text)) {
      problems.push(`${rel} uses a dynamic require(). Metro rejects that in the store bundle.`)
    }

    for (const spec of specsIn(text)) {
      const name = packageName(spec)
      if (!isNativePackage(name) && !isNativePackage(spec)) continue
      if (rel.startsWith('native/shim/') && rel.endsWith('-safe.cjs')) continue
      if (shimmed(name, spec, keys)) continue
      problems.push(`${rel} imports ${spec}, which is not in NATIVE_SHIMS`)
    }
  }

  for (const rel of HOSTS) {
    const text = readFileSync(path.join(repo, rel), 'utf8')
    if (!text.includes('<Slot')) problems.push(`${rel} renders a lazy screen with no Slot`)
  }

  const pin = readFileSync(path.join(repo, 'native/shim/pin-module.cjs'), 'utf8')
  if (!pin.includes('catch')) problems.push('pin-module.cjs does not catch a throwing native getter')
  if (/require\(\s*id\s*\)/.test(pin)) problems.push('pin-module.cjs still calls require(id)')

  const svg = readFileSync(path.join(repo, 'native/lib/svg-parts.js'), 'utf8')
  if (!svg.includes('try')) problems.push('svg-parts.js loads react-native-svg outside try')

  return problems
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = lintStore(root)
  if (!problems.length) {
    console.log('ok   store lint')
    process.exit(0)
  }
  for (const problem of problems) console.error(`fail ${problem}`)
  process.exit(1)
}
