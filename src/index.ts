import { IMessageSDK } from "@photon-ai/imessage-kit";
import { routeMessage } from "./router";
import { getAllUsers } from "./store/preferences";
import { handleMorning } from "./commands/morning";
import { msUntilTime } from "./utils/time";
import { prefetchWeather, startWeatherRefresh } from "./services/weather-cache";

const MY_PHONE = process.env.MY_PHONE; // iCloud email or phone number to accept messages from
const MY_CANONICAL_PHONE = process.env.MY_CANONICAL_PHONE ?? MY_PHONE; // phone number for DB lookups
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
  retry: {
    max: 1, // 1 attempt only — AppleScript always succeeds but SDK can't confirm self-text delivery
  },             // default max:2 would send twice; max:1 sends once
});

console.log("Tower — Your Morning Copilot");
console.log("Listening for messages...");
if (MY_PHONE) console.log(`Scoped to: ${MY_PHONE}`);

// ── EchoGuard (from future-me-courtroom-agent pattern) ────────────────
// Tracks everything Tower sends. If an incoming message matches
// something we recently sent, it's our own echo — skip it.
class EchoGuard {
  private messages = new Map<string, { text: string; at: number }[]>();

  track(chatKey: string, text: string) {
    this.prune();
    const entries = this.messages.get(chatKey) ?? [];
    entries.push({ text: this.normalize(text), at: Date.now() });
    this.messages.set(chatKey, entries.slice(-50));
  }

  isEcho(chatKey: string, text: string): boolean {
    this.prune();
    const entries = this.messages.get(chatKey);
    if (!entries) return false;
    const normalized = this.normalize(text);
    return entries.some((e) => e.text === normalized);
  }

  private normalize(text: string): string {
    return text.trim().replace(/\s+/g, " ").toLowerCase();
  }

  private prune() {
    const cutoff = Date.now() - 12 * 60 * 60 * 1000; // 12 hours
    for (const [key, entries] of this.messages.entries()) {
      const keep = entries.filter((e) => e.at >= cutoff);
      if (keep.length > 0) this.messages.set(key, keep);
      else this.messages.delete(key);
    }
  }
}

const echoGuard = new EchoGuard();

// ── Dedup: processed message GUIDs ────────────────────────────────────
const processedGuids = new Map<string, number>();

function alreadyProcessed(guid: string): boolean {
  // Prune old entries
  const now = Date.now();
  for (const [k, at] of processedGuids.entries()) {
    if (now - at > 10 * 60 * 1000) processedGuids.delete(k);
  }
  return processedGuids.has(guid);
}

function markProcessed(guid: string) {
  processedGuids.set(guid, Date.now());
}

// ── Dedup: same text within 30s per chat ──────────────────────────────
const recentInbound = new Map<string, { text: string; at: number }[]>();

function isDuplicateText(chatKey: string, text: string): boolean {
  const now = Date.now();
  const cutoff = now - 30_000;
  const normalized = text.trim().replace(/\s+/g, " ").toLowerCase();

  const existing = recentInbound.get(chatKey) ?? [];
  const pruned = existing.filter((e) => e.at >= cutoff);
  const dup = pruned.some((e) => e.text === normalized);
  pruned.push({ text: normalized, at: now });
  recentInbound.set(chatKey, pruned.slice(-20));
  return dup;
}

// ── Message handler ───────────────────────────────────────────────────

await sdk.startWatching({
  onMessage: async (msg: any) => {
    try {
      // Skip our own sent messages
      if (msg.isFromMe) return;

      const text = msg.text?.trim();
      if (!text) return;

      // 2. Skip by GUID (same DB row)
      const guid = msg.guid ?? msg.id ?? "";
      if (guid && alreadyProcessed(String(guid))) return;
      if (guid) markProcessed(String(guid));

      const sender = msg.sender ?? msg.participant ?? msg.handle ?? "";
      if (!sender) return;
      const chatKey = msg.chatId ?? sender;

      // 3. Skip if it matches something we recently sent (echo guard)
      if (echoGuard.isEcho(chatKey, text)) {
        if (DEBUG) console.log(`[skip:echo] ${text.slice(0, 50)}`);
        return;
      }

      // 4. Skip duplicate text within 30s
      if (isDuplicateText(chatKey, text)) {
        if (DEBUG) console.log(`[skip:dedup] ${text.slice(0, 50)}`);
        return;
      }

      // 5. Sender filter — accept MY_PHONE (iCloud email or phone number)
      if (MY_PHONE) {
        const digits = MY_PHONE.replace(/[^0-9]/g, "");
        const match = sender === MY_PHONE || (digits && sender.includes(digits));
        if (!match) return;
      }

      // Normalize sender to canonical phone number for DB lookups
      const phone = MY_CANONICAL_PHONE ?? sender;

      console.log(`[${sender}] ${text}`);

      const result = await routeMessage(phone, text);

      // Track our reply BEFORE sending so the echo guard catches it
      echoGuard.track(chatKey, result.text);

      // Always send text first — never let a failed image suppress the text
      const target = msg.chatId ?? MY_PHONE ?? sender;
      await sdk.send(target, result.text).catch(() => {});
      // Then try to attach image separately
      if (result.images && result.images.length > 0) {
        await sdk.send(target, { text: "", attachments: result.images }).catch(() => {});
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
        echoGuard.track(user.phone, result.text);
        await sdk.send(user.phone, result.text).catch(() => {});
        if (result.images && result.images.length > 0) {
          await sdk.send(user.phone, { text: "", attachments: result.images }).catch(() => {});
        }
      } catch (error) {
        console.error(`Morning briefing error for ${user.phone}:`, error);
      }
      scheduleMorningBriefings();
    }, ms);
  }
}

scheduleMorningBriefings();

// Pre-fetch weather for all users with a home airport so gm is instant
const usersWithHome = getAllUsers();
if (usersWithHome.length > 0) {
  for (const u of usersWithHome) {
    if (u.home_airport) prefetchWeather(u.home_airport).catch(() => {});
  }
  startWeatherRefresh(() =>
    getAllUsers().map((u) => u.home_airport).filter(Boolean) as string[]
  );
}

process.on("SIGINT", () => {
  console.log("\nShutting down Tower...");
  sdk.stopWatching();
  process.exit(0);
});

process.on("SIGTERM", () => {
  sdk.stopWatching();
  process.exit(0);
});
