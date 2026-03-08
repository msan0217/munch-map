export const COLORS = {
  google: '#3fdf33ff',
  michelinStar: '#D4A017',
  michelinBib: '#E8711A',
  michelinSelected: '#E8711A',
  dual: '#8B5CF6',
}

export const GOOGLE_GLYPH = 'g'
export const DUAL_GLYPH = ''

export const MICHELIN_STYLES = {
  '1 Star':      { color: COLORS.michelinStar,     glyph: 'm★',   label: '1 Star' },
  '2 Stars':     { color: COLORS.michelinStar,     glyph: 'm★★',  label: '2 Stars' },
  '3 Stars':     { color: COLORS.michelinStar,     glyph: 'm★★★', label: '3 Stars' },
  'Bib Gourmand':{ color: COLORS.michelinBib,      glyph: 'm Bib',   label: 'Bib Gourmand' },
  'Selected':    { color: COLORS.michelinSelected, glyph: 'm',   label: 'Selected' },
}

export const LEGEND_ITEMS = [
  { glyph: GOOGLE_GLYPH,                          color: COLORS.google,           label: 'Google Top-Rated', sources: ['google'] },
  { glyph: MICHELIN_STYLES['1 Star'].glyph,       color: COLORS.michelinStar,     label: 'Michelin Star',    sources: ['michelin'] },
  { glyph: MICHELIN_STYLES['Bib Gourmand'].glyph, color: COLORS.michelinBib,      label: 'Bib Gourmand',     sources: ['michelin'] },
  { glyph: MICHELIN_STYLES['Selected'].glyph,     color: COLORS.michelinSelected, label: 'Michelin Selected', sources: ['michelin'] },
  { glyph: DUAL_GLYPH,                            color: COLORS.dual,             label: 'Both Sources',     sources: ['google', 'michelin'] },
]
