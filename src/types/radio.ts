export interface Station {
  id: string;
  title: string;
  city: string;
  country: string;
  region?: string;
  placeId?: string;
  geo?: [number, number]; // [lng, lat]
  coordinates: {
    lat: number;
    lng: number;
    display: string;
  };
  frequency: number; // in MHz
  frequencyDisplay: string;
  callsign: string;
  track: string;
  artist?: string;
  genre?: string;
  mapPosition: {
    x: number; // percentage left 0..100
    y: number; // percentage top 0..100
  };
  accentColor: 'primary' | 'secondary' | 'tertiary';
  utcOffset?: number;
  weather?: {
    temp: string;
    condition: string;
  };
  rssi?: number;
  bitrate?: string;
  streamUrl?: string;
  directStreamUrl?: string;
  radioGardenUrl?: string;
  website?: string;
  source?: 'radio.garden' | 'curated';
}

export interface RadioGardenPlace {
  id: string;
  title: string;
  country: string;
  geo: [number, number];
  mapPosition: { x: number; y: number };
  stationCount: number;
}
