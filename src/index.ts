import type { Context } from "./types/cordis-shim.js";
import { rememberMessageId, parseInboxText } from "./agent/inbox.js";
import { createAgentDriver } from "./agent/driver.js";
import { createFeishuClients, replyText } from "./feishu/outbound.js";
import { startFeishuWs } from "./feishu/ws.js";
import { installToolGate } from "./safety/gate.js";
import { resolveConfig, type FeishuBridgeConfig } from "./config.js";
import { log } from "./log.js";
import {
  MSG,
  toolDeniedNotify,
  unauthorized,
} from "./messages.js";

export const name = "dsh-feishu-bridge";
export type { FeishuBridgeConfig };

/** Needs agents factory + default model from dsh-base. */
export const inject = ["agents", "agentDefaultModel"] as const;

export function apply(ctx: Context, config: FeishuBridgeConfig = {}) {
  const resolved = resolveConfig(config);

  ctx.effect(() => {
    log.info("plugin_loaded", {
      appId: resolved.appId ? "set" : "empty",
      allowlist: resolved.allowOpenIds.length,
      workspace: resolved.workspace,
      denyTools: resolved.denyPolicy.names.length,
      denyPrefixes: resolved.denyPolicy.prefixes.length,
      allowDangerousTools: Boolean(resolved.denyPolicy.allowDangerousTools),
    });

    if (!resolved.appId || !resolved.appSecret) {
      log.warn("missing_credentials", {
        hint: MSG.missingCredentials,
      });
      return () => {
        log.info("plugin_unloaded");
      };
    }

    if (resolved.allowOpenIds.length === 0) {
      log.warn("empty_allowlist", {
        hint: MSG.emptyAllowlist,
      });
    }

    const { client } = createFeishuClients(resolved.appId, resolved.appSecret);
    const driver = createAgentDriver({
      ctx,
      client,
      workspace: resolved.workspace,
      taskTimeoutMs: resolved.taskTimeoutMs,
    });

    let lastDenyNotifyAt = 0;
    const uninstallGate = installToolGate(ctx, resolved.denyPolicy, {
      onDeny: ({ toolName, reason }) => {
        log.warn("tool_denied", { toolName, reason });
        const chatId = driver.getActiveChatId();
        if (!chatId) return;
        const now = Date.now();
        if (now - lastDenyNotifyAt < 8_000) return;
        lastDenyNotifyAt = now;
        void replyText(
          client,
          chatId,
          toolDeniedNotify(toolName, reason),
        ).catch((err) => {
          log.error("deny_notify_failed", {
            message: err instanceof Error ? err.message : String(err),
          });
        });
      },
    });

    let stopWs: (() => void) | undefined;
    let disposed = false;

    void (async () => {
      try {
        stopWs = await startFeishuWs({
          appId: resolved.appId,
          appSecret: resolved.appSecret,
          onTextMessage: async (msg) => {
            if (disposed) return;

            if (!rememberMessageId(msg.messageId)) {
              log.info("skip_duplicate", { messageId: msg.messageId });
              return;
            }

            if (msg.messageType !== "text" || !msg.text.trim()) {
              await replyText(client, msg.chatId, MSG.textOnly);
              return;
            }

            if (!resolved.allowOpenIds.includes(msg.openId)) {
              log.info("deny_open_id", {
                openId: msg.openId,
                chatId: msg.chatId,
              });
              await replyText(client, msg.chatId, unauthorized(msg.openId));
              return;
            }

            const cmd = parseInboxText(msg.text);
            if (cmd.kind === "status") {
              await replyText(
                client,
                msg.chatId,
                driver.statusText(msg.openId, msg.chatId),
              );
              return;
            }
            if (cmd.kind === "cancel") {
              await driver.cancel(msg.openId, msg.chatId);
              return;
            }

            await driver.handleUserText({
              openId: msg.openId,
              chatId: msg.chatId,
              text: cmd.text,
            });
          },
        });
      } catch (err) {
        log.error("ws_bootstrap_failed", {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return () => {
      disposed = true;
      uninstallGate();
      stopWs?.();
      void driver.dispose();
      log.info("plugin_unloaded");
    };
  });
}
