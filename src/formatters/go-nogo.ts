import type { AvwxMetar } from "../services/avwx";
import type { UserPrefs } from "../store/preferences";

export interface GoNoGoResult {
  decision: "GO" | "CAUTION" | "NO GO";
  reasons: string[];
  flightRules: string;
}

function getCeilingFt(metar: AvwxMetar): number | null {
  if (!metar.clouds || metar.clouds.length === 0) return null; // CLR = unlimited
  const ceiling = metar.clouds.find(
    (c) => c.type === "BKN" || c.type === "OVC" || c.type === "VV"
  );
  if (!ceiling) return null; // FEW/SCT only = no ceiling
  return ceiling.altitude * 100;
}

export function calculateCrosswind(
  windDir: number,
  windSpeed: number,
  runwayHeading: number
): { crosswind: number; headwind: number } {
  const diff = ((windDir - runwayHeading + 360) % 360) * (Math.PI / 180);
  return {
    crosswind: Math.abs(Math.round(windSpeed * Math.sin(diff))),
    headwind: Math.round(windSpeed * Math.cos(diff)),
  };
}

export function evaluateGoNoGo(metar: AvwxMetar, prefs: UserPrefs, runwayHeading?: number): GoNoGoResult {
  const reasons: string[] = [];
  let decision: "GO" | "CAUTION" | "NO GO" = "GO";

  // Check flight rules
  const rules = metar.flight_rules;
  if (rules === "IFR" || rules === "LIFR") {
    decision = "NO GO";
    reasons.push(`Flight rules: ${rules}`);
  } else if (rules === "MVFR") {
    decision = "CAUTION";
    reasons.push("Flight rules: MVFR — marginal conditions");
  }

  // Check ceiling against minimums
  const ceiling = getCeilingFt(metar);
  if (ceiling !== null && ceiling < prefs.ceiling_minimum) {
    decision = "NO GO";
    reasons.push(`Ceiling ${ceiling}ft below your minimum of ${prefs.ceiling_minimum}ft`);
  }

  // Check visibility against minimums
  const vis = metar.visibility?.value ?? 99;
  if (vis < prefs.visibility_minimum) {
    decision = "NO GO";
    reasons.push(`Visibility ${vis}SM below your minimum of ${prefs.visibility_minimum}SM`);
  }

  // Check crosswind
  if (runwayHeading !== undefined && metar.wind_direction?.value !== undefined && metar.wind_speed?.value !== undefined) {
    const windSpeed = metar.wind_gust?.value ?? metar.wind_speed.value;
    const { crosswind } = calculateCrosswind(metar.wind_direction.value, windSpeed, runwayHeading);

    if (crosswind > prefs.max_crosswind + 5) {
      decision = "NO GO";
      reasons.push(`Crosswind ${crosswind}kt exceeds your limit of ${prefs.max_crosswind}kt (with gusts)`);
    } else if (crosswind > prefs.max_crosswind) {
      if (decision === "GO") decision = "CAUTION";
      reasons.push(`Crosswind ${crosswind}kt near your limit of ${prefs.max_crosswind}kt`);
    }
  }

  // Check gusts
  if (metar.wind_gust?.value) {
    const gustFactor = metar.wind_gust.value - (metar.wind_speed?.value ?? 0);
    if (gustFactor > 15) {
      if (decision === "GO") decision = "CAUTION";
      reasons.push(`Strong gusts: ${metar.wind_gust.value}kt (${gustFactor}kt above sustained)`);
    }
  }

  if (reasons.length === 0) {
    reasons.push("All conditions within your personal minimums");
  }

  return { decision, reasons, flightRules: rules };
}

export function formatGoNoGo(result: GoNoGoResult): string {
  const icon = result.decision === "GO" ? "✓" : result.decision === "CAUTION" ? "⚠️" : "✗";
  return `${result.flightRules} ${result.decision} ${icon}`;
}
