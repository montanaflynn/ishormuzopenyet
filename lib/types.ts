export interface Ship {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: string;
}

export interface ShipsResponse {
  ships: Ship[];
  isOpen: boolean;
  lastUpdated: string;
}
