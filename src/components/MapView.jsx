import { useEffect, useRef, useState } from 'react'
import { AUSTIN_CENTER, AUSTIN_RADIUS_KM, SEARCH_RADIUS_KM, GRID_SPACING_KM, generateGridPoints } from '../config/austin.js'
import { COLORS, GOOGLE_GLYPH, MICHELIN_STYLES } from '../config/markerStyles.js'

const MAPKIT_TOKEN = import.meta.env.VITE_MAPKIT_TOKEN

const DEFAULT_CENTER = { latitude: AUSTIN_CENTER.lat, longitude: AUSTIN_CENTER.lng }
const DEFAULT_ZOOM_LEVEL = 10

// --- SVG glyph images for dual-source markers ---
// Creates an SVG with two icons stacked vertically inside the balloon pin
const DUAL_GLYPH_CACHE = {}
function dualGlyphImage(michelinGlyph) {
  if (DUAL_GLYPH_CACHE[michelinGlyph]) return DUAL_GLYPH_CACHE[michelinGlyph]
  // Top: michelin glyph, Bottom: fork emoji (🍴 doesn't render in SVG, use ψ as fork)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <text x="14" y="9" text-anchor="middle" dominant-baseline="central"
      fill="white" font-family="-apple-system,system-ui,sans-serif"
      font-size="10" font-weight="700">${michelinGlyph}</text>
    <line x1="4" y1="14" x2="24" y2="14" stroke="rgba(255,255,255,0.35)" stroke-width="0.75"/>
    <text x="14" y="21" text-anchor="middle" dominant-baseline="central"
      fill="white" font-family="-apple-system,system-ui,sans-serif"
      font-size="11" font-weight="600">${GOOGLE_GLYPH}</text>
  </svg>`
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  const img = { 1: url, 2: url, 3: url }
  DUAL_GLYPH_CACHE[michelinGlyph] = img
  return img
}

// Compute the true coverage boundary — union of 5km circles at each hex grid point.
// For each angle from center, ray-march to find the farthest point still within
// SEARCH_RADIUS_KM of at least one grid point, then smooth to remove micro-notches.
function computeCoverageBoundary(mapkit) {
  const gridPoints = generateGridPoints(AUSTIN_CENTER, AUSTIN_RADIUS_KM, GRID_SPACING_KM)
  const kmPerDegreeLat = 111.32
  const kmPerDegreeLng = 111.32 * Math.cos((AUSTIN_CENTER.lat * Math.PI) / 180)
  const rSq = SEARCH_RADIUS_KM * SEARCH_RADIUS_KM

  // Step 1: Ray-cast to find raw boundary distances
  const N = 360
  const rawDistances = new Float64Array(N)

  for (let i = 0; i < N; i++) {
    const angle = (2 * Math.PI * i) / N
    const sinA = Math.sin(angle)
    const cosA = Math.cos(angle)

    let lo = 0
    let hi = AUSTIN_RADIUS_KM + SEARCH_RADIUS_KM + 1
    for (let iter = 0; iter < 20; iter++) {
      const mid = (lo + hi) / 2
      const testLat = AUSTIN_CENTER.lat + (mid * sinA) / kmPerDegreeLat
      const testLng = AUSTIN_CENTER.lng + (mid * cosA) / kmPerDegreeLng

      let covered = false
      for (const gp of gridPoints) {
        const dLat = (testLat - gp.lat) * kmPerDegreeLat
        const dLng = (testLng - gp.lng) * kmPerDegreeLng
        if (dLat * dLat + dLng * dLng <= rSq) {
          covered = true
          break
        }
      }

      if (covered) lo = mid
      else hi = mid
    }

    rawDistances[i] = lo
  }

  // Step 2: Smooth to remove hex-grid artifacts while preserving overall shape.
  // Moving-max (window=5) fills notches, then wide moving-avg (window=15) rounds bumps
  // into gentle undulations instead of visible hex-grid bulges.
  const MAX_WINDOW = 5
  const maxHalf = Math.floor(MAX_WINDOW / 2)
  const maxed = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    let m = 0
    for (let j = -maxHalf; j <= maxHalf; j++) {
      m = Math.max(m, rawDistances[(i + j + N) % N])
    }
    maxed[i] = m
  }

  const SMOOTH_WINDOW = 15
  const half = Math.floor(SMOOTH_WINDOW / 2)
  const smoothed = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    let sum = 0
    for (let j = -half; j <= half; j++) {
      sum += maxed[(i + j + N) % N]
    }
    smoothed[i] = sum / SMOOTH_WINDOW
  }

  // Step 3: Convert to MapKit coordinates
  return Array.from({ length: N }, (_, i) => {
    const angle = (2 * Math.PI * i) / N
    const r = smoothed[i]
    return new mapkit.Coordinate(
      AUSTIN_CENTER.lat + (r * Math.sin(angle)) / kmPerDegreeLat,
      AUSTIN_CENTER.lng + (r * Math.cos(angle)) / kmPerDegreeLng
    )
  })
}

function addQueryZoneOverlay(mapkit, map) {
  const boundary = computeCoverageBoundary(mapkit)

  // Outer rectangle wound clockwise (NW→NE→SE→SW) = winding −1
  const outer = [
    new mapkit.Coordinate(85, -179.9),
    new mapkit.Coordinate(85,  179.9),
    new mapkit.Coordinate(-85, 179.9),
    new mapkit.Coordinate(-85, -179.9),
  ]

  // Main dimming overlay outside the boundary
  const dimOverlay = new mapkit.PolygonOverlay([outer, boundary], {
    style: new mapkit.Style({
      fillColor: '#1a1a2e',
      fillOpacity: 0.15,
      lineWidth: 0,
      strokeOpacity: 0,
    }),
  })

  // Solid boundary stroke — thin and subtle, avoids accentuating micro-geometry
  const borderOverlay = new mapkit.PolygonOverlay([boundary], {
    style: new mapkit.Style({
      fillOpacity: 0,
      strokeColor: '#475569',
      strokeOpacity: 0.35,
      lineWidth: 1,
    }),
  })

  map.addOverlays([dimOverlay, borderOverlay])
}

function austinCameraBoundary(mapkit) {
  // Use 3x the data radius so users can freely zoom into edge markers
  // without being pushed back, while still preventing panning to other cities.
  const boundaryKm = AUSTIN_RADIUS_KM * 3
  const kmPerDegreeLat = 111.32
  const kmPerDegreeLng = 111.32 * Math.cos((AUSTIN_CENTER.lat * Math.PI) / 180)
  const latSpan = (boundaryKm / kmPerDegreeLat) * 2
  const lngSpan = (boundaryKm / kmPerDegreeLng) * 2
  return new mapkit.CoordinateRegion(
    new mapkit.Coordinate(AUSTIN_CENTER.lat, AUSTIN_CENTER.lng),
    new mapkit.CoordinateSpan(latSpan, lngSpan)
  )
}

function zoomToSpan(zoom) {
  return 360 / Math.pow(2, zoom)
}

// --- Callout element (only DOM we create — lazy, on-demand) ---

function createCalloutElement(item) {
  const el = document.createElement('div')
  el.style.cssText = `
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
    min-width: 220px; max-width: 300px; padding: 14px 16px;
    background: white; border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  `

  const name = document.createElement('div')
  name.style.cssText = 'font-weight: 600; font-size: 15px; margin-bottom: 6px; color: #1d1d1f;'
  name.textContent = item.name
  el.appendChild(name)

  const badges = document.createElement('div')
  badges.style.cssText = 'display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;'

  if (item.google) {
    const gBadge = document.createElement('span')
    gBadge.style.cssText = `
      font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px;
      background: #FFF0F0; color: ${COLORS.google}; border: 1px solid ${COLORS.google};
    `
    const stars = '★'.repeat(Math.floor(item.google.rating))
    gBadge.textContent = `${stars} ${item.google.rating} (${item.google.reviewCount.toLocaleString()})`
    badges.appendChild(gBadge)
  }

  if (item.michelin) {
    const style = MICHELIN_STYLES[item.michelin.distinction] || MICHELIN_STYLES['Selected']
    const mBadge = document.createElement('span')
    mBadge.style.cssText = `
      font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px;
      background: #FFF8E1; color: ${style.color}; border: 1px solid ${style.color};
    `
    mBadge.textContent = `${style.glyph} ${style.label}`
    badges.appendChild(mBadge)
  }

  el.appendChild(badges)

  const details = document.createElement('div')
  details.style.cssText = 'font-size: 12px; color: #6e6e73; margin-bottom: 8px;'
  const parts = []
  if (item.michelin?.cuisine) parts.push(item.michelin.cuisine)
  if (item.michelin?.priceLevel) parts.push(item.michelin.priceLevel)
  if (item.google?.address) parts.push(item.google.address)
  details.textContent = parts.join(' · ')
  if (parts.length) el.appendChild(details)

  const links = document.createElement('div')
  links.style.cssText = 'display: flex; gap: 10px; font-size: 12px; flex-wrap: wrap;'

  function addLink(href, text) {
    const a = document.createElement('a')
    a.href = href
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.style.cssText = 'color: #0071e3; text-decoration: none; font-weight: 500;'
    a.textContent = text
    a.addEventListener('mouseenter', () => (a.style.textDecoration = 'underline'))
    a.addEventListener('mouseleave', () => (a.style.textDecoration = 'none'))
    links.appendChild(a)
  }

  if (item.google?.googleMapsUrl) addLink(item.google.googleMapsUrl, 'Google Maps')
  if (item.google?.websiteUrl) addLink(item.google.websiteUrl, 'Website')
  if (item.michelin?.url) addLink(item.michelin.url, 'Michelin Guide')
  if (item.google) {
    addLink(
      `https://maps.apple.com/?ll=${item.latitude},${item.longitude}&q=${encodeURIComponent(item.name)}`,
      'Apple Maps'
    )
  }

  el.appendChild(links)
  return el
}

