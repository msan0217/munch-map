import { useEffect, useRef } from 'react'

const MAPKIT_TOKEN = import.meta.env.VITE_MAPKIT_TOKEN

// Default center: San Francisco
const DEFAULT_CENTER = { latitude: 37.7749, longitude: -122.4194 }
const DEFAULT_ZOOM_LEVEL = 12

// Convert zoom level to MapKit span (approximate degrees visible)
function zoomToSpan(zoom) {
  return 360 / Math.pow(2, zoom)
}

export default function MapView() {
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
    })

    // Cleanup on unmount
    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
    />
  )
}
