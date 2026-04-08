"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { StraitStatus, DailyTransit } from "@/lib/portwatch";

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
    <div style={{ textAlign: "center" }}>
      <div className="text-white/40 text-sm">
        {day.total} transits on {day.date}
      </div>
      <div className="flex justify-center gap-x-4 text-[11px] text-white/35 mt-2" style={{ minHeight: 18 }}>
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

export default function Home() {
  const [status, setStatus] = useState<StraitStatus | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<DailyTransit | null>(null);

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
                  status.isOpen ? "text-green-400" : "text-red-500"
                }`}
              >
                {status.isOpen ? "YES" : "NO"}
              </span>
              <div className="flex flex-col">
                <span className="text-white/60 text-sm font-medium leading-tight">
                  The Strait of Hormuz
                </span>
                <span className="text-white/40 text-sm leading-tight">
                  is {status.isOpen ? "open" : "effectively closed"}
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
            {/* Divider */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />

            {/* Day info — shows hovered day or latest */}
            <DayInfo day={hoveredDay ?? status.latest} />

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
                { label: "7d avg", value: status.avgLast7 },
                { label: "30d avg", value: status.avgLast30 },
                { label: "90d avg", value: status.avgLast90 },
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

            <div className="text-center text-[10px] text-white/20">
              Source:{" "}
              <a
                href="https://portwatch.imf.org/pages/chokepoint6"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/50 hover:underline transition-colors"
              >
                IMF PortWatch
              </a>
              {" "}&middot;{" "}
              <a
                href="https://github.com/montanaflynn/ishormuzopenyet"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/50 hover:underline transition-colors"
              >
                GitHub
              </a>
            </div>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}
