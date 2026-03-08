import monchLogo from '../assets/monch.jpeg'

function LayerToggle({ label, sublabel, color, glyph, enabled, onChange }) {
  return (
    <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/60 hover:bg-gray-800 transition-colors cursor-pointer select-none">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2 transition-opacity"
        style={{
          borderColor: color,
          background: enabled ? color + '22' : 'transparent',
          color: color,
          opacity: enabled ? 1 : 0.35,
        }}
      >
        {glyph}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white leading-tight">{label}</div>
        {sublabel && (
          <div className="text-xs text-gray-400 leading-tight">{sublabel}</div>
        )}
      </div>
      <div
        className="relative w-10 h-[22px] rounded-full transition-colors shrink-0"
        style={{ background: enabled ? color : '#4B5563' }}
      >
        <div
          className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all"
          style={{ left: enabled ? '20px' : '2px' }}
        />
      </div>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </label>
  )
}

export default function Sidebar({ onClose, layers, onToggleLayer }) {
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

      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Layers</h2>

      <div className="flex flex-col gap-2">
        <LayerToggle
          label="Google Top-Rated"
          sublabel="4.5+ stars, 100+ reviews"
          color="#FF6B6B"
          glyph="🍴"
          enabled={layers.google}
          onChange={(v) => onToggleLayer('google', v)}
        />
        <LayerToggle
          label="Michelin Guide"
          sublabel="Stars, Bib Gourmand, Selected"
          color="#D4A017"
          glyph="★"
          enabled={layers.michelin}
          onChange={(v) => onToggleLayer('michelin', v)}
        />
      </div>

      <hr className="border-gray-700" />

      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</h2>

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
