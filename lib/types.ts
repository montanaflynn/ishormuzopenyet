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
}

export const SHIP_TYPE_LABELS: Record<string, string> = {
  "1": "Vessel",
  "3": "Fishing",
  "6": "Passenger",
  "7": "Cargo",
  "8": "Tanker",
};

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
