/** W2: map Feishu identity → durable Harness session id. */
export type FeishuRouteKey = {
  openId: string;
  chatId: string;
};

export class SessionRouter {
  private readonly map = new Map<string, string>();

  keyOf(k: FeishuRouteKey): string {
    return `${k.chatId}:${k.openId}`;
  }

  get(k: FeishuRouteKey): string | undefined {
    return this.map.get(this.keyOf(k));
  }

  set(k: FeishuRouteKey, sessionId: string): void {
    this.map.set(this.keyOf(k), sessionId);
  }
}
