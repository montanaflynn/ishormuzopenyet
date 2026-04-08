"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { StraitStatus, DailyTransit, PolymarketOdds } from "@/lib/portwatch";

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

function DayInfo({ day }: { day: DailyTransit }) {
  const types: { label: string; count: number }[] = [
    { label: "Tanker", count: day.tanker },
    { label: "Container", count: day.container },
    { label: "Dry Bulk", count: day.dryBulk },
    { label: "General", count: day.generalCargo },
    { label: "RoRo", count: day.roro },
  ];
  const nonZero = types.filter((t) => t.count > 0);

  let labels: { label: string; count: number }[];
  if (nonZero.length <= 3) {
    labels = nonZero;
  } else {
    const top3 = nonZero.slice(0, 3);
    const rest = nonZero.slice(3).reduce((s, t) => s + t.count, 0);
    labels = [...top3, { label: "Other", count: rest }];
  }

  return (
    <div>
      <div className="text-white/60 text-xs">
        {day.total} crossings on {day.date}
      </div>
      <div className="flex gap-x-4 text-[11px] text-white/35 mt-2" style={{ minHeight: 18 }}>
        {day.total === 0 ? (
          <span>No ships</span>
        ) : (
          labels.map((t) => (
            <span key={t.label}>{t.label}: {t.count}</span>
          ))
        )}
      </div>
    </div>
  );
}

function MiniChart({
  status,
  onHover,
}: {
  status: StraitStatus;
  onHover: (day: DailyTransit | null) => void;
}) {
  const days = status.days.slice(0, 90).slice().reverse();
  const max = Math.max(...days.map((d) => d.total), 1);
  return (
    <div
      className="flex items-end gap-[2px] h-full"
      onMouseLeave={() => onHover(null)}
    >
      {days.map((day) => (
        <div
          key={day.date}
          className="flex-1 min-w-[2px] max-w-[4px] relative"
          style={{ height: "100%" }}
          onMouseEnter={() => onHover(day)}
        >
          <div
            className="absolute bottom-0 w-full rounded-sm"
            style={{
              height: `${Math.max(Math.round((day.total / max) * 100), 2)}%`,
              maxHeight: "100%",
              backgroundColor:
                day.total < status.avgLast365 * 0.25 ? "#ef4444" : "#4ade80",
              opacity: 0.6,
            }}
          />
        </div>
      ))}
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
        <span className="text-[11px] text-white/40 uppercase tracking-wide font-medium group-hover:text-white/60 transition-colors">
          Prediction Market <span className="normal-case text-white/25 font-normal group-hover:text-white/40 transition-colors">via Polymarket</span>
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
          <div className="text-white/25 text-[10px] mt-0.5">
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
  const [hoveredDay, setHoveredDay] = useState<DailyTransit | null>(null);

  // Polymarket odds override isOpen when available (75% threshold)
  const isOpen = status?.polymarket
    ? status.polymarket.yesPrice >= 0.75
    : status?.isOpen ?? false;

  useEffect(() => {
    fetch("/api/status")
      .then((res) => res.json())
      .then((data: StraitStatus) => {
        setStatus(data);
        const open = data.polymarket
          ? data.polymarket.yesPrice >= 0.75
          : data.isOpen;
        setFavicon(open);
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
                <span className="text-white/40 text-sm leading-tight">
                  is {isOpen ? "open" : "effectively closed"}<sup>*</sup>
                </span>
              </div>
              <span
                className="text-white/30 text-sm ml-auto transition-transform"
                style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
              >
                ▼
              </span>
            </div>

            {expanded && <>
            {/* Prediction Market — primary signal */}
            {status.polymarket && <>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />
              <PredictionMarket odds={status.polymarket} />
            </>}

            {/* Crossing Data */}
            <div>
              <a
                href="https://portwatch.imf.org/pages/chokepoint6"
                target="_blank"
                rel="noopener noreferrer"
                className="group text-[11px] text-white/40 uppercase tracking-wide font-medium hover:text-white/60 transition-colors"
              >
                Crossing Data <span className="normal-case text-white/25 font-normal group-hover:text-white/40 transition-colors">via IMF PortWatch</span>
              </a>
            </div>

            {/* Day info — shows hovered day or latest */}
            <div style={{ marginTop: -12 }}>
              <DayInfo day={hoveredDay ?? status.latest} />
            </div>

            {/* Chart */}
            <div style={{ overflow: "hidden" }}>
              <div className="h-12">
                <MiniChart status={status} onHover={setHoveredDay} />
              </div>
              <div className="flex justify-between text-[10px] text-white/25 mt-2">
                <span>90 days ago</span>
                <span>{status.latest.date}</span>
              </div>
            </div>

            {/* Averages */}
            <div className="flex justify-center gap-8">
              {[
                { label: "Last 7d avg", value: status.avgLast7 },
                { label: "Last 30d avg", value: status.avgLast30 },
                { label: "Last 90d avg", value: status.avgLast90 },
              ].map((item) => {
                const pctChange = status.avgLast365 > 0
                  ? ((item.value - status.avgLast365) / status.avgLast365) * 100
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
                    <span className="text-white/30 text-[11px]">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="text-[11px] text-white/40 uppercase tracking-wide font-medium">
              Disclaimer
            </div>
            <div className="text-[11px] text-white/40 leading-relaxed" style={{ marginTop: -12 }}>
              <sup>*</sup>I built this as a fun side project, please
              don&apos;t rely on it for anything serious. Crossing data
              lags ~4 days and ship positions on the map
              are cached, not live. The data is from public sources and I
              make no guarantees on its accuracy.
            </div>

            <div className="text-center text-[10px] text-white/40">
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
