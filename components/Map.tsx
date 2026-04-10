"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Ship } from "@/lib/types";
import { SHIP_TYPE_LABELS, FLAG_NAMES } from "@/lib/types";

const CENTER: L.LatLngExpression = [26.6, 56.5];
const ZOOM = 9;

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

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

        const ships: Ship[] = raw.data.rows
          .filter((r) => r.LAT && r.LON && !r.SHIPNAME?.includes("[SAT-AIS]"))
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

        const shipMarkers: { marker: L.Marker; ship: Ship; idx: number }[] = [];

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

        ships.forEach((ship, idx) => {
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

          shipMarkers.push({ marker, ship, idx });
          marker.addTo(map);
        });

        map.on("zoomend", () => {
          const size = sizeForZoom(map.getZoom());
          shipMarkers.forEach(({ marker, ship, idx }) => {
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

  return <div ref={mapRef} className="h-full w-full" />;
}
