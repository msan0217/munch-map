/**
 * Fetch high-quality Austin restaurants from Google Places API (Nearby Search v2).
 *
 * Usage:
 *   node --env-file=.env scripts/fetch-restaurants.mjs
 *
 * Requires GOOGLE_PLACES_API_KEY in .env
 */

import { writeFileSync, mkdirSync } from 'node:fs'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY
if (!API_KEY) {
  console.error('Missing GOOGLE_PLACES_API_KEY environment variable')
  process.exit(1)
}

// Austin center and search parameters
const CENTER = { lat: 30.3500, lng: -97.7431 }
const COVERAGE_RADIUS_KM = 40
const SEARCH_RADIUS_M = 5000
const GRID_SPACING_KM = 8
const MIN_RATING = 4.5
const MIN_REVIEWS = 100
const REQUEST_DELAY_MS = 1000

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.formattedAddress',
  'places.primaryType',
  'places.types',
  'places.googleMapsUri',
  'places.websiteUri',
].join(',')

// Nearby Search (New) returns max 20 results per call and does NOT support pagination.
// We rely on the dense grid to get coverage instead.

function generateGridPoints(center, radiusKm, spacingKm) {
  const points = []
  const kmPerDegreeLat = 111.32
  const kmPerDegreeLng = 111.32 * Math.cos((center.lat * Math.PI) / 180)

  const rowSpacing = spacingKm * (Math.sqrt(3) / 2)
  const maxRows = Math.ceil(radiusKm / rowSpacing)
  const maxCols = Math.ceil(radiusKm / spacingKm)

  for (let row = -maxRows; row <= maxRows; row++) {
    const latOffset = (row * rowSpacing) / kmPerDegreeLat
    const lat = center.lat + latOffset

    for (let col = -maxCols; col <= maxCols; col++) {
      const colOffset = (col * spacingKm + (Math.abs(row) % 2 === 1 ? spacingKm / 2 : 0)) / kmPerDegreeLng
      const lng = center.lng + colOffset

      const distKm = Math.sqrt(
        Math.pow((lat - center.lat) * kmPerDegreeLat, 2) +
        Math.pow((lng - center.lng) * kmPerDegreeLng, 2)
      )
      if (distKm <= radiusKm) {
        points.push({ lat, lng })
      }
    }
  }

  return points
}

async function searchNearby(lat, lng) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: ['restaurant'],
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: SEARCH_RADIUS_M,
        },
      },
      maxResultCount: 20,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    const err = new Error(`API error ${res.status}: ${text}`)
    err.status = res.status
    throw err
  }

  return res.json()
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function saveResults(allPlaces, { partial }) {
  const filtered = []
  for (const place of allPlaces.values()) {
    const rating = place.rating ?? 0
    const reviewCount = place.userRatingCount ?? 0
    if (rating >= MIN_RATING && reviewCount >= MIN_REVIEWS) {
      filtered.push({
        placeId: place.id,
        name: place.displayName?.text ?? '',
        latitude: place.location?.latitude,
        longitude: place.location?.longitude,
        rating,
        reviewCount,
        priceLevel: place.priceLevel ?? null,
        address: place.formattedAddress ?? '',
        primaryType: place.primaryType ?? null,
        types: place.types ?? [],
        googleMapsUrl: place.googleMapsUri ?? null,
        websiteUrl: place.websiteUri ?? null,
      })
    }
  }

  filtered.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)

  const output = {
    fetchedAt: new Date().toISOString(),
    ...(partial && { partial: true }),
    count: filtered.length,
    restaurants: filtered,
  }

  const outPath = new URL('../src/data/restaurants.json', import.meta.url).pathname
  mkdirSync(new URL('../src/data/', import.meta.url).pathname, { recursive: true })
  writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n')

  const label = partial ? 'Partial save' : 'Done'
  console.log(`${label}: ${filtered.length} restaurants (>= ${MIN_RATING} stars, >= ${MIN_REVIEWS} reviews) written to ${outPath}`)
}

async function main() {
  const gridPoints = generateGridPoints(CENTER, COVERAGE_RADIUS_KM, GRID_SPACING_KM)
  console.log(`Generated ${gridPoints.length} grid search points`)

  const allPlaces = new Map()
  let requestCount = 0

  for (let i = 0; i < gridPoints.length; i++) {
    const { lat, lng } = gridPoints[i]

    try {
      const data = await searchNearby(lat, lng)
      requestCount++
      if (data.places) {
        for (const place of data.places) {
          if (!allPlaces.has(place.id)) {
            allPlaces.set(place.id, place)
          }
        }
      }
    } catch (err) {
      console.error(`Error at point ${i} (${lat.toFixed(4)}, ${lng.toFixed(4)}): ${err.message}`)
      if (err.status === 400 || err.status === 401 || err.status === 403) {
        console.error('Fatal: non-retryable error.')
        if (allPlaces.size > 0) {
          console.log(`Saving partial results (${i}/${gridPoints.length} points searched, ${allPlaces.size} unique places)...`)
          saveResults(allPlaces, { partial: true })
        }
        process.exit(1)
      }
    }

    await delay(REQUEST_DELAY_MS)

    if ((i + 1) % 10 === 0) {
      console.log(`  Searched ${i + 1}/${gridPoints.length} points, ${allPlaces.size} unique places so far`)
    }
  }

  console.log(`\nTotal API requests: ${requestCount}`)
  console.log(`Total unique places found: ${allPlaces.size}`)
  saveResults(allPlaces, { partial: false })
}

main()
