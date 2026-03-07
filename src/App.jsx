import { useState } from 'react'
import Sidebar from './components/Sidebar'
import MapView from './components/MapView'
import restaurantData from './data/restaurants.json'

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile layout */}
      <div className="relative w-screen h-screen md:hidden">
        <MapView restaurants={restaurantData.restaurants} />

        {/* Bottom sheet bar */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-gray-900 text-white px-4 py-3 flex items-center gap-2 cursor-pointer"
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="text-lg leading-none">☰</span>
          <span className="text-sm font-medium">Options</span>
        </div>

        {/* Full-screen menu overlay */}
        {mobileMenuOpen && (
          <div className="absolute inset-0 z-50">
            <Sidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex h-screen w-screen overflow-hidden">
        <div className="w-1/5 min-w-[240px] max-w-[320px] shrink-0">
          <Sidebar />
        </div>
        <div className="flex-1">
          <MapView restaurants={restaurantData.restaurants} />
        </div>
      </div>
    </>
  )
}

export default App
