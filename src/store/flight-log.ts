import db from "./db";
import { getOrCreateUser } from "./preferences";

export interface FlightEntry {
  id: number;
  phone: string;
  hours: number;
  flight_type: string;
  airport: string | null;
  notes: string | null;
  logged_at: string;
}

export interface FlightTotals {
  dual: number;
  solo: number;
  xc: number;
  sim: number;
  total: number;
}

export function logFlight(phone: string, hours: number, flightType: string, airport?: string, notes?: string): void {
  getOrCreateUser(phone);
  db.run(
    "INSERT INTO flight_log (phone, hours, flight_type, airport, notes) VALUES (?, ?, ?, ?, ?)",
    [phone, hours, flightType.toLowerCase(), airport ?? null, notes ?? null]
  );
}

export function getFlightTotals(phone: string): FlightTotals {
  const rows = db.query(
    "SELECT flight_type, SUM(hours) as total FROM flight_log WHERE phone = ? GROUP BY flight_type"
  ).all(phone) as { flight_type: string; total: number }[];

  const totals: FlightTotals = { dual: 0, solo: 0, xc: 0, sim: 0, total: 0 };
  for (const row of rows) {
    const key = row.flight_type as keyof Omit<FlightTotals, "total">;
    if (key in totals) {
      totals[key] = row.total;
    }
    totals.total += row.total;
  }
  return totals;
}

export function getRecentFlights(phone: string, days: number = 30): FlightEntry[] {
  return db.query(
    "SELECT * FROM flight_log WHERE phone = ? AND logged_at >= datetime('now', ? || ' days') ORDER BY logged_at DESC",
  ).all(phone, `-${days}`) as FlightEntry[];
}

export function getLastFlight(phone: string): FlightEntry | null {
  return db.query(
    "SELECT * FROM flight_log WHERE phone = ? ORDER BY logged_at DESC LIMIT 1"
  ).get(phone) as FlightEntry | null;
}
