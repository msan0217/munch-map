# MunchMap — Claude Context

## What this is
MunchMap is a food/restaurant discovery map app with multi-source restaurant data displayed on an Apple MapKit JS map.

## Stack
- **React 19** + **Vite 7** (JSX, functional components + hooks)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (no config file — uses CSS-first config)
- **Apple MapKit JS** loaded dynamically from CDN (`https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js`)
- Deployed via **gh-pages** (`npm run deploy`)

## Project Structure
```
src/
  main.jsx              — React entry point
  index.css             — Tailwind import + base styles
  App.jsx               — Layout, layer state management, merges Google + Michelin data
  config/
    austin.js           — Shared Austin center coords + radius (used by map & fetch script)
  data/
    google-top-rated.json — Google Places top-rated restaurants (generated, committed)
    michelin.json         — Michelin Guide restaurants (generated, committed)
  utils/
    mergeRestaurants.js — Deduplicates Google + Michelin by name/proximity, filters to Austin area
  components/
    Sidebar.jsx         — Left panel with layer toggles + action buttons
    MapView.jsx         — MapKit JS map with custom DOM annotations, per-source styling, clustering
    MapLegend.jsx       — Floating map legend overlay showing marker types
scripts/
  fetch-google-top-rated.mjs — Fetches Austin restaurants from Google Places Text Search API
  fetch-michelin.mjs         — Scrapes Michelin Guide Austin restaurants via Playwright
```

## Key Implementation Details
- MapKit token comes from `VITE_MAPKIT_TOKEN` env var (set in `.env.local`)
- MapKit JS loaded dynamically in `useEffect`; guarded against double-init with `mapkit.initialized` flag
- Map cleanup via `mapInstanceRef.current.destroy()` on unmount; `cancelled` flag prevents race on fast unmount
- `zoomToSpan(zoom)` converts zoom level → MapKit `CoordinateSpan` (degrees): `360 / 2^zoom`
- Layout: single MapView instance shared across mobile/desktop; sidebar is full-width overlay on mobile, `w-1/5` (min 240px, max 320px) on `md+`
- **Multi-layer annotations:** Uses `mapkit.Annotation` with custom DOM element factories (not `MarkerAnnotation`) for full visual control. Three marker types: Google-only (coral), Michelin-only (gold/orange/gray by distinction), and dual-source (side-by-side pill). Annotation updates use `requestAnimationFrame` to avoid crashing MapKit during React's commit phase.
- **Layer toggles:** `layers` state in App controls which sources are visible; MapView removes/re-adds annotations on toggle
- **Data merging:** `mergeRestaurants()` matches across datasets by normalized name + haversine proximity (<1km), filters Michelin to Austin area

## Restaurant Data Pipelines

### Google Top-Rated
- `scripts/fetch-google-top-rated.mjs` uses **Google Places Text Search API** (v2) with grid-based search
- Requires `GOOGLE_PLACES_API_KEY` in `.env` (never committed)
- Server-side `minRating` filter + pagination (up to 60 results per grid point)
- Client-side filtering: ≥4.5 stars, ≥100 reviews, excluded non-restaurant primaryTypes
- Free tier: 1,000 SearchText Enterprise requests/month (covers ~1 full run)
- Run with: `npm run fetch-google-top-rated`

### Michelin Guide
- `scripts/fetch-michelin.mjs` scrapes guide.michelin.com Austin page via **Playwright** (headless Chromium)
- Extracts coords, name, distinction, cuisine, price from restaurant cards
- Requires: `npx playwright install chromium`
- Run with: `npm run fetch-michelin`

## Commands
```bash
npm run dev               # start dev server
npm run build             # production build
npm run deploy            # build + push to gh-pages
npm run lint              # eslint
npm run fetch-google-top-rated # re-fetch from Google Places API
npm run fetch-michelin         # re-scrape Michelin Guide
```

## Conventions
- Functional components only, no class components
- Tailwind utility classes for all styling — no CSS modules or inline styles
- No TypeScript (plain JSX)
- **Asset paths:** Vite `base` is set to `/munch-map/` for GitHub Pages. Never hardcode absolute paths (e.g. `/image.png`) for assets — import them via JS (`import img from './assets/foo.png'`) so Vite resolves the base path and adds cache-busting hashes. Only files in `public/` that are referenced in `index.html` (like `favicon.ico`) should use absolute paths.
