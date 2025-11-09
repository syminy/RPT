#!/usr/bin/env node
// Scan templates and static files for non-commented `onclick=` occurrences.
const fs = require('fs')
const path = require('path')

function walk(dir) {
  const res = []
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) res.push(...walk(full))
    else res.push(full)
  }
  return res
}

function isTextFile(file) {
  const exts = ['.html', '.js', '.htm', '.vue']
  return exts.includes(path.extname(file).toLowerCase())
}

function scanFile(file) {
  const text = fs.readFileSync(file, 'utf8')
  const lines = text.split(/\r?\n/)
  const findings = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const idx = line.indexOf('onclick=')
    if (idx !== -1) {
      // crude check: ignore lines that are HTML comments <!-- ... onclick= ... -->
      const inComment = /<!--([\s\S]*?)-->/.test(line)
      if (!inComment) findings.push({file, line: i+1, text: line.trim()})
    }
  }
  return findings
}

const roots = [path.join(__dirname, '..', 'webui', 'templates'), path.join(__dirname, '..', 'webui', 'static')]
let total = 0
const allFindings = []
for (const r of roots) {
  if (!fs.existsSync(r)) continue
  const files = walk(r).filter(isTextFile)
  for (const f of files) {
    const fnd = scanFile(f)
    if (fnd.length) {
      allFindings.push(...fnd)
      total += fnd.length
    }
  }
}

if (total === 0) {
  console.log('OK: no non-commented onclick= found in scanned paths')
  process.exit(0)
} else {
  console.error(`FOUND ${total} inline onclick occurrences:`)
  for (const it of allFindings) console.error(`${it.file}:${it.line}: ${it.text}`)
  process.exit(3)
}
