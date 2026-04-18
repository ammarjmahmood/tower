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

const sdk = new IMessageSDK({ debug: DEBUG });

console.log("Tower — Your Morning Copilot");
console.log("Listening for messages...");
if (MY_PHONE) console.log(`Scoped to: ${MY_PHONE}`);

// Track recently sent messages to avoid feedback loop
const recentlySent = new Set<string>();
const DEDUP_WINDOW_MS = 30_000; // 30 seconds

function trackSent(text: string) {
  const key = text.trim().slice(0, 100);
  recentlySent.add(key);
  setTimeout(() => recentlySent.delete(key), DEDUP_WINDOW_MS);
}

function wasSentByUs(text: string): boolean {
  const key = text.trim().slice(0, 100);
  return recentlySent.has(key);
}

// Track message IDs we've already processed to prevent duplicates
const processedMessages = new Set<string>();
const PROCESSED_WINDOW_MS = 60_000;

// Start watching for incoming messages
await sdk.startWatching({
  onDirectMessage: async (msg: any) => {
    try {
      // Use the SDK's is_from_me flag if available
      if (msg.is_from_me || msg.isFromMe) return;

      const sender = msg.participant ?? msg.sender ?? msg.handle;
      const text = msg.text?.trim();

      if (!sender || !text) return;

      // If MY_PHONE is set, only respond to that number
      if (MY_PHONE && !sender.includes(MY_PHONE.replace(/[^0-9]/g, ""))) {
        return;
      }

      // Deduplicate by message ID if available
      const msgId = msg.guid ?? msg.id ?? msg.rowid;
      if (msgId) {
        if (processedMessages.has(String(msgId))) return;
        processedMessages.add(String(msgId));
        setTimeout(() => processedMessages.delete(String(msgId)), PROCESSED_WINDOW_MS);
      }

      // Skip if this looks like something we just sent (feedback loop prevention)
      if (wasSentByUs(text)) {
        if (DEBUG) console.log(`[skip] Echo detected: ${text.slice(0, 50)}`);
        return;
      }

      if (DEBUG) console.log(`[${sender}] ${text}`);

      const result = await routeMessage(sender, text);

      // Track our outgoing message to prevent echo loop
      trackSent(result.text);

      // Send response
      if (result.images && result.images.length > 0) {
        await sdk.send(sender, {
          text: result.text,
          attachments: result.images,
        });
      } else {
        await sdk.send(sender, result.text);
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
