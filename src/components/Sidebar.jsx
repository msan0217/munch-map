import monchLogo from '../assets/monch.jpeg'

export default function Sidebar({ onClose }) {
  return (
    <aside className="w-full h-full bg-gray-900 text-white p-6 flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={monchLogo} alt="MunchMap logo" className="w-8 h-8 rounded-full object-cover object-top" />
          <h1 className="text-2xl font-bold tracking-tight">MunchMap</h1>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none cursor-pointer"
            aria-label="Close menu"
          >
            ✕
          </button>
        )}
      </div>
      <hr className="border-gray-700" />

      <h2 className="text-lg font-semibold text-gray-300">Options</h2>

      <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors cursor-pointer">
        Add Filter
      </button>

      <button className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors cursor-pointer">
        Search Nearby
      </button>

      <button className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors cursor-pointer">
        Saved Places
      </button>

      <div className="mt-auto text-xs text-gray-500">
        MunchMap v0.1
      </div>
    </aside>
  )
}
