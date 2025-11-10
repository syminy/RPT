#!/usr/bin/env node
// Generate a CSV report of inline onclick occurrences under webui/templates and webui/static
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
      const inComment = /<!--([\s\S]*?)-->/.test(line)
      if (!inComment) findings.push({file, line: i+1, snippet: line.trim()})
    }
  }
  return findings
}

const roots = [path.join(__dirname, '..', 'webui', 'templates'), path.join(__dirname, '..', 'webui', 'static')]
const all = []
for (const r of roots) {
  if (!fs.existsSync(r)) continue
  const files = walk(r).filter(isTextFile)
  for (const f of files) {
    const fnd = scanFile(f)
    if (fnd.length) all.push(...fnd)
  }
}

if (all.length === 0) {
  console.log('No inline onclick occurrences found.')
  process.exit(0)
}

const reportsDir = path.join(__dirname, '..', 'reports')
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, {recursive:true})
const ts = new Date().toISOString().replace(/[:.]/g, '-')
const out = path.join(reportsDir, `onclick_report_${ts}.csv`)
const header = 'file,line,snippet\n'
const csv = all.map(r => `${r.file.replace(/,/g,'')},${r.line},"${r.snippet.replace(/"/g,'""')}"`).join('\n') + '\n'
fs.writeFileSync(out, header + csv, 'utf8')
console.log(`Wrote report: ${out} (${all.length} items)`)
process.exit(0)
