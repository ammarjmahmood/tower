import type { AvwxMetar, AvwxStation } from "../services/avwx";
import { calculateCrosswind } from "./go-nogo";

export interface CrosswindBreakdown {
  runway: string;
  runwayHeading: number;
  crosswind: number;
  headwind: number;
  windDir: number;
  windSpeed: number;
  windGust: number | null;
  gustCrosswind: number | null;
}

export function calculateAllRunwayCrosswinds(
  metar: AvwxMetar,
  station: AvwxStation
): CrosswindBreakdown[] {
  const windDir = metar.wind_direction?.value;
  const windSpeed = metar.wind_speed?.value;

  if (windDir === undefined || windSpeed === undefined) return [];

  const results: CrosswindBreakdown[] = [];

  for (const rwy of station.runways) {
    for (const ident of [rwy.ident1, rwy.ident2]) {
      // Parse runway heading from ident (e.g., "08" → 80°, "26L" → 260°)
      const num = parseInt(ident.replace(/[LRC]/g, ""));
      if (isNaN(num)) continue;
      const heading = num * 10;

      const { crosswind, headwind } = calculateCrosswind(windDir, windSpeed, heading);

      let gustCrosswind: number | null = null;
      if (metar.wind_gust?.value) {
        const gustResult = calculateCrosswind(windDir, metar.wind_gust.value, heading);
        gustCrosswind = gustResult.crosswind;
      }

      results.push({
        runway: ident,
        runwayHeading: heading,
        crosswind,
        headwind,
        windDir,
        windSpeed,
        windGust: metar.wind_gust?.value ?? null,
        gustCrosswind,
      });
    }
  }

  return results;
}

export function formatCrosswindReport(breakdowns: CrosswindBreakdown[], maxCrosswind: number): string {
  if (breakdowns.length === 0) return "No runway data available.";

  const lines: string[] = ["Crosswind Breakdown:", ""];

  // Sort by lowest crosswind first (best runway)
  const sorted = [...breakdowns].sort((a, b) => a.crosswind - b.crosswind);

  for (const b of sorted) {
    const status = b.crosswind <= maxCrosswind ? "OK" : "EXCEEDS LIMIT";
    let line = `Rwy ${b.runway} (${b.runwayHeading}°): ${b.crosswind}kt crosswind, ${b.headwind}kt ${b.headwind >= 0 ? "headwind" : "tailwind"} — ${status}`;
    if (b.gustCrosswind !== null) {
      line += ` (gusts: ${b.gustCrosswind}kt xwind)`;
    }
    lines.push(line);
  }

  lines.push("");
  lines.push(`Wind: ${sorted[0].windDir}°@${sorted[0].windSpeed}kt${sorted[0].windGust ? `G${sorted[0].windGust}kt` : ""}`);
  lines.push(`Best runway: ${sorted[0].runway}`);

  return lines.join("\n");
}
