import { LEGEND_ITEMS } from '../config/markerStyles.js'

function PinIcon({ color, glyph }) {
  return (
    <svg width="18" height="24" viewBox="0 0 18 24" className="shrink-0">
      <path
        d="M9 0C4.03 0 0 3.58 0 8c0 5.25 9 16 9 16s9-10.75 9-16c0-4.42-4.03-8-9-8z"
        fill={color}
      />
      <text
        x="9"
        y="9"
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={glyph.length > 2 ? '6' : '8'}
        fontWeight="700"
        fontFamily="-apple-system,system-ui,sans-serif"
      >
        {glyph}
      </text>
    </svg>
  )
}

export default function MapLegend({ layers = {} }) {
  const visibleItems = LEGEND_ITEMS.filter((item) =>
    item.sources.every((source) => layers[source])
  )

  if (visibleItems.length === 0) return null

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-md rounded-xl shadow-lg px-3 py-2.5 flex flex-col gap-1 pointer-events-auto">
      {visibleItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <PinIcon color={item.color} glyph={item.glyph} />
          <span className="text-[11px] font-medium text-gray-700 leading-tight whitespace-nowrap">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
