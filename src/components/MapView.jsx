import { useEffect, useRef, useState } from 'react'
import { AUSTIN_CENTER, AUSTIN_RADIUS_KM } from '../config/austin.js'

const MAPKIT_TOKEN = import.meta.env.VITE_MAPKIT_TOKEN

const DEFAULT_CENTER = { latitude: AUSTIN_CENTER.lat, longitude: AUSTIN_CENTER.lng }
const DEFAULT_ZOOM_LEVEL = 10

// --- Layer color palette ---
const COLORS = {
  google: '#FF6B6B',
  googleBg: '#FFF0F0',
  michelinStar: '#D4A017',
  michelinStarBg: '#FFF8E1',
  michelinBib: '#E8711A',
  michelinBibBg: '#FFF3E8',
  michelinSelected: '#6B7280',
  michelinSelectedBg: '#F3F4F6',
}

// Michelin distinction config
const MICHELIN_STYLES = {
  '1 Star': { color: COLORS.michelinStar, bg: COLORS.michelinStarBg, glyph: '★', label: '1 Star' },
  '2 Stars': { color: COLORS.michelinStar, bg: COLORS.michelinStarBg, glyph: '★★', label: '2 Stars' },
  '3 Stars': { color: COLORS.michelinStar, bg: COLORS.michelinStarBg, glyph: '★★★', label: '3 Stars' },
  'Bib Gourmand': { color: COLORS.michelinBib, bg: COLORS.michelinBibBg, glyph: '𝐁', label: 'Bib Gourmand' },
  'Selected': { color: COLORS.michelinSelected, bg: COLORS.michelinSelectedBg, glyph: '◆', label: 'Selected' },
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

// --- Marker element factories ---

function createBadge(glyph, color, bg) {
  const badge = document.createElement('div')
  badge.style.cssText = `
    width: 28px; height: 28px; border-radius: 50%;
    background: ${bg}; border: 2.5px solid ${color};
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; line-height: 1; color: ${color};
    font-weight: 700; cursor: pointer;
    box-shadow: 0 1px 4px rgba(0,0,0,0.18);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  `
  badge.textContent = glyph
  badge.addEventListener('mouseenter', () => {
    badge.style.transform = 'scale(1.15)'
    badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)'
  })
  badge.addEventListener('mouseleave', () => {
    badge.style.transform = 'scale(1)'
    badge.style.boxShadow = '0 1px 4px rgba(0,0,0,0.18)'
  })
  return badge
}

function createGoogleMarker() {
  return createBadge('🍴', COLORS.google, COLORS.googleBg)
}

function createMichelinMarker(distinction) {
  const style = MICHELIN_STYLES[distinction] || MICHELIN_STYLES['Selected']
  return createBadge(style.glyph, style.color, style.bg)
}

function createDualMarker(distinction) {
  const container = document.createElement('div')
  container.style.cssText = `
    display: flex; align-items: center; gap: 0px;
    cursor: pointer; position: relative;
  `

  // Pill background connecting both badges
  const pill = document.createElement('div')
  pill.style.cssText = `
    position: absolute; inset: -2px; border-radius: 18px;
    background: white; box-shadow: 0 1px 6px rgba(0,0,0,0.15);
    z-index: 0;
  `
  container.appendChild(pill)

  const googleBadge = createBadge('🍴', COLORS.google, COLORS.googleBg)
  googleBadge.style.position = 'relative'
  googleBadge.style.zIndex = '1'
  googleBadge.style.boxShadow = 'none'
  googleBadge.style.marginRight = '-4px'

  const style = MICHELIN_STYLES[distinction] || MICHELIN_STYLES['Selected']
  const michelinBadge = createBadge(style.glyph, style.color, style.bg)
  michelinBadge.style.position = 'relative'
  michelinBadge.style.zIndex = '1'
  michelinBadge.style.boxShadow = 'none'

  container.appendChild(googleBadge)
  container.appendChild(michelinBadge)

  container.addEventListener('mouseenter', () => {
    pill.style.boxShadow = '0 2px 10px rgba(0,0,0,0.22)'
    container.style.transform = 'scale(1.1)'
  })
  container.addEventListener('mouseleave', () => {
    pill.style.boxShadow = '0 1px 6px rgba(0,0,0,0.15)'
    container.style.transform = 'scale(1)'
  })
  container.style.transition = 'transform 0.15s ease'

  return container
}

// --- Callout element ---

