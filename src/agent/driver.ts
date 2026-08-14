import type { Context } from "../types/cordis-shim.js";
import { SessionRouter } from "./session-router.js";
import { replyText } from "../feishu/outbound.js";
import { createUserMessage } from "./user-message.js";
import type { Client } from "@larksuiteoapi/node-sdk";
import { log } from "../log.js";
import {
  MSG,
  createAgentFailed,
  statusBusy,
  statusIdle,
  turnFailed,
} from "../messages.js";

type AgentLike = {
  id: string;
  status: string;
  followup: (message: unknown) => void;
  cancel: (cause: string) => void;
  whenIdle: () => Promise<void>;
  session: {
    events: ReadonlyArray<{
      seq: number;
      type: string;
      data?: unknown;
    }>;
  };
};

type AgentHandleLike = {
  agent: AgentLike;
  dispose: () => Promise<void>;
};

type AgentsService = {
  create: (options: {
    sessionId: string;
    meta?: { cwd?: string };
    agentOptions?: { provider: string; model: string };
  }) => Promise<AgentHandleLike>;
  get: (id: string) => AgentLike | undefined;
};

type AgentDefaultModel = {
  currentSelection: () => { provider: string; model: string };
};

export type AgentDriver = {
  handleUserText: (input: {
    openId: string;
    chatId: string;
    text: string;
  }) => Promise<void>;
  statusText: (openId: string, chatId: string) => string;
  cancel: (openId: string, chatId: string) => Promise<void>;
  /** Chat currently running a turn — used by safety gate Feishu notify. */
  getActiveChatId: () => string | undefined;
  dispose: () => Promise<void>;
};

type Live = {
  handle: AgentHandleLike;
  busy: boolean;
  lastError?: string;
  chatId: string;
};

type TurnOutcome = {
  text: string;
  error?: string;
};

