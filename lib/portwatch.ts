export interface DailyTransit {
  date: string;
  total: number;
  tanker: number;
  container: number;
  dryBulk: number;
  generalCargo: number;
  roro: number;
  capacity: number;
}

export interface PolymarketOdds {
  question: string;
  yesPrice: number;
  volume: number;
  slug: string;
  endDate: string;
  url: string;
}

export interface StraitStatus {
  isOpen: boolean;
  latest: DailyTransit;
  days: DailyTransit[];
  avgLast7: number;
  avgLast30: number;
  avgLast90: number;
  avgLast365: number;
  lastUpdated: string;
  polymarket?: PolymarketOdds | null;
}

const ARCGIS_URL =
  "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query";

function parseFeature(attrs: Record<string, unknown>): DailyTransit {
  const ts = attrs.date as number;
  return {
    date: new Date(ts).toISOString().split("T")[0],
    total: (attrs.n_total as number) ?? 0,
    tanker: (attrs.n_tanker as number) ?? 0,
    container: (attrs.n_container as number) ?? 0,
    dryBulk: (attrs.n_dry_bulk as number) ?? 0,
    generalCargo: (attrs.n_general_cargo as number) ?? 0,
    roro: (attrs.n_roro as number) ?? 0,
    capacity: (attrs.capacity as number) ?? 0,
  };
}

function avg(days: DailyTransit[]): number {
  if (days.length === 0) return 0;
  return Math.round((days.reduce((s, d) => s + d.total, 0) / days.length) * 10) / 10;
}

export async function getStraitStatus(): Promise<StraitStatus> {
  // Fetch last 365 days (maxRecordCountFactor=5 allows up to 5000)
  const params = new URLSearchParams({
    where: "portid='chokepoint6'",
    outFields: "*",
    orderByFields: "date DESC",
    resultRecordCount: "365",
    maxRecordCountFactor: "5",
    f: "json",
  });

  const res = await fetch(`${ARCGIS_URL}?${params}`, {
    next: { revalidate: 3600 },
  });
  const data = await res.json();
  const features = data.features ?? [];

  const days: DailyTransit[] = features.map(
    (f: { attributes: Record<string, unknown> }) => parseFeature(f.attributes)
  );

  const latest = days[0] ?? {
    date: new Date().toISOString().split("T")[0],
    total: 0, tanker: 0, container: 0, dryBulk: 0,
    generalCargo: 0, roro: 0, capacity: 0,
  };

  const avgLast7 = avg(days.slice(0, 7));
  const avgLast30 = avg(days.slice(0, 30));
  const avgLast90 = avg(days.slice(0, 90));
  const avgLast365 = avg(days);

  // "Open" = latest day has meaningful traffic (> 25% of 365-day average)
  const threshold = avgLast365 * 0.25;
  const isOpen = latest.total >= threshold;

  return {
    isOpen,
    latest,
    days,
    avgLast7,
    avgLast30,
    avgLast90,
    avgLast365,
    lastUpdated: new Date().toISOString(),
  };
}
