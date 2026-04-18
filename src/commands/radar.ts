import { getOrCreateUser } from "../store/preferences";
import { setLastCommand } from "../store/conversation";
import { downloadRadar } from "../services/navcanada";

export async function handleRadar(phone: string): Promise<{ text: string; images?: string[] }> {
  const prefs = getOrCreateUser(phone);
  setLastCommand(phone, "radar");

  try {
    const imagePath = await downloadRadar();
    return {
      text: "Radar composite — current precipitation",
      images: [imagePath],
    };
  } catch (error: any) {
    return { text: `Radar download error: ${error.message}` };
  }
}
