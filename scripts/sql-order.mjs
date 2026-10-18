// The apply order in scripts/apply-all-sql.mjs, and which functions a file
// defines that a later file defines again. Applying such a file on its own
// puts the older function back over the newer one: that is how friends lost
// their pictures and looks (known_people from blocks.sql over readthrough-12).

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function sqlOrder(root = process.cwd()) {
  const text = readFileSync(resolve(root, 'scripts/apply-all-sql.mjs'), 'utf8')
  return [...text.matchAll(/'(supabase\/[a-z0-9-]+\.sql)'/g)].map((m) => m[1])
}

export function definedFunctions(sql) {
  const names = new Set()
  for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?\s*\(/gi)) {
    names.add(m[1].toLowerCase())
  }
  return names
}

// [{ name, later }]: functions in file that a file after it in apply order
// defines again. Empty for a file that is not in the order.
export function laterRedefinitions(file, root = process.cwd()) {
  const order = sqlOrder(root)
  const at = order.indexOf(file.replace(/\\/g, '/').replace(/^\.\//, ''))
  if (at < 0) return []
  const mine = definedFunctions(readFileSync(resolve(root, order[at]), 'utf8'))
  const found = []
  for (const later of order.slice(at + 1)) {
    const theirs = definedFunctions(readFileSync(resolve(root, later), 'utf8'))
    for (const name of mine) {
      if (theirs.has(name) && !found.some((f) => f.name === name)) found.push({ name, later })
    }
  }
  return found
}
