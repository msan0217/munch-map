import Sidebar from './components/Sidebar'
import MapView from './components/MapView'

function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar — fixed 20% width, collapses to full width on small screens */}
      <div className="w-full md:w-1/5 md:min-w-[240px] md:max-w-[320px] shrink-0">
        <Sidebar />
      </div>

      {/* Map fills remaining space */}
      <div className="hidden md:block flex-1">
        <MapView />
      </div>
    </div>
  )
}

export default App
