import { resolveDenyPolicy, type ToolDenyPolicy } from "./safety/gate.js";
import type { FeishuBridgeConfig } from "./config-types.js";

export type { FeishuBridgeConfig } from "./config-types.js";

export type ResolvedConfig = {
  appId: string;
  appSecret: string;
  workspace: string;
  allowOpenIds: string[];
  taskTimeoutMs: number;
  denyPolicy: ToolDenyPolicy;
};

function splitIds(value?: string[] | string): string[] {
  if (Array.isArray(value)) {
    return value.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export function resolveConfig(
  config: FeishuBridgeConfig = {},
  env: NodeJS.ProcessEnv = process.env,
): ResolvedConfig {
  const appId = (config.appId?.trim() || env.FEISHU_APP_ID?.trim() || "");
  const appSecret =
    config.appSecret?.trim() || env.FEISHU_APP_SECRET?.trim() || "";
  const workspace =
    config.workspace?.trim() || env.DSH_WORKSPACE?.trim() || process.cwd();

  let allowOpenIds = splitIds(config.allowOpenIds);
  // Empty array in cordis.patch.yml must not block env fallback
  if (allowOpenIds.length === 0) {
    allowOpenIds = splitIds(env.FEISHU_ALLOW_OPEN_IDS);
  }

  const taskTimeoutMs =
    typeof config.taskTimeoutMs === "number" && config.taskTimeoutMs > 0
      ? config.taskTimeoutMs
      : Number(env.FEISHU_TASK_TIMEOUT_MS) || 600_000;

  const allowDangerousTools =
    config.allowDangerousTools === true ||
    env.FEISHU_ALLOW_DANGEROUS_TOOLS === "1" ||
    env.FEISHU_ALLOW_DANGEROUS_TOOLS === "true";

  const denyPolicy = resolveDenyPolicy({
    denyToolNames: config.denyToolNames ?? env.FEISHU_DENY_TOOLS,
    denyToolPrefixes: config.denyToolPrefixes ?? env.FEISHU_DENY_TOOL_PREFIXES,
    allowDangerousTools,
  });

  return {
    appId,
    appSecret,
    workspace,
    allowOpenIds,
    taskTimeoutMs,
    denyPolicy,
  };
}
