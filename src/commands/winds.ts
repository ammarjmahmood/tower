import { fetchMetar, fetchStation } from "../services/avwx";
import { getOrCreateUser } from "../store/preferences";
import { setLastCommand } from "../store/conversation";
import { calculateAllRunwayCrosswinds, formatCrosswindReport } from "../formatters/crosswind";

export async function handleWinds(phone: string, icao: string): Promise<{ text: string }> {
  const prefs = getOrCreateUser(phone);
  setLastCommand(phone, "winds");

  try {
    const [metar, station] = await Promise.all([fetchMetar(icao), fetchStation(icao)]);

    if (!station.runways || station.runways.length === 0) {
      return { text: `No runway data available for ${icao}.` };
    }

    const breakdowns = calculateAllRunwayCrosswinds(metar, station);
    const report = formatCrosswindReport(breakdowns, prefs.max_crosswind);

    return { text: `${icao} — ${station.name ?? icao}\n\n${report}` };
  } catch (error: any) {
    return { text: `Winds error for ${icao}: ${error.message}` };
  }
}
