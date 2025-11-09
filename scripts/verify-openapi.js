#!/usr/bin/env node
// Simple verifier for openapi.json presence and basic sanity checks
const fs = require('fs')
const path = require('path')

const openapiPath = path.join(__dirname, '..', 'openapi.json')
if (!fs.existsSync(openapiPath)) {
  console.error('ERROR: openapi.json not found at project root. Run tools/export_openapi.py to generate it.')
  process.exit(2)
}

let doc
try {
  doc = JSON.parse(fs.readFileSync(openapiPath, 'utf8'))
} catch (e) {
  console.error('ERROR: failed to parse openapi.json:', e.message)
  process.exit(3)
}

const paths = Object.keys(doc.paths || {})
console.log(`OpenAPI loaded. Found ${paths.length} paths.`)
if (paths.length === 0) {
  console.error('ERROR: no paths declared in openapi.json')
  process.exit(4)
}

// report duplicates of operationId if present
const opIds = {}
for (const p of paths) {
  const methods = Object.keys(doc.paths[p])
  for (const m of methods) {
    const op = doc.paths[p][m]
    if (op && op.operationId) {
      opIds[op.operationId] = (opIds[op.operationId] || 0) + 1
    }
  }
}
const dups = Object.entries(opIds).filter(([,c]) => c>1)
if (dups.length) {
  console.warn('Warning: duplicate operationId values detected:')
  for (const [id,c] of dups) console.warn(`  ${id}: ${c} occurrences`)
}

console.log('Basic OpenAPI check passed.')
process.exit(0)
