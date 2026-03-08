const LEGEND_ITEMS = [
  { glyph: '🍴', color: '#FF6B6B', bg: '#FFF0F0', label: 'Google Top-Rated' },
  { glyph: '★', color: '#D4A017', bg: '#FFF8E1', label: 'Michelin Star' },
  { glyph: '𝐁', color: '#E8711A', bg: '#FFF3E8', label: 'Bib Gourmand' },
  { glyph: '◆', color: '#6B7280', bg: '#F3F4F6', label: 'Michelin Selected' },
]

export default function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-md rounded-xl shadow-lg px-3 py-2.5 flex flex-col gap-1.5 pointer-events-auto">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{
              background: item.bg,
              border: `2px solid ${item.color}`,
              color: item.color,
            }}
          >
            {item.glyph}
          </div>
          <span className="text-[11px] font-medium text-gray-700 leading-tight whitespace-nowrap">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
