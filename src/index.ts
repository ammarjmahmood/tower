import { IMessageSDK } from "@photon-ai/imessage-kit";
import { routeMessage } from "./router";
import { getAllUsers } from "./store/preferences";
import { handleMorning } from "./commands/morning";
import { msUntilTime } from "./utils/time";

const MY_PHONE = process.env.MY_PHONE;
const DEBUG = process.env.DEBUG === "true";

if (!process.env.AVWX_TOKEN) {
  console.error("Missing AVWX_TOKEN in .env");
  process.exit(1);
}
if (!process.env.AZURE_OPENAI_API_KEY) {
  console.error("Missing AZURE_OPENAI_API_KEY in .env");
  process.exit(1);
}

const sdk = new IMessageSDK({
  debug: DEBUG,
  watcher: {
    excludeOwnMessages: false,
  },
});

console.log("Tower — Your Morning Copilot");
console.log("Listening for messages...");
if (MY_PHONE) console.log(`Scoped to: ${MY_PHONE}`);

// ── Anti-loop protection ──────────────────────────────────────────────

// 1. Track processed message IDs so we never handle the same DB row twice
const processedIds = new Set<string>();

// 2. Track recent message text (30s window) — catches the blue/grey bubble
//    duplicate when texting yourself. 30s because the SDK send timeout is 10s.
const recentTexts = new Set<string>();

// 3. Every possible Tower reply starts with one of these prefixes.
//    If an incoming message matches, it's our own echo.
const BOT_PREFIXES = [
  "tower — your morning copilot",
  "i didn't catch that",
  "set your home airport first",
  "✓",
  "your settings:",
  "your flight log:",
  "currency check:",
  "no flights logged",
  "metar quiz:",
  "go/no-go scenario:",
  "correct answer:",
  "scenario generation error",
  "no active quiz",
  "no active scenario",
  "nothing to explain yet",
  "route briefing:",
  "crosswind breakdown:",
  "radar composite",
  "gfa —",
  "briefing error:",
  "metar error",
  "taf error",
  "winds error",
  "radar download error",
  "gfa download error",
  "invalid airport code",
  "invalid hours",
  "invalid flight type",
  "no runway data",
  "no valid airport codes",
  "no priority set",
  "no active priority",
  "usage:",
  "☀️ good morning",
  "⚠️ good morning",
  "🌙 good night",
  "evaluation error",
  "explain error",
  "score:",
  "i don't recognize",
  "use 24hr format",
  "invalid time",
  "ceiling must be",
  "visibility must be",
  // METAR decode replies start with the ICAO code like "CYYZ —"
  // TAF replies start with "CYYZ — TAF"
  // These are 4 uppercase letters followed by " —"
];

function isBotEcho(text: string): boolean {
  const lower = text.toLowerCase();
  for (const prefix of BOT_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }
  // Also catch METAR/TAF decode replies: "CYYZ — Toronto Pearson" etc.
  if (/^[A-Z]{4} —/.test(text)) return true;
  // Catch crosswind report replies
  if (/^[A-Z]{4} —.*\n/.test(text)) return true;
  return false;
}

// ── Message handler ───────────────────────────────────────────────────

await sdk.startWatching({
  onMessage: async (msg: any) => {
    try {
      // Layer 1: Skip messages we sent (isFromMe flag from iMessage DB)
      if (msg.isFromMe) {
        if (DEBUG) console.log(`[skip:fromMe] ${(msg.text ?? "").slice(0, 40)}`);
        return;
      }

      const text = msg.text?.trim();
      if (!text) return;

      // Layer 2: Skip known bot reply prefixes
      if (isBotEcho(text)) {
        if (DEBUG) console.log(`[skip:echo] ${text.slice(0, 50)}`);
        return;
      }

      // Layer 3: Skip by message ID (prevents re-processing same DB row)
      const msgId = String(msg.id ?? msg.guid ?? msg.rowid ?? "");
      if (msgId) {
        if (processedIds.has(msgId)) {
          if (DEBUG) console.log(`[skip:id] ${msgId}`);
          return;
        }
        processedIds.add(msgId);
        setTimeout(() => processedIds.delete(msgId), 120_000);
      }

      // Layer 4: Skip duplicate text within 30s (blue/grey bubble dedup)
      const textKey = text.toLowerCase();
      if (recentTexts.has(textKey)) {
        if (DEBUG) console.log(`[skip:dedup] ${text.slice(0, 50)}`);
        return;
      }
      recentTexts.add(textKey);
      setTimeout(() => recentTexts.delete(textKey), 30_000);

      // Layer 5: Phone number filter
      const sender = msg.sender ?? msg.participant ?? msg.handle ?? "";
      if (!sender) return;
      if (MY_PHONE && !sender.includes(MY_PHONE.replace(/[^0-9]/g, ""))) {
        return;
      }

      console.log(`[${sender}] ${text}`);

      const result = await routeMessage(sender, text);

      // Send response (use chatId if available, else phone number)
      const target = msg.chatId ?? sender;
      if (result.images && result.images.length > 0) {
        await sdk.send(target, {
          text: result.text,
          attachments: result.images,
        }).catch(() => {}); // Swallow send timeout errors — message still goes through
      } else {
        await sdk.send(target, result.text).catch(() => {});
      }

      console.log(`[→ ${sender}] ${result.text.slice(0, 80)}...`);
    } catch (error) {
      console.error("Error handling message:", error);
    }
  },
  onError: (error: any) => {
    console.error("SDK error:", error);
  },
});

// ── Scheduled morning briefings ───────────────────────────────────────

function scheduleMorningBriefings() {
  const users = getAllUsers();
  for (const user of users) {
    const ms = msUntilTime(user.wake_time, user.timezone);
    setTimeout(async () => {
      try {
        const result = await handleMorning(user.phone);
        if (result.images && result.images.length > 0) {
          await sdk.send(user.phone, { text: result.text, attachments: result.images }).catch(() => {});
        } else {
          await sdk.send(user.phone, result.text).catch(() => {});
        }
        if (DEBUG) console.log(`Morning briefing sent to ${user.phone}`);
      } catch (error) {
        console.error(`Morning briefing error for ${user.phone}:`, error);
      }
      scheduleMorningBriefings();
    }, ms);
    const wakeFormatted = `${user.wake_time.slice(0, 2)}:${user.wake_time.slice(2, 4)}`;
    console.log(`Scheduled morning briefing for ${user.phone} at ${wakeFormatted} ${user.timezone}`);
  }
}

scheduleMorningBriefings();

process.on("SIGINT", () => {
  console.log("\nShutting down Tower...");
  sdk.stopWatching();
  process.exit(0);
});

process.on("SIGTERM", () => {
  sdk.stopWatching();
  process.exit(0);
});
