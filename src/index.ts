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

// ── Anti-loop: per-sender lock ────────────────────────────────────────
// While Tower is handling a message from a sender, ALL other messages
// from that sender are dropped. Lock stays for 15s after completion
// to catch late-arriving duplicates (send timeout is 10s).
const senderLock = new Set<string>();

// ── Anti-loop: bot echo prefixes ──────────────────────────────────────
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
];

function isBotEcho(text: string): boolean {
  const lower = text.toLowerCase();
  for (const prefix of BOT_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }
  // METAR/TAF decode replies: "CYYZ — Toronto Pearson" etc.
  if (/^[A-Z]{4} —/.test(text)) return true;
  return false;
}

// ── Message handler ───────────────────────────────────────────────────

await sdk.startWatching({
  onMessage: async (msg: any) => {
    try {
      // 1. Skip our own sent messages
      if (msg.isFromMe) return;

      const text = msg.text?.trim();
      if (!text) return;

      // 2. Skip bot echoes
      if (isBotEcho(text)) {
        if (DEBUG) console.log(`[skip:echo] ${text.slice(0, 50)}`);
        return;
      }

      // 3. Phone number filter
      const sender = msg.sender ?? msg.participant ?? msg.handle ?? "";
      if (!sender) return;
      if (MY_PHONE && !sender.includes(MY_PHONE.replace(/[^0-9]/g, ""))) return;

      // 4. Per-sender lock — only one message at a time per person
      if (senderLock.has(sender)) {
        if (DEBUG) console.log(`[skip:locked] ${text.slice(0, 50)}`);
        return;
      }
      senderLock.add(sender);

      console.log(`[${sender}] ${text}`);

      const result = await routeMessage(sender, text);

      // Send response
      const target = msg.chatId ?? sender;
      if (result.images && result.images.length > 0) {
        await sdk.send(target, { text: result.text, attachments: result.images }).catch(() => {});
      } else {
        await sdk.send(target, result.text).catch(() => {});
      }

      console.log(`[→ ${sender}] ${result.text.slice(0, 80)}...`);

      // Keep lock for 15s after send to catch late duplicates
      setTimeout(() => senderLock.delete(sender), 15_000);
    } catch (error) {
      console.error("Error handling message:", error);
      // Release lock on error so user isn't permanently stuck
      const sender = msg?.sender ?? msg?.participant ?? msg?.handle ?? "";
      if (sender) setTimeout(() => senderLock.delete(sender), 5_000);
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
      } catch (error) {
        console.error(`Morning briefing error for ${user.phone}:`, error);
      }
      scheduleMorningBriefings();
    }, ms);
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
