import type { AvwxTaf, AvwxTafForecast } from "../services/avwx";
import type { UserPrefs } from "../store/preferences";
import { getAirportName } from "../utils/icao";

function formatPeriodWind(f: AvwxTafForecast): string {
  if (!f.wind_direction || !f.wind_speed) return "calm";
  let wind = `${f.wind_direction.repr}@${f.wind_speed.value}`;
  if (f.wind_gust) wind += `G${f.wind_gust.value}`;
  return wind;
}

function formatPeriodClouds(f: AvwxTafForecast): string {
  if (!f.clouds || f.clouds.length === 0) return "CLR";
  return f.clouds.map((c) => `${c.type} ${c.altitude * 100}`).join(", ");
}

function flightRulesIcon(rules: string): string {
  switch (rules) {
    case "VFR": return "✓";
    case "MVFR": return "⚠️";
    case "IFR": return "✗";
    case "LIFR": return "✗✗";
    default: return "?";
  }
}

function checkMinimums(f: AvwxTafForecast, prefs: UserPrefs): string[] {
  const warnings: string[] = [];
  const ceiling = f.clouds?.find((c) => c.type === "BKN" || c.type === "OVC" || c.type === "VV");
  if (ceiling && ceiling.altitude * 100 < prefs.ceiling_minimum) {
    warnings.push(`✗ Below your ceiling minimum (${ceiling.altitude * 100}ft < ${prefs.ceiling_minimum}ft)`);
  }
  if (f.visibility && f.visibility.value < prefs.visibility_minimum) {
    warnings.push(`✗ Below your visibility minimum (${f.visibility.value}SM < ${prefs.visibility_minimum}SM)`);
  }
  return warnings;
}

export function formatTafFull(taf: AvwxTaf, prefs: UserPrefs): string {
  const name = getAirportName(taf.station) ?? taf.station;
  const lines: string[] = [
    `${taf.station} — TAF`,
    "",
  ];

  for (const f of taf.forecast) {
    const start = f.start_time.repr;
    const end = f.end_time.repr;
    const type = f.type !== "FROM" ? ` (${f.type})` : "";
    const icon = flightRulesIcon(f.flight_rules);

    lines.push(`${start} → ${end}${type}: ${f.flight_rules} ${icon}`);
    lines.push(`  Wind ${formatPeriodWind(f)}, vis ${f.visibility?.repr ?? "N/A"}, ${formatPeriodClouds(f)}`);

    const warnings = checkMinimums(f, prefs);
    for (const w of warnings) {
      lines.push(`  ${w}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
