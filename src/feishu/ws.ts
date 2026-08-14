import * as Lark from "@larksuiteoapi/node-sdk";
import type { FeishuTextMessage } from "./types.js";
import { parseMessageText } from "./types.js";
import { log } from "../log.js";

export type StartFeishuWsOptions = {
  appId: string;
  appSecret: string;
  onTextMessage: (msg: FeishuTextMessage) => void | Promise<void>;
};

/**
 * Feishu long connection with SDK auto-reconnect.
 * Event handlers must finish quickly (<3s); heavy work is fire-and-forget.
 */
export async function startFeishuWs(
  opts: StartFeishuWsOptions,
): Promise<() => void> {
  const wsClient = new Lark.WSClient({
    appId: opts.appId,
    appSecret: opts.appSecret,
    loggerLevel: Lark.LoggerLevel.info,
    autoReconnect: true,
    onReady: () => {
      log.info("ws_ready");
    },
    onReconnecting: () => {
      log.warn("ws_reconnecting");
    },
    onReconnected: () => {
      log.info("ws_reconnected");
    },
    onError: (err) => {
      log.error("ws_error", {
        message: err instanceof Error ? err.message : String(err),
      });
    },
  });

  const dispatcher = new Lark.EventDispatcher({}).register({
    "im.message.receive_v1": async (data) => {
      try {
        const sender = data.sender as {
          sender_id?: { open_id?: string };
          sender_type?: string;
        };
        const message = data.message as {
          message_id?: string;
          chat_id?: string;
          chat_type?: string;
          message_type?: string;
          content?: string;
        };

        const openId = sender.sender_id?.open_id ?? "";
        const chatId = message.chat_id ?? "";
        const messageId = message.message_id ?? "";
        if (!openId || !chatId || !messageId) return;

        if (sender.sender_type && sender.sender_type !== "user") return;

        if (message.chat_type && message.chat_type !== "p2p") {
          return;
        }

        if (message.message_type !== "text") {
          void opts.onTextMessage({
            openId,
            chatId,
            messageId,
            chatType: message.chat_type ?? "p2p",
            messageType: message.message_type ?? "unknown",
            text: "",
            senderType: sender.sender_type,
          });
          return;
        }

        const text = parseMessageText(message.content ?? "");
        if (text === null) return;

        void Promise.resolve(
          opts.onTextMessage({
            openId,
            chatId,
            messageId,
            chatType: message.chat_type ?? "p2p",
            messageType: "text",
            text,
            senderType: sender.sender_type,
          }),
        ).catch((err) => {
          log.error("on_text_message_failed", {
            message: err instanceof Error ? err.message : String(err),
            messageId,
            chatId,
          });
        });
      } catch (err) {
        log.error("receive_handler_error", {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
  });

  void wsClient.start({ eventDispatcher: dispatcher }).catch((err) => {
    log.error("ws_start_failed", {
      message: err instanceof Error ? err.message : String(err),
    });
  });

  log.info("ws_starting");

  return () => {
    try {
      const anyWs = wsClient as unknown as { close?: () => void; stop?: () => void };
      anyWs.close?.();
      anyWs.stop?.();
      log.info("ws_stopped");
    } catch (err) {
      log.warn("ws_stop_error", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };
}
