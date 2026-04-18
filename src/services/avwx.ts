const AVWX_BASE = "https://avwx.rest/api";
const TOKEN = process.env.AVWX_TOKEN!;

const headers = {
  Authorization: `BEARER ${TOKEN}`,
};

export interface AvwxMetar {
  raw: string;
  station: string;
  time: { repr: string; dt: string };
  flight_rules: string;
  wind_direction: { value: number; repr: string };
  wind_speed: { value: number; repr: string };
  wind_gust: { value: number; repr: string } | null;
  wind_variable_direction: { value: number; repr: string }[];
  visibility: { value: number; repr: string };
  clouds: { type: string; altitude: number; repr: string }[];
  temperature: { value: number; repr: string };
  dewpoint: { value: number; repr: string };
  altimeter: { value: number; repr: string };
  remarks: string;
  units: {
    altimeter: string;
    altitude: string;
    temperature: string;
    visibility: string;
    wind_speed: string;
  };
}

export interface AvwxTaf {
  raw: string;
  station: string;
  time: { repr: string; dt: string };
  forecast: AvwxTafForecast[];
}

export interface AvwxTafForecast {
  type: string;
  start_time: { repr: string; dt: string };
  end_time: { repr: string; dt: string };
  flight_rules: string;
  wind_direction: { value: number; repr: string } | null;
  wind_speed: { value: number; repr: string } | null;
  wind_gust: { value: number; repr: string } | null;
  visibility: { value: number; repr: string } | null;
  clouds: { type: string; altitude: number; repr: string }[];
  raw: string;
}

export interface AvwxStation {
  icao: string;
  name: string;
  city: string;
  country: string;
  elevation_ft: number;
  latitude: number;
  longitude: number;
  runways: { ident1: string; ident2: string; length_ft: number; width_ft: number }[];
}

export async function fetchMetar(icao: string): Promise<AvwxMetar> {
  const res = await fetch(`${AVWX_BASE}/metar/${icao}?options=info`, { headers });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AVWX METAR error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function fetchTaf(icao: string): Promise<AvwxTaf> {
  const res = await fetch(`${AVWX_BASE}/taf/${icao}`, { headers });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AVWX TAF error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function fetchStation(icao: string): Promise<AvwxStation> {
  const res = await fetch(`${AVWX_BASE}/station/${icao}`, { headers });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AVWX Station error ${res.status}: ${err}`);
  }
  return res.json();
}
