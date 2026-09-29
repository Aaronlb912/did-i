// PostToolUse hook (Write|Edit): reminds to run `npm run db:audit` after
// editing a supabase/*.sql file.
let d = ''
process.stdin.on('data', c => (d += c))
process.stdin.on('end', () => {
  const j = JSON.parse(d)
  const f = (j.tool_input && j.tool_input.file_path) || (j.tool_response && j.tool_response.filePath) || ''
  if (/(^|[\\/])supabase[\\/].*\.sql$/.test(f)) {
    console.log(JSON.stringify({
      systemMessage: 'Reminder: run npm run db:audit before calling backend work done (must return no rows).',
    }))
  } else {
    console.log('{}')
  }
})
