import { useEffect, useRef } from 'react'

const MAPKIT_TOKEN = import.meta.env.VITE_MAPKIT_TOKEN

// Default center: Austin, TX
const DEFAULT_CENTER = { latitude: 30.3500, longitude: -97.7431 }
const DEFAULT_ZOOM_LEVEL = 10

// Convert zoom level to MapKit span (approximate degrees visible)
function zoomToSpan(zoom) {
  return 360 / Math.pow(2, zoom)
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
        showsZoomControl: true,
        showsMapTypeControl: true,
        isScrollEnabled: true,
        isZoomEnabled: true,
        isRotationEnabled: false,
      })

      mapInstanceRef.current = map

      // Add resolved restaurants as native PlaceAnnotations
      const resolved = restaurants.filter((r) => r.mapkitPlaceId)
      if (resolved.length > 0) {
        const lookup = new mapkit.PlaceLookup()
        resolved.forEach((r) => {
          if (cancelled) return
          lookup.getPlace(r.mapkitPlaceId, (error, place) => {
            if (cancelled || error || !place) return
            map.addAnnotation(new mapkit.PlaceAnnotation(place))
          })
        })
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
