/** W2: inbound pipeline — dedupe + slash commands. */

const seen = new Set<string>();
const SEEN_CAP = 5000;

export type InboxCommand =
  | { kind: "status" }
  | { kind: "cancel" }
  | { kind: "prompt"; text: string };

export function rememberMessageId(messageId: string): boolean {
  if (seen.has(messageId)) return false;
  seen.add(messageId);
  if (seen.size > SEEN_CAP) {
    const first = seen.values().next().value;
    if (first !== undefined) seen.delete(first);
  }
  return true;
}

export function parseInboxText(text: string): InboxCommand {
  const t = text.trim();
  if (t === "/status" || t === "／status") return { kind: "status" };
  if (t === "/cancel" || t === "／cancel") return { kind: "cancel" };
  return { kind: "prompt", text: t };
}
