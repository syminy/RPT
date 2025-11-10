#!/usr/bin/env node
// Aggregate the latest reports/onclick_report_*.csv into a Markdown summary
const fs = require('fs')
const path = require('path')

const reportsDir = path.join(__dirname, '..', 'reports')
if (!fs.existsSync(reportsDir)) {
  console.error('reports directory not found:', reportsDir)
  process.exit(1)
}

const files = fs.readdirSync(reportsDir).filter(f => f.startsWith('onclick_report_') && f.endsWith('.csv'))
if (!files.length) {
  console.error('No onclick report CSVs found in', reportsDir)
  process.exit(2)
}

// pick latest by mtime
files.sort((a,b)=>{
  const sa = fs.statSync(path.join(reportsDir,a)).mtimeMs
  const sb = fs.statSync(path.join(reportsDir,b)).mtimeMs
  return sb-sa
})
const latest = files[0]
const csv = fs.readFileSync(path.join(reportsDir, latest), 'utf8')
const lines = csv.split(/\r?\n/).slice(1).filter(Boolean)

const byFile = {}
for (const ln of lines) {
  // simple CSV parse: file,line,"snippet"
  const m = ln.match(/^([^,]+),(\d+),"([\s\S]*)"$/)
  if (!m) continue
  const file = m[1]
  const lineNo = parseInt(m[2],10)
  const snippet = m[3]
  if (!byFile[file]) byFile[file]=[]
  byFile[file].push({line:lineNo, snippet})
}

const outDir = path.join(__dirname, '..', 'docs', 'frontend')
fs.mkdirSync(outDir, {recursive:true})
const outPath = path.join(outDir, 'onclick_report_detailed.md')

let md = `# Inline onclick detailed report\n\n`;
md += `Source CSV: \\reports/${latest}  \n\n`
md += `Total occurrences: ${lines.length}  \n\n`
md += `| File | Count | Example lines |\n|---|---:|---|\n`

const entries = Object.entries(byFile).sort((a,b)=>b[1].length - a[1].length)
for (const [file, arr] of entries) {
  const examples = arr.slice(0,3).map(x=>`line ${x.line}: ${x.snippet.replace(/\"/g,'"')}`)
  md += `| ${file} | ${arr.length} | ${examples.join(' <br> ')} |\n`
}

md += `\n\n## Full per-file lists\n\n`
for (const [file, arr] of entries) {
  md += `### ${file} — ${arr.length} occurrences\n\n`
  for (const it of arr) md += `- line ${it.line}: \`${it.snippet.replace(/`/g,'`') }\`\n`
  md += `\n`
}

fs.writeFileSync(outPath, md, 'utf8')
console.log('Wrote detailed report:', outPath)
process.exit(0)
