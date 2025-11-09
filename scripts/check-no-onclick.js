#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const TPL_DIR = path.join(ROOT, 'webui', 'templates')

function scanFile(file) {
  const content = fs.readFileSync(file, 'utf8')
  const lines = content.split(/\r?\n/)
  const matches = []
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    // ignore commented out onclicks or data-old-onclick markers
    if (/<!--/.test(l) || /\/\*/.test(l)) continue
    const m = l.match(/onclick\s*=\s*"([^"]*)"/i)
    if (m) {
      // if data-old-onclick already present nearby, treat as ok
      if (/data-old-onclick/.test(l)) continue
      matches.push({line: i+1, text: l.trim()})
    }
  }
  return matches
}

function walk(dir) {
  const files = fs.readdirSync(dir)
  return files.flatMap(f => {
    const p = path.join(dir, f)
    const st = fs.statSync(p)
    if (st.isDirectory()) return walk(p)
    if (/\.html?$/.test(f)) return [p]
    return []
  })
}

const files = walk(TPL_DIR)
let total = 0
let found = false
for (const f of files) {
  const matches = scanFile(f)
  if (matches.length) {
    found = true
    console.error(`File: ${f}`)
    for (const m of matches) {
      console.error(`  line ${m.line}: ${m.text}`)
    }
    total += matches.length
  }
}

if (found) {
  console.error(`Found ${total} inline onclick handler(s). Please migrate to data-action or add data-old-onclick backup.`)
  process.exit(1)
} else {
  console.log('No active inline onclick handlers found in templates.')
  process.exit(0)
}
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function walk(dir, list=[]) {
  const items = fs.readdirSync(dir);
  for (const it of items) {
    const p = path.join(dir, it);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      walk(p, list);
    } else {
      list.push(p);
    }
  }
  return list;
}

const templatesDir = path.join(process.cwd(), 'webui', 'templates');
if (!fs.existsSync(templatesDir)) {
  console.error('Templates dir not found:', templatesDir);
  process.exit(2);
}

const files = walk(templatesDir).filter(f => f.endsWith('.html') || f.endsWith('.htm'));
let found = [];
const re = /\bonclick\s*=\s*("|')/i;
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  const lines = txt.split(/\n/);
  for (let i=0;i<lines.length;i++){
    if (re.test(lines[i])) {
      found.push({file:f,line:i+1,content:lines[i].trim()});
    }
  }
}
if (found.length) {
  console.error('Found inline onclick handlers (should be removed or only kept as commented backups):');
  for (const e of found) {
    console.error(`${e.file}:${e.line}: ${e.content}`);
  }
  process.exit(1);
}
console.log('No active inline onclick handlers found in templates.');
process.exit(0);
