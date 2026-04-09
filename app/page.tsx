"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { StraitStatus, DailyTransit, PolymarketOdds, WindwardData, WindwardDay } from "@/lib/portwatch";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

function setFavicon(isOpen: boolean) {
  const svg = isOpen
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="%2322c55e"/><path d="M10 16l4 4 8-8" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="%23ef4444"/><path d="M11 11l10 10M21 11l-10 10" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>`;

  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = `data:image/svg+xml,${svg}`;
}

function shipTypeDetail(d: DailyTransit): string {
  const types = [
    { label: "Tanker", count: d.tanker },
    { label: "Container", count: d.container },
    { label: "Dry Bulk", count: d.dryBulk },
    { label: "General", count: d.generalCargo },
    { label: "RoRo", count: d.roro },
  ].filter((t) => t.count > 0);

  if (types.length <= 3) return types.map((t) => `${t.label}: ${t.count}`).join(" · ");

  const top3 = types.slice(0, 3);
  const rest = types.slice(3).reduce((s, t) => s + t.count, 0);
  return [...top3, { label: "Other", count: rest }].map((t) => `${t.label}: ${t.count}`).join(" · ");
}

interface ChartDay {
  date: string;
  total: number;
  detail?: string;
}

function CrossingChart({
  days,
  threshold,
  onHover,
}: {
  days: ChartDay[];
  threshold: number;
  onHover: (day: ChartDay | null) => void;
}) {
  const max = Math.max(...days.map((d) => d.total), 1);
  return (
    <div style={{ overflow: "hidden" }}>
      <div
        className="flex items-end gap-[2px]"
        style={{ height: 48 }}
        onMouseLeave={() => onHover(null)}
      >
        {days.map((day) => (
          <div
            key={day.date}
            className="flex-1 min-w-[2px] relative"
            style={{ height: "100%" }}
            onMouseEnter={() => onHover(day)}
          >
            <div
              className="absolute bottom-0 w-full rounded-sm"
              style={{
                height: `${Math.max(Math.round((day.total / max) * 100), 2)}%`,
                maxHeight: "100%",
                backgroundColor: day.total >= threshold ? "#4ade80" : "#ef4444",
                opacity: 0.6,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-white/45 mt-2">
        <span>{days[0]?.date}</span>
        <span>{days[days.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function PredictionMarket({ odds }: { odds: PolymarketOdds }) {
  const pct = Math.round(odds.yesPrice * 100);
  const endMonth = new Date(odds.endDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const signal = pct >= 75;

  return (
    <a
      href={odds.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <div className="mb-3">
        <span className="text-[11px] text-white/50 uppercase tracking-wide font-medium group-hover:text-white/60 transition-colors">
          Prediction Market <span className="normal-case text-white/45 font-normal group-hover:text-white/50 transition-colors">via Polymarket</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`text-2xl font-bold tabular-nums ${
            signal ? "text-green-400" : "text-red-400"
          }`}
        >
          {pct}%
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-white/60 text-xs leading-tight">
            chance traffic normalizes by {endMonth}
          </div>
          <div className="text-white/45 text-[10px] mt-0.5">
            ${odds.volume.toLocaleString()} vol
          </div>
        </div>
      </div>
      {/* Progress bar */}
      <div
        className="mt-2 rounded-full overflow-hidden"
        style={{ height: 3, background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: signal
              ? "rgba(74, 222, 128, 0.6)"
              : "rgba(239, 68, 68, 0.5)",
          }}
        />
      </div>
    </a>
  );
}

export default function Home() {
  const [status, setStatus] = useState<StraitStatus | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<ChartDay | null>(null);
  const [hoveredWindward, setHoveredWindward] = useState<ChartDay | null>(null);

  const isOpen = status?.isOpen ?? false;

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((data: StraitStatus) => {
        setStatus(data);
        setFavicon(data.isOpen);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="h-screen w-screen relative" suppressHydrationWarning>
      <Map />

      {status && (
        <div className="absolute top-5 left-5 z-[1000] pointer-events-auto">
          <div style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", width: 360, padding: 24, boxShadow: "0 25px 50px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Status header */}
            <div
              className="flex items-center justify-center gap-4 cursor-pointer select-none"
              onClick={() => setExpanded((e) => !e)}
            >
              <span
                className={`text-5xl font-black tracking-tight leading-none ${
                  isOpen ? "text-green-400" : "text-red-500"
                }`}
              >
                {isOpen ? "YES" : "NO"}
              </span>
              <div className="flex flex-col">
                <span className="text-white/60 text-sm font-medium leading-tight">
                  The Strait of Hormuz
                </span>
                <span className="text-white/50 text-sm leading-tight">
                  is {isOpen ? "open" : "effectively closed"}<sup>*</sup>
                </span>
              </div>
              <span
                className="text-white/50 text-sm ml-auto transition-transform"
                style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
              >
                ▼
              </span>
            </div>

            {expanded && <>
            {/* Today's Crossings — primary signal via Windward */}
            {status.windward?.latest && <>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />
              <a
                href="https://insights.windward.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="mb-3">
                  <span className="text-[11px] text-white/50 uppercase tracking-wide font-medium group-hover:text-white/60 transition-colors">
                    Crossings <span className="normal-case text-white/45 font-normal group-hover:text-white/50 transition-colors">via Windward.ai</span>
                  </span>
                </div>

                {/* Day info — hovered or latest */}
                {(() => {
                  const latest = status.windward!.latest!;
                  const day = hoveredWindward ?? { date: latest.date, total: latest.total, detail: `${latest.inbound} in · ${latest.outbound} out` };
                  return (
                    <div>
                      <div className="text-white/60 text-xs">
                        {day.total} crossings on {day.date}
                      </div>
                      {day.detail && (
                        <div className="text-white/45 text-[11px] mt-1">{day.detail}</div>
                      )}
                    </div>
                  );
                })()}

                {/* Chart */}
                {status.windward.days.length > 1 && (
                  <CrossingChart
                    days={[...status.windward.days].reverse().map((d) => ({
                      date: d.date,
                      total: d.total,
                      detail: `${d.inbound} in · ${d.outbound} out`,
                    }))}
                    threshold={status.avgPreCrisis * 0.5}
                    onHover={setHoveredWindward}
                  />
                )}

                {/* Threshold bar */}
                {(() => {
                  const threshold = Math.round(status.avgPreCrisis * 0.5);
                  const current = status.windward!.latest!.total;
                  const avg = Math.round(status.avgPreCrisis);
                  const barPct = Math.min(Math.round((current / avg) * 100), 100);
                  const thresholdPct = Math.round((threshold / avg) * 100);
                  return (
                    <div style={{ marginTop: 16 }}>
                      <div
                        className="rounded-full relative"
                        style={{ height: 4, background: "rgba(255,255,255,0.06)" }}
                      >
                        <div
                          className="h-full rounded-full absolute left-0"
                          style={{
                            width: `${barPct}%`,
                            background: current >= threshold
                              ? "rgba(74, 222, 128, 0.6)"
                              : "rgba(239, 68, 68, 0.5)",
                          }}
                        />
                        <div
                          className="absolute top-[-3px]"
                          style={{
                            left: `${thresholdPct}%`,
                            width: 2,
                            height: 10,
                            background: "#4ade80",
                            borderRadius: 1,
                          }}
                        />
                      </div>
                      <div className="relative text-[10px] mt-1">
                        <div className="flex justify-between text-white/45">
                          <span>{current} crossings</span>
                          <span>{avg} avg</span>
                        </div>
                        <div className="absolute top-0 text-green-400/50" style={{ left: `${thresholdPct}%`, transform: "translateX(-50%)" }}>
                          {threshold} to be considered open
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </a>
            </>}

            {/* Historical Crossing Data */}
            <div>
              <a
                href="https://portwatch.imf.org/pages/chokepoint6"
                target="_blank"
                rel="noopener noreferrer"
                className="group text-[11px] text-white/50 uppercase tracking-wide font-medium hover:text-white/60 transition-colors"
              >
                Crossings <span className="normal-case text-white/45 font-normal group-hover:text-white/50 transition-colors">via IMF PortWatch</span>
              </a>
            </div>

            {/* Day info — shows hovered day or latest */}
            <div style={{ marginTop: -12 }}>
              {(() => {
                const d = status.latest;
                const fallback: ChartDay = {
                  date: d.date, total: d.total,
                  detail: shipTypeDetail(d),
                };
                const day = hoveredDay ?? fallback;
                return (
                  <div>
                    <div className="text-white/60 text-xs">
                      {day.total} crossings on {day.date}
                    </div>
                    {day.detail && (
                      <div className="text-white/45 text-[11px] mt-1">{day.detail}</div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Chart */}
            <CrossingChart
              days={status.days.slice(0, 90).reverse().map((d) => ({
                date: d.date,
                total: d.total,
                detail: shipTypeDetail(d),
              }))}
              threshold={status.avgPreCrisis * 0.5}
              onHover={setHoveredDay}
            />

            {/* Averages */}
            <div className="flex justify-center gap-8">
              {[
                { label: "Last 7d avg", value: status.avgLast7 },
                { label: "Last 30d avg", value: status.avgLast30 },
                { label: "Last 90d avg", value: status.avgLast90 },
              ].map((item) => {
                const pctChange = status.avgPreCrisis > 0
                  ? ((item.value - status.avgPreCrisis) / status.avgPreCrisis) * 100
                  : 0;
                return (
                  <div key={item.label} className="flex flex-col items-center">
                    <span className="text-white/70 text-lg font-semibold tabular-nums leading-tight">
                      {item.value}
                    </span>
                    <span
                      className={`text-[10px] font-medium tabular-nums ${
                        pctChange >= 0 ? "text-green-400/60" : "text-red-400/60"
                      }`}
                    >
                      {pctChange >= 0 ? "+" : ""}
                      {Math.round(pctChange)}% vs 1yr ago
                    </span>
                    <span className="text-white/50 text-[11px]">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Prediction Market */}
            {status.polymarket && (
              <PredictionMarket odds={status.polymarket} />
            )}

            <div className="text-[11px] text-white/50 uppercase tracking-wide font-medium">
              Disclaimer
            </div>
            <div className="text-[11px] text-white/50 leading-relaxed" style={{ marginTop: -12 }}>
              <sup>*</sup>I built this as a fun side project, please
              don&apos;t rely on it for anything serious. Ship positions
              on the map are cached, not live. The data is from public
              sources and I make no guarantees on its accuracy.
            </div>

            <div className="text-center text-[10px] text-white/50">
              <a href="https://github.com/montanaflynn/ishormuzopenyet" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 hover:underline transition-colors">GitHub Repo</a>
              {" "}&middot;{" "}
              By <a href="https://x.com/montanaflynn" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 hover:underline transition-colors">@montanaflynn</a>
            </div>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}
