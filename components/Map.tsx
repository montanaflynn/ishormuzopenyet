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

    // Fetch and render ships (static file, no serverless function)
    fetch("/data/sample-marinetraffic.json")
      .then((res) => res.json())
      .then((raw: { capturedAt?: string; data: { rows: Record<string, string | null>[] } }) => {
        if (cancelled) return;

        const capturedLabel = raw.capturedAt
          ? new Date(raw.capturedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" })
          : null;

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
          }));

        let pinnedMarker: L.Marker | null = null;

        ships.forEach((ship) => {
          const heading = ship.heading ?? 0;
          const marker = L.marker([ship.lat, ship.lng], {
            icon: L.divIcon({
              className: "ship-marker",
              html: `<svg width="12" height="12" viewBox="0 0 12 12" style="transform:rotate(${heading}deg)"><polygon points="6,1 10,10 6,8 2,10" fill="#e2b553" fill-opacity="0.9" stroke="#000" stroke-width="0.5"/></svg>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6],
            }),
            interactive: true,
          });

          {
            const flagName = ship.flag && ship.flag !== "--" ? (FLAG_NAMES[ship.flag] ?? ship.flag) : null;
            const typeName = ship.shipType ? (SHIP_TYPE_LABELS[ship.shipType] ?? "Vessel") : null;
            const speedKnots = ship.speed.toFixed(1);

            const rows: string[] = [];
            if (ship.name) rows.push(`<div class="ship-tip-name">${ship.name}</div>`);

            if (typeName) rows.push(`<div class="ship-tip-meta">Ship Type: ${typeName}</div>`);
            if (flagName) rows.push(`<div class="ship-tip-meta">Flag State: ${flagName}</div>`);

            const details: string[] = [];
            if (ship.speed > 0) details.push(`Speed: ${speedKnots} kn`);
            if (ship.length && ship.width) details.push(`Size: ${ship.length}m by ${ship.width}m`);
            if (details.length) rows.push(`<div class="ship-tip-details">${details.join("<br/>")}</div>`);

            const mtLink = `<a href="https://www.marinetraffic.com/en/ais/home/centerx:57.4/centery:26.4/zoom:8" target="_blank" rel="noopener noreferrer">MarineTraffic</a>`;
            const mtLabel = capturedLabel ? `Data from ${mtLink} on ${capturedLabel}` : `Data from ${mtLink}`;
            if (mtLabel) rows.push(`<div class="ship-tip-elapsed">${mtLabel}</div>`);

            if (rows.length) {
              const content = rows.join("");

              marker.bindTooltip(content, {
                className: "ship-tooltip-rich",
                direction: "top",
                offset: [0, -8],
              });

              marker.bindPopup(content, {
                className: "ship-popup-rich",
                closeButton: true,
                offset: [0, -8],
                maxWidth: 220,
              });

              marker.on("mouseover", () => {
                if (!pinnedMarker) marker.openTooltip();
              });

              marker.on("mouseout", () => {
                if (pinnedMarker !== marker) marker.closeTooltip();
              });

              marker.on("click", () => {
                // close previous pinned popup
                if (pinnedMarker && pinnedMarker !== marker) {
                  pinnedMarker.closePopup();
                }
                marker.closeTooltip();
                pinnedMarker = marker;
                marker.openPopup();
              });

              marker.on("popupclose", () => {
                if (pinnedMarker === marker) pinnedMarker = null;
              });
            }
          }

          marker.addTo(map);
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
