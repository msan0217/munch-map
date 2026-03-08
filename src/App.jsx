import { useState } from 'react'
import Sidebar from './components/Sidebar'
import MapView from './components/MapView'
import googleTopRated from './data/google-top-rated.json'
import monchLogo from './assets/monch.jpeg'

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile layout */}
      <div className="relative w-screen h-screen md:hidden">
        <MapView restaurants={googleTopRated.restaurants} />

        {/* Top bar */}
        <div
          className="absolute top-0 left-0 right-0 bg-gray-900 text-white px-4 py-3 flex items-center justify-between cursor-pointer"
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="text-xl leading-none">☰</span>
          <div className="flex items-center gap-2">
            <img src={monchLogo} alt="MunchMap logo" className="w-6 h-6 rounded-full object-cover object-top" />
            <span className="text-base font-bold tracking-tight">MunchMap</span>
          </div>
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
          <MapView restaurants={googleTopRated.restaurants} />
        </div>
      </div>
    </>
  )
}

export default App
