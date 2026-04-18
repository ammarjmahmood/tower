import { getConversation } from "./store/conversation";
import { handleMorning } from "./commands/morning";
import { handleNight } from "./commands/night";
import { handleMetar } from "./commands/metar";
import { handleTaf } from "./commands/taf";
import { handleBrief } from "./commands/brief";
import { handleWinds } from "./commands/winds";
import { handleRadar } from "./commands/radar";
import { handleGfa } from "./commands/gfa";
import { handleQuiz, handleQuizAnswer } from "./commands/quiz";
import { handleScenario, handleScenarioAnswer } from "./commands/scenario";
import { handleExplain } from "./commands/explain";
import { handleLogFlight, handleHours, handleCurrency } from "./commands/flight-log";
import { handlePriority } from "./commands/priority";
import { handleHome, handleMinimums, handleWake, handleAircraft, handleStatus } from "./commands/settings";
import { handleHelp } from "./commands/help";
import { isValidICAO } from "./utils/icao";

export interface CommandResult {
  text: string;
  images?: string[];
}

export async function routeMessage(phone: string, message: string): Promise<CommandResult> {
  const text = message.trim();
  const lower = text.toLowerCase();

  // 1. Check if we're awaiting a response (quiz answer, scenario answer)
  const state = getConversation(phone);
  if (state.awaiting_response === "quiz") {
    return handleQuizAnswer(phone, text);
  }
  if (state.awaiting_response === "scenario") {
    return handleScenarioAnswer(phone, text);
  }

  // 2. Exact matches
  if (["gm", "good morning", "morning"].includes(lower)) {
    return handleMorning(phone);
  }

  if (["gn", "good night", "night"].includes(lower)) {
    return handleNight(phone);
  }

  if (lower === "quiz") {
    return handleQuiz(phone);
  }

  if (lower === "scenario") {
    return handleScenario(phone);
  }

  if (lower === "explain") {
    return handleExplain(phone);
  }

  if (lower === "help") {
    return handleHelp();
  }

  if (lower === "status") {
    return handleStatus(phone);
  }

  if (lower === "hours") {
    return handleHours(phone);
  }

  if (lower === "currency") {
    return handleCurrency(phone);
  }

  if (lower === "radar") {
    return handleRadar(phone);
  }

  if (lower === "gfa") {
    return handleGfa(phone);
  }

  // 3. Prefix matches
  if (lower.startsWith("home ")) {
    return handleHome(phone, text.slice(5));
  }

  if (lower.startsWith("minimums ")) {
    return handleMinimums(phone, text.slice(9));
  }

  if (lower.startsWith("wake ")) {
    return handleWake(phone, text.slice(5));
  }

  if (lower.startsWith("aircraft ")) {
    return handleAircraft(phone, text.slice(9));
  }

  if (lower.startsWith("priority:") || lower.startsWith("priority ")) {
    const content = text.replace(/^priority[:\s]\s*/i, "");
    return handlePriority(phone, content);
  }

  if (lower.startsWith("flew ")) {
    return handleLogFlight(phone, text.slice(5));
  }

  if (lower.startsWith("taf ")) {
    const icao = text.slice(4).trim().toUpperCase();
    if (isValidICAO(icao)) {
      return handleTaf(phone, icao);
    }
    return { text: "Invalid airport code. Example: taf CYTZ" };
  }

  if (lower.startsWith("brief ")) {
    const airports = text.slice(6).trim().split(/\s+/);
    return handleBrief(phone, airports);
  }

  if (lower.startsWith("winds ")) {
    const icao = text.slice(6).trim().toUpperCase();
    if (isValidICAO(icao)) {
      return handleWinds(phone, icao);
    }
    return { text: "Invalid airport code. Example: winds CYTZ" };
  }

  if (lower.startsWith("metar ")) {
    const icao = text.slice(6).trim().toUpperCase();
    if (isValidICAO(icao)) {
      return handleMetar(phone, icao);
    }
    return { text: "Invalid airport code. Example: metar CYYZ" };
  }

  // 4. Bare ICAO code → METAR
  const upperText = text.toUpperCase();
  if (/^[A-Z]{4}$/.test(upperText) && isValidICAO(upperText)) {
    return handleMetar(phone, upperText);
  }

  // 5. Fallback
  return { text: "I didn't catch that. Text help for commands." };
}
