import db from "./db";
import { DEFAULT_PREFS } from "../utils/constants";

export interface UserPrefs {
  phone: string;
  home_airport: string | null;
  ceiling_minimum: number;
  visibility_minimum: number;
  wake_time: string;
  aircraft_type: string | null;
  max_crosswind: number;
  region: string;
  timezone: string;
}

export function getOrCreateUser(phone: string): UserPrefs {
  let user = db.query("SELECT * FROM users WHERE phone = ?").get(phone) as UserPrefs | null;
  if (!user) {
    db.run(
      `INSERT INTO users (phone, ceiling_minimum, visibility_minimum, wake_time, max_crosswind, region, timezone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [phone, DEFAULT_PREFS.ceiling_minimum, DEFAULT_PREFS.visibility_minimum, DEFAULT_PREFS.wake_time, DEFAULT_PREFS.max_crosswind, DEFAULT_PREFS.region, DEFAULT_PREFS.timezone]
    );
    user = db.query("SELECT * FROM users WHERE phone = ?").get(phone) as UserPrefs;
  }
  return user;
}

export function setHomeAirport(phone: string, icao: string): void {
  getOrCreateUser(phone);
  db.run("UPDATE users SET home_airport = ?, updated_at = datetime('now') WHERE phone = ?", [icao, phone]);
}

export function setMinimums(phone: string, ceiling: number, visibility: number): void {
  getOrCreateUser(phone);
  db.run("UPDATE users SET ceiling_minimum = ?, visibility_minimum = ?, updated_at = datetime('now') WHERE phone = ?", [ceiling, visibility, phone]);
}

export function setWakeTime(phone: string, time: string): void {
  getOrCreateUser(phone);
  db.run("UPDATE users SET wake_time = ?, updated_at = datetime('now') WHERE phone = ?", [time, phone]);
}

export function setAircraft(phone: string, aircraft: string): void {
  getOrCreateUser(phone);
  db.run("UPDATE users SET aircraft_type = ?, updated_at = datetime('now') WHERE phone = ?", [aircraft, phone]);
}

export function setRegion(phone: string, region: string): void {
  getOrCreateUser(phone);
  db.run("UPDATE users SET region = ?, updated_at = datetime('now') WHERE phone = ?", [region, phone]);
}

export function setTimezone(phone: string, tz: string): void {
  getOrCreateUser(phone);
  db.run("UPDATE users SET timezone = ?, updated_at = datetime('now') WHERE phone = ?", [tz, phone]);
}

export function getAllUsers(): UserPrefs[] {
  return db.query("SELECT * FROM users WHERE home_airport IS NOT NULL").all() as UserPrefs[];
}
