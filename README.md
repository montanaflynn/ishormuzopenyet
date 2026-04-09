# Is Hormuz Open Yet?

[ishormuzopenyet.com](https://ishormuzopenyet.com)

A status page showing whether the Strait of Hormuz is open for maritime traffic, based on daily transit data from the IMF PortWatch platform.

> [!WARNING]
> I built this as a fun side project, please don't rely on it for anything serious. Crossing data lags ~4 days and ship positions on the map are cached, not live. The data is from public sources and I make no guarantees on its accuracy.

## How It Works

The site displays a YES/NO status based on [Polymarket](https://polymarket.com/predictions/strait-of-hormuz) prediction market odds for whether Strait of Hormuz traffic will return to normal. If bettors give it a 75%+ chance of normalizing, the strait is considered open. When prediction market data is unavailable, it falls back to IMF PortWatch transit data (open if daily crossings exceed 25% of the 1-year average).

A dark map centered on the strait shows cached ship positions, and an overlay card displays prediction market odds, crossing counts, a 90-day bar chart, and rolling averages compared to the 1-year baseline.

## Data Sources

## [Polymarket](https://polymarket.com/predictions/strait-of-hormuz)

Prediction market odds for Strait of Hormuz traffic normalization via the [Gamma API](https://gamma-api.polymarket.com). Markets resolve based on IMF PortWatch 7-day moving average reaching 60+ transit calls. Uses the nearest active monthly market (April until May, then May).

## [IMF PortWatch](https://portwatch.imf.org/pages/chokepoint6)

Daily chokepoint transit data from the [ArcGIS FeatureServer](https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0). Provides daily counts of container, dry bulk, general cargo, RoRo, and tanker crossings. Updated daily with a ~4 day processing lag. The Strait of Hormuz is `chokepoint6`.

## [CartoDB](https://carto.com/basemaps)

Dark basemap tiles (`dark_nolabels` variant) for the map background.

## [MarineTraffic](https://www.marinetraffic.com)

Ship positions (lat/lng, heading, speed, name) manually captured and served as a static file. Not live.

> [!NOTE]
> Live AIS tracking APIs exist but are expensive. If you'd like to help sponsor a real-time data feed, please [open an issue](https://github.com/montanaflynn/ishormuzopenyet/issues) or reach out via the email on my [GitHub profile](https://github.com/montanaflynn).

## Tech Stack

- **[Next.js 16](https://nextjs.org)** with App Router
- **[Leaflet](https://leafletjs.com)** for the interactive map
- **[Tailwind CSS](https://tailwindcss.com)** for styling

## Running Locally

```bash
git clone https://github.com/montanaflynn/ishormuzopenyet.git
cd ishormuzopenyet
npm install
npm run dev
```

No environment variables are required. The PortWatch API is public and the CartoDB tiles are free. Ship positions use the cached sample data in `data/`.

## API Endpoints

- `GET /api/status` — Returns strait status including YES/NO, Polymarket odds, latest day data, 365 days of history, and rolling averages. Cached at the edge for 1 hour.

## Project Structure

```
app/
  page.tsx            — Main page with status overlay
  api/status/         — PortWatch data endpoint (edge-cached)
components/
  Map.tsx             — Leaflet map with ship markers
lib/
  portwatch.ts        — IMF PortWatch API client
  polymarket.ts       — Polymarket odds fetcher
  types.ts            — TypeScript types
public/
  data/sample-marinetraffic.json — Static ship positions (served as-is, no function call)
```

