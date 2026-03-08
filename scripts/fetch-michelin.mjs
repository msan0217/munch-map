/**
 * Scrape Michelin Guide Austin restaurants using Playwright.
 *
 * Usage:
 *   node scripts/fetch-michelin.mjs
 *
 * Requires: npx playwright install chromium
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const SOURCE_URL =
  'https://guide.michelin.com/us/en/texas/austin_2958315/restaurants?sort=distance'

// Map raw data-dtm-distinction values to display names
const DISTINCTION_MAP = {
  'THREE_STARS': '3 Stars',
  'TWO_STARS': '2 Stars',
  'ONE_STAR': '1 Star',
  'BIB_GOURMAND': 'Bib Gourmand',
}

const DISTINCTION_ORDER = {
  '3 Stars': 0,
  '2 Stars': 1,
  '1 Star': 2,
  'Bib Gourmand': 3,
  'Selected': 4,
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0
      const distance = 400
      const timer = setInterval(() => {
        window.scrollBy(0, distance)
        totalHeight += distance
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer)
          resolve()
        }
      }, 200)
    })
  })
}

async function main() {
  console.log('Launching browser...')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    console.log(`Navigating to ${SOURCE_URL}`)
    await page.goto(SOURCE_URL, { waitUntil: 'networkidle', timeout: 30000 })

    // Dismiss cookie banner if present
    try {
      const cookieBtn = page.locator('button:has-text("Accept")')
      await cookieBtn.click({ timeout: 3000 })
      console.log('Dismissed cookie banner')
    } catch {
      // No cookie banner, continue
    }

    // Wait for restaurant list items
    await page.waitForSelector('.js-restaurant__list_item', { timeout: 15000 })
    console.log('Restaurant list loaded')

    // Scroll to bottom to trigger any lazy-loading
    await autoScroll(page)
    // Brief pause for any final renders
    await page.waitForTimeout(1000)

    // Extract restaurant data from list items
    const restaurants = await page.$$eval('.js-restaurant__list_item', (items) => {
      return items.map((el) => {
        // Coordinates are on the card div itself
        const lat = parseFloat(el.getAttribute('data-lat'))
        const lng = parseFloat(el.getAttribute('data-lng'))
        const michelinId = el.getAttribute('data-id') || ''

        // Name and URL from the title link
        const titleLink = el.querySelector('.card__menu-content--title a')
        const name = titleLink?.textContent?.trim() || ''
        const url = titleLink?.getAttribute('href') || ''

        // Distinction from data attribute on inner element (e.g. ONE_STAR, BIB_GOURMAND, or empty)
        const innerEl = el.querySelector('[data-dtm-distinction]')
        const rawDistinction = innerEl?.getAttribute('data-dtm-distinction') || ''

        // Cuisine and price from visible footer text (e.g. "$$$$ · American")
        const footerEls = el.querySelectorAll('.card__menu-footer--score')
        let cuisine = ''
        let priceLevel = null
        if (footerEls.length >= 2) {
          const footerText = footerEls[1].textContent.trim()
          const parts = footerText.split('·').map(s => s.trim())
          if (parts.length === 2) {
            priceLevel = parts[0] || null
            cuisine = parts[1]
          } else if (parts.length === 1) {
            // No price, just cuisine
            cuisine = parts[0]
          }
        }

        // Green star from distinction icon area
        const greenStar = !!el.querySelector('img[src*="green-star"]')

        return { michelinId, name, latitude: lat, longitude: lng, cuisine, priceLevel, rawDistinction, greenStar, url }
      })
    })

    console.log(`Extracted ${restaurants.length} raw entries`)

    // Filter out entries with invalid coordinates
    const valid = restaurants.filter(
      (r) => !isNaN(r.latitude) && !isNaN(r.longitude) && r.name
    )
    console.log(`${valid.length} entries with valid coordinates`)

    // Map raw distinction codes to display names, ensure absolute URLs
    for (const r of valid) {
      r.distinction = DISTINCTION_MAP[r.rawDistinction] || 'Selected'
      delete r.rawDistinction

      if (r.url && !r.url.startsWith('http')) {
        r.url = `https://guide.michelin.com${r.url}`
      }
    }

    // Sort by distinction tier, then name
    valid.sort((a, b) => {
      const tierA = DISTINCTION_ORDER[a.distinction] ?? 99
      const tierB = DISTINCTION_ORDER[b.distinction] ?? 99
      if (tierA !== tierB) return tierA - tierB
      return a.name.localeCompare(b.name)
    })

    const output = {
      fetchedAt: new Date().toISOString(),
      source: SOURCE_URL,
      count: valid.length,
      restaurants: valid,
    }

    const outDir = new URL('../src/data/', import.meta.url).pathname
    const outPath = new URL('../src/data/michelin.json', import.meta.url).pathname
    mkdirSync(outDir, { recursive: true })
    writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n')

    console.log(`Done: ${valid.length} restaurants written to ${outPath}`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
