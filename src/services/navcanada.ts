import { join } from "path";

const IMAGES_DIR = join(import.meta.dir, "..", "..", "images");

/**
 * Get GFA (Graphic Area Forecast) chart URL for a given region
 */
export function getGfaUrl(region: string): string {
  return `https://plan.navcanada.ca/weather/images/prog/gfa/latest/${region}_clds_turb_icg.png`;
}

/**
 * Download an image from a URL and save it locally
 */
export async function downloadImage(url: string, filename: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed: ${res.status} from ${url}`);

  const buffer = await res.arrayBuffer();
  const filepath = join(IMAGES_DIR, filename);
  await Bun.write(filepath, buffer);
  return filepath;
}

/**
 * Get radar composite URL for a Canadian radar station
 */
export function getRadarUrl(station: string = "WKR"): string {
  // Use Environment Canada's latest radar composite
  return `https://radar.weather.gc.ca/radar/PRECIPET/GIF/${station}/${station}_PRECIPET_RAIN.gif`;
}

/**
 * Download the GFA chart for a region and return the file path
 */
export async function downloadGfa(region: string): Promise<string> {
  const url = getGfaUrl(region);
  return downloadImage(url, `gfa_${region}.png`);
}

/**
 * Download radar image and return the file path
 */
export async function downloadRadar(station: string = "WKR"): Promise<string> {
  const url = getRadarUrl(station);
  return downloadImage(url, `radar_${station}.gif`);
}
