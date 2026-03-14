/**
 * Fetch high-quality Austin restaurants from Google Places API (Text Search v2).
 *
 * Usage:
 *   node --env-file=.env scripts/fetch-google-top-rated.mjs
 *
 * Requires GOOGLE_PLACES_API_KEY in .env
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { AUSTIN_CENTER, AUSTIN_RADIUS_KM, SEARCH_RADIUS_KM, GRID_SPACING_KM, generateGridPoints } from '../src/config/austin.js'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY
if (!API_KEY) {
  console.error('Missing GOOGLE_PLACES_API_KEY environment variable')
  process.exit(1)
}

// Austin center and search parameters
const CENTER = AUSTIN_CENTER
const COVERAGE_RADIUS_KM = AUSTIN_RADIUS_KM
const SEARCH_RADIUS_M = SEARCH_RADIUS_KM * 1000
const MIN_RATING = 4.5
const MIN_REVIEWS = 100
const REQUEST_DELAY_MS = 150
const EXCLUDED_PRIMARY_TYPES = new Set([
  'movie_theater',
  'hotel',
  'bar',
  'shopping_mall',
  'grocery_store',
  'convenience_store',
  'video_arcade',
  'adventure_sports_center',
  'association_or_organization',
  'marina',
  'asian_grocery_store',
  'live_music_venue',
  'tourist_attraction',
  'event_venue',
])

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
  'nextPageToken',
].join(',')

async function textSearch(lat, lng, pageToken) {
  const body = {
    textQuery: 'restaurants',
    includedType: 'restaurant',
    minRating: MIN_RATING,
    rankPreference: 'RELEVANCE',
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: SEARCH_RADIUS_M,
      },
    },
    pageSize: 20,
  }

  if (pageToken) {
    body.pageToken = pageToken
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
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
    if (rating >= MIN_RATING && reviewCount >= MIN_REVIEWS && !EXCLUDED_PRIMARY_TYPES.has(place.primaryType)) {
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

  const outPath = new URL('../src/data/google-top-rated.json', import.meta.url).pathname
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
    let pageToken = null

    try {
      do {
        const data = await textSearch(lat, lng, pageToken)
        requestCount++

        if (data.places) {
          for (const place of data.places) {
            if (!allPlaces.has(place.id)) {
              allPlaces.set(place.id, place)
            }
          }
        }

        pageToken = data.nextPageToken ?? null
        if (pageToken) {
          await delay(REQUEST_DELAY_MS)
        }
      } while (pageToken)
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
      console.log(`  Searched ${i + 1}/${gridPoints.length} points, ${allPlaces.size} unique places so far (${requestCount} requests)`)
    }
  }

  console.log(`\nTotal API requests: ${requestCount}`)
  console.log(`Total unique places found: ${allPlaces.size}`)
  saveResults(allPlaces, { partial: false })
}

main()
