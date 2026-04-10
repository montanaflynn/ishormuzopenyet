export interface Ship {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: string;
  flag?: string;
  destination?: string;
  length?: number;
  width?: number;
  shipType?: string;
  elapsed?: number;
}

export const MAX_ELAPSED_MINUTES = 360;

export const AGE_BUCKETS: { key: string; label: string; max: number }[] = [
  { key: "1h", label: "≤ 1 hr", max: 60 },
  { key: "3h", label: "1 – 3 hr", max: 180 },
  { key: "6h", label: "3 – 6 hr", max: MAX_ELAPSED_MINUTES },
];

export const ageBucket = (elapsed: number | undefined): string => {
  if (elapsed == null || !Number.isFinite(elapsed)) return "";
  for (const b of AGE_BUCKETS) {
    if (elapsed <= b.max) return b.key;
  }
  return "";
};

export const SHIP_TYPE_BUCKETS: { key: string; label: string }[] = [
  { key: "cargo", label: "Cargo" },
  { key: "tanker", label: "Tanker" },
  { key: "tugs-and-special", label: "Tugs & Special" },
  { key: "pleasure", label: "Pleasure" },
  { key: "passenger", label: "Passenger" },
  { key: "fishing", label: "Fishing" },
  { key: "other", label: "Other" },
];

const SHIPTYPE_TO_BUCKET: Record<string, string> = {
  "7": "cargo",
  "8": "tanker",
  "3": "tugs-and-special",
  "9": "pleasure",
  "6": "passenger",
  "2": "fishing",
};

export const shipTypeBucket = (shipType: string | undefined): string => {
  if (shipType && SHIPTYPE_TO_BUCKET[shipType]) return SHIPTYPE_TO_BUCKET[shipType];
  return "other";
};

const BUCKET_LABEL: Record<string, string> = Object.fromEntries(
  SHIP_TYPE_BUCKETS.map((b) => [b.key, b.label])
);

export const shipTypeLabel = (shipType: string | undefined): string =>
  BUCKET_LABEL[shipTypeBucket(shipType)];

export const FLAG_NAMES: Record<string, string> = {
  AE: "UAE",
  AG: "Antigua & Barbuda",
  BB: "Barbados",
  BH: "Bahrain",
  BO: "Bolivia",
  BS: "Bahamas",
  BW: "Botswana",
  CM: "Cameroon",
  CN: "China",
  FR: "France",
  GM: "Gambia",
  GW: "Guinea-Bissau",
  GY: "Guyana",
  HK: "Hong Kong",
  IN: "India",
  IR: "Iran",
  IT: "Italy",
  KM: "Comoros",
  KN: "St Kitts & Nevis",
  KR: "South Korea",
  LR: "Liberia",
  MG: "Madagascar",
  MH: "Marshall Islands",
  MT: "Malta",
  NL: "Netherlands",
  NO: "Norway",
  OM: "Oman",
  PA: "Panama",
  PH: "Philippines",
  PW: "Palau",
  SA: "Saudi Arabia",
  SG: "Singapore",
  SM: "San Marino",
  ST: "São Tomé & Príncipe",
  TG: "Togo",
  TZ: "Tanzania",
  VC: "St Vincent & Grenadines",
};
