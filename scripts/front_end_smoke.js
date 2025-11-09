#!/usr/bin/env node
// Puppeteer-based smoke test skeleton for front-end interactions.
// NOTE: This script is a skeleton and requires `npm install puppeteer` (or puppeteer-core + browser)
// Usage:
//   npm install puppeteer --no-save
//   node scripts/front_end_smoke.js

const fs = require('fs')
const path = require('path')

async function run() {
  let puppeteer
  try {
    puppeteer = require('puppeteer')
  } catch (e) {
    console.error('puppeteer not installed. Run: npm install puppeteer --no-save')
    process.exit(2)
  }

  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']})
  const page = await browser.newPage()
  const base = process.env.RPT_BASE_URL || 'http://127.0.0.1:8000'
  console.log('Opening', base)
  await page.goto(base, {waitUntil: 'networkidle2', timeout: 60000})

  // Example interactions: click start/stop scan if buttons exist
  try {
    const startSel = '#start-scan-btn'
    if (await page.$(startSel)) {
      console.log('Clicking start scan')
      await page.click(startSel)
      await page.waitForTimeout(1500)
      const stopSel = '#stop-scan-btn'
      if (await page.$(stopSel)) {
        console.log('Clicking stop scan')
        await page.click(stopSel)
      }
    } else {
      console.log('Start scan button not found, skipping')
    }
  } catch (e) {
    console.error('Interaction failed:', e.message)
  }

  const screenshotsDir = path.join(__dirname, '..', 'reports', 'screenshots')
  fs.mkdirSync(screenshotsDir, {recursive:true})
  const shot = path.join(screenshotsDir, `smoke_${Date.now()}.png`)
  await page.screenshot({path: shot, fullPage: false})
  console.log('Saved screenshot:', shot)

  await browser.close()
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
