import { getOrCreateUser } from "../store/preferences";
import { setLastCommand } from "../store/conversation";
import { downloadGfa } from "../services/navcanada";
import { GFA_REGIONS } from "../utils/constants";

export async function handleGfa(phone: string): Promise<{ text: string; images?: string[] }> {
  const prefs = getOrCreateUser(phone);
  setLastCommand(phone, "gfa");

  const regionName = GFA_REGIONS[prefs.region] ?? prefs.region;

  try {
    const imagePath = await downloadGfa(prefs.region);
    return {
      text: `GFA — ${regionName} — Clouds, Turbulence & Icing`,
      images: [imagePath],
    };
  } catch (error: any) {
    return { text: `GFA download error: ${error.message}` };
  }
}
