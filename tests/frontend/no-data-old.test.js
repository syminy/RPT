const fs = require('fs')
const path = require('path')

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      walk(full, cb)
    } else {
      cb(full)
    }
  }
}

test('no data-old-* fallback attributes in templates and static', () => {
  const root = path.resolve(__dirname, '../../webui')
  const targets = [path.join(root, 'templates'), path.join(root, 'static')]
  const exts = ['.html', '.htm', '.js', '.vue']
  const failures = []

  for (const t of targets) {
    if (!fs.existsSync(t)) continue
    walk(t, (file) => {
      if (!exts.includes(path.extname(file).toLowerCase())) return
      const txt = fs.readFileSync(file, 'utf8')
      if (txt.includes('data-old-')) {
        failures.push(file)
      }
    })
  }

  if (failures.length) {
    const list = failures.slice(0, 10).map((f) => `  ${f}`).join('\n')
    throw new Error(`Found data-old-* fallbacks in ${failures.length} files:\n${list}`)
  }
})
