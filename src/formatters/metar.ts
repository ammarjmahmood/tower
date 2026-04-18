import type { AvwxMetar } from "../services/avwx";
import { getAirportName } from "../utils/icao";
import { formatZuluWithLocal } from "../utils/time";

function formatWind(metar: AvwxMetar): string {
  const dir = metar.wind_direction?.repr ?? "VRB";
  const spd = metar.wind_speed?.value ?? 0;
  const gust = metar.wind_gust?.value;
  let wind = `${dir}@${spd}kt`;
  if (gust) wind += `G${gust}kt`;
  return wind;
}

function formatClouds(metar: AvwxMetar): string {
  if (!metar.clouds || metar.clouds.length === 0) return "CLR";
  return metar.clouds
    .map((c) => {
      if (c.type === "CLR" || c.type === "SKC") return "CLR";
      return `${c.type} ${c.altitude * 100}ft`;
    })
    .join(", ");
}

function getCeiling(metar: AvwxMetar): string {
  if (!metar.clouds || metar.clouds.length === 0) return "CLR (no ceiling)";
  const ceilingLayer = metar.clouds.find(
    (c) => c.type === "BKN" || c.type === "OVC" || c.type === "VV"
  );
  if (!ceilingLayer) return "no ceiling";
  if (ceilingLayer.type === "VV") return `VV ${ceilingLayer.altitude * 100}ft`;
  return `${ceilingLayer.type} ${ceilingLayer.altitude * 100}ft`;
}

function flightRulesEmoji(rules: string): string {
  switch (rules) {
    case "VFR": return "✓";
    case "MVFR": return "⚠️";
    case "IFR": return "✗";
    case "LIFR": return "✗✗";
    default: return "?";
  }
}

export function formatMetarFull(metar: AvwxMetar, timezone: string): string {
  const name = getAirportName(metar.station) ?? metar.station;
  const obsTime = formatZuluWithLocal(metar.time.repr, timezone);
  const vis = metar.visibility?.repr ?? "N/A";
  const temp = metar.temperature?.value ?? "N/A";
  const dew = metar.dewpoint?.value ?? "N/A";
  const alt = metar.altimeter?.value ?? "N/A";

  return [
    `${metar.station} — ${name}`,
    `Observed: ${obsTime}`,
    "",
    `Flight Rules: ${metar.flight_rules} ${flightRulesEmoji(metar.flight_rules)}`,
    `Wind: ${formatWind(metar)}`,
    `Visibility: ${vis}`,
    `Ceiling: ${getCeiling(metar)}`,
    `Temperature: ${temp}°C / Dewpoint: ${dew}°C`,
    `Altimeter: ${alt}`,
    "",
    `Raw: ${metar.raw}`,
  ].join("\n");
}

export function formatMetarBrief(metar: AvwxMetar): string {
  const ceiling = getCeiling(metar);
  const vis = metar.visibility?.repr ?? "N/A";
  const wind = formatWind(metar);
  const temp = metar.temperature?.value ?? "?";
  const dew = metar.dewpoint?.value ?? "?";

  return [
    `Ceiling ${ceiling}, Vis ${vis}, Wind ${wind}`,
    `Temp ${temp}°C / Dew ${dew}°C`,
  ].join("\n");
}

export { formatWind, getCeiling, flightRulesEmoji };
