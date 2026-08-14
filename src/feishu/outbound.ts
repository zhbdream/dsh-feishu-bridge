import * as Lark from "@larksuiteoapi/node-sdk";

export type FeishuClients = {
  client: Lark.Client;
  wsClient: Lark.WSClient;
};

export function createFeishuClients(appId: string, appSecret: string): FeishuClients {
  const base = { appId, appSecret };
  return {
    client: new Lark.Client(base),
    wsClient: new Lark.WSClient({
      ...base,
      loggerLevel: Lark.LoggerLevel.info,
    }),
  };
}

export async function replyText(
  client: Lark.Client,
  chatId: string,
  text: string,
): Promise<void> {
  const clipped = text.length > 3500 ? `${text.slice(0, 3500)}\n…(已截断)` : text;
  await client.im.v1.message.create({
    params: { receive_id_type: "chat_id" },
    data: {
      receive_id: chatId,
      msg_type: "text",
      content: JSON.stringify({ text: clipped }),
    },
  });
}
