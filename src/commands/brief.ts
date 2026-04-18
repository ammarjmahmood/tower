import { fetchMetar } from "../services/avwx";
import { getOrCreateUser } from "../store/preferences";
import { setLastCommand } from "../store/conversation";
import { formatMetarBrief, flightRulesEmoji } from "../formatters/metar";
import { getAirportName } from "../utils/icao";
import { isValidICAO, normalizeICAO } from "../utils/icao";

export async function handleBrief(phone: string, airports: string[]): Promise<{ text: string }> {
  const prefs = getOrCreateUser(phone);
  setLastCommand(phone, "brief");

  const valid = airports.map(normalizeICAO).filter(isValidICAO);
  if (valid.length === 0) {
    return { text: "No valid airport codes found. Example: brief CYTZ KBUF" };
  }

  try {
    const metars = await Promise.all(valid.map((icao) => fetchMetar(icao)));

    const lines = ["Route Briefing:", ""];

    for (const metar of metars) {
      const name = getAirportName(metar.station) ?? metar.station;
      const icon = flightRulesEmoji(metar.flight_rules);
      const brief = formatMetarBrief(metar);
      lines.push(`${metar.station} — ${name}`);
      lines.push(`${metar.flight_rules} ${icon}`);
      lines.push(brief);
      lines.push("");
    }

    return { text: lines.join("\n").trim() };
  } catch (error: any) {
    return { text: `Route briefing error: ${error.message}` };
  }
}
