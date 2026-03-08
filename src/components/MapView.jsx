import { useEffect, useRef, useState } from 'react'
import { AUSTIN_CENTER, AUSTIN_RADIUS_KM } from '../config/austin.js'
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

function austinCameraBoundary(mapkit) {
  const kmPerDegreeLat = 111.32
  const kmPerDegreeLng = 111.32 * Math.cos((AUSTIN_CENTER.lat * Math.PI) / 180)
  const latSpan = (AUSTIN_RADIUS_KM / kmPerDegreeLat) * 2
  const lngSpan = (AUSTIN_RADIUS_KM / kmPerDegreeLng) * 2
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

      map.padding = new mapkit.Padding({ top: 16, right: 16, bottom: 32, left: 16 })

      // Native cluster styling — modify the MarkerAnnotation in-place
      map.annotationForCluster = (clusterAnnotation) => {
        const members = clusterAnnotation.memberAnnotations
        const count = members.length

        let hasGoogle = false
        let hasMichelin = false
        for (const m of members) {
          const t = m.data?.sourceType
          if (t === 'google' || t === 'dual') hasGoogle = true
          if (t === 'michelin' || t === 'dual') hasMichelin = true
          if (hasGoogle && hasMichelin) break
        }

        if (hasGoogle && hasMichelin) {
          clusterAnnotation.color = COLORS.dual
        } else if (hasMichelin) {
          clusterAnnotation.color = COLORS.michelinStar
        } else {
          clusterAnnotation.color = COLORS.google
        }

        clusterAnnotation.glyphText = `${count}`
        clusterAnnotation.displayPriority = 750
        return clusterAnnotation
      }

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
      const showMichelin = hasMichelin && layers.michelin

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
