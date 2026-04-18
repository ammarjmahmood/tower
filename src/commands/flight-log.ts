import { logFlight, getFlightTotals, getRecentFlights, getLastFlight } from "../store/flight-log";
import { setLastCommand } from "../store/conversation";

export async function handleLogFlight(phone: string, input: string): Promise<{ text: string }> {
  setLastCommand(phone, "flew");

  // Parse: "flew 1.2 dual CYTZ circuits"
  // Or: "1.2 dual CYTZ circuits" (after stripping "flew ")
  const parts = input.trim().split(/\s+/);
  const hours = parseFloat(parts[0]);

  if (isNaN(hours) || hours <= 0 || hours > 24) {
    return { text: "Invalid hours. Example: flew 1.2 dual CYTZ" };
  }

  const flightType = (parts[1] ?? "dual").toLowerCase();
  const validTypes = ["solo", "dual", "xc", "sim"];
  if (!validTypes.includes(flightType)) {
    return { text: `Invalid flight type. Use: ${validTypes.join(", ")}` };
  }

  const airport = parts[2]?.match(/^[A-Z]{4}$/i) ? parts[2].toUpperCase() : undefined;
  const notes = parts.slice(airport ? 3 : 2).join(" ") || undefined;

  logFlight(phone, hours, flightType, airport, notes);
  const totals = getFlightTotals(phone);

  return {
    text: [
      `✓ Logged ${hours}h ${flightType}${airport ? ` at ${airport}` : ""}${notes ? ` — ${notes}` : ""}`,
      "",
      `Total: ${totals.total.toFixed(1)}h (Dual: ${totals.dual.toFixed(1)}, Solo: ${totals.solo.toFixed(1)}, XC: ${totals.xc.toFixed(1)}, Sim: ${totals.sim.toFixed(1)})`,
    ].join("\n"),
  };
}

export async function handleHours(phone: string): Promise<{ text: string }> {
  setLastCommand(phone, "hours");
  const totals = getFlightTotals(phone);

  return {
    text: [
      "Your flight log:",
      `  Dual:  ${totals.dual.toFixed(1)} hrs`,
      `  Solo:  ${totals.solo.toFixed(1)} hrs`,
      `  XC:    ${totals.xc.toFixed(1)} hrs`,
      `  Sim:   ${totals.sim.toFixed(1)} hrs`,
      `  Total: ${totals.total.toFixed(1)} hrs`,
    ].join("\n"),
  };
}

export async function handleCurrency(phone: string): Promise<{ text: string }> {
  setLastCommand(phone, "currency");

  const recent30 = getRecentFlights(phone, 30);
  const recent90 = getRecentFlights(phone, 90);
  const last = getLastFlight(phone);

  const lines = ["Currency Check:", ""];

  if (!last) {
    lines.push("No flights logged yet. Text flew 1.2 dual to get started.");
    return { text: lines.join("\n") };
  }

  // 30-day recency
  if (recent30.length > 0) {
    const total30 = recent30.reduce((sum, f) => sum + f.hours, 0);
    lines.push(`✓ Active — ${recent30.length} flight(s), ${total30.toFixed(1)}h in last 30 days`);
  } else {
    lines.push("⚠️ No flights in last 30 days — consider a refresher");
  }

  // 90-day for passenger carrying (approximate)
  if (recent90.length >= 3) {
    lines.push(`✓ ${recent90.length} flights in last 90 days (passenger currency likely met*)`);
  } else {
    lines.push(`⚠️ Only ${recent90.length} flight(s) in last 90 days — check 3 T/O & landing requirement`);
  }

  lines.push("");
  lines.push(`Last flight: ${last.hours}h ${last.flight_type} on ${last.logged_at.split("T")[0]}`);
  lines.push("");
  lines.push("*Based on logged flights only. Verify takeoff/landing counts separately.");

  return { text: lines.join("\n") };
}
