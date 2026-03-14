import { useState, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import MapView from './components/MapView'
import MapLegend from './components/MapLegend'
import googleTopRated from './data/google-top-rated.json'
import michelinData from './data/michelin.json'
import { mergeRestaurants } from './utils/mergeRestaurants.js'
import monchLogo from './assets/monch.jpeg'

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [layers, setLayers] = useState({
    google: true,
    michelin: true,
    michelinFilters: { '1 Star': true, 'Bib Gourmand': true, 'Selected': true },
  })

  const merged = useMemo(
    () => mergeRestaurants(googleTopRated.restaurants, michelinData.restaurants),
    []
  )

  function handleToggleLayer(layer, enabled) {
    setLayers((prev) => ({ ...prev, [layer]: enabled }))
  }

  function handleToggleMichelinFilter(distinction, enabled) {
    setLayers((prev) => ({
      ...prev,
      michelinFilters: { ...prev.michelinFilters, [distinction]: enabled },
    }))
  }

  return (
    <div className="relative w-screen h-[100dvh] flex flex-col md:flex-row overflow-hidden">
      {/* Mobile top bar */}
      <div
        className="md:hidden bg-gray-900 text-white px-4 py-3 flex items-center justify-between cursor-pointer shrink-0 z-20"
        onClick={() => setMobileMenuOpen(true)}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <rect x="2" y="4" width="18" height="2" rx="1" fill="currentColor" />
            <rect x="2" y="10" width="18" height="2" rx="1" fill="currentColor" />
            <rect x="2" y="16" width="18" height="2" rx="1" fill="currentColor" />
          </svg>
        <div className="flex items-center gap-2">
          <img src={monchLogo} alt="MunchMap logo" className="w-6 h-6 rounded-full object-cover object-top" />
          <span className="text-base font-bold tracking-tight">MunchMap</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:block w-1/5 min-w-[240px] max-w-[320px] shrink-0">
        <Sidebar layers={layers} onToggleLayer={handleToggleLayer} onToggleMichelinFilter={handleToggleMichelinFilter} />
      </div>

      {/* Map (single instance) */}
      <div className="flex-1 relative min-h-0">
        <MapView restaurants={merged} layers={layers} />
        <MapLegend layers={layers} />
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="absolute inset-0 z-50 md:hidden">
          <Sidebar
            onClose={() => setMobileMenuOpen(false)}
            layers={layers}
            onToggleLayer={handleToggleLayer}
            onToggleMichelinFilter={handleToggleMichelinFilter}
          />
        </div>
      )}
    </div>
  )
}

export default App
