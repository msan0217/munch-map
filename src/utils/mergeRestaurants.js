import { AUSTIN_CENTER, AUSTIN_RADIUS_KM } from '../config/austin.js'

// Haversine distance in km between two lat/lng points
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Normalize name for fuzzy matching
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Merge Google and Michelin datasets into a unified list.
 * Each entry has: { google, michelin, sources: ['google'|'michelin'], latitude, longitude }
 */
export function mergeRestaurants(googleList, michelinList) {
  // Filter Michelin to only Austin-area restaurants
  const filteredMichelin = michelinList.filter(
    (r) =>
      haversineKm(AUSTIN_CENTER.lat, AUSTIN_CENTER.lng, r.latitude, r.longitude) <
      AUSTIN_RADIUS_KM
  )

  const merged = []
  const matchedMichelinIds = new Set()

  // Start with Google restaurants, try to find Michelin matches
  for (const g of googleList) {
    const gNorm = normalizeName(g.name)
    let match = null

    for (const m of filteredMichelin) {
      if (matchedMichelinIds.has(m.michelinId)) continue

      const mNorm = normalizeName(m.name)
      const nameMatch = gNorm === mNorm || gNorm.includes(mNorm) || mNorm.includes(gNorm)
      const dist = haversineKm(g.latitude, g.longitude, m.latitude, m.longitude)

      if (nameMatch && dist < 1.0) {
        match = m
        break
      }
    }

    if (match) {
      matchedMichelinIds.add(match.michelinId)
      merged.push({
        sources: ['google', 'michelin'],
        google: g,
        michelin: match,
        latitude: g.latitude,
        longitude: g.longitude,
        name: g.name,
      })
    } else {
      merged.push({
        sources: ['google'],
        google: g,
        michelin: null,
        latitude: g.latitude,
        longitude: g.longitude,
        name: g.name,
      })
    }
  }

  // Add unmatched Michelin restaurants
  for (const m of filteredMichelin) {
    if (!matchedMichelinIds.has(m.michelinId)) {
      merged.push({
        sources: ['michelin'],
        google: null,
        michelin: m,
        latitude: m.latitude,
        longitude: m.longitude,
        name: m.name,
      })
    }
  }

  return merged
}