function createCalloutElement(item) {
  const el = document.createElement('div')
  el.style.cssText = `
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
    min-width: 220px; max-width: 300px; padding: 14px 16px;
    background: white; border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  `

  // Name
  const name = document.createElement('div')
  name.style.cssText = 'font-weight: 600; font-size: 15px; margin-bottom: 6px; color: #1d1d1f;'
  name.textContent = item.name
  el.appendChild(name)

  // Source badges row
  const badges = document.createElement('div')
  badges.style.cssText = 'display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;'

  if (item.google) {
    const gBadge = document.createElement('span')
    gBadge.style.cssText = `
      font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px;
      background: ${COLORS.googleBg}; color: ${COLORS.google}; border: 1px solid ${COLORS.google};
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
      background: ${style.bg}; color: ${style.color}; border: 1px solid ${style.color};
    `
    mBadge.textContent = `${style.glyph} ${style.label}`
    badges.appendChild(mBadge)
  }

  el.appendChild(badges)

  // Details
  const details = document.createElement('div')
  details.style.cssText = 'font-size: 12px; color: #6e6e73; margin-bottom: 8px;'

  const parts = []
  if (item.michelin?.cuisine) parts.push(item.michelin.cuisine)
  if (item.michelin?.priceLevel) parts.push(item.michelin.priceLevel)
  if (item.google?.address) parts.push(item.google.address)

  details.textContent = parts.join(' · ')
  if (parts.length) el.appendChild(details)

  // Links
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
  const annotationsRef = useRef([]) // { annotation, sources }
  const [mapReady, setMapReady] = useState(false)

  // Init map once
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

    let cancelled = false

    loadMapKit().then((mapkit) => {
      if (cancelled) return

      if (!mapkit.initialized) {
        mapkit.init({
          authorizationCallback: (done) => done(MAPKIT_TOKEN),
        })
        mapkit.initialized = true
      }

      const span = zoomToSpan(DEFAULT_ZOOM_LEVEL)
      const map = new mapkit.Map(mapContainerRef.current, {
        center: new mapkit.Coordinate(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude),
        region: new mapkit.CoordinateRegion(
          new mapkit.Coordinate(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude),
          new mapkit.CoordinateSpan(span, span)
        ),
        mapType: mapkit.Map.MapTypes.Standard,
        showsCompass: mapkit.FeatureVisibility.Visible,
        showsZoomControl: true,
        showsMapTypeControl: false,
        isScrollEnabled: true,
        isZoomEnabled: true,
        isRotationEnabled: false,
        cameraBoundary: austinCameraBoundary(mapkit),
        cameraZoomRange: new mapkit.CameraZoomRange(0, AUSTIN_RADIUS_KM * 1000 * 3),
      })

      map.padding = new mapkit.Padding({ top: 16, right: 16, bottom: 32, left: 16 })

      // Style clusters per group
      map.annotationForCluster = (clusterAnnotation) => {
        const id = clusterAnnotation.memberAnnotations[0]?.clusteringIdentifier
        const count = clusterAnnotation.memberAnnotations.length
        if (id === 'google') {
          clusterAnnotation.color = COLORS.google
          clusterAnnotation.glyphText = `${count}`
        } else if (id === 'michelin') {
          clusterAnnotation.color = COLORS.michelinStar
          clusterAnnotation.glyphText = `${count}`
        } else if (id === 'dual') {
          clusterAnnotation.color = '#8B5CF6'
          clusterAnnotation.glyphText = `${count}`
        }
      }

      mapInstanceRef.current = map
      setMapReady(true)
    })

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Add/update annotations when restaurants or layers change
  useEffect(() => {
    const map = mapInstanceRef.current
    const mapkit = window.mapkit
    if (!map || !mapkit) return

    // Defer DOM-heavy annotation swap to next frame to avoid
    // interfering with React's synchronous commit phase
    let cancelled = false
    const rafId = requestAnimationFrame(() => {
      if (cancelled) return

      // Remove all existing annotations
      try {
        const old = annotationsRef.current.map((a) => a.annotation)
        if (old.length) map.removeAnnotations(old)
      } catch {
        // map may have been destroyed between frames
      }
      annotationsRef.current = []

      if (cancelled) return

      const newAnnotations = []

      for (const item of restaurants) {
        const hasGoogle = item.sources.includes('google')
        const hasMichelin = item.sources.includes('michelin')
        const showGoogle = hasGoogle && layers.google
        const showMichelin = hasMichelin && layers.michelin

        if (!showGoogle && !showMichelin) continue

        const coord = new mapkit.Coordinate(item.latitude, item.longitude)
        const isDual = showGoogle && showMichelin

        let factory
        let clusterId

        if (isDual) {
          const distinction = item.michelin?.distinction
          factory = () => createDualMarker(distinction)
          clusterId = 'dual'
        } else if (showMichelin) {
          const distinction = item.michelin?.distinction
          factory = () => createMichelinMarker(distinction)
          clusterId = 'michelin'
        } else {
          factory = () => createGoogleMarker()
          clusterId = 'google'
        }

        const annotation = new mapkit.Annotation(coord, factory, {
          title: item.name,
          clusteringIdentifier: clusterId,
          callout: {
            calloutElementForAnnotation: () => createCalloutElement(item),
          },
        })

        newAnnotations.push({ annotation, sources: item.sources })
      }

      if (!cancelled) {
        map.addAnnotations(newAnnotations.map((a) => a.annotation))
        annotationsRef.current = newAnnotations
      }
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    }
  }, [restaurants, layers, mapReady])

  return (
    <div ref={mapContainerRef} className="w-full h-full relative" />
  )
}
