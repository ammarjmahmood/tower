import { fetchMetar, fetchTaf, fetchStation } from "./avwx";
import type { AvwxMetar, AvwxTaf, AvwxStation } from "./avwx";

const CACHE_TTL = 20 * 60 * 1000; // refresh every 20 minutes

interface CacheEntry {
  metar: AvwxMetar;
  taf: AvwxTaf;
  station: AvwxStation;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedWeather(icao: string): CacheEntry | null {
  const entry = cache.get(icao);
  if (!entry || Date.now() - entry.fetchedAt > CACHE_TTL) return null;
  return entry;
}

export async function prefetchWeather(icao: string): Promise<void> {
  const [metar, taf, station] = await Promise.all([
    fetchMetar(icao),
    fetchTaf(icao),
    fetchStation(icao),
  ]);
  cache.set(icao, { metar, taf, station, fetchedAt: Date.now() });
  console.log(`[Cache] Weather ready for ${icao}`);
}

export function startWeatherRefresh(getIcaos: () => string[]) {
  setInterval(async () => {
    for (const icao of new Set(getIcaos())) {
      await prefetchWeather(icao).catch((e) =>
        console.error(`[Cache] Refresh failed for ${icao}:`, e.message)
      );
    }
  }, CACHE_TTL);
}
