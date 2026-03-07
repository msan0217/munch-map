# MunchMap

A food and restaurant discovery map app built with React and Apple MapKit JS.

## Stack

- React 19 + Vite 7
- Tailwind CSS v4
- Apple MapKit JS

## Setup

1. Get an Apple MapKit JS token from the [Apple Developer portal](https://developer.apple.com/maps/web/).
2. Create a `.env.local` file in the project root:
   ```
   VITE_MAPKIT_TOKEN=your_token_here
   ```
3. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run deploy` | Build and deploy to GitHub Pages |
| `npm run lint` | Run ESLint |
