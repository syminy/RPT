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
