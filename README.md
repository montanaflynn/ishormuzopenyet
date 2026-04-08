# Is the Strait of Hormuz Open Yet?

A real-time status page showing whether the Strait of Hormuz is open for maritime traffic, based on daily transit data from the IMF PortWatch platform.

## How It Works

The site displays a YES/NO status based on daily ship transit counts through the Strait of Hormuz. If the latest day's traffic drops below 25% of the 1-year average, the strait is considered "effectively closed."

A dark map centered on the strait shows cached ship positions, and an overlay card displays transit counts, a 90-day bar chart, and rolling averages compared to the 1-year baseline.

## Data Sources

- **IMF PortWatch** (primary) — Daily chokepoint transit data from the [ArcGIS FeatureServer](https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0). Provides daily counts of container, dry bulk, general cargo, RoRo, and tanker transits. Data goes back to 2018. Updated daily with a ~4 day processing lag. The Strait of Hormuz is `chokepoint6`.
- **MarineTraffic** (cached) — Ship position data (lat/lng, heading, speed, name) stored in `data/sample-marinetraffic.json` for map visualization. Not live — manually captured sample data.
- **CartoDB** — Dark basemap tiles (`dark_nolabels` variant) for the map background.

## Tech Stack

- **Next.js 16** with App Router
- **Leaflet** for the interactive map
- **Tailwind CSS** for styling
- **IMF PortWatch ArcGIS API** for transit data (no API key required)

## Running Locally

```bash
git clone <repo-url>
cd isthestraitofhormuzopenyet
npm install
npm run dev
```

No environment variables are required. The PortWatch API is public and the CartoDB tiles are free. Ship positions use the cached sample data in `data/`.

## Deploying to Vercel

```bash
vercel --prod
```

## API Endpoints

- `GET /api/status` — Returns strait status including YES/NO, latest day data, 365 days of history, and rolling averages.
- `GET /api/ships` — Returns cached ship positions for map display.

## Project Structure

```
app/
  page.tsx            — Main page with status overlay
  api/status/         — PortWatch data endpoint
  api/ships/          — Ship positions endpoint
components/
  Map.tsx             — Leaflet map with ship markers
lib/
  portwatch.ts        — IMF PortWatch API client
  ships.ts            — Ship data loader
  types.ts            — TypeScript types
data/
  sample-marinetraffic.json — Cached ship positions
```
