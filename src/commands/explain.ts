import { getConversation } from "../store/conversation";
import { setLastCommand } from "../store/conversation";
import { explainMetar } from "../services/azure-openai";

export async function handleExplain(phone: string): Promise<{ text: string }> {
  setLastCommand(phone, "explain");

  const state = getConversation(phone);

  if (!state.last_metar_raw) {
    return { text: "Nothing to explain yet. Text an airport code first (e.g. CYTZ)." };
  }

  try {
    const explanation = await explainMetar(state.last_metar_raw);
    return { text: explanation };
  } catch (error: any) {
    return { text: `Explain error: ${error.message}` };
  }
}
