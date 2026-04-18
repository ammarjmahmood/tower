import { fetchMetar } from "../services/avwx";
import { getOrCreateUser } from "../store/preferences";
import { setLastAirport, setLastCommand } from "../store/conversation";
import { formatMetarFull } from "../formatters/metar";

export async function handleMetar(phone: string, icao: string): Promise<{ text: string }> {
  const prefs = getOrCreateUser(phone);
  setLastCommand(phone, "metar");

  try {
    const metar = await fetchMetar(icao);
    setLastAirport(phone, icao, metar.raw);
    const formatted = formatMetarFull(metar, prefs.timezone);
    return { text: formatted };
  } catch (error: any) {
    return { text: `METAR error for ${icao}: ${error.message}` };
  }
}