// --- Main component ---

export default function MapView({ restaurants = [], layers = { google: true, michelin: true } }) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)

  // Init map once — survives StrictMode double-fire by reusing existing map
  useEffect(() => {
    function loadMapKit() {
      return new Promise((resolve, reject) => {
        if (window.mapkit) {
          resolve(window.mapkit)
          return
        }
        const script = document.createElement('script')
        script.src = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js'
        script.crossOrigin = 'anonymous'
        script.onload = () => resolve(window.mapkit)
        script.onerror = () => reject(new Error('Failed to load MapKit JS'))
        document.head.appendChild(script)
      })
    }

    // If the map already exists (StrictMode remount), just signal ready
    if (mapInstanceRef.current) {
      setMapReady(true)
      return
    }

    let cancelled = false

    loadMapKit().then((mapkit) => {
      if (cancelled) return

      if (!mapkit.initialized) {
        mapkit.init({
          authorizationCallback: (done) => done(MAPKIT_TOKEN),
        })
        mapkit.initialized = true
      }

      // Guard against StrictMode creating duplicate maps
      if (mapInstanceRef.current) {
        setMapReady(true)
        return
      }

      const span = zoomToSpan(DEFAULT_ZOOM_LEVEL)
      const map = new mapkit.Map(mapContainerRef.current, {
        center: new mapkit.Coordinate(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude),
        region: new mapkit.CoordinateRegion(
          new mapkit.Coordinate(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude),
          new mapkit.CoordinateSpan(span, span)
        ),
        mapType: mapkit.Map.MapTypes.Standard,
        showsZoomControl: true,
        showsMapTypeControl: false,
        isScrollEnabled: true,
        isZoomEnabled: true,
        isRotationEnabled: false,
        cameraBoundary: austinCameraBoundary(mapkit),
        cameraZoomRange: new mapkit.CameraZoomRange(0, AUSTIN_RADIUS_KM * 1000 * 3),
      })

      map.padding = new mapkit.Padding({ top: 16, right: 16, bottom: 48, left: 16 })

      // Native cluster styling — modify the MarkerAnnotation in-place
      map.annotationForCluster = (clusterAnnotation) => {
        const members = clusterAnnotation.memberAnnotations
        const count = members.length

        let hasGoogle = false
        let hasMichelin = false
        let hasMichelinStar = false
        for (const m of members) {
          const t = m.data?.sourceType
          if (t === 'google' || t === 'dual') hasGoogle = true
          if (t === 'michelin' || t === 'dual') {
            hasMichelin = true
            const distinction = m.data?.item?.michelin?.distinction
            if (distinction === '1 Star' || distinction === '2 Stars' || distinction === '3 Stars') {
              hasMichelinStar = true
            }
          }
          if (hasGoogle && hasMichelin && hasMichelinStar) break
        }

        if (hasGoogle && hasMichelin) {
          clusterAnnotation.color = COLORS.dual
        } else if (hasMichelin) {
          clusterAnnotation.color = hasMichelinStar ? COLORS.michelinStar : COLORS.michelinBib
        } else {
          clusterAnnotation.color = COLORS.google
        }

        clusterAnnotation.glyphText = `${count}`
        clusterAnnotation.displayPriority = 750
        return clusterAnnotation
      }

      addQueryZoneOverlay(mapkit, map)

      mapInstanceRef.current = map
      setMapReady(true)
    })

    // Don't destroy map on StrictMode cleanup — it corrupts MapKit tile state.
    // Map will be destroyed when the component truly unmounts (page navigation).
    return () => {
      cancelled = true
    }
  }, [])

  // Add/update annotations when restaurants or layers change
  useEffect(() => {
    const map = mapInstanceRef.current
    const mapkit = window.mapkit
    if (!map || !mapkit) return

    // Clear all existing annotations (spread to avoid live-array mutation)
    try {
      const existing = [...map.annotations]
      if (existing.length) map.removeAnnotations(existing)
    } catch {
      // map may have been destroyed
    }

    const annotations = []

    for (const item of restaurants) {
      const hasGoogle = item.sources.includes('google')
      const hasMichelin = item.sources.includes('michelin')
      const showGoogle = hasGoogle && layers.google
      const showMichelin = hasMichelin && layers.michelin && layers.michelinFilters?.[item.michelin?.distinction] !== false

      if (!showGoogle && !showMichelin) continue

      const coord = new mapkit.Coordinate(item.latitude, item.longitude)
      const isDual = showGoogle && showMichelin

      let color, glyphText, glyphImage, sourceType

      if (isDual) {
        const style = MICHELIN_STYLES[item.michelin?.distinction] || MICHELIN_STYLES['Selected']
        color = COLORS.dual
        glyphImage = dualGlyphImage(style.glyph)
        glyphText = undefined
        sourceType = 'dual'
      } else if (showMichelin) {
        const style = MICHELIN_STYLES[item.michelin?.distinction] || MICHELIN_STYLES['Selected']
        color = style.color
        glyphText = style.glyph
        sourceType = 'michelin'
      } else {
        color = COLORS.google
        glyphText = GOOGLE_GLYPH
        sourceType = 'google'
      }

      const opts = {
        color,
        glyphText,
        title: item.name,
        clusteringIdentifier: 'restaurant',
        displayPriority: sourceType === 'dual' ? 350 : sourceType === 'michelin' ? 300 : 200,
        collisionMode: mapkit.Annotation.CollisionMode.Circle,
        data: { sourceType, item },
        callout: {
          calloutElementForAnnotation: () => createCalloutElement(item),
        },
      }

      if (glyphImage) {
        opts.glyphImage = glyphImage
        delete opts.glyphText
      }

      annotations.push(new mapkit.MarkerAnnotation(coord, opts))
    }

    map.addAnnotations(annotations)
  }, [restaurants, layers, mapReady])

  return (
    <div ref={mapContainerRef} className="w-full h-full relative" />
  )
}
