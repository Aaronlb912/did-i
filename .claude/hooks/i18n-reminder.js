// PostToolUse hook (Write|Edit): reminds about the src/locales/en.js + es.js
// rule when a screen/component under src/lib/ or native/ changes.
let d = ''
process.stdin.on('data', c => (d += c))
process.stdin.on('end', () => {
  const j = JSON.parse(d)
  const f = (j.tool_input && j.tool_input.file_path) || (j.tool_response && j.tool_response.filePath) || ''
  if (/(^|[\\/])(src\/lib|native)[\\/].*\.(jsx|js)$/.test(f)) {
    console.log(JSON.stringify({
      systemMessage: 'Reminder: if this screen has new/changed user-facing copy, add keys to both src/locales/en.js and es.js.',
    }))
  } else {
    console.log('{}')
  }
})
