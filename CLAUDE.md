# MunchMap — Claude Context

## What this is
MunchMap is a food/restaurant discovery map app. Early-stage — currently a layout skeleton with a sidebar and Apple MapKit JS map.

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
  App.jsx               — Layout: sidebar (20%) + map (80%)
  components/
    Sidebar.jsx         — Left panel (dark bg, buttons: Add Filter / Search Nearby / Saved Places)
    MapView.jsx         — MapKit JS map initialization, defaults to SF at zoom 12
```

## Key Implementation Details
- MapKit token comes from `VITE_MAPKIT_TOKEN` env var (set in `.env.local`)
- MapKit JS loaded dynamically in `useEffect`; guarded against double-init with `mapkit.initialized` flag
- Map cleanup via `mapInstanceRef.current.destroy()` on unmount; `cancelled` flag prevents race on fast unmount
- `zoomToSpan(zoom)` converts zoom level → MapKit `CoordinateSpan` (degrees): `360 / 2^zoom`
- Layout: sidebar is full-width on mobile, `w-1/5` (min 240px, max 320px) on `md+`
- Map (`MapView`) is hidden on mobile (`hidden md:block`), sidebar always visible

## Commands
```bash
npm run dev       # start dev server
npm run build     # production build
npm run deploy    # build + push to gh-pages
npm run lint      # eslint
```

## Conventions
- Functional components only, no class components
- Tailwind utility classes for all styling — no CSS modules or inline styles
- No TypeScript (plain JSX)
- **Asset paths:** Vite `base` is set to `/munch-map/` for GitHub Pages. Never hardcode absolute paths (e.g. `/image.png`) for assets — import them via JS (`import img from './assets/foo.png'`) so Vite resolves the base path and adds cache-busting hashes. Only files in `public/` that are referenced in `index.html` (like `favicon.ico`) should use absolute paths.
