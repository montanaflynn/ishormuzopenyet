"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Ship } from "@/lib/types";
import { SHIP_TYPE_LABELS, FLAG_NAMES, AGE_BUCKETS, ageBucket, MAX_ELAPSED_MINUTES } from "@/lib/types";

const CENTER: L.LatLngExpression = [26.28972, 55.89157];
const ZOOM = 9;

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const shipMarkersRef = useRef<{ marker: L.Marker; ship: Ship; idx: number }[]>([]);
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugState, setDebugState] = useState({ lat: 26.28972, lng: 55.89157, zoom: 9 });
  const [filterVisible, setFilterVisible] = useState(false);
  const [flagsExpanded, setFlagsExpanded] = useState(false);
  const [excludedFlags, setExcludedFlags] = useState<Set<string>>(new Set());
  const [excludedTypes, setExcludedTypes] = useState<Set<string>>(new Set());
  const [excludedAges, setExcludedAges] = useState<Set<string>>(new Set());
  const [ships, setShips] = useState<Ship[]>([]);

  const stats = useMemo(() => {
    const flagCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const ageCounts: Record<string, number> = {};
    let moving = 0;
    let totalSpeed = 0;
    ships.forEach((s) => {
      const flagKey = s.flag && s.flag !== "--" ? s.flag : "";
      const typeKey = s.shipType ?? "";
      const ageKey = ageBucket(s.elapsed);
      flagCounts[flagKey] = (flagCounts[flagKey] ?? 0) + 1;
      typeCounts[typeKey] = (typeCounts[typeKey] ?? 0) + 1;
      ageCounts[ageKey] = (ageCounts[ageKey] ?? 0) + 1;
      if (s.speed > 0) {
        moving++;
        totalSpeed += s.speed;
      }
    });
    const flags = Object.entries(flagCounts)
      .map(([key, count]) => ({
        key,
        label: key ? (FLAG_NAMES[key] ?? key) : "Unknown",
        count,
      }))
      .sort((a, b) => b.count - a.count);
    const types = Object.entries(typeCounts)
      .map(([key, count]) => ({
        key,
        label: key ? (SHIP_TYPE_LABELS[key] ?? `Type ${key}`) : "Unknown",
        count,
      }))
      .sort((a, b) => b.count - a.count);
    const ages = AGE_BUCKETS.map((b) => ({
      key: b.key,
      label: b.label,
      count: ageCounts[b.key] ?? 0,
    }));
    return {
      total: ships.length,
      moving,
      avgSpeed: moving > 0 ? totalSpeed / moving : 0,
      flags,
      types,
      ages,
    };
  }, [ships]);

  const visibleCount = useMemo(() => {
    return ships.filter((s) => {
      const flagKey = s.flag && s.flag !== "--" ? s.flag : "";
      const typeKey = s.shipType ?? "";
      const ageKey = ageBucket(s.elapsed);
      return !excludedFlags.has(flagKey) && !excludedTypes.has(typeKey) && !excludedAges.has(ageKey);
    }).length;
  }, [ships, excludedFlags, excludedTypes, excludedAges]);

  const toggleKey = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "d" || e.key === "D") setDebugVisible((v) => !v);
      else if (e.key === "f" || e.key === "F") setFilterVisible((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;
    shipMarkersRef.current.forEach(({ marker, ship }) => {
      const flagKey = ship.flag && ship.flag !== "--" ? ship.flag : "";
      const typeKey = ship.shipType ?? "";
      const ageKey = ageBucket(ship.elapsed);
      const show = !excludedFlags.has(flagKey) && !excludedTypes.has(typeKey) && !excludedAges.has(ageKey);
      if (show && !map.hasLayer(marker)) marker.addTo(map);
      else if (!show && map.hasLayer(marker)) marker.remove();
    });
  }, [excludedFlags, excludedTypes, excludedAges]);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: CENTER,
      zoom: ZOOM,
      zoomControl: false,
      attributionControl: true,
      minZoom: 7,
      maxZoom: 11,
    });

    let cancelled = false;
    leafletMap.current = map;

    const updateDebug = () => {
      const c = map.getCenter();
      setDebugState({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    };
    updateDebug();
    map.on("move zoom", updateDebug);

    // CartoDB Dark Matter — no labels
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }
    ).addTo(map);

    // Country labels
    const COUNTRIES = [
      { name: "IRAN", lat: 27.5, lng: 56.5 },
      { name: "OMAN", lat: 26.1, lng: 56.3 },
      { name: "UAE", lat: 24.0, lng: 54.5 },
      { name: "SAUDI ARABIA", lat: 24.5, lng: 44.5 },
      { name: "QATAR", lat: 25.3, lng: 51.2 },
      { name: "BAHRAIN", lat: 26.05, lng: 50.55 },
      { name: "KUWAIT", lat: 29.5, lng: 47.2 },
      { name: "IRAQ", lat: 33.0, lng: 44.0 },
      { name: "PAKISTAN", lat: 25.8, lng: 63.5 },
      { name: "YEMEN", lat: 15.5, lng: 47.5 },
    ];

    COUNTRIES.forEach(({ name, lat, lng }) => {
      L.tooltip({
        permanent: true,
        direction: "center",
        className: "country-label",
        interactive: false,
      })
        .setContent(name)
        .setLatLng([lat, lng])
        .addTo(map);
    });

    // Strait boundary lines — 3 parallel lines, ~10° rotation from N-S
    const straitCenter: L.LatLngExpression = [26.7762, 56.5613];
    const outerLineStyle: L.PolylineOptions = {
      color: "#ff4444",
      weight: 1.5,
      opacity: 0.5,
    };
    const centerLineStyle: L.PolylineOptions = {
      color: "#ffffff",
      weight: 1.5,
      opacity: 0.5,
    };

    // Center line (from GeoJSON)
    L.polyline(
      [[26.7860, 56.3559], [26.4312, 56.3580]],
      centerLineStyle
    ).addTo(map);

    // Outer line east (parallel, offset ~0.05 lng)
    L.polyline(
      [[26.7860, 56.4061], [26.4312, 56.4078]],
      outerLineStyle
    ).addTo(map);

    // Outer line west (parallel, offset ~0.05 lng)
    L.polyline(
      [[26.7860, 56.3061], [26.4312, 56.3078]],
      outerLineStyle
    ).addTo(map);



    // Fetch and render ships (static file, no serverless function)
    fetch("/data/sample-marinetraffic.json")
      .then((res) => res.json())
      .then((raw: { capturedAt?: string; data: { rows: Record<string, string | null>[] } }) => {
        if (cancelled) return;

        const capturedAtMs = raw.capturedAt ? new Date(raw.capturedAt).getTime() : null;

        const parsedShips: Ship[] = raw.data.rows
          .filter((r) => {
            if (!r.LAT || !r.LON || r.SHIPNAME?.includes("[SAT-AIS]")) return false;
            const e = r.ELAPSED ? parseInt(r.ELAPSED) : NaN;
            return Number.isFinite(e) && e <= MAX_ELAPSED_MINUTES;
          })
          .map((r) => ({
            mmsi: 0,
            name: r.SHIPNAME ?? "",
            lat: parseFloat(r.LAT!),
            lng: parseFloat(r.LON!),
            heading: r.HEADING ? parseInt(r.HEADING) : r.COURSE ? parseInt(r.COURSE) / 10 : 0,
            speed: r.SPEED ? parseInt(r.SPEED) / 10 : 0,
            timestamp: new Date().toISOString(),
            flag: r.FLAG ?? undefined,
            destination: r.DESTINATION ?? undefined,
            length: r.LENGTH ? parseInt(r.LENGTH) : undefined,
            width: r.WIDTH ? parseInt(r.WIDTH) : undefined,
            shipType: r.SHIPTYPE ?? undefined,
            elapsed: r.ELAPSED ? parseInt(r.ELAPSED) : undefined,
          }));

        shipMarkersRef.current = [];

        const sizeForZoom = (zoom: number) => 10 + Math.max(0, zoom - 7) * 3;

        const buildShipIcon = (ship: Ship, idx: number, size: number) => {
          const heading = ship.heading ?? 0;
          const flagCode = ship.flag && ship.flag !== "--" ? ship.flag.toLowerCase() : null;
          const html = flagCode
            ? `<svg width="${size}" height="${size}" viewBox="0 0 20 20" style="transform:rotate(${heading}deg)"><defs><clipPath id="ship-clip-${idx}"><polygon points="10,2 17,17 10,14 3,17"/></clipPath></defs><image href="https://flagcdn.com/w20/${flagCode}.png" x="0" y="0" width="20" height="20" clip-path="url(#ship-clip-${idx})" preserveAspectRatio="xMidYMid slice"/><polygon points="10,2 17,17 10,14 3,17" fill="none" stroke="#000" stroke-width="1"/></svg>`
            : `<svg width="${size}" height="${size}" viewBox="0 0 20 20" style="transform:rotate(${heading}deg)"><polygon points="10,2 17,17 10,14 3,17" fill="#e2b553" fill-opacity="0.9" stroke="#000" stroke-width="1"/></svg>`;
          return L.divIcon({
            className: "ship-marker",
            html,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        };

        parsedShips.forEach((ship, idx) => {
          const marker = L.marker([ship.lat, ship.lng], {
            icon: buildShipIcon(ship, idx, sizeForZoom(map.getZoom())),
            interactive: true,
          });

          {
            const flagCode = ship.flag && ship.flag !== "--" ? ship.flag.toLowerCase() : null;
            const flagName = ship.flag && ship.flag !== "--" ? (FLAG_NAMES[ship.flag] ?? ship.flag) : null;
            const typeName = ship.shipType ? (SHIP_TYPE_LABELS[ship.shipType] ?? "Vessel") : null;
            const speedKnots = ship.speed.toFixed(1);

            const rows: string[] = [];
            const nameHtml = ship.name ? `<span class="ship-tip-name">${ship.name}</span>` : "";
            const flagImgHtml = flagCode ? `<img src="https://flagcdn.com/w20/${flagCode}.png" alt="" class="ship-tip-flag-img" />` : "";
            if (nameHtml || flagImgHtml) {
              rows.push(`<div class="ship-tip-header">${nameHtml}${flagImgHtml}</div>`);
            }

            if (typeName) rows.push(`<div class="ship-tip-meta">Ship Type: ${typeName}</div>`);
            if (flagName) rows.push(`<div class="ship-tip-meta">Flag State: ${flagName}</div>`);
            if (ship.speed > 0) rows.push(`<div class="ship-tip-meta">Speed: ${speedKnots} kn</div>`);
            if (ship.length && ship.width) rows.push(`<div class="ship-tip-meta">Size: ${ship.length}m by ${ship.width}m</div>`);

            const shipUpdateMs = capturedAtMs != null && ship.elapsed != null
              ? capturedAtMs - ship.elapsed * 60_000
              : null;
            const updatedAtLabel = shipUpdateMs != null
              ? new Date(shipUpdateMs).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZoneName: "short",
                })
              : null;
            if (updatedAtLabel) rows.push(`<div class="ship-tip-meta">Updated at: ${updatedAtLabel}</div>`);

            rows.push(`<div class="ship-tip-elapsed">via MarineTraffic.com</div>`);

            if (rows.length) {
              const content = rows.join("");

              marker.bindTooltip(content, {
                className: "ship-tooltip-rich",
                direction: "top",
                offset: [0, -8],
              });
            }
          }

          shipMarkersRef.current.push({ marker, ship, idx });
          marker.addTo(map);
        });

        setShips(parsedShips);

        map.on("zoomend", () => {
          const size = sizeForZoom(map.getZoom());
          shipMarkersRef.current.forEach(({ marker, ship, idx }) => {
            marker.setIcon(buildShipIcon(ship, idx, size));
          });
        });
      })
      .catch(console.error);

    return () => {
      cancelled = true;
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />

      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 max-h-[calc(100vh-1.5rem)]">
        <div className="w-[260px] bg-black/85 backdrop-blur-sm text-white font-mono text-[11px] rounded-lg border border-white/15 shadow-xl select-text flex-shrink-0 overflow-hidden">
          <button
            onClick={() => setDebugVisible((v) => !v)}
            className={`w-full p-1 flex items-center justify-between uppercase tracking-[0.15em] text-[9px] text-white/50 hover:text-white/80 transition-colors ${debugVisible ? "border-b border-white/10" : ""}`}
          >
            <span>Debug</span>
            <span className="text-white/30 normal-case tracking-normal">
              {debugVisible ? "press d to hide" : "press d"}
            </span>
          </button>

          {debugVisible && (
            <>
              <div className="p-1 space-y-1 border-b border-white/10">
                <div className="flex justify-between gap-3">
                  <span className="text-white/40">center</span>
                  <span className="tabular-nums">[{debugState.lat.toFixed(5)}, {debugState.lng.toFixed(5)}]</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/40">zoom</span>
                  <span className="tabular-nums">{debugState.zoom}</span>
                </div>
              </div>

              <div className="p-1 space-y-1">
                <div className="flex justify-between gap-3">
                  <span className="text-white/40">ships</span>
                  <span className="tabular-nums">{stats.total}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/40">moving</span>
                  <span className="tabular-nums">{stats.moving}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-white/40">avg speed</span>
                  <span className="tabular-nums">{stats.avgSpeed.toFixed(1)} kn</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={`w-[260px] min-h-0 flex flex-col bg-black/85 backdrop-blur-sm text-white font-mono text-[11px] rounded-lg border border-white/15 shadow-xl select-none overflow-hidden ${filterVisible ? "flex-1" : "flex-shrink-0"}`}>
          <button
            onClick={() => setFilterVisible((v) => !v)}
            className={`w-full p-1 flex items-center justify-between uppercase tracking-[0.15em] text-[9px] text-white/50 hover:text-white/80 transition-colors ${filterVisible ? "border-b border-white/10" : ""}`}
          >
            <span className="flex items-center gap-2">
              <span>Filters</span>
              {filterVisible && stats.total > 0 && (
                <span className="normal-case tracking-normal tabular-nums text-white/40">
                  <span className="text-[#e2b553]">{visibleCount}</span>
                  <span> / {stats.total}</span>
                </span>
              )}
            </span>
            <span className="text-white/30 normal-case tracking-normal">
              {filterVisible ? "press f to hide" : "press f"}
            </span>
          </button>

          {filterVisible && (
            <div
              className="overflow-y-auto flex-1 divide-y divide-white/10 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/25"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}
            >
              <div className="p-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/40 uppercase tracking-[0.15em] text-[9px]">Ship Type</span>
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider">
                    <button
                      onClick={() => setExcludedTypes(new Set())}
                      className="text-white/40 hover:text-white"
                    >
                      all
                    </button>
                    <span className="text-white/15">|</span>
                    <button
                      onClick={() => setExcludedTypes(new Set(stats.types.map((t) => t.key)))}
                      className="text-white/40 hover:text-white"
                    >
                      none
                    </button>
                  </div>
                </div>
                <div className="space-y-px">
                  {stats.types.map((t) => {
                    const checked = !excludedTypes.has(t.key);
                    return (
                      <label
                        key={t.key || "unknown"}
                        className="flex items-center gap-2 px-1 py-1 rounded hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleKey(setExcludedTypes, t.key)}
                          className="accent-[#e2b553] w-3 h-3"
                        />
                        <span className={`flex-1 truncate ${checked ? "text-white" : "text-white/30"}`}>{t.label}</span>
                        <span className="tabular-nums text-white/40">{t.count}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="p-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/40 uppercase tracking-[0.15em] text-[9px]">Position Age</span>
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider">
                    <button
                      onClick={() => setExcludedAges(new Set())}
                      className="text-white/40 hover:text-white"
                    >
                      all
                    </button>
                    <span className="text-white/15">|</span>
                    <button
                      onClick={() => setExcludedAges(new Set(stats.ages.map((a) => a.key)))}
                      className="text-white/40 hover:text-white"
                    >
                      none
                    </button>
                  </div>
                </div>
                <div className="space-y-px">
                  {stats.ages.map((a) => {
                    const checked = !excludedAges.has(a.key);
                    return (
                      <label
                        key={a.key || "unknown"}
                        className="flex items-center gap-2 px-1 py-1 rounded hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleKey(setExcludedAges, a.key)}
                          className="accent-[#e2b553] w-3 h-3"
                        />
                        <span className={`flex-1 truncate ${checked ? "text-white" : "text-white/30"}`}>{a.label}</span>
                        <span className="tabular-nums text-white/40">{a.count}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="p-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/40 uppercase tracking-[0.15em] text-[9px]">Flag</span>
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider">
                    <button
                      onClick={() => setExcludedFlags(new Set())}
                      className="text-white/40 hover:text-white"
                    >
                      all
                    </button>
                    <span className="text-white/15">|</span>
                    <button
                      onClick={() => setExcludedFlags(new Set(stats.flags.map((f) => f.key)))}
                      className="text-white/40 hover:text-white"
                    >
                      none
                    </button>
                  </div>
                </div>
                <div className="space-y-px">
                  {(flagsExpanded ? stats.flags : stats.flags.slice(0, 20)).map((f) => {
                    const checked = !excludedFlags.has(f.key);
                    return (
                      <label
                        key={f.key || "unknown"}
                        className="flex items-center gap-2 px-1 py-1 rounded hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleKey(setExcludedFlags, f.key)}
                          className="accent-[#e2b553] w-3 h-3"
                        />
                        {f.key ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`https://flagcdn.com/w20/${f.key.toLowerCase()}.png`}
                            alt=""
                            className="w-4 h-3 object-cover border border-white/10 flex-shrink-0"
                          />
                        ) : (
                          <span className="w-4 h-3 border border-white/10 bg-white/5 flex-shrink-0" />
                        )}
                        <span className={`flex-1 truncate ${checked ? "text-white" : "text-white/30"}`}>{f.label}</span>
                        <span className="tabular-nums text-white/40">{f.count}</span>
                      </label>
                    );
                  })}
                </div>
                {stats.flags.length > 20 && (
                  <button
                    onClick={() => setFlagsExpanded((v) => !v)}
                    className="w-full mt-1 px-1 py-1 text-[9px] uppercase tracking-wider text-white/40 hover:text-white/80 text-center"
                  >
                    {flagsExpanded ? "show less" : `show ${stats.flags.length - 20} more`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
