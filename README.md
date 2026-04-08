# Is Hormuz Open Yet?

[ishormuzopenyet.com](https://ishormuzopenyet.com)

A status page showing whether the Strait of Hormuz is open for maritime traffic, based on daily transit data from the IMF PortWatch platform.

> [!WARNING]
> This is a fun side project and should not be relied upon for any decision-making. The underlying data is based on public AIS signals, which are inherently incomplete — [many ships deliberately switch off their AIS transponders to avoid detection](https://www.bbc.com/news/articles/c4geg0eeyjeo). Actual transit volumes may be higher than reported.

## How It Works

The site displays a YES/NO status based on daily ship transit counts through the Strait of Hormuz. If the latest day's traffic drops below 25% of the 1-year average, the strait is considered "effectively closed."

A dark map centered on the strait shows cached ship positions, and an overlay card displays transit counts, a 90-day bar chart, and rolling averages compared to the 1-year baseline.

## Data Sources

- **IMF PortWatch** (primary) — Daily chokepoint transit data from the [ArcGIS FeatureServer](https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0). Provides daily counts of container, dry bulk, general cargo, RoRo, and tanker transits. Data goes back to 2018. Updated daily with a ~4 day processing lag. The Strait of Hormuz is `chokepoint6`.
- **CartoDB** — Dark basemap tiles (`dark_nolabels` variant) for the map background.
- **MarineTraffic** (cached) — 223 ship positions (lat/lng, heading, speed, name) manually captured from [MarineTraffic](https://www.marinetraffic.com) and served as a static file. Not live.

> [!NOTE]
> The ship positions on the map are currently static sample data. Live AIS tracking APIs exist but are expensive. If you'd like to help sponsor a real-time data feed, please [open an issue](https://github.com/montanaflynn/ishormuzopenyet/issues) or reach out via the email on my [GitHub profile](https://github.com/montanaflynn).

## Tech Stack

- **Next.js 16** with App Router
- **Leaflet** for the interactive map
- **Tailwind CSS** for styling
- **IMF PortWatch ArcGIS API** for transit data (no API key required)

## Running Locally

```bash
git clone https://github.com/montanaflynn/ishormuzopenyet.git
cd ishormuzopenyet
npm install
npm run dev
```

No environment variables are required. The PortWatch API is public and the CartoDB tiles are free. Ship positions use the cached sample data in `data/`.

## API Endpoints

- `GET /api/status` — Returns strait status including YES/NO, latest day data, 365 days of history, and rolling averages. Cached at the edge for 1 hour.

## Project Structure

```
app/
  page.tsx            — Main page with status overlay
  api/status/         — PortWatch data endpoint (edge-cached)
components/
  Map.tsx             — Leaflet map with ship markers
lib/
  portwatch.ts        — IMF PortWatch API client
  types.ts            — TypeScript types
public/
  data/sample-marinetraffic.json — Static ship positions (served as-is, no function call)
```

