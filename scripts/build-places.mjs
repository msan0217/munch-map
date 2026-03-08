/**
 * Build MapKit place ID mapping from resolution output.
 *
 * Reads the resolution file (restaurants + mapkitPlaceId merged),
 * splits into:
 *   - src/data/mapkit-places.json  — { googlePlaceId: mapkitPlaceId } mapping
 *   - src/data/unresolved.json     — restaurants that failed resolution
 *
 * Usage:
 *   node scripts/build-places.mjs [resolution-file]
 *
 * Defaults to "src/data/restaurants mapkit.json" if no file is specified.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../src/data')

const inputPath = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(DATA_DIR, 'restaurants mapkit.json')

console.log(`Reading resolution file: ${inputPath}`)

const data = JSON.parse(readFileSync(inputPath, 'utf-8'))
const restaurants = data.restaurants

if (!restaurants || !restaurants.length) {
  console.error('No restaurants found in input file.')
  process.exit(1)
}

mkdirSync(DATA_DIR, { recursive: true })

// Build place ID mapping (googlePlaceId → mapkitPlaceId)
const mapping = {}
const unresolvedList = []

for (const r of restaurants) {
  if (r.mapkitPlaceId) {
    mapping[r.placeId] = r.mapkitPlaceId
  } else {
    unresolvedList.push({
      placeId: r.placeId,
      name: r.name,
      address: r.address,
      latitude: r.latitude,
      longitude: r.longitude,
    })
  }
}

// Write mapping
const mappingPath = resolve(DATA_DIR, 'mapkit-places.json')
writeFileSync(mappingPath, JSON.stringify(mapping, null, 2) + '\n')
console.log(`Wrote ${Object.keys(mapping).length} place mappings to ${mappingPath}`)

// Write unresolved
const unresolvedPath = resolve(DATA_DIR, 'unresolved.json')
writeFileSync(unresolvedPath, JSON.stringify(unresolvedList, null, 2) + '\n')
console.log(`Wrote ${unresolvedList.length} unresolved restaurants to ${unresolvedPath}`)

console.log(`\nSummary: ${Object.keys(mapping).length} resolved, ${unresolvedList.length} unresolved out of ${restaurants.length} total`)
