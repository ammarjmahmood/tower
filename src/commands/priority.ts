import { setPriority, getCurrentPriority, completePriority } from "../store/priorities";
import { setLastCommand } from "../store/conversation";

export async function handlePriority(phone: string, input: string): Promise<{ text: string }> {
  setLastCommand(phone, "priority");

  const text = input.trim();

  if (!text) {
    const current = getCurrentPriority(phone);
    if (current) {
      return { text: `Your priority: ${current}` };
    }
    return { text: "No priority set. Text priority: your task here" };
  }

  if (text.toLowerCase() === "done" || text.toLowerCase() === "complete") {
    const completed = completePriority(phone);
    if (completed) {
      return { text: "✓ Priority completed. Nice work." };
    }
    return { text: "No active priority to complete." };
  }

  setPriority(phone, text);
  return { text: `✓ Priority set: ${text}` };
}
