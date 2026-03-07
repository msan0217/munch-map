import { useEffect, useRef } from 'react'

const MAPKIT_TOKEN = import.meta.env.VITE_MAPKIT_TOKEN

// Default center: Austin, TX
const DEFAULT_CENTER = { latitude: 30.3500, longitude: -97.7431 }
const DEFAULT_ZOOM_LEVEL = 10

// Convert zoom level to MapKit span (approximate degrees visible)
function zoomToSpan(zoom) {
  return 360 / Math.pow(2, zoom)
}

function createCalloutElement(restaurant) {
  const el = document.createElement('div')
  el.style.cssText = 'font-family: system-ui, sans-serif; min-width: 200px; max-width: 280px; padding: 12px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);'

  const name = document.createElement('div')
  name.style.cssText = 'font-weight: 600; font-size: 14px; margin-bottom: 4px;'
  name.textContent = restaurant.name
  el.appendChild(name)

  const meta = document.createElement('div')
  meta.style.cssText = 'font-size: 12px; color: #555; margin-bottom: 4px;'
  const stars = '★'.repeat(Math.floor(restaurant.rating)) + (restaurant.rating % 1 >= 0.5 ? '½' : '')
  meta.textContent = `${stars} ${restaurant.rating} (${restaurant.reviewCount.toLocaleString()} reviews)`
  el.appendChild(meta)

  if (restaurant.address) {
    const addr = document.createElement('a')
    addr.href = `https://maps.apple.com/?ll=${restaurant.latitude},${restaurant.longitude}&q=${encodeURIComponent(restaurant.name)}`
    addr.target = '_blank'
    addr.rel = 'noopener noreferrer'
    addr.style.cssText = 'font-size: 11px; color: #777; margin-bottom: 6px; display: block; text-decoration: none;'
    addr.textContent = restaurant.address
    el.appendChild(addr)
  }

  const links = document.createElement('div')
  links.style.cssText = 'display: flex; gap: 8px; font-size: 12px;'
  if (restaurant.googleMapsUrl) {
    const gLink = document.createElement('a')
    gLink.href = restaurant.googleMapsUrl
    gLink.target = '_blank'
    gLink.rel = 'noopener noreferrer'
    gLink.style.cssText = 'color: #1a73e8; text-decoration: none;'
    gLink.textContent = 'Google Maps'
    links.appendChild(gLink)
  }
  if (restaurant.websiteUrl) {
    const wLink = document.createElement('a')
    wLink.href = restaurant.websiteUrl
    wLink.target = '_blank'
    wLink.rel = 'noopener noreferrer'
    wLink.style.cssText = 'color: #1a73e8; text-decoration: none;'
    wLink.textContent = 'Website'
    links.appendChild(wLink)
  }
  el.appendChild(links)

  return el
}

export default function MapView({ restaurants = [] }) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    // Load MapKit JS script dynamically if not already loaded
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

      // Initialize MapKit with token (only once)
      if (!mapkit.initialized) {
        mapkit.init({
          authorizationCallback: (done) => {
            done(MAPKIT_TOKEN)
          },
        })
        mapkit.initialized = true
      }

      // Create the map instance
      const span = zoomToSpan(DEFAULT_ZOOM_LEVEL)
      const map = new mapkit.Map(mapContainerRef.current, {
        center: new mapkit.Coordinate(
          DEFAULT_CENTER.latitude,
          DEFAULT_CENTER.longitude
        ),
        region: new mapkit.CoordinateRegion(
          new mapkit.Coordinate(
            DEFAULT_CENTER.latitude,
            DEFAULT_CENTER.longitude
          ),
          new mapkit.CoordinateSpan(span, span)
        ),
        showsCompass: mapkit.FeatureVisibility.Visible,
        showsZoomControl: true,
        showsMapTypeControl: true,
        isScrollEnabled: true,
        isZoomEnabled: true,
        isRotationEnabled: true,
      })

      mapInstanceRef.current = map

      // Add restaurant markers
      if (restaurants.length > 0) {
        const annotations = restaurants.map((r) => {
          const coord = new mapkit.Coordinate(r.latitude, r.longitude)
          const annotation = new mapkit.MarkerAnnotation(coord, {
            color: '#e53e3e',
            glyphText: '🍴',
            title: r.name,
            clusteringIdentifier: 'restaurant',
            callout: {
              calloutElementForAnnotation: () => createCalloutElement(r),
            },
          })
          return annotation
        })
        map.addAnnotations(annotations)
      }
    })

    // Cleanup on unmount
    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
  }, [restaurants])

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
    />
  )
}