function randomSessionId(): string {
  return `feishu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Fold assistant text + turn error from session events after `firstSeq` (headless-compatible). */
export function summarizeSessionEvents(
  events: ReadonlyArray<{ seq: number; type: string; data?: unknown }>,
  firstSeq: number,
): TurnOutcome {
  let started = false;
  let text = "";
  let chunkFallback = "";
  let error: string | undefined;

  for (const event of events) {
    if (event.seq < firstSeq) continue;
    if (event.type === "turn/start") {
      started = true;
      continue;
    }
    if (!started) continue;

    if (event.type === "assistant/message") {
      const data = event.data as
        | { message?: { content?: Array<{ type?: string; text?: string }> } }
        | undefined;
      const joined = (data?.message?.content ?? [])
        .filter((b) => b?.type === "text" && typeof b.text === "string")
        .map((b) => b.text as string)
        .join("");
      if (joined) text = joined;
    } else if (event.type === "assistant/chunk") {
      const data = event.data as
        | { chunk?: { type?: string; text?: string } }
        | undefined;
      if (data?.chunk?.type === "text-delta" && data.chunk.text) {
        chunkFallback += data.chunk.text;
      }
    } else if (event.type === "turn/end") {
      const data = event.data as
        | {
            reason?: {
              kind?: string;
              error?: { message?: string; code?: string };
            };
          }
        | undefined;
      if (data?.reason?.kind === "error") {
        const err = data.reason.error;
        error = err?.message
          ? `${err.code ? `${err.code}: ` : ""}${err.message}`
          : "turn ended with error";
      }
    }
  }

  return { text: (text || chunkFallback).trim(), error };
}

function resolveModelSelection(ctx: Context): { provider: string; model: string } {
  const svc = ctx.get?.("agentDefaultModel") as AgentDefaultModel | undefined;
  const selection = svc?.currentSelection?.();
  if (selection?.provider && selection?.model) {
    return { provider: selection.provider, model: selection.model };
  }

  const provider =
    process.env.DSH_PROVIDER?.trim() ||
    process.env.FEISHU_DSH_PROVIDER?.trim() ||
    "";
  const model =
    process.env.DSH_MODEL?.trim() || process.env.FEISHU_DSH_MODEL?.trim() || "";
  if (provider && model) return { provider, model };

  throw new Error(
    "未配置默认模型：请在 ~/.dsh/settings.yaml 的 agent-default-model 中设置 provider/model，或设置环境变量 DSH_PROVIDER + DSH_MODEL",
  );
}

export function createAgentDriver(deps: {
  ctx: Context;
  client: Client;
  workspace: string;
  taskTimeoutMs: number;
}): AgentDriver {
  const router = new SessionRouter();
  const lives = new Map<string, Live>();
  const agents = deps.ctx.agents as AgentsService | undefined;
  let activeChatId: string | undefined;

  const keyOf = (openId: string, chatId: string) => `${chatId}:${openId}`;

  async function ensureLive(openId: string, chatId: string): Promise<Live> {
    const key = keyOf(openId, chatId);
    const existing = lives.get(key);
    if (existing) return existing;

    if (!agents?.create) {
      throw new Error("ctx.agents 不可用：请确认 profile 包含 dsh-base / agent-loop");
    }

    let sessionId = router.get({ openId, chatId });
    if (!sessionId) {
      sessionId = randomSessionId();
      router.set({ openId, chatId }, sessionId);
    }

    const model = resolveModelSelection(deps.ctx);
    const cwd = deps.workspace.trim() || process.cwd();
    log.info("agent_create", {
      sessionId,
      provider: model.provider,
      model: model.model,
      cwd,
    });

    const handle = await agents.create({
      sessionId,
      meta: { cwd },
      agentOptions: {
        provider: model.provider,
        model: model.model,
      },
    });

    const live: Live = { handle, busy: false, chatId };
    lives.set(key, live);
    return live;
  }

  return {
    getActiveChatId() {
      return activeChatId;
    },

    statusText(openId, chatId) {
      const live = lives.get(keyOf(openId, chatId));
      if (!live) return MSG.noSession;
      if (live.busy) return statusBusy(live.handle.agent.status);
      return statusIdle(live.handle.agent.status);
    },

    async cancel(openId, chatId) {
      const live = lives.get(keyOf(openId, chatId));
      if (!live) {
        await replyText(deps.client, chatId, MSG.noCancel);
        return;
      }
      try {
        live.handle.agent.cancel("user");
      } catch (err) {
        log.error("cancel_failed", {
          message: err instanceof Error ? err.message : String(err),
        });
      }
      live.busy = false;
      await replyText(deps.client, chatId, MSG.cancelRequested);
    },

    async handleUserText({ openId, chatId, text }) {
      if (!agents?.create) {
        await replyText(deps.client, chatId, MSG.agentUnavailable);
        return;
      }

      let live: Live;
      try {
        live = await ensureLive(openId, chatId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error("ensure_live_failed", { message: msg });
        await replyText(deps.client, chatId, createAgentFailed(msg));
        return;
      }

      if (live.busy) {
        await replyText(deps.client, chatId, MSG.busy);
        return;
      }

      live.busy = true;
      live.chatId = chatId;
      live.lastError = undefined;
      activeChatId = chatId;

      await replyText(deps.client, chatId, MSG.processing);

      try {
        const firstSeq = live.handle.agent.session.events.length;

        live.handle.agent.followup(
          createUserMessage({
            content: [{ type: "text", text }],
            source: { kind: "user" },
          }),
        );

        const timeoutMs = deps.taskTimeoutMs > 0 ? deps.taskTimeoutMs : 600_000;
        const result = await Promise.race([
          live.handle.agent.whenIdle().then(() => "idle" as const),
          new Promise<"timeout">((resolve) =>
            setTimeout(() => resolve("timeout"), timeoutMs),
          ),
        ]);

        if (result === "timeout") {
          await replyText(deps.client, chatId, MSG.timeout);
          return;
        }

        const outcome = summarizeSessionEvents(
          live.handle.agent.session.events,
          firstSeq,
        );

        if (outcome.error) {
          live.lastError = outcome.error;
          log.error("agent_turn_error", { error: outcome.error });
          await replyText(
            deps.client,
            chatId,
            turnFailed(outcome.error, outcome.text),
          );
          return;
        }

        const answer = outcome.text || MSG.emptyModelReply;
        await replyText(deps.client, chatId, answer);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        live.lastError = msg;
        log.error("agent_turn_failed", { message: msg });
        await replyText(deps.client, chatId, turnFailed(msg));
      } finally {
        live.busy = false;
        if (activeChatId === chatId) activeChatId = undefined;
      }
    },

    async dispose() {
      activeChatId = undefined;
      for (const live of lives.values()) {
        try {
          await live.handle.dispose();
        } catch {
          /* ignore */
        }
      }
      lives.clear();
    },
  };
}
