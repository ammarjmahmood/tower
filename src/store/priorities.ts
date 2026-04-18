import db from "./db";
import { getOrCreateUser } from "./preferences";

export function setPriority(phone: string, text: string): void {
  getOrCreateUser(phone);
  // Mark old priorities as completed
  db.run("UPDATE priorities SET completed = 1 WHERE phone = ? AND completed = 0", [phone]);
  db.run("INSERT INTO priorities (phone, text) VALUES (?, ?)", [phone, text]);
}

export function getCurrentPriority(phone: string): string | null {
  const row = db.query(
    "SELECT text FROM priorities WHERE phone = ? AND completed = 0 ORDER BY created_at DESC LIMIT 1"
  ).get(phone) as { text: string } | null;
  return row?.text ?? null;
}

export function completePriority(phone: string): boolean {
  const result = db.run(
    "UPDATE priorities SET completed = 1 WHERE phone = ? AND completed = 0",
    [phone]
  );
  return result.changes > 0;
}
