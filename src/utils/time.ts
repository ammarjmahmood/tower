/**
 * Convert a Zulu (UTC) time string to local time display
 */
export function zuluToLocal(zuluStr: string, timezone: string): string {
  // Parse METAR-style time: DDHHMMz
  const match = zuluStr.match(/^(\d{2})(\d{2})(\d{2})Z?$/i);
  if (!match) return zuluStr;

  const [, , hours, minutes] = match;
  const now = new Date();
  const utcDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), parseInt(hours), parseInt(minutes))
  );

  return utcDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  });
}

/**
 * Format a Date to HH:MM in a given timezone
 */
export function formatTime(date: Date, timezone: string): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
    timeZoneName: "short",
  });
}

/**
 * Format Zulu time like "1200Z (08:00 EDT)"
 */
export function formatZuluWithLocal(zuluStr: string, timezone: string): string {
  const local = zuluToLocal(zuluStr, timezone);
  return `${zuluStr.toUpperCase()} (${local})`;
}

/**
 * Get current time in a timezone
 */
export function nowInTimezone(timezone: string): Date {
  const str = new Date().toLocaleString("en-US", { timeZone: timezone });
  return new Date(str);
}

/**
 * Parse a 4-digit wake time (e.g. "0600") into hours and minutes
 */
export function parseWakeTime(time: string): { hours: number; minutes: number } {
  const h = parseInt(time.slice(0, 2));
  const m = parseInt(time.slice(2, 4));
  return { hours: h, minutes: m };
}

/**
 * Calculate ms until next occurrence of a given time in a timezone
 */
export function msUntilTime(wakeTime: string, timezone: string): number {
  const { hours, minutes } = parseWakeTime(wakeTime);
  const now = nowInTimezone(timezone);
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
}
