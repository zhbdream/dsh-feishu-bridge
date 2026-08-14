export type FeishuTextMessage = {
  openId: string;
  chatId: string;
  messageId: string;
  chatType: string;
  messageType: string;
  text: string;
  senderType?: string;
};

export function parseMessageText(content: string): string | null {
  try {
    const parsed = JSON.parse(content) as { text?: unknown };
    if (typeof parsed.text === "string") return parsed.text;
  } catch {
    return null;
  }
  return null;
}
