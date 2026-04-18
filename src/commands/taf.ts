import { fetchTaf } from "../services/avwx";
import { getOrCreateUser } from "../store/preferences";
import { setLastCommand } from "../store/conversation";
import { formatTafFull } from "../formatters/taf";

export async function handleTaf(phone: string, icao: string): Promise<{ text: string }> {
  const prefs = getOrCreateUser(phone);
  setLastCommand(phone, "taf");

  try {
    const taf = await fetchTaf(icao);
    const formatted = formatTafFull(taf, prefs);
    return { text: formatted };
  } catch (error: any) {
    return { text: `TAF error for ${icao}: ${error.message}` };
  }
}
