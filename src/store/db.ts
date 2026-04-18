import { Database } from "bun:sqlite";
import { join } from "path";

const DB_PATH = join(import.meta.dir, "..", "..", "tower.db");

const db = new Database(DB_PATH, { create: true });

// Enable WAL mode for better concurrent performance
db.run("PRAGMA journal_mode = WAL");

// Run migrations
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    phone TEXT PRIMARY KEY,
    home_airport TEXT DEFAULT NULL,
    ceiling_minimum INTEGER DEFAULT 1000,
    visibility_minimum INTEGER DEFAULT 3,
    wake_time TEXT DEFAULT '0600',
    aircraft_type TEXT DEFAULT NULL,
    max_crosswind INTEGER DEFAULT 15,
    region TEXT DEFAULT 'GFACN33',
    timezone TEXT DEFAULT 'America/Toronto',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS flight_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    hours REAL NOT NULL,
    flight_type TEXT NOT NULL,
    airport TEXT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    logged_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (phone) REFERENCES users(phone)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS quiz_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    quiz_type TEXT NOT NULL,
    correct INTEGER NOT NULL,
    total INTEGER NOT NULL,
    last_question TEXT DEFAULT NULL,
    last_answer TEXT DEFAULT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (phone) REFERENCES users(phone)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS priorities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (phone) REFERENCES users(phone)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS conversation_state (
    phone TEXT PRIMARY KEY,
    last_airport TEXT DEFAULT NULL,
    last_metar_raw TEXT DEFAULT NULL,
    last_command TEXT DEFAULT NULL,
    awaiting_response TEXT DEFAULT NULL,
    quiz_answer TEXT DEFAULT NULL,
    quiz_explanation TEXT DEFAULT NULL,
    scenario_context TEXT DEFAULT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

export default db;
