// Austin coverage area — shared between MapView and fetch scripts
export const AUSTIN_CENTER = { lat: 30.3500, lng: -97.7431 }
export const AUSTIN_RADIUS_KM = 20
// Google Places search radius per grid point (meters → km)
export const SEARCH_RADIUS_KM = 5
export const GRID_SPACING_KM = 5

// Hex grid used by the Google Places fetch script.
// Shared so the map overlay can render the true coverage boundary.
export function generateGridPoints(center, radiusKm, spacingKm) {
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

// Precomputed grid for coverage checks (avoids regenerating per-restaurant)
let _cachedGrid = null
function getGrid() {
  if (!_cachedGrid) _cachedGrid = generateGridPoints(AUSTIN_CENTER, AUSTIN_RADIUS_KM, GRID_SPACING_KM)
  return _cachedGrid
}

// Check if a lat/lng is within the actual Google search coverage area
// (within SEARCH_RADIUS_KM of any grid point)
export function isInCoverageArea(lat, lng) {
  const kmPerDegreeLat = 111.32
  const kmPerDegreeLng = 111.32 * Math.cos((AUSTIN_CENTER.lat * Math.PI) / 180)
  const rSq = SEARCH_RADIUS_KM * SEARCH_RADIUS_KM

  for (const gp of getGrid()) {
    const dLat = (lat - gp.lat) * kmPerDegreeLat
    const dLng = (lng - gp.lng) * kmPerDegreeLng
    if (dLat * dLat + dLng * dLng <= rSq) return true
  }
  return false
}
