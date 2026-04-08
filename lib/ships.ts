import type { Ship } from "./types";
import fs from "fs";
import path from "path";

interface MarineTrafficRow {
  LAT: string;
  LON: string;
  SPEED: string | null;
  COURSE: string | null;
  HEADING: string | null;
  SHIPNAME: string;
  SHIPTYPE: string;
  SHIP_ID: string;
  FLAG?: string;
  LENGTH?: string;
  DWT?: string;
}

interface MarineTrafficResponse {
  type: number;
  data: {
    rows: MarineTrafficRow[];
    areaShips: number;
  };
}

function parseMarineTrafficData(data: MarineTrafficResponse): Ship[] {
  return data.data.rows
    .filter((row) => row.LAT && row.LON && !row.SHIPNAME.includes("[SAT-AIS]"))
    .map((row) => {
      const speed = row.SPEED ? parseInt(row.SPEED, 10) / 10 : 0;
      const course = row.COURSE ? parseInt(row.COURSE, 10) / 10 : 0;
      const heading = row.HEADING ? parseInt(row.HEADING, 10) : course;

      return {
        mmsi: 0,
        name: row.SHIPNAME,
        lat: parseFloat(row.LAT),
        lng: parseFloat(row.LON),
        heading,
        speed,
        timestamp: new Date().toISOString(),
      };
    });
}

export async function getShips(): Promise<Ship[]> {
  // For now, use cached MarineTraffic data
  // TODO: Replace with live API when available
  const filePath = path.join(process.cwd(), "data", "sample-marinetraffic.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const data: MarineTrafficResponse = JSON.parse(raw);
  return parseMarineTrafficData(data);
}
