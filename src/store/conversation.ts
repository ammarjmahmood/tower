import db from "./db";

export interface ConversationState {
  phone: string;
  last_airport: string | null;
  last_metar_raw: string | null;
  last_command: string | null;
  awaiting_response: string | null;
  quiz_answer: string | null;
  quiz_explanation: string | null;
  scenario_context: string | null;
}

export function getConversation(phone: string): ConversationState {
  let state = db.query("SELECT * FROM conversation_state WHERE phone = ?").get(phone) as ConversationState | null;
  if (!state) {
    db.run("INSERT INTO conversation_state (phone) VALUES (?)", [phone]);
    state = db.query("SELECT * FROM conversation_state WHERE phone = ?").get(phone) as ConversationState;
  }
  return state;
}

export function setLastAirport(phone: string, icao: string, rawMetar: string): void {
  getConversation(phone);
  db.run(
    "UPDATE conversation_state SET last_airport = ?, last_metar_raw = ?, updated_at = datetime('now') WHERE phone = ?",
    [icao, rawMetar, phone]
  );
}

export function setLastCommand(phone: string, command: string): void {
  getConversation(phone);
  db.run(
    "UPDATE conversation_state SET last_command = ?, updated_at = datetime('now') WHERE phone = ?",
    [command, phone]
  );
}

export function setAwaitingResponse(phone: string, type: string | null, answer?: string, explanation?: string): void {
  getConversation(phone);
  db.run(
    "UPDATE conversation_state SET awaiting_response = ?, quiz_answer = ?, quiz_explanation = ?, updated_at = datetime('now') WHERE phone = ?",
    [type, answer ?? null, explanation ?? null, phone]
  );
}

export function setScenarioContext(phone: string, context: string | null): void {
  getConversation(phone);
  db.run(
    "UPDATE conversation_state SET scenario_context = ?, updated_at = datetime('now') WHERE phone = ?",
    [context, phone]
  );
}

export function clearAwaiting(phone: string): void {
  db.run(
    "UPDATE conversation_state SET awaiting_response = NULL, quiz_answer = NULL, quiz_explanation = NULL, scenario_context = NULL, updated_at = datetime('now') WHERE phone = ?",
    [phone]
  );
}
