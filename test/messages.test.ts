import { describe, expect, it } from "vitest";
import { resolveConfig } from "../src/config.js";
import { humanizeError, MSG, unauthorized } from "../src/messages.js";

describe("resolveConfig", () => {
  it("falls back from empty allowOpenIds array to env", () => {
    const resolved = resolveConfig(
      { allowOpenIds: [], appId: "cli_a", appSecret: "sec" },
      { FEISHU_ALLOW_OPEN_IDS: "ou_1, ou_2" } as NodeJS.ProcessEnv,
    );
    expect(resolved.allowOpenIds).toEqual(["ou_1", "ou_2"]);
    expect(resolved.appId).toBe("cli_a");
  });

  it("prefers config over env for appId", () => {
    const resolved = resolveConfig(
      { appId: "from-config", appSecret: "s" },
      { FEISHU_APP_ID: "from-env" } as NodeJS.ProcessEnv,
    );
    expect(resolved.appId).toBe("from-config");
  });

  it("parses deny lists from env", () => {
    const resolved = resolveConfig(
      {},
      {
        FEISHU_DENY_TOOLS: "job_kill",
        FEISHU_ALLOW_DANGEROUS_TOOLS: "1",
      } as NodeJS.ProcessEnv,
    );
    expect(resolved.denyPolicy.allowDangerousTools).toBe(true);
    expect(resolved.denyPolicy.names).toContain("job_kill");
    expect(resolved.denyPolicy.names).not.toContain("bash");
  });
});

describe("messages", () => {
  it("humanizes missing provider/model", () => {
    const tip = humanizeError('agent "x" has no provider/model: set AgentOptions');
    expect(tip).toMatch(/agent-default-model/);
  });

  it("unauthorized includes open_id", () => {
    expect(unauthorized("ou_abc")).toContain("ou_abc");
  });

  it("exposes stable busy copy", () => {
    expect(MSG.busy).toMatch(/cancel/i);
  });
});
