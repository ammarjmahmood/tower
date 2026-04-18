import { fetchStation } from "../services/avwx";
import { getOrCreateUser, setHomeAirport, setMinimums, setWakeTime, setAircraft } from "../store/preferences";
import { setLastCommand } from "../store/conversation";
import { isValidICAO, normalizeICAO, getAirportName } from "../utils/icao";

export async function handleHome(phone: string, icao: string): Promise<{ text: string }> {
  setLastCommand(phone, "home");
  const code = normalizeICAO(icao);

  if (!isValidICAO(code)) {
    return { text: "Invalid airport code. Use a 4-letter ICAO code like CYTZ." };
  }

  // Validate via AVWX
  try {
    const station = await fetchStation(code);
    setHomeAirport(phone, code);
    const name = getAirportName(code) ?? station.name ?? code;
    return { text: `✓ Home airport set: ${code} — ${name}` };
  } catch {
    return { text: `I don't recognize that airport code: ${code}` };
  }
}

export async function handleMinimums(phone: string, input: string): Promise<{ text: string }> {
  setLastCommand(phone, "minimums");

  const parts = input.trim().split(/\s+/);
  const ceiling = parseInt(parts[0]);
  const visibility = parseFloat(parts[1]);

  if (isNaN(ceiling) || isNaN(visibility)) {
    return { text: "Usage: minimums 1000 3 (ceiling in ft, visibility in SM)" };
  }

  if (ceiling < 200 || ceiling > 10000) {
    return { text: "Ceiling must be between 200 and 10000 ft." };
  }

  if (visibility < 0.5 || visibility > 15) {
    return { text: "Visibility must be between 0.5 and 15 SM." };
  }

  setMinimums(phone, ceiling, visibility);
  return { text: `✓ Minimums set: ${ceiling}ft ceiling / ${visibility}SM visibility` };
}

export async function handleWake(phone: string, time: string): Promise<{ text: string }> {
  setLastCommand(phone, "wake");
  const t = time.trim().replace(":", "");

  if (!/^\d{4}$/.test(t)) {
    return { text: "Use 24hr format: wake 0600" };
  }

  const hours = parseInt(t.slice(0, 2));
  const mins = parseInt(t.slice(2, 4));
  if (hours > 23 || mins > 59) {
    return { text: "Invalid time. Use 0000–2359." };
  }

  setWakeTime(phone, t);
  return { text: `✓ Morning briefing set for ${t.slice(0, 2)}:${t.slice(2, 4)} local.` };
}

export async function handleAircraft(phone: string, aircraft: string): Promise<{ text: string }> {
  setLastCommand(phone, "aircraft");
  const ac = aircraft.trim().toUpperCase();

  if (!ac) {
    return { text: "Usage: aircraft C172" };
  }

  setAircraft(phone, ac);
  return { text: `✓ Aircraft set: ${ac}` };
}

export async function handleStatus(phone: string): Promise<{ text: string }> {
  setLastCommand(phone, "status");
  const prefs = getOrCreateUser(phone);
  const name = prefs.home_airport ? (getAirportName(prefs.home_airport) ?? "") : "";

  return {
    text: [
      "Your settings:",
      "",
      `Home: ${prefs.home_airport ?? "not set"}${name ? ` — ${name}` : ""}`,
      `Minimums: ${prefs.ceiling_minimum}ft / ${prefs.visibility_minimum}SM`,
      `Max crosswind: ${prefs.max_crosswind}kt`,
      `Wake time: ${prefs.wake_time.slice(0, 2)}:${prefs.wake_time.slice(2, 4)}`,
      `Aircraft: ${prefs.aircraft_type ?? "not set"}`,
      `Region: ${prefs.region}`,
      `Timezone: ${prefs.timezone}`,
    ].join("\n"),
  };
}
