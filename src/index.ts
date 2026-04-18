import { IMessageSDK } from "@photon-ai/imessage-kit";
import { routeMessage } from "./router";
import { getAllUsers } from "./store/preferences";
import { handleMorning } from "./commands/morning";
import { msUntilTime } from "./utils/time";

// Load env
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
    excludeOwnMessages: false, // We handle filtering ourselves
  },
});

console.log("Tower — Your Morning Copilot");
console.log("Listening for messages...");
if (MY_PHONE) console.log(`Scoped to: ${MY_PHONE}`);

// Known bot reply prefixes — if a message starts with any of these, it's our own reply echoing back
const BOT_REPLY_PREFIXES = [
  "tower — your morning copilot",
  "i didn't catch that",
  "set your home airport first",
  "✓ home airport set",
  "✓ minimums set",
  "✓ morning briefing set",
  "✓ aircraft set",
  "✓ priority set",
  "✓ priority completed",
  "✓ logged",
  "your settings:",
  "your flight log:",
  "currency check:",
  "no flights logged",
  "metar quiz:",
  "✓ correct!",
  "✗ not quite",
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
];

// Dedup exact messages within 5 seconds (blue/grey bubble duplicate when texting yourself)
const recentMessages = new Set<string>();

// Start watching for incoming messages
await sdk.startWatching({
  onMessage: async (msg: any) => {
    try {
      const text = msg.text?.trim();
      if (!text) return;

      const lower = text.toLowerCase();

      // Skip messages that start with known bot reply prefixes
      for (const prefix of BOT_REPLY_PREFIXES) {
        if (lower.startsWith(prefix)) {
          if (DEBUG) console.log(`[skip] Bot echo: ${text.slice(0, 50)}`);
          return;
        }
      }

      // Dedup exact messages within 5 seconds (handles blue/grey bubble duplication)
      if (recentMessages.has(lower)) {
        if (DEBUG) console.log(`[skip] Duplicate: ${text.slice(0, 50)}`);
        return;
      }
      recentMessages.add(lower);
      setTimeout(() => recentMessages.delete(lower), 5000);

      const sender = msg.sender ?? msg.participant ?? msg.handle ?? "";
      if (!sender) return;

      // If MY_PHONE is set, only respond to messages from that number
      if (MY_PHONE && !sender.includes(MY_PHONE.replace(/[^0-9]/g, ""))) {
        return;
      }

      if (DEBUG) console.log(`[${sender}] ${text}`);

      const result = await routeMessage(sender, text);

      // Send response
      if (result.images && result.images.length > 0) {
        await sdk.send(msg.chatId ?? sender, {
          text: result.text,
          attachments: result.images,
        });
      } else {
        await sdk.send(msg.chatId ?? sender, result.text);
      }

      if (DEBUG) console.log(`[→ ${sender}] ${result.text.slice(0, 80)}...`);
    } catch (error) {
      console.error("Error handling message:", error);
    }
  },
  onError: (error: any) => {
    console.error("SDK error:", error);
  },
});

// Schedule morning briefings
function scheduleMorningBriefings() {
  const users = getAllUsers();

  for (const user of users) {
    const ms = msUntilTime(user.wake_time, user.timezone);

    setTimeout(async () => {
      try {
        const result = await handleMorning(user.phone);
        if (result.images && result.images.length > 0) {
          await sdk.send(user.phone, {
            text: result.text,
            attachments: result.images,
          });
        } else {
          await sdk.send(user.phone, result.text);
        }
        if (DEBUG) console.log(`Morning briefing sent to ${user.phone}`);
      } catch (error) {
        console.error(`Morning briefing error for ${user.phone}:`, error);
      }

      // Reschedule for tomorrow
      scheduleMorningBriefings();
    }, ms);

    const wakeFormatted = `${user.wake_time.slice(0, 2)}:${user.wake_time.slice(2, 4)}`;
    console.log(`Scheduled morning briefing for ${user.phone} at ${wakeFormatted} ${user.timezone}`);
  }
}

scheduleMorningBriefings();

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down Tower...");
  sdk.stopWatching();
  process.exit(0);
});

process.on("SIGTERM", () => {
  sdk.stopWatching();
  process.exit(0);
});
