#!/usr/bin/env node
// Strict onclick checker: fails if an element contains an `onclick=` attribute but does NOT have
// a `data-old-onclick` or `data-action` attribute. Prints occurrences and exits with code 1 on failure.
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const exts = ['.html', '.htm', '.js', '.vue'];
let failures = [];

function scanFile(file) {
  const data = fs.readFileSync(file, 'utf8');
  const regex = /<([a-zA-Z0-9]+)([^>]*?)\sonclick\s*=\s*(["'])(.*?)\3([^>]*?)>/gms;
  let m;
  while ((m = regex.exec(data))) {
    const full = m[0];
    const attrs = (m[2] || '') + (m[5] || '');
    if (!/data-old-onclick\s*=/.test(attrs) && !/data-action\s*=/.test(attrs)) {
      const idx = data.substring(0, m.index).split('\n').length;
      failures.push({ file, line: idx, snippet: full.trim() });
    }
  }
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === 'backups') continue;
      walk(p);
    } else if (exts.includes(path.extname(name))) {
      scanFile(p);
    }
  }
}

walk(root);
if (failures.length) {
  console.error('Found raw onclick occurrences without data-old-onclick/data-action:');
  failures.forEach(f => console.error(`${f.file}:${f.line}: ${f.snippet}`));
  process.exit(1);
} else {
  console.log('OK: no strict onclick violations found.');
}
