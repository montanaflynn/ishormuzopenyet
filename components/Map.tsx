"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ShipsResponse } from "@/lib/types";

const CENTER: L.LatLngExpression = [26.6, 56.5];
const ZOOM = 9;

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

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const map = L.map(mapRef.current, {
      center: CENTER,
      zoom: ZOOM,
      zoomControl: false,
      attributionControl: false,
      minZoom: 7,
      maxZoom: 11,
    });

    let cancelled = false;
    leafletMap.current = map;

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd" }
    ).addTo(map);

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

    // Fetch and render ships
    fetch("/api/ships")
      .then((res) => res.json())
      .then((data: ShipsResponse) => {
        if (cancelled) return;

        data.ships.forEach((ship) => {
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

          if (ship.name) {
            marker.bindTooltip(ship.name, {
              className: "ship-tooltip",
              direction: "top",
              offset: [0, -8],
            });
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
