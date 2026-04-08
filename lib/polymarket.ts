export interface PolymarketOdds {
  question: string;
  yesPrice: number;
  volume: number;
  slug: string;
  endDate: string;
  url: string;
}

const GAMMA_API = "https://gamma-api.polymarket.com";

const MARKETS = [
  {
    slug: "strait-of-hormuz-traffic-returns-to-normal-by-april-30",
    // Use this market until May 1, 2026
    useUntil: new Date("2026-05-01T00:00:00Z"),
  },
  {
    slug: "strait-of-hormuz-traffic-returns-to-normal-by-end-of-may",
    // Use this market until June 1, 2026
    useUntil: new Date("2026-06-01T00:00:00Z"),
  },
];

function getActiveMarketSlug(): string | null {
  const now = new Date();
  for (const m of MARKETS) {
    if (now < m.useUntil) return m.slug;
  }
  return null;
}

export async function getPolymarketOdds(): Promise<PolymarketOdds | null> {
  const slug = getActiveMarketSlug();
  if (!slug) return null;

  try {
    const res = await fetch(`${GAMMA_API}/markets?slug=${slug}`, {
      next: { revalidate: 300 }, // cache 5 min
    });
    const data = await res.json();
    if (!data || data.length === 0) return null;

    const market = data[0];
    const prices = JSON.parse(market.outcomePrices);
    const yesPrice = parseFloat(prices[0]);

    return {
      question: market.question,
      yesPrice,
      volume: Math.round(market.volumeNum),
      slug: market.slug,
      endDate: market.endDate,
      url: `https://polymarket.com/event/${slug}`,
    };
  } catch (e) {
    console.error("Failed to fetch Polymarket odds:", e);
    return null;
  }
}
