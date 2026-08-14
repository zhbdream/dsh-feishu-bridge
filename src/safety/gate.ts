/**
 * tools/pre-execute gate — MVP denies dangerous tools (no Feishu ask flow).
 */

export type SafetyDecision = "allow" | "deny";

export type ToolDenyPolicy = {
  /** Exact tool names (case-insensitive). */
  names: string[];
  /** Prefixes matched against tool name start (case-insensitive). */
  prefixes: string[];
  /**
   * When true, skip built-in dangerous defaults (still applies `names`/`prefixes`).
   * Unsafe; only for local experiments.
   */
  allowDangerousTools?: boolean;
};

/** Built-in deny list aligned with dsh tool packages (bash/write/edit/…). */
export const DEFAULT_DENY_NAMES = [
  "bash",
  "pwsh",
  "write",
  "edit",
  "str_replace_editor",
  "run_code",
] as const;

export const DEFAULT_DENY_PREFIXES = [
  "bash",
  "shell",
  "terminal",
  "write",
  "edit",
  "remove",
  "delete",
  "str_replace",
  "pwsh",
] as const;

export function resolveDenyPolicy(input: {
  denyToolNames?: string[] | string;
  denyToolPrefixes?: string[] | string;
  allowDangerousTools?: boolean;
}): ToolDenyPolicy {
  const names = [
    ...(input.allowDangerousTools ? [] : DEFAULT_DENY_NAMES),
    ...splitList(input.denyToolNames),
  ];
  const prefixes = [
    ...(input.allowDangerousTools ? [] : DEFAULT_DENY_PREFIXES),
    ...splitList(input.denyToolPrefixes),
  ];
  return {
    names: uniqueLower(names),
    prefixes: uniqueLower(prefixes),
    allowDangerousTools: Boolean(input.allowDangerousTools),
  };
}

function splitList(value?: string[] | string): string[] {
  if (Array.isArray(value)) {
    return value.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function uniqueLower(items: readonly string[]): string[] {
  return [...new Set(items.map((s) => s.toLowerCase()).filter(Boolean))];
}

export function matchDeniedTool(
  toolName: string,
  policy: ToolDenyPolicy,
): { denied: false } | { denied: true; reason: string } {
  const name = toolName.trim().toLowerCase();
  if (!name) return { denied: false };

  if (policy.names.includes(name)) {
    return {
      denied: true,
      reason: `工具「${toolName}」被 dsh-feishu-bridge 安全闸拒绝（精确匹配黑名单）。MVP 不允许远程触发高危操作；详见 SECURITY.md。`,
    };
  }

  for (const p of policy.prefixes) {
    if (name === p || name.startsWith(`${p}_`) || name.startsWith(`${p}-`)) {
      return {
        denied: true,
        reason: `工具「${toolName}」被 dsh-feishu-bridge 安全闸拒绝（前缀「${p}」）。MVP 不允许远程触发高危操作；详见 SECURITY.md。`,
      };
    }
  }

  return { denied: false };
}

export function decideToolCall(input: {
  toolName: string;
  policy?: ToolDenyPolicy;
}): SafetyDecision {
  const policy = input.policy ?? resolveDenyPolicy({});
  return matchDeniedTool(input.toolName, policy).denied ? "deny" : "allow";
}

export type ToolExecutionLike = {
  name?: string;
};

export type PreToolDecisionLike =
  | { kind: "allow" }
  | { kind: "deny"; reason: string }
  | { kind: "ask"; reason?: string };

/**
 * Register `tools/pre-execute` deny gate on the plugin context.
 * @returns disposer from cordis `ctx.on` when available, else a no-op.
 */
export function installToolGate(
  ctx: {
    on?: (
      event: string,
      listener: (...args: any[]) => any,
      options?: { prepend?: boolean },
    ) => void | (() => void);
  },
  policy: ToolDenyPolicy,
  hooks?: {
    onDeny?: (info: { toolName: string; reason: string }) => void;
  },
): () => void {
  const listener = (
    exec: ToolExecutionLike,
    next: () => Promise<PreToolDecisionLike>,
  ): Promise<PreToolDecisionLike> | PreToolDecisionLike => {
    const toolName = typeof exec?.name === "string" ? exec.name : "";
    const hit = matchDeniedTool(toolName, policy);
    if (hit.denied) {
      hooks?.onDeny?.({ toolName, reason: hit.reason });
      return { kind: "deny", reason: hit.reason };
    }
    return next();
  };

  const dispose = ctx.on?.("tools/pre-execute", listener);
  return typeof dispose === "function" ? dispose : () => {};
}
